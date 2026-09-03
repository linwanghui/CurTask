export type ZRSJZ_BoxroomCategory = "工艺品" | "食用品" | "收藏品" | "高科技";

export const ZRSJZ_BOXROOM_CATEGORIES: readonly ZRSJZ_BoxroomCategory[] = [
    "工艺品",
    "食用品",
    "收藏品",
    "高科技",
];

/** 每次升到对应等级时需要放入的同名道具数量。 */
export const ZRSJZ_BOXROOM_LEVEL_COST: readonly number[] = [1, 3, 5];

export type ZRSJZ_BoxroomAttribute = "生命" | "近战伤害" | "枪械伤害";

/** 使用整数基点保存百分比：1 基点 = 0.01%。 */
export const ZRSJZ_BOXROOM_LEVEL_BONUS_BASIS_POINT: readonly number[] = [
    0,
    50,
    110,
    180,
];

const PROP_ATTRIBUTE = new Map<string, ZRSJZ_BoxroomAttribute>([
    ["各种红蛋", "生命"],
    ["咖啡豆", "生命"],
    ["万金泪冠", "生命"],
    ["曼德尔", "生命"],
    ["呼吸机", "生命"],
    ["欧洲之心", "生命"],
    ["医疗机器人", "生命"],

    ["劳力士", "近战伤害"],
    ["金玫瑰", "近战伤害"],
    ["步战车", "近战伤害"],
    ["坦克", "近战伤害"],
    ["浮力机器设备", "近战伤害"],

    ["155炮弹", "枪械伤害"],
    ["供能单元", "枪械伤害"],
    ["装甲车电池", "枪械伤害"],
    ["反应炉", "枪械伤害"],
    ["火箭燃料", "枪械伤害"],
]);

const FOOD_PROPS = new Set<string>([
    "八宝粥", "柠檬茶", "苹果", "鱼子酱", "香槟", "各种红蛋", "咖啡豆",
    "七彩鸟蛋", "特供香槟", "彩金色鲤鱼", "极品平安果", "特供咖啡豆", "白金鸟蛋",
    "红珊瑚鲤鱼", "钻石级鱼子酱", "黄金方苹果", "极品大红袍茶", "野生狗奶",
]);

const COLLECTION_PROPS = new Set<string>([
    "黑色手表", "地图", "怀表", "化石", "古玩钱币", "镜子", "纵横", "金条",
    "万金泪冠", "劳力士", "曼德尔", "万金", "封存音源卫", "金玫瑰", "留声机",
    "瞪铃", "摄影机", "阿萨拉时尚周刊", "克小圈玩偶", "天圆地方", "麦小蛋玩偶",
    "烽火奖杯", "玄武", "欧洲之心", "勇士半身像", "八音盒", "半身像",
    "印象派名画", "黄金鳄鱼头",
    "光头弹药箱", "战神勋章", "混乱勋章", "裂空之弩", "高科技护目镜",
]);

const HIGH_TECH_PROPS = new Set<string>([
    "实验数据", "无线便携电钻", "量子U盘", "脑机数据", "高速阵列", "高精数显卡尺",
    "太阳能板", "扫地机器", "刀片服务器", "显卡", "电动马达", "终端", "外星人笔记本",
    "供能单元", "装甲车电池", "军用电话", "笔记本电脑", "云存储", "信息大终端",
    "军用电台", "动力电池组", "信息终端", "除颤器", "飞行记录仪", "反应炉",
    "呼吸机", "吸尘器", "协议箱", "无人机", "机器人", "卫星锅", "ECMO",
    "军用雷达", "医疗机器人", "浮力机器设备",
]);

/**
 * 分类只属于收藏室远程包。未单独配置的“物品”会归入工艺品，
 * 因此主包以后新增物品时不会从收藏室中消失。
 */
export function GetBoxroomCategory(propName: string): ZRSJZ_BoxroomCategory {
    if (FOOD_PROPS.has(propName)) return "食用品";
    if (COLLECTION_PROPS.has(propName)) return "收藏品";
    if (HIGH_TECH_PROPS.has(propName)) return "高科技";
    return "工艺品";
}

export function GetBoxroomAttribute(propName: string): ZRSJZ_BoxroomAttribute {
    return PROP_ATTRIBUTE.get(propName) ?? "生命";
}

export function GetBoxroomBonusBasisPoint(level: number, propCount: number = 15): number {
    const safeLevel = Math.max(0, Math.min(3, Math.floor(level)));
    // 红色收藏品继续增加时自动等比压缩单件收益，保证全部满级总和不超过 30%。
    const maxBasisPoint = Math.min(180, Math.floor(3000 / Math.max(1, propCount)));
    return Math.floor(
        ZRSJZ_BOXROOM_LEVEL_BONUS_BASIS_POINT[safeLevel] * maxBasisPoint / 180
    );
}

export function FormatBoxroomPercent(basisPoint: number): string {
    return `${(Math.max(0, Math.floor(basisPoint)) / 100).toFixed(2)}%`;
}
