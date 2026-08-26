import { SpriteFrame } from "cc";
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";
import { ZRSJZ_PROP_CONFIG } from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_Tools } from "../ZRSJZ_Tools";

export interface ZRSJZ_GradeInfo {
    Level: number;
    CurrentExperience: number;
    RequiredExperience: number;
    Progress: number;
    IsMaxLevel: boolean;
}

export interface ZRSJZ_ExperienceAddedInfo {
    Amount: number;
    Before: ZRSJZ_GradeInfo;
    After: ZRSJZ_GradeInfo;
}

/** 等级、账号统计及等级界面展示数据。 */
export class ZRSJZ_GradeService {
    public static readonly MAX_LEVEL: number = 60;

    /**
     * 下标 0～59 对应等级 1～60；60 级为满级，因此升级需求为 0。
     * 曲线采用二次增长：前期升级轻快，20 级后逐渐拉开养成周期。
     */
    public static readonly REQUIRED_EXPERIENCE_BY_LEVEL: readonly number[] = Object.freeze([
        100, 140, 190, 260, 340, 430, 540, 660, 790, 940,
        1100, 1280, 1470, 1680, 1900, 2130, 2380, 2640, 2910, 3200,
        3500, 3820, 4150, 4500, 4860, 5230, 5620, 6020, 6430, 6860,
        7300, 7760, 8230, 8720, 9220, 9730, 10260, 10800, 11350, 11920,
        12500, 13100, 13710, 14340, 14980, 15630, 16300, 16980, 17670, 18380,
        19100, 19840, 20590, 21360, 22140, 22930, 23740, 24560, 25390, 0,
    ]);

    private static readonly _roleSpritePromises = new Map<string, Promise<SpriteFrame | null>>();
    private static _onlineTimeFraction: number = 0;
    private static _unsavedOnlineSeconds: number = 0;

    public static GetGradeInfo(): ZRSJZ_GradeInfo {
        const data = ZRSJZ_GameData.Instance;
        const level = this.ClampLevel(data.Grade);
        const isMaxLevel = level >= this.MAX_LEVEL;
        const requiredExperience = isMaxLevel ? 0 : this.GetRequiredExperience(level);
        const currentExperience = isMaxLevel
            ? 0
            : Math.max(0, Math.min(
                Math.floor(data.CurExp ?? 0),
                Math.max(0, requiredExperience - 1),
            ));
        return {
            Level: level,
            CurrentExperience: currentExperience,
            RequiredExperience: requiredExperience,
            Progress: isMaxLevel
                ? 1
                : currentExperience / Math.max(1, requiredExperience),
            IsMaxLevel: isMaxLevel,
        };
    }

    public static GetRequiredExperience(level: number): number {
        return this.REQUIRED_EXPERIENCE_BY_LEVEL[this.ClampLevel(level) - 1] ?? 0;
    }

    /** 主线任务领取时动态取值，保证奖励恰好补足当前等级。 */
    public static GetExperienceToNextLevel(): number {
        const info = this.GetGradeInfo();
        return info.IsMaxLevel
            ? 0
            : Math.max(0, info.RequiredExperience - info.CurrentExperience);
    }

