import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AccountService } from './ZRSJZ_AccountService';
import { ZRSJZ_ACHIEVEMENT_CONFIG, ZRSJZ_ACHIEVEMENT_MILESTONE_CONFIG, ZRSJZ_AchievementConfig, ZRSJZ_AchievementReward, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryService } from './ZRSJZ_InventoryService';
import { ZRSJZ_TitleService } from './ZRSJZ_TitleService';
import { ZRSJZ_AvatarFrameService } from './ZRSJZ_AvatarFrameService';
import { ZRSJZ_BattlePassService } from './ZRSJZ_BattlePassService';

/** 记录成就进度、完成状态和领奖；配置统一来自 ZRSJZ_Constant。 */
export class ZRSJZ_AchievementService {
    public static readonly Items = ZRSJZ_ACHIEVEMENT_CONFIG;
    public static readonly Milestones = ZRSJZ_ACHIEVEMENT_MILESTONE_CONFIG.map(item => item.percent);
    private static readonly searchedBoxes = new Set<string>();
    private static battleKillStreak = 0;
    private static lowHpEnemyKillStreak = 0;

    public static GetProgress(id: string): number {
        const data = ZRSJZ_GameData.Instance;
        switch (id) {
            case '枪火洗礼': return Math.max(data.TotalEvacuation || 0, data.AchievementProgress?.[id] || 0);
            case '百万撤离': return Math.max(data.OptimumEvacuation || 0, data.AchievementProgress?.[id] || 0);
            case '不灭传说': return Math.max(data.AchievementEvacuationStreak || 0, data.AchievementProgress?.[id] || 0);
            case '萌宠相伴': return Object.keys(data.PetData || {}).length;
            case '万能兵王': return this.Items.filter(item => item.id !== id && this.IsCompleted(item)).length;
            default: return data.AchievementProgress?.[id] || 0;
        }
    }

    public static IsCompleted(item: ZRSJZ_AchievementConfig): boolean {
        const data = ZRSJZ_GameData.Instance;
        return !!data.AchievementCompleted?.includes(item.id)
            || !!data.AchievementClaimed?.includes(item.id)
            || this.GetProgress(item.id) >= item.target;
    }

    /** 补齐旧进度与宠物等派生条件；完成记录一旦写入就保留。 */
    public static SyncCompleted(save = true): void {
        const data = ZRSJZ_GameData.Instance;
        data.AchievementCompleted ??= [];
        let changed = false;
        for (const item of this.Items) {
            if (!data.AchievementCompleted.includes(item.id) && this.IsCompleted(item)) {
                data.AchievementCompleted.push(item.id);
                changed = true;
            }
        }
        if (changed && save) ZRSJZ_GameData.SaveData();
    }

    public static GetCompletedCount(): number {
        this.SyncCompleted();
        return this.Items.filter(item => this.IsCompleted(item)).length;
    }
    public static GetCompletionPercent(): number { return Math.floor(this.GetCompletedCount() * 100 / this.Items.length); }

    /** 主页提醒包含成就条目和当前宝箱阶段的可领取奖励。 */
    public static HasClaimableRewards(): boolean {
        this.SyncCompleted();
        const claimed = ZRSJZ_GameData.Instance.AchievementClaimed ?? [];
        return this.Items.some(item => !claimed.includes(item.id) && this.IsCompleted(item))
            || this.GetMilestoneState(this.GetNextMilestone()) === 'claimable';
    }

    public static Claim(id: string): boolean {
        this.SyncCompleted();
        const item = this.Items.find(config => config.id === id);
        const data = ZRSJZ_GameData.Instance;
        if (!item || !this.IsCompleted(item) || data.AchievementClaimed?.includes(id)
            || !this.ValidateRewards(item.rewards)) return false;
        data.AchievementClaimed ??= [];
        data.AchievementClaimed.push(id);
        this.GrantRewards(item.rewards);
        return true;
    }

    public static ClaimAll(): number {
        let count = 0;
        for (const item of this.Items) if (this.Claim(item.id)) count++;
        // 里程碑由宝箱逐档领取，避免一键领取让宝箱跨过多个阶段。
        return count;
    }

    public static ClaimMilestone(percent: number): boolean {
        const data = ZRSJZ_GameData.Instance;
        const config = ZRSJZ_ACHIEVEMENT_MILESTONE_CONFIG.find(item => item.percent === percent);
        if (!config || percent !== this.GetNextMilestone()
            || this.GetMilestoneState(percent) !== 'claimable' || !this.ValidateRewards(config.rewards)) return false;
        data.AchievementMilestonesClaimed ??= [];
        data.AchievementMilestonesClaimed.push(percent);
        this.GrantRewards(config.rewards);
        return true;
    }

    public static GetMilestoneState(percent: number): 'claimed' | 'locked' | 'claimable' {
        if (ZRSJZ_GameData.Instance.AchievementMilestonesClaimed?.includes(percent)) return 'claimed';
        return this.Milestones.includes(percent) && this.GetCompletionPercent() >= percent ? 'claimable' : 'locked';
    }

    /** 始终停在最早未领取的阶段，完成度增加不会使宝箱跳档。 */
    public static GetNextMilestone(): number {
        const ordered = [...this.Milestones].sort((a, b) => a - b);
        return ordered.find(value => !ZRSJZ_GameData.Instance.AchievementMilestonesClaimed?.includes(value))
            ?? ordered[ordered.length - 1];
    }

