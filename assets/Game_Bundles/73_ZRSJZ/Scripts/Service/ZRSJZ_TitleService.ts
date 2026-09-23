import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_TITLE_CONFIG, ZRSJZ_BOSS_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';

export class ZRSJZ_TitleService {
    /** 唯一的称号解锁入口：仅依据配置条件，不接受外部传入奖励名称。 */
    public static SyncUnlocks(save = true): void {
        const data = ZRSJZ_GameData.Instance;
        const owned = new Set(data.OwnedTitles ?? []);
        let changed = false;
        for (const item of ZRSJZ_TITLE_CONFIG) {
            const rule = item.unlock;
            let unlocked = false;
            switch (rule.type) {
                case 'default': unlocked = true; break;
                case 'achievement': unlocked = !!data.AchievementClaimed?.includes(rule.id); break;
                case 'milestone': unlocked = !!data.AchievementMilestonesClaimed?.includes(rule.percent); break;
                case 'evacuations': unlocked = data.TotalEvacuation >= rule.count; break;
                case 'kills': unlocked = (data.AchievementProgress?.['火力覆盖'] ?? 0) >= rule.count; break;
                case 'allBosses': unlocked = ZRSJZ_BOSS_CONFIG.size > 0
                    && Array.from(ZRSJZ_BOSS_CONFIG.keys()).every(name => data.DefeatedTitleBosses?.includes(name)); break;
            }
            if (unlocked && !owned.has(item.name)) { owned.add(item.name); changed = true; }
        }
        if (changed) data.OwnedTitles = Array.from(owned);
        if (!owned.has(data.EquippedTitle) || !this.Normalize(data.EquippedTitle)) {
            data.EquippedTitle = '勇者';
            changed = true;
        }
        if (changed && save) ZRSJZ_GameData.SaveData();
    }
    public static RecordBossDefeated(name: string): void {
        if (!ZRSJZ_BOSS_CONFIG.has(name)) return;
        const data = ZRSJZ_GameData.Instance;
        data.DefeatedTitleBosses ??= [];
        if (data.DefeatedTitleBosses.includes(name)) return;
        data.DefeatedTitleBosses.push(name);
        this.SyncUnlocks(false);
        ZRSJZ_GameData.SaveData();
    }
    public static Normalize(name: string): string {
        return ZRSJZ_TITLE_CONFIG.find(item => item.name === name)?.name ?? '';
    }
    public static IsOwned(name: string): boolean {
        this.SyncUnlocks();
        const normalized = this.Normalize(name);
        return !!normalized && (ZRSJZ_GameData.Instance.OwnedTitles ?? []).some(value => this.Normalize(value) === normalized);
    }
    public static GetEquipped(): string {
        this.SyncUnlocks();
        const name = this.Normalize(ZRSJZ_GameData.Instance.EquippedTitle);
        return this.IsOwned(name) ? name : '';
    }
    public static Equip(name: string): boolean {
        if (!this.IsOwned(name)) return false;
        ZRSJZ_GameData.Instance.EquippedTitle = this.Normalize(name);
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
        return true;
    }
    public static GetUnlockHint(name: string): string {
        return ZRSJZ_TITLE_CONFIG.find(item => item.name === name)?.unlockCondition.text ?? '尚未获得该称号';
    }
}
