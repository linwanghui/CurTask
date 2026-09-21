import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { CreateBattlePassState, ZRSJZ_BATTLE_PASS_CONFIG as Config, ZRSJZ_BattlePassMetric, ZRSJZ_BattlePassPeriod, ZRSJZ_BattlePassTrack } from '../ZRSJZ_BattlePassConfig';
import { ZRSJZ_AccountService } from './ZRSJZ_AccountService';
import { ZRSJZ_InventoryService } from './ZRSJZ_InventoryService';
import { ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';

/** 与 UI、DLC 资源无关，任务事件在游戏场景内也会累计并持久化。 */
export class ZRSJZ_BattlePassService {
    public static PeriodKeys(now = Date.now()): { daily: string; weekly: string } {
        const shifted = new Date(now + (Config.timezoneOffsetMinutes - Config.dailyRefreshHour * 60) * 60000);
        const daily = shifted.toISOString().slice(0, 10);
        shifted.setUTCDate(shifted.getUTCDate() - (shifted.getUTCDay() - Config.weeklyRefreshDay + 7) % 7);
        return { daily, weekly: shifted.toISOString().slice(0, 10) };
    }

    public static EnsurePeriods(now = Date.now()): boolean {
        const data = ZRSJZ_GameData.Instance;
        let changed = !data.BattlePass;
        data.BattlePass ??= CreateBattlePassState();
        const state = data.BattlePass;
        const keys = this.PeriodKeys(now);
        for (const period of ['daily', 'weekly'] as const) {
            // 时钟回拨不会重新生成已经经过的周期，以免反复领奖。
            if (!state[period] || keys[period] > state[period].key) {
                state[period] = { key: keys[period], progress: {}, claimed: [] };
                changed = true;
            }
        }
        if (state.daily.key === keys.daily) {
            for (const item of Config.daily.filter(item => item.metric === 'login')) {
                if (!state.daily.progress[item.id]) { state.daily.progress[item.id] = 1; changed = true; }
            }
        }
        if (changed) ZRSJZ_GameData.SaveData();
        return changed;
    }

    public static Record(metric: ZRSJZ_BattlePassMetric, amount = 1): void {
        if (!Number.isSafeInteger(amount) || amount <= 0) return;
        this.EnsurePeriods();
        const state = ZRSJZ_GameData.Instance.BattlePass;
        const keys = this.PeriodKeys();
        let changed = false;
        for (const period of ['daily', 'weekly'] as const) {
            if (state[period].key !== keys[period]) continue;
            for (const task of Config[period]) {
                if (task.metric !== metric || state[period].claimed.includes(task.id)) continue;
                const previous = state[period].progress[task.id] || 0;
                const next = Math.min(task.target, previous + amount);
                if (next !== previous) { state[period].progress[task.id] = next; changed = true; }
            }
        }
        if (changed) ZRSJZ_GameData.SaveData();
    }

    public static GetLevel(): number {
        return Math.min(Config.maxLevel, Math.floor((ZRSJZ_GameData.Instance.BattlePass?.exp || 0) / Config.expPerLevel));
    }
    public static GetTaskState(period: ZRSJZ_BattlePassPeriod, id: string): 'locked' | 'claimable' | 'claimed' {
        const task = Config[period].find(item => item.id === id);
        const state = ZRSJZ_GameData.Instance.BattlePass?.[period];
        if (!task || !state) return 'locked';
        if (state.claimed.includes(id)) return 'claimed';
        return (state.progress[id] || 0) >= task.target ? 'claimable' : 'locked';
    }
    public static ClaimTask(period: ZRSJZ_BattlePassPeriod, id: string): boolean {
        this.EnsurePeriods();
        if (this.GetTaskState(period, id) !== 'claimable') return false;
        const state = ZRSJZ_GameData.Instance.BattlePass;
        const task = Config[period].find(item => item.id === id);
        state[period].claimed.push(id);
        state.exp = Math.min(Config.maxLevel * Config.expPerLevel, state.exp + task.exp);
        ZRSJZ_GameData.SaveData();
        return true;
    }
    public static GetRewardState(level: number, track: ZRSJZ_BattlePassTrack = 'normal'): 'locked' | 'claimable' | 'claimed' {
        if (!this.Rewards(track).some(item => item.level === level)) return 'locked';
        const state = ZRSJZ_GameData.Instance.BattlePass;
        if (track === 'advanced' && !state?.advancedUnlocked) return 'locked';
        if ((track === 'advanced' ? state?.advancedClaimed : state?.claimed)?.includes(level)) return 'claimed';
        return this.GetLevel() >= level ? 'claimable' : 'locked';
    }
    public static ClaimReward(level: number, track: ZRSJZ_BattlePassTrack = 'normal'): boolean {
        this.EnsurePeriods();
        if (this.GetRewardState(level, track) !== 'claimable') return false;
        const reward = this.Rewards(track).find(item => item.level === level);
        if (!reward || !Number.isSafeInteger(reward.count) || reward.count <= 0
            || (reward.type === 'prop' && !ZRSJZ_PROP_CONFIG.has(reward.name))) return false;
        // 先记录领取标记，奖励服务同步保存时包含该标记，防止连点重复发奖。
        const state = ZRSJZ_GameData.Instance.BattlePass;
        (track === 'advanced' ? state.advancedClaimed : state.claimed).push(level);
        if (reward.type === 'gold') ZRSJZ_AccountService.ChangeGold(reward.count);
        else ZRSJZ_InventoryService.AddPropsToWarehouseByName(reward.name, reward.count);
        ZRSJZ_GameData.SaveData();
        return true;
    }
    public static Rewards(track: ZRSJZ_BattlePassTrack) { return track === 'advanced' ? Config.advancedRewards : Config.rewards; }
    /** 一次性回调，只交给激励视频成功事件调用。 */
    public static CreateVideoReward(kind: 'advanced' | 'level'): (() => boolean) | null {
        this.EnsurePeriods();
        const state = ZRSJZ_GameData.Instance.BattlePass;
        if (kind === 'advanced' ? state.advancedUnlocked : this.GetLevel() >= Config.maxLevel) return null;
        let used = false;
        return () => {
            if (used) return false;
            used = true;
            const current = ZRSJZ_GameData.Instance.BattlePass;
            if (kind === 'advanced') {
                if (current.advancedUnlocked) return false;
                current.advancedUnlocked = true;
            } else {
                if (this.GetLevel() >= Config.maxLevel) return false;
                current.exp = Math.min(Config.maxLevel * Config.expPerLevel, current.exp + Config.expPerLevel);
            }
            ZRSJZ_GameData.SaveData();
            return true;
        };
    }
    public static ClaimAll(): number {
        let count = 0;
        for (const track of ['normal', 'advanced'] as const)
            for (const reward of this.Rewards(track)) if (this.ClaimReward(reward.level, track)) count++;
        return count;
    }
}