    public static DescribeRewards(rewards: readonly ZRSJZ_AchievementReward[], separator = '、'): string {
        return rewards.map(reward => {
            switch (reward.type) {
                case '钞票': return reward.count + '钞票';
                case '道具': return reward.name + '×' + reward.count;
                case '称号': return '称号·' + reward.name;
                case '头像框': return '头像框·' + reward.id;
            }
        }).join(separator);
    }

    private static ValidateRewards(rewards: readonly ZRSJZ_AchievementReward[]): boolean {
        return Array.isArray(rewards) && rewards.length > 0 && rewards.every(reward => {
            switch (reward.type) {
                case '钞票': return Number.isSafeInteger(reward.count) && reward.count > 0;
                case '道具': return Number.isSafeInteger(reward.count) && reward.count > 0 && ZRSJZ_PROP_CONFIG.has(reward.name);
                case '称号': return typeof reward.name === 'string' && reward.name.trim().length > 0;
                case '头像框': return typeof reward.id === 'string' && reward.id.trim().length > 0;
                default: return false;
            }
        });
    }

    private static GrantRewards(rewards: readonly ZRSJZ_AchievementReward[]): void {
        const data = ZRSJZ_GameData.Instance;
        data.OwnedAvatarFrames ??= ['1'];
        for (const reward of rewards) {
            switch (reward.type) {
                case '钞票': ZRSJZ_AccountService.ChangeGold(reward.count); break;
                case '道具': ZRSJZ_InventoryService.AddPropsToWarehouseByName(reward.name, reward.count); break;
                case '称号': break; // 领取记录写入后，由统一条件检查解锁。
                case '头像框': break; // 头像框按统一条件解锁，不绕过 Boss/视频条件。
            }
        }
        ZRSJZ_TitleService.SyncUnlocks(false);
        ZRSJZ_AvatarFrameService.SyncUnlocks(false);
        ZRSJZ_GameData.SaveData();
    }

    private static Add(id: string, amount = 1): void {
        if (!Number.isFinite(amount) || amount <= 0) return;
        const data = ZRSJZ_GameData.Instance;
        data.AchievementProgress ??= {};
        data.AchievementProgress[id] = Math.max(0, data.AchievementProgress[id] || 0) + amount;
        this.SyncCompleted(false);
        ZRSJZ_TitleService.SyncUnlocks(false);
        ZRSJZ_GameData.SaveData();
    }
    private static Max(id: string, value: number): void {
        if (!Number.isFinite(value)) return;
        const data = ZRSJZ_GameData.Instance;
        data.AchievementProgress ??= {};
        data.AchievementProgress[id] = Math.max(data.AchievementProgress[id] || 0, value);
        this.SyncCompleted(false);
        ZRSJZ_GameData.SaveData();
    }

    public static BattleStarted(): void {
        this.searchedBoxes.clear();
        this.battleKillStreak = 0;
        this.lowHpEnemyKillStreak = 0;
    }
    public static BattleFinished(success: boolean, value: number, seconds: number, map: string, duo: boolean, lowHp: boolean): void {
        ZRSJZ_BattlePassService.Record('battle');
        if (success) ZRSJZ_BattlePassService.Record('extract');
        this.Add('初入战场');
        if (duo) this.Max('甜蜜双排', 1);
        const data = ZRSJZ_GameData.Instance;
        data.AchievementEvacuationStreak = success ? (data.AchievementEvacuationStreak || 0) + 1 : 0;
        this.Max('不灭传说', data.AchievementEvacuationStreak);
        if (success) {
            this.Max('枪火洗礼', 1);
            this.Max('百万撤离', value);
            if (lowHp) this.Max('有惊无险', 1);
        }
        if (map.includes('沙漠')) this.Add('沙漠之狼', Math.max(0, seconds));
        ZRSJZ_GameData.SaveData();
    }
    public static PlayerDied(): void { this.battleKillStreak = 0; this.lowHpEnemyKillStreak = 0; }
    public static EnemyKilled(count: number, weapon: '枪' | '刀' | '散弹枪' | 'unknown', snowMap: boolean, lowHp: boolean): void {
        ZRSJZ_BattlePassService.Record('kill', count);
        this.Add('火力覆盖', count);
        this.Add('战场主宰', count);
        this.battleKillStreak += count;
        this.Max('无人能挡', this.battleKillStreak);
        this.lowHpEnemyKillStreak = lowHp ? this.lowHpEnemyKillStreak + count : 0;
        this.Max('绝地反击', this.lowHpEnemyKillStreak);
        if (weapon !== 'unknown') this.Add('枪械入门', count);
        if (weapon === '刀') { this.Add('刀尖起舞', count); this.Add('近战大师', count); }
        if (weapon === '散弹枪') this.Add('火力压制', count);
        if (snowMap) this.Add('雪域幽灵', count);
    }
    public static HealUsed(): void { this.Add('战地医师'); ZRSJZ_BattlePassService.Record('heal'); }
    public static ContainerSearched(id: string): void {
        if (!id || this.searchedBoxes.has(id)) return;
        this.searchedBoxes.add(id);
        ZRSJZ_BattlePassService.Record('search');
        this.Add('搜刮专家');
    }
    public static SpecialTaskCompleted(): void { this.Add('赏金猎人'); ZRSJZ_BattlePassService.Record('special'); }
    public static BombAvoided(): void { this.Add('雷区舞者'); }
}
