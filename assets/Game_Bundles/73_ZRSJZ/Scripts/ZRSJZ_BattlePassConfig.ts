/** 战令的等级、奖励、日/周任务和刷新规则统一在此配置。 */
export type ZRSJZ_BattlePassMetric = 'login' | 'battle' | 'extract' | 'kill' | 'search' | 'heal' | 'special';
export type ZRSJZ_BattlePassPeriod = 'daily' | 'weekly';
export type ZRSJZ_BattlePassTrack = 'normal' | 'advanced';
export interface ZRSJZ_BattlePassTask {
    id: string; name: string; description: string; metric: ZRSJZ_BattlePassMetric; target: number; exp: number;
}
export interface ZRSJZ_BattlePassReward {
    level: number; type: 'gold' | 'prop'; name: string; count: number; special: boolean;
}
export interface ZRSJZ_BattlePassTaskState {
    key: string; progress: Record<string, number>; claimed: string[];
}
export interface ZRSJZ_BattlePassState {
    exp: number; claimed: number[]; advancedClaimed: number[]; advancedUnlocked: boolean;
    daily: ZRSJZ_BattlePassTaskState; weekly: ZRSJZ_BattlePassTaskState;
}
export function CreateBattlePassState(): ZRSJZ_BattlePassState {
    return { exp: 0, claimed: [], advancedClaimed: [], advancedUnlocked: false, daily: { key: '', progress: {}, claimed: [] }, weekly: { key: '', progress: {}, claimed: [] } };
}

const specialProps = ['显卡', '留声机', '动力电池组', '军用雷达', '医疗机器人'];
export const ZRSJZ_BATTLE_PASS_CONFIG = {
    name: '火线战令',
    maxLevel: 50,
    expPerLevel: 100,
    groupSize: 10,
    timezoneOffsetMinutes: 480, // 北京时间；不受设备时区设置影响。
    dailyRefreshHour: 0,
    weeklyRefreshDay: 1, // 0=周日，1=周一。
    progressAnimationSeconds: 0.8, // 每段经验条的缓动时间；跨级依次播放。
    advancedRewards: Array.from({ length: 50 }, (_, index): ZRSJZ_BattlePassReward => {
        const level = index + 1;
        if (level % 10 === 0) return { level, type: 'prop', name: specialProps[level / 10 - 1], count: 3, special: true };
        if (level % 5 === 0) return { level, type: 'prop', name: '低级房卡', count: 3, special: false };
        return { level, type: 'gold', name: '钞票', count: (5000 + Math.floor(index / 10) * 5000) * 3, special: false };
    }),
    rewards: Array.from({ length: 50 }, (_, index): ZRSJZ_BattlePassReward => {
        const level = index + 1;
        if (level % 10 === 0) return { level, type: 'prop', name: specialProps[level / 10 - 1], count: 1, special: true };
        if (level % 5 === 0) return { level, type: 'prop', name: '低级房卡', count: 1, special: false };
        return { level, type: 'gold', name: '钞票', count: 5000 + Math.floor(index / 10) * 5000, special: false };
    }),
    daily: [
        { id: 'd_login', name: '每日集结', description: '今日登录游戏', metric: 'login', target: 1, exp: 20 },
        { id: 'd_battle', name: '行动开始', description: '完成 1 场对局', metric: 'battle', target: 1, exp: 30 },
        { id: 'd_kill', name: '火力训练', description: '累计击败 15 名敌人', metric: 'kill', target: 15, exp: 30 },
        { id: 'd_search', name: '物资搜寻', description: '搜索 8 个容器', metric: 'search', target: 8, exp: 20 },
        { id: 'd_extract', name: '平安归来', description: '成功撤离 1 次', metric: 'extract', target: 1, exp: 50 },
    ] as ZRSJZ_BattlePassTask[],
    weekly: [
        { id: 'w_battle', name: '久经沙场', description: '完成 10 场对局', metric: 'battle', target: 10, exp: 150 },
        { id: 'w_kill', name: '战场精英', description: '累计击败 100 名敌人', metric: 'kill', target: 100, exp: 200 },
        { id: 'w_search', name: '搜刮能手', description: '搜索 50 个容器', metric: 'search', target: 50, exp: 150 },
        { id: 'w_extract', name: '撤离专家', description: '成功撤离 5 次', metric: 'extract', target: 5, exp: 250 },
        { id: 'w_heal', name: '战地支援', description: '有效治疗 20 次', metric: 'heal', target: 20, exp: 100 },
        { id: 'w_special', name: '特别行动', description: '完成 3 个局内特殊任务', metric: 'special', target: 3, exp: 150 },
    ] as ZRSJZ_BattlePassTask[],
};