    /** CurExp 保存当前等级内经验；一次增加可连续提升多级。 */
    public static AddExperience(experience: number): boolean {
        if (!Number.isFinite(experience) || experience <= 0) return false;
        const data = ZRSJZ_GameData.Instance;
        const amount = Math.floor(experience);
        if (amount <= 0) return false;
        const before = this.GetGradeInfo();
        let level = this.ClampLevel(data.Grade);
        let currentExperience = Math.max(0, Math.floor(data.CurExp ?? 0))
            + amount;

        while (level < this.MAX_LEVEL) {
            const requiredExperience = this.GetRequiredExperience(level);
            if (currentExperience < requiredExperience) break;
            currentExperience -= requiredExperience;
            level++;
        }
        if (level >= this.MAX_LEVEL) currentExperience = 0;
        data.Grade = level;
        data.CurExp = currentExperience;
        this._unsavedOnlineSeconds = 0;
        ZRSJZ_GameData.SaveData();
        const changeInfo: ZRSJZ_ExperienceAddedInfo = {
            Amount: amount,
            Before: before,
            After: this.GetGradeInfo(),
        };
        // 先通知经验动画，再发送通用刷新，避免等级 UI 先瞬间跳到最终值。
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_EXPERIENCE_ADDED, changeInfo);
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
        return true;
    }

    public static RecordBattleStarted(): void {
        const data = ZRSJZ_GameData.Instance;
        data.TotalGamePlayed = this.SafeInteger(data.TotalGamePlayed) + 1;
        this.SaveAndNotify();
    }

    public static RecordBattleFinished(
        evacuationSuccess: boolean,
        evacuationValue: number = 0,
        battleSeconds: number = 0,
        killCount: number = 0,
        queueExperience: boolean = true,
    ): number {
        const data = ZRSJZ_GameData.Instance;
        if (evacuationSuccess) {
            data.TotalEvacuation = this.SafeInteger(data.TotalEvacuation) + 1;
            data.OptimumEvacuation = Math.max(
                this.SafeInteger(data.OptimumEvacuation),
                Math.max(0, Math.floor(evacuationValue || 0)),
            );
        }
        const battleExperience = queueExperience
            ? this.CalculateBattleExperience(battleSeconds, killCount)
            : 0;
        if (battleExperience > 0) {
            data.PendingExperience = this.SafeInteger(data.PendingExperience) + battleExperience;
        }
        this.SaveAndNotify();
        return battleExperience;
    }

    /**
     * 一局典型的10分钟、10击杀约获得当前等级需求的10%。
     * 时长最多计算15分钟、击杀最多计算15个，避免挂机和反复刷怪快速冲级。
     */
    public static CalculateBattleExperience(battleSeconds: number, killCount: number): number {
        const gradeInfo = this.GetGradeInfo();
        if (gradeInfo.IsMaxLevel) return 0;
        const seconds = Math.max(0, Math.min(15 * 60, Number(battleSeconds) || 0));
        const kills = Math.max(0, Math.min(15, Math.floor(Number(killCount) || 0)));
        if (seconds < 30 && kills <= 0) return 0;

        const timeExperience = Math.floor(
            gradeInfo.RequiredExperience * 0.004 * (seconds / 60),
        );
        const killExperience = Math.floor(
            gradeInfo.RequiredExperience * 0.006 * kills,
        );
        return Math.max(1, timeExperience + killExperience);
    }

    /** 仅在进入大厅后调用，清空暂存并通过统一入口发放经验。 */
    public static ClaimPendingExperience(): number {
        const data = ZRSJZ_GameData.Instance;
        const experience = this.SafeInteger(data.PendingExperience);
        if (experience <= 0) return 0;
        data.PendingExperience = 0;
        this.AddExperience(experience);
        return experience;
    }

    /** 主界面和局内场景共同调用，累计真实在线时间；每30秒自动落盘。 */
    public static UpdateOnlineTime(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        this._onlineTimeFraction += deltaTime;
        const wholeSeconds = Math.floor(this._onlineTimeFraction);
        if (wholeSeconds <= 0) return;
        this._onlineTimeFraction -= wholeSeconds;
        const data = ZRSJZ_GameData.Instance;
        data.TotalTimePlayed = this.SafeInteger(data.TotalTimePlayed) + wholeSeconds;
        this._unsavedOnlineSeconds += wholeSeconds;
        if (this._unsavedOnlineSeconds >= 30) this.FlushOnlineTime();
    }

    public static FlushOnlineTime(): void {
        if (this._unsavedOnlineSeconds <= 0) return;
        this._unsavedOnlineSeconds = 0;
        this.SaveAndNotify();
    }

    /** 当前账号全部道具价值，并额外计入收藏室中已解锁的藏品。 */
    public static GetTotalAssetValue(): number {
        const data = ZRSJZ_GameData.Instance;
        const inventoryValue = Object.values(data.PropData ?? {}).reduce(
            (total, prop) => total
                + Math.max(0, Number(prop?.UnitPrice) || 0)
                * Math.max(0, Number(prop?.CurCount) || 0),
            0,
        );
        const collectionValue = Object.entries(data.BoxroomPropLevel ?? {}).reduce(
            (total, [propName, level]) => {
                if ((Number(level) || 0) <= 0) return total;
                return total + Math.max(0, ZRSJZ_PROP_CONFIG.get(propName)?.UnitPrice ?? 0);
            },
            0,
        );
        return Math.floor(inventoryValue + collectionValue);
    }

    public static GetPropIDsValue(propIDs: readonly string[]): number {
        const data = ZRSJZ_GameData.Instance;
        return Math.floor((propIDs ?? []).reduce((total, propID) => {
            const prop = data.PropData?.[propID];
            return prop
                ? total + Math.max(0, prop.UnitPrice || 0) * Math.max(0, prop.CurCount || 0)
                : total;
        }, 0));
    }

    public static FormatPlayTime(totalSeconds: number): string {
        const totalMinutes = Math.max(0, Math.floor((Number(totalSeconds) || 0) / 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
    }

    public static FormatEvacuationRate(successCount: number, totalGameCount: number): string {
        const total = this.SafeInteger(totalGameCount);
        if (total <= 0) return "0.0%";
        const success = Math.min(total, this.SafeInteger(successCount));
        const percentage = success / total * 100;
        return `${percentage.toFixed(1)}%`;
    }

    public static FormatAssetValue(value: number): string {
        const safeValue = Math.max(0, Math.floor(Number(value) || 0));
        if (safeValue >= 100000000) return `${(safeValue / 10000000).toFixed(1)}亿`;
        if (safeValue >= 10000) return `${(safeValue / 10000).toFixed(1)}万`;
        return safeValue.toString();
    }

    public static GetRoleAvatar(roleName: string): Promise<SpriteFrame | null> {
        return this.LoadRoleSprite("Sprites/等级系统/头像", roleName);
    }

    public static GetRoleFrame(roleName: string): Promise<SpriteFrame | null> {
        return this.LoadRoleSprite("Sprites/等级系统/角色框", roleName);
    }

    private static ClampLevel(level: number): number {
        return Math.max(1, Math.min(this.MAX_LEVEL, Math.floor(Number(level) || 1)));
    }

    private static SafeInteger(value: number): number {
        return Math.max(0, Math.floor(Number(value) || 0));
    }

    private static SaveAndNotify(): void {
        this._unsavedOnlineSeconds = 0;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
    }

    private static LoadRoleSprite(directory: string, roleName: string): Promise<SpriteFrame | null> {
        if (!roleName) return Promise.resolve(null);
        const key = `${directory}/${roleName}`;
        let promise = this._roleSpritePromises.get(key);
        if (!promise) {
            promise = ZRSJZ_Tools.LoadSprites(directory)
                .then(spriteFrames => spriteFrames.find(spriteFrame => spriteFrame.name === roleName) ?? null)
                .catch(error => {
                    console.error(`[ZRSJZ_GradeService] 等级角色图片加载失败: ${key}`, error);
                    this._roleSpritePromises.delete(key);
                    return null;
                });
            this._roleSpritePromises.set(key, promise);
        }
        return promise;
    }


}
