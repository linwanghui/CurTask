import type { ZRSJZ_UpgradeMaterial } from './ZRSJZ_Constant';

export type EnhancementStat = '技能伤害' | '技能冷却' | '换弹速度' | '大红掉落概率' | '攻击' | '生命' | '移速' | '防御';
export interface EnhancementNode {
    ID: string; Level: number; Special: boolean; Stat: EnhancementStat;
    Value: number; Gold: number; Materials: ZRSJZ_UpgradeMaterial[];
}
export const ZRSJZ_ENHANCEMENT_MAX_LEVEL = 50;
export const ZRSJZ_ENHANCEMENT_STATS: Record<EnhancementStat, { Icon: string; Suffix: string; Description: string }> = {
    '攻击': { Icon: '攻击', Suffix: '%', Description: '按基础伤害百分比提高玩家枪械和近战攻击。' },
    '生命': { Icon: '生命', Suffix: '%', Description: '按基础生命百分比提高玩家生命上限，进入战斗时生效。' },
    '移速': { Icon: '移速', Suffix: '%', Description: '提高玩家移动速度。' },
    '防御': { Icon: '防御', Suffix: '%', Description: '按百分比降低玩家受到的伤害；非零攻击至少造成1点伤害。' },
    '技能伤害': { Icon: '技能伤害', Suffix: '%', Description: '提高玩家激光、轰炸等伤害技能的伤害。' },
    '技能冷却': { Icon: '技能冷却', Suffix: '%', Description: '缩短玩家主动技能冷却时间。' },
    '换弹速度': { Icon: '换弹速度', Suffix: '%', Description: '提高玩家换弹速度。换弹时间＝基础时间÷(1＋速度加成)。' },
    '大红掉落概率': { Icon: '掉率', Suffix: '%', Description: '相对提高局内红色掉落概率；基础10%加成2%后为10.2%，不影响盲盒。' },
};

// ID 发布后保持稳定。主路线逐级解锁，特殊节点可在达到等级后单独购买。
const normal: [EnhancementStat, number][] = [
    ['技能伤害', 3], ['技能冷却', 2], ['生命', 3], ['攻击', 2], ['防御', 2],
    ['移速', 2], ['生命', 3], ['攻击', 2], ['技能伤害', 3], ['防御', 2],
];
const materialTiers: readonly string[][] = [
    // 每档覆盖 5 级；档内轮换六种物品，相邻等级不会一直要求同一对材料。
    ['切割刀', '黑色手表', '八宝粥', '核桃', '哑铃', '营养罐头'],
    ['苹果', '地图', '量子U盘', '剪刀', '工业图纸', '沙袋'],
    ['无线便携电钻', '手雷', '手套', '太阳能板', '鱼子酱', '高精数显卡尺'],
    ['封存音源卫', '电动马达', '古玩钱币', '镜子', '香槟', '脑机数据'],
    ['黑咖啡', '军用电话', '机器人', '汽车燃油', '金玫瑰', '磁轴键盘'],
    ['化石', '白金鸟蛋', '黄金方苹果', '实验数据', '曼德尔', '七彩鸟蛋'],
    ['高速阵列', '极品平安果', '万金泪冠', '金条', '钻石级鱼子酱', '极品大红袍茶'],
    ['劳力士', '食物粉碎机', '纵横', '终端', '扫地机器', '野生狗奶'],
    ['军用地图匣', '外星人笔记本', '炮弹', '万金', '刀片服务器', '供能单元'],
    ['显卡', '留声机', '军用电台', '装甲车电池', '信息终端', '玄武'],
];
export const ZRSJZ_ENHANCEMENT_NODES: readonly EnhancementNode[] = Array.from(
    { length: ZRSJZ_ENHANCEMENT_MAX_LEVEL }, (_, i): EnhancementNode[] => {
        const level = i + 1, tier = Math.floor(i / 5);
        const cost = (special: boolean): Pick<EnhancementNode, 'Gold' | 'Materials'> => {
            const pool = materialTiers[tier];
            const levelInTier = i % 5;
            const offset = (levelInTier + (special ? 3 : 0)) % pool.length;
            return {
                Gold: Math.round((10000 + 2500 * level * level) * (special ? 1.5 : 1)),
                Materials: [pool[offset], pool[(offset + 1) % pool.length]].map(PropName => ({
                    PropName,
                    Count: 1 + Math.floor(tier / 3) + (special ? 1 : 0),
                })),
            };
        };
        const [Stat, Value] = normal[i % normal.length];
        const nodes: EnhancementNode[] = [{ ID: `main_${level}`, Level: level, Special: false, Stat, Value, ...cost(false) }];
        if (level % 5 === 0) nodes.push({ ID: `special_${level}`, Level: level, Special: true,
            Stat: level % 10 === 5 ? '大红掉落概率' : '换弹速度',
            Value: level % 10 === 5 ? 2 : 5, ...cost(true) });
        return nodes;
    },
).reduce((all, row) => all.concat(row), []);

/** 仅计算迁移值，不读单例、不触发存储；兼容只有 FiringRangeLevel 的早期版本。 */
export function MigrateLegacyEnhancement(saved: any): { Level: number; Specials: string[] } {
    const safe = (value: unknown): number => typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.min(5, Math.floor(value))) : 0;
    const level = safe(saved.FacilityLevel?.['靶场'] ?? saved.FiringRangeLevel)
        + safe(saved.FacilityLevel?.['研究所']) + safe(saved.FacilityLevel?.['健身']);
    return { Level: level, Specials: ZRSJZ_ENHANCEMENT_NODES.filter(n => n.Special && n.Level <= level).map(n => n.ID) };
}
