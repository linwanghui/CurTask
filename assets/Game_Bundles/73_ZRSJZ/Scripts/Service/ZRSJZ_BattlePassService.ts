import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { CreateBattlePassState, ZRSJZ_BATTLE_PASS_CONFIG as Config, ZRSJZ_BattlePassMetric, ZRSJZ_BattlePassPeriod, ZRSJZ_BattlePassTask, ZRSJZ_BattlePassTrack, ZRSJZ_BattlePassReward } from '../ZRSJZ_BattlePassConfig';
import { ZRSJZ_AccountService } from './ZRSJZ_AccountService';
import { ZRSJZ_MAIL_TYPE, ZRSJZ_PROP_CONFIG, ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPON_SKIN } from '../ZRSJZ_Constant';
import { ZRSJZ_FragmentService } from './ZRSJZ_FragmentService';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_MailService } from './ZRSJZ_MailService';

/** 与 UI、DLC 资源无关，任务事件在游戏场景内也会累计并持久化。 */
export class ZRSJZ_BattlePassService {
    private static SelectTaskIds(period: ZRSJZ_BattlePassPeriod, key: string): string[] {
        const tasks = [...Config[period]];
        // 以周期键作为种子：同一周期结果稳定，跨周期重新随机，避免重开界面刷任务。
        let seed = 2166136261;
        for (const char of `${period}:${key}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
        const random = (): number => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 0x100000000;
        };
        for (let i = tasks.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
        }
        return tasks.slice(0, Config.taskSelectionCount).map(task => task.id);
    }

    public static GetTasks(period: ZRSJZ_BattlePassPeriod): ZRSJZ_BattlePassTask[] {
        const ids = ZRSJZ_GameData.Instance.BattlePass?.[period]?.taskIds ?? [];
        return ids.map(id => Config[period].find(task => task.id === id)).filter((task): task is ZRSJZ_BattlePassTask => !!task);
    }

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
                state[period] = { key: keys[period], taskIds: this.SelectTaskIds(period, keys[period]), progress: {}, claimed: [] };
                changed = true;
            }
            if (!Array.isArray(state[period].taskIds) || state[period].taskIds.length !== Config.taskSelectionCount
                || state[period].taskIds.some(id => !Config[period].some(task => task.id === id))) {
                state[period].taskIds = this.SelectTaskIds(period, state[period].key || keys[period]);
                changed = true;
            }
        }
        if (state.daily.key === keys.daily) {
            for (const item of this.GetTasks('daily').filter(item => item.metric === 'login')) {
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
            for (const task of this.GetTasks(period)) {
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
        const task = this.GetTasks(period).find(item => item.id === id);
        const state = ZRSJZ_GameData.Instance.BattlePass?.[period];
        if (!task || !state) return 'locked';
        if (state.claimed.includes(id)) return 'claimed';
        return (state.progress[id] || 0) >= task.target ? 'claimable' : 'locked';
    }
    public static ClaimTask(period: ZRSJZ_BattlePassPeriod, id: string): boolean {
        this.EnsurePeriods();
        if (this.GetTaskState(period, id) !== 'claimable') return false;
        const state = ZRSJZ_GameData.Instance.BattlePass;
        const task = this.GetTasks(period).find(item => item.id === id);
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
        const props: { PropName: string; Count: number }[] = [];
        const claimed = this.ClaimRewardIntoBatch(level, track, props);
        this.DeliverProps(props);
        return claimed;
    }
    private static ClaimRewardIntoBatch(level: number, track: ZRSJZ_BattlePassTrack, props: { PropName: string; Count: number }[]): boolean {
        this.EnsurePeriods();
        if (this.GetRewardState(level, track) !== 'claimable') return false;
        const reward = this.Rewards(track).find(item => item.level === level);
        if (!reward || !Number.isSafeInteger(reward.count) || reward.count <= 0
            || (reward.type === 'prop' && !ZRSJZ_PROP_CONFIG.has(reward.name))
            || (reward.type === 'fragment' && !ZRSJZ_FragmentService.IsFragment(reward.name))
            || (reward.type === 'weaponSkin' && (!reward.weaponName
                || !ZRSJZ_WEAPON_SKIN.get(reward.weaponName)?.some(skin => skin.Name === reward.name)))
            || (reward.type === 'heroSkin' && (!reward.roleName || !ZRSJZ_SKIN_CONFIG.has(reward.name)
                || !ZRSJZ_ROLE_CONFIG.get(reward.roleName)?.Skin.includes(reward.name)))) return false;
        // 先记录领取标记，奖励服务同步保存时包含该标记，防止连点重复发奖。
        const state = ZRSJZ_GameData.Instance.BattlePass;
        (track === 'advanced' ? state.advancedClaimed : state.claimed).push(level);
        if (reward.type === 'gold') ZRSJZ_AccountService.ChangeGold(reward.count);
        else if (reward.type === 'fragment') {
            // 在实际入账分支再次收窄字符串类型，避免配置数据绕过碎片种类约束。
            if (!ZRSJZ_FragmentService.IsFragment(reward.name)) return false;
            ZRSJZ_FragmentService.Credit(reward.name, reward.count, false);
        }
        else if (reward.type === 'weaponSkin') ZRSJZ_AccountService.AddWeaponSkin(reward.weaponName, reward.name);
        else if (reward.type === 'heroSkin') ZRSJZ_AccountService.AddSkin(reward.roleName, reward.name);
        else props.push({ PropName: reward.name, Count: reward.count });
        ZRSJZ_GameData.SaveData();
        return true;
    }
    private static DeliverProps(props: { PropName: string; Count: number }[]): void {
        if (!props.length) return;
        const counts = new Map<string, number>();
        for (const prop of props) counts.set(prop.PropName, (counts.get(prop.PropName) ?? 0) + prop.Count);
        const awards = [...counts].map(([PropName, Count]) => ({ PropName, Count }));
        const receiver = ZRSJZ_UIManager.Instance;
        if (receiver?.ReceivePropAwards) {
            // One popup is one delivery batch: all overflow becomes a single mail.
            void receiver.ReceivePropAwards(awards, ZRSJZ_MAIL_TYPE.仓库已满).catch(error => {
                console.error('[BattlePass] 奖励入库失败，已改发邮件', error);
                ZRSJZ_MailService.AddMail(ZRSJZ_MAIL_TYPE.仓库已满, awards);
            });
        } else ZRSJZ_MailService.AddMail(ZRSJZ_MAIL_TYPE.仓库已满, awards);
    }
    public static Rewards(track: ZRSJZ_BattlePassTrack) { return track === 'advanced' ? Config.advancedRewards : Config.rewards; }
    public static HasClaimableTasks(period?: ZRSJZ_BattlePassPeriod): boolean {
        this.EnsurePeriods();
        const periods: ZRSJZ_BattlePassPeriod[] = period ? [period] : ['daily', 'weekly'];
        return periods.some(value => this.GetTasks(value)
            .some(task => this.GetTaskState(value, task.id) === 'claimable'));
    }
    public static HasClaimableRewards(): boolean {
        this.EnsurePeriods();
        for (const track of ['normal', 'advanced'] as const)
            if (this.Rewards(track).some(reward => this.GetRewardState(reward.level, track) === 'claimable')) return true;
        return false;
    }
    /** 主页红点：任一任务经验或等级奖励可领取时显示。 */
    public static HasClaimable(): boolean {
        return this.HasClaimableTasks() || this.HasClaimableRewards();
    }
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
        return this.ClaimAllRewards().length;
    }
    /** Returns exactly the claimed rewards for one popup and submits one inventory batch. */
    public static ClaimAllRewards(): ZRSJZ_BattlePassReward[] {
        const claimed: ZRSJZ_BattlePassReward[] = [];
        const props: { PropName: string; Count: number }[] = [];
        for (const track of ['normal', 'advanced'] as const)
            for (const reward of this.Rewards(track))
                if (this.ClaimRewardIntoBatch(reward.level, track, props)) claimed.push(reward);
        this.DeliverProps(props);
        return claimed;
    }
}
