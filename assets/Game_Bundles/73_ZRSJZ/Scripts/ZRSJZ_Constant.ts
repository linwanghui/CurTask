//#region 常量
//格子大小
export const ZRSJZ_GRID_SIZE = 132;//格子大小
export const ZRSJZ_GRID_INTERVAL = 5;//格子间隔
// 单个弹药格最多可堆叠的子弹数量。
export const ZRSJZ_AMMO_MAX_COUNT = 60;

//界面路径
export enum ZRSJZ_PANEL {
    选关界面 = "73_ZRSJZ/Prefabs/Panel/选关界面",
    商店界面 = "73_ZRSJZ/Prefabs/Panel/商店界面",
    仓库界面 = "73_ZRSJZ/Prefabs/Panel/仓库界面",
    角色界面 = "73_ZRSJZ/Prefabs/Panel/角色界面",
    作弊界面 = "73_ZRSJZ/Prefabs/Panel/作弊界面",
    道具弹窗 = "73_ZRSJZ/Prefabs/Panel/道具弹窗",
    背包弹窗 = "73_ZRSJZ/Prefabs/Panel/背包弹窗",
    物资弹窗 = "73_ZRSJZ/Prefabs/Panel/物资弹窗",
    地图弹窗 = "73_ZRSJZ/Prefabs/Panel/地图弹窗",
    暂停界面 = "73_ZRSJZ/Prefabs/Panel/暂停界面",
    失败弹窗 = "73_ZRSJZ/Prefabs/Panel/失败弹窗",
    胜利弹窗 = "73_ZRSJZ/Prefabs/Panel/胜利弹窗",
    强化界面 = "73_ZRSJZ/Prefabs/Panel/强化界面",
    密码箱弹窗 = "73_ZRSJZ/Prefabs/Panel/密码箱弹窗",
    破壁行动密码弹窗 = "73_ZRSJZ/Prefabs/Panel/破壁行动密码弹窗",
    医疗箱弹窗 = "73_ZRSJZ/Prefabs/Panel/医疗箱弹窗",
    死亡弹窗 = "73_ZRSJZ/Prefabs/Panel/死亡弹窗",
    双人模式死亡弹窗 = "73_ZRSJZ/Prefabs/Panel/双人模式死亡弹窗",
    死亡状态弹窗 = "73_ZRSJZ/Prefabs/Panel/死亡状态弹窗",
    加载界面 = "73_ZRSJZ/Prefabs/Panel/加载界面",
    签到弹窗 = "73_ZRSJZ/Prefabs/Panel/签到弹窗",
    获取金币弹窗 = "73_ZRSJZ/Prefabs/Panel/获取金币弹窗",
    设置界面 = "73_ZRSJZ/Prefabs/Panel/设置界面",
    购买子弹弹窗 = "73_ZRSJZ/Prefabs/Panel/购买子弹弹窗",
    解锁仓库弹窗 = "73_ZRSJZ/Prefabs/Panel/解锁仓库弹窗",
    新手引导弹窗 = "73_ZRSJZ/Prefabs/Panel/新手引导弹窗",
    主线任务界面 = "73_ZRSJZ/Prefabs/Panel/主线任务界面",
    获取奖励弹窗 = "73_ZRSJZ/Prefabs/Panel/获取奖励弹窗",
    涨经验弹窗 = "73_ZRSJZ/Prefabs/Panel/涨经验弹窗",
    击败弹窗 = "73_ZRSJZ/Prefabs/Panel/击败弹窗",
    特别行动弹窗 = "73_ZRSJZ/Prefabs/Panel/特别行动弹窗",
    等级弹窗 = "73_ZRSJZ/Prefabs/Panel/等级弹窗",
    助战礼包弹窗 = "73_ZRSJZ/Prefabs/Panel/助战礼包弹窗",
    弹药大礼包弹窗 = "73_ZRSJZ/Prefabs/Panel/弹药大礼包弹窗",
    增强针弹窗 = "73_ZRSJZ/Prefabs/Panel/增强针弹窗",
    增强针替换弹窗 = "73_ZRSJZ/Prefabs/Panel/增强针替换弹窗",
    背包扩容弹窗 = "73_ZRSJZ/Prefabs/Panel/背包扩容弹窗",
    邮件界面 = "73_ZRSJZ/Prefabs/Panel/邮件界面",
    收藏室界面 = "73_ZRSJZ_DLC/Prefabs/Panel/收藏室界面",
    盲盒界面 = "73_ZRSJZ_DLC/Prefabs/Panel/盲盒界面",
    避难所_升级界面 = "73_ZRSJZ_DLC_BNS/Prefabs/Panel/ZRSJZ_BNS_UpLevelPanel",
}

//物理层级
export enum ZRSJZ_TIER {
    地形 = 1 << 0,
    玩家 = 1 << 1,
    敌人 = 1 << 2,
    场景物 = 1 << 3,
    玩家子弹 = 1 << 4,
    敌人子弹 = 1 << 5,
};

//#region 道具配置
//装备品质
export enum ZRSJZ_PROP_QUALITY {
    白色 = "白色格子",
    绿色 = "绿色格子",
    蓝色 = "蓝色格子",
    紫色 = "紫色格子",
    金色 = "金色格子",
    红色 = "红色格子",
}

//格子类型
export enum ZRSJZ_GRID_TYPE {
    _1x1 = "1_1",
    _1x2 = "1_2",
    _2x2 = "2_2",
    _2x3 = "2_3",
}

/**
 * 搜索物资出售价格倍率。
 * 房卡、弹药和穿戴装备保持原价，只调整 PropType 为“物品”的战利品。
 */
const ZRSJZ_SEARCH_LOOT_PRICE_MULTIPLIER: Readonly<Record<ZRSJZ_PROP_QUALITY, number>> = {
    [ZRSJZ_PROP_QUALITY.白色]: 1,
    [ZRSJZ_PROP_QUALITY.绿色]: 3,
    [ZRSJZ_PROP_QUALITY.蓝色]: 3,
    [ZRSJZ_PROP_QUALITY.紫色]: 3,
    [ZRSJZ_PROP_QUALITY.金色]: 4,
    [ZRSJZ_PROP_QUALITY.红色]: 4,
};

/**
 * 装备配置
 * @param Name 名称
 * @param Description 道具描述
 * @param GridType 格子类型
 * @param Quality 品质
 * @param PropType 物品类别 --装备（头盔/防弹衣/背包）、武器（枪/刀）、弹药、物品(房卡/物品))
 * @param UnitPrice 单价 
 * @param MaxCount 最多数量
 */
export const ZRSJZ_PROP_CONFIG: Map<string, {
    Name: string,
    Description?: string,
    Quality: ZRSJZ_PROP_QUALITY,
    GridType: ZRSJZ_GRID_TYPE,
    PropType: string,
    UnitPrice: number,
    MaxCount: number,
}> = new Map([
    //1x1 --  白
    ["八宝粥", { Name: "八宝粥", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 2300, MaxCount: 1 }],
    ["切割刀", { Name: "切割刀", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 2100, MaxCount: 1 }],
    ["黑色手表", { Name: "黑色手表", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 2200, MaxCount: 1 }],
    ["核桃", { Name: "核桃", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 2300, MaxCount: 1 }],
    //1x1 --  绿
    ["剪刀", { Name: "剪刀", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 6600, MaxCount: 1 }],
    ["地图", { Name: "地图", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 5400, MaxCount: 1 }],
    ["苹果", { Name: "苹果", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 4400, MaxCount: 1 }],
    ["量子U盘", { Name: "量子U盘", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 5600, MaxCount: 1 }],
    //1x1 --  蓝
    ["手套", { Name: "手套", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 12000, MaxCount: 1 }],
    ["无线便携电钻", { Name: "无线便携电钻", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 11000, MaxCount: 1 }],
    ["手雷", { Name: "手雷", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 11000, MaxCount: 1 }],
    ["鱼子酱", { Name: "鱼子酱", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 13000, MaxCount: 1 }],
    //1x1 --  紫
    ["柠檬茶", { Name: "柠檬茶", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 220000, MaxCount: 1 }],
    ["古玩钱币", { Name: "古玩钱币", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 29000, MaxCount: 1 }],
    ["镜子", { Name: "镜子", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 29000, MaxCount: 1 }],
    ["香槟", { Name: "香槟", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 36000, MaxCount: 1 }],
    //1x1 --  金
    ["脑机数据", { Name: "脑机数据", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 46000, MaxCount: 1 }],
    ["怀表", { Name: "怀表", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 52000, MaxCount: 1 }],
    //1x1 --  红
    ["纵横", { Name: "纵横", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 250000, MaxCount: 1 }],
    ["金条", { Name: "金条", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 220000, MaxCount: 1 }],
    ["高速阵列", { Name: "高速阵列", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 210000, MaxCount: 1 }],
    ["化石", { Name: "化石", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 180000, MaxCount: 1 }],
    ["实验数据", { Name: "实验数据", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 190000, MaxCount: 1 }],
    ["万金泪冠", { Name: "万金泪冠", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 218000, MaxCount: 1 }],
    ["劳力士", { Name: "劳力士", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 236000, MaxCount: 1 }],
    ["曼德尔", { Name: "曼德尔", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 194000, MaxCount: 1 }],
    ["白金鸟蛋", { Name: "白金鸟蛋", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 184000, MaxCount: 1 }],
    ["极品平安果", { Name: "极品平安果", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 214000, MaxCount: 1 }],
    ["七彩鸟蛋", { Name: "七彩鸟蛋", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 203800, MaxCount: 1 }],
    ["钻石级鱼子酱", { Name: "钻石级鱼子酱", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 223800, MaxCount: 1 }],
    ["黄金方苹果", { Name: "黄金方苹果", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 189000, MaxCount: 1 }],
    ["极品大红袍茶", { Name: "极品大红袍茶", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 232210, MaxCount: 1 }],
    ["野生狗奶", { Name: "野生狗奶", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 282100, MaxCount: 1 }],

    //1x2 --  白
    ["哑铃", { Name: "哑铃", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 3600, MaxCount: 1 }],
    ["营养罐头", { Name: "营养罐头", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 4000, MaxCount: 1 }],
    //1x2 --  绿
    ["工业图纸", { Name: "工业图纸", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 7100, MaxCount: 1 }],
    ["沙袋", { Name: "沙袋", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 7200, MaxCount: 1 }],
    //1x2 --  蓝
    ["太阳能板", { Name: "太阳能板", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 12000, MaxCount: 1 }],
    ["高精数显卡尺", { Name: "高精数显卡尺", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 18000, MaxCount: 1 }],
    //1x2 --  紫
    ["封存音源卫", { Name: "封存音源卫", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 25000, MaxCount: 1 }],
    ["电动马达", { Name: "电动马达", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 28000, MaxCount: 1 }],
    //1x2 --  金
    ["磁轴键盘", { Name: "磁轴键盘", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 130000, MaxCount: 1 }],
    ["金玫瑰", { Name: "金玫瑰", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 120000, MaxCount: 1 }],
    //1x2 --  红
    ["终端", { Name: "终端", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 250000, MaxCount: 1 }],
    ["扫地机器", { Name: "扫地机器", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 280000, MaxCount: 1 }],
    ["军用地图匣", { Name: "军用地图匣", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 310000, MaxCount: 1 }],
    ["外星人笔记本", { Name: "外星人笔记本", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 330000, MaxCount: 1 }],
    ["炮弹", { Name: "炮弹", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 350000, MaxCount: 1 }],
    ["万金", { Name: "万金", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 400000, MaxCount: 1 }],
    ["刀片服务器", { Name: "刀片服务器", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 410000, MaxCount: 1 }],
    ["显卡", { Name: "显卡", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 420000, MaxCount: 1 }],
    ["各种红蛋", { Name: "各种红蛋", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 500000, MaxCount: 1 }],
    ["155炮弹", { Name: "155炮弹", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 420000, MaxCount: 1 }],
    ["供能单元", { Name: "供能单元", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 412000, MaxCount: 1 }],
    ["装甲车电池", { Name: "装甲车电池", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 476000, MaxCount: 1 }],
    ["特供香槟", { Name: "特供香槟", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 483000, MaxCount: 1 }],
    ["彩金色鲤鱼", { Name: "彩金色鲤鱼", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 498000, MaxCount: 1 }],
    //2x2 --  白
    ["水泥石砖", { Name: "水泥石砖", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 5000, MaxCount: 1 }],
    ["垃圾桶", { Name: "垃圾桶", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 4400, MaxCount: 1 }],
    //2x2 --  绿
    ["阿萨拉时尚周刊", { Name: "阿萨拉时尚周刊", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 12000, MaxCount: 1 }],
    ["海鲜大罐头", { Name: "海鲜大罐头", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 11000, MaxCount: 1 }],
    //2x2 --  蓝
    ["高档座椅", { Name: "高档座椅", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 32000, MaxCount: 1 }],
    //2x2 --  紫
    ["黑咖啡", { Name: "黑咖啡", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 70000, MaxCount: 1 }],
    ["军用电话", { Name: "军用电话", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 80000, MaxCount: 1 }],
    //2x2 --  金
    ["克小圈玩偶", { Name: "克小圈玩偶", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 180000, MaxCount: 1 }],
    ["麦小蛋玩偶", { Name: "麦小蛋玩偶", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 200000, MaxCount: 1 }],
    ["除颤器", { Name: "除颤器", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 210000, MaxCount: 1 }],
    //2x2 --  红
    ["留声机", { Name: "留声机", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 440000, MaxCount: 1 }],
    ["军用电台", { Name: "军用电台", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 450000, MaxCount: 1 }],
    ["动力电池组", { Name: "动力电池组", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 550000, MaxCount: 1 }],
    ["瞪铃", { Name: "瞪铃", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 480000, MaxCount: 1 }],
    ["玄武", { Name: "玄武", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 500000, MaxCount: 1 }],
    ["天圆地方", { Name: "天圆地方", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 650000, MaxCount: 1 }],
    ["笔记本电脑", { Name: "笔记本电脑", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 1100000, MaxCount: 1 }],
    ["绿瓦斯罐", { Name: "绿瓦斯罐", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 800000, MaxCount: 1 }],
    ["信息大终端", { Name: "信息大终端", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 900000, MaxCount: 1 }],
    ["云存储", { Name: "云存储", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 650000, MaxCount: 1 }],
    ["信息终端", { Name: "信息终端", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 480000, MaxCount: 1 }],
    ["烽火奖杯", { Name: "烽火奖杯", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 1990000, MaxCount: 1 }],
    ["飞行记录仪", { Name: "飞行记录仪", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 1600000, MaxCount: 1 }],
    ["摄影机", { Name: "摄影机", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 850000, MaxCount: 1 }],
    ["反应炉", { Name: "反应炉", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 670000, MaxCount: 1 }],
    ["呼吸机", { Name: "呼吸机", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 680000, MaxCount: 1 }],
    ["欧洲之心", { Name: "欧洲之心", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 13140000, MaxCount: 1 }],
    ["步战车", { Name: "步战车", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 1340000, MaxCount: 1 }],
    ["红珊瑚鲤鱼", { Name: "红珊瑚鲤鱼", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 3340000, MaxCount: 1 }],
    ["特供咖啡豆", { Name: "特供咖啡豆", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 2540000, MaxCount: 1 }],
    ["幸运修勾", { Name: "幸运修勾", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 620000, MaxCount: 1 }],
    ["快乐小熊", { Name: "快乐小熊", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 730000, MaxCount: 1 }],
    ["魔术兔子", { Name: "魔术兔子", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 880000, MaxCount: 1 }],
    ["嘟嘟骑士", { Name: "嘟嘟骑士", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 1110000, MaxCount: 1 }],

    ["光头弹药箱", { Name: "光头弹药箱", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 500000, MaxCount: 1 }],
    ["战神勋章", { Name: "战神勋章", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 500000, MaxCount: 1 }],
    ["混乱勋章", { Name: "混乱勋章", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 500000, MaxCount: 1 }],
    ["裂空之弩", { Name: "裂空之弩", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 500000, MaxCount: 1 }],
    ["高科技护目镜", { Name: "高科技护目镜", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 500000, MaxCount: 1 }],

    //2x3 --  白
    ["水泥", { Name: "水泥", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 13000, MaxCount: 1 }],
    //2x3 --  绿
    ["吸尘器", { Name: "吸尘器", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 21000, MaxCount: 1 }],
    //2x3 --  蓝
    ["油漆桶", { Name: "油漆桶", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 55000, MaxCount: 1 }],
    ["协议箱", { Name: "协议箱", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 50000, MaxCount: 1 }],
    //2x3 --  紫
    ["汽车燃油", { Name: "汽车燃油", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 110000, MaxCount: 1 }],
    ["机器人", { Name: "机器人", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 90000, MaxCount: 1 }],
    //2x3 --  金
    ["食物粉碎机", { Name: "食物粉碎机", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 240000, MaxCount: 1 }],
    ["八音盒", { Name: "八音盒", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 210000, MaxCount: 1 }],
    //2x3 --  红
    ["无人机", { Name: "无人机", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 400000, MaxCount: 1 }],
    ["军用雷达", { Name: "军用雷达", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1200000, MaxCount: 1 }],
    ["半身像", { Name: "半身像", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 800000, MaxCount: 1 }],
    ["卫星锅", { Name: "卫星锅", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 700000, MaxCount: 1 }],
    ["印象派名画", { Name: "印象派名画", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 2000000, MaxCount: 1 }],
    ["碳纤维", { Name: "碳纤维", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 2000000, MaxCount: 1 }],
    ["黄金鳄鱼头", { Name: "黄金鳄鱼头", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1100000, MaxCount: 1 }],
    ["ECMO", { Name: "ECMO", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1450000, MaxCount: 1 }],
    ["勇士半身像", { Name: "勇士半身像", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 890000, MaxCount: 1 }],
    ["咖啡豆", { Name: "咖啡豆", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1000000, MaxCount: 1 }],
    ["医疗机器人", { Name: "医疗机器人", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 2200000, MaxCount: 1 }],
    ["坦克", { Name: "坦克", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 2400000, MaxCount: 1 }],
    ["浮力机器设备", { Name: "浮力机器设备", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1600000, MaxCount: 1 }],
    ["火箭燃料", { Name: "火箭燃料", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1700000, MaxCount: 1 }],

    //房卡
    ["低级房卡", { Name: "低级房卡", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "房卡", UnitPrice: 20000, MaxCount: 1 }],
    ["中级房卡", { Name: "中级房卡", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "房卡", UnitPrice: 80000, MaxCount: 1 }],
    ["高级房卡", { Name: "高级房卡", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "房卡", UnitPrice: 400000, MaxCount: 1 }],

    //子弹
    ["1级子弹", { Name: "1级子弹", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 1200 / ZRSJZ_AMMO_MAX_COUNT, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["2级子弹", { Name: "2级子弹", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 30000 / ZRSJZ_AMMO_MAX_COUNT, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["3级子弹", { Name: "3级子弹", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 50000 / ZRSJZ_AMMO_MAX_COUNT, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["4级子弹", { Name: "4级子弹", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 120000 / ZRSJZ_AMMO_MAX_COUNT, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["5级子弹", { Name: "5级子弹", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 220000 / ZRSJZ_AMMO_MAX_COUNT, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["6级子弹", { Name: "6级子弹", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 400000 / ZRSJZ_AMMO_MAX_COUNT, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    //头盔
    ["一级头", { Name: "一级头", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 35000, MaxCount: 1 }],
    ["二级头", { Name: "二级头", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 78000, MaxCount: 1 }],
    ["三级头", { Name: "三级头", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 195000, MaxCount: 1 }],
    ["四级头", { Name: "四级头", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 345000, MaxCount: 1 }],
    ["五级头", { Name: "五级头", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 1320000, MaxCount: 1 }],
    ["六级头", { Name: "六级头", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 5005000, MaxCount: 1 }],
    //防弹衣
    ["一级甲", { Name: "一级甲", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 52500, MaxCount: 1 }],
    ["二级甲", { Name: "二级甲", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 117000, MaxCount: 1 }],
    ["三级甲", { Name: "三级甲", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 292000, MaxCount: 1 }],
    ["四级甲", { Name: "四级甲", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 517000, MaxCount: 1 }],
    ["五级甲", { Name: "五级甲", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 1980000, MaxCount: 1 }],
    ["六级甲", { Name: "六级甲", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 7500000, MaxCount: 1 }],
    //背包
    ["一级包", { Name: "一级包", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 42000, MaxCount: 1 }],
    ["二级包", { Name: "二级包", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 93600, MaxCount: 1 }],
    ["三级包", { Name: "三级包", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 234000, MaxCount: 1 }],
    ["四级包", { Name: "四级包", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 414000, MaxCount: 1 }],
    ["五级包", { Name: "五级包", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 1580000, MaxCount: 1 }],
    ["六级包", { Name: "六级包", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 6000000, MaxCount: 1 }],
    //枪
    ["CN8-突击步枪", { Name: "CN8-突击步枪", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 120000, MaxCount: 1 }],
    ["DX9-冲锋枪", { Name: "DX9-冲锋枪", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 200000, MaxCount: 1 }],
    ["K50-轻机枪", { Name: "K50-轻机枪", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 350000, MaxCount: 1 }],
    ["RK77-轻机枪", { Name: "RK77-轻机枪", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 500000, MaxCount: 1 }],
    ["FS-霰弹枪", { Name: "FS-霰弹枪", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 800000, MaxCount: 1 }],
    ["KK41-霰弹枪", { Name: "KK41-霰弹枪", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 1500000, MaxCount: 1 }],
    ["ssv-狙击枪", { Name: "ssv-狙击枪", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 3000000, MaxCount: 1 }],
    ["W76-狙击枪", { Name: "W76-狙击枪", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 5500000, MaxCount: 1 }],
    //刀
    ["战术匕首", { Name: "战术匕首", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 8400, MaxCount: 1 }],
    ["刺厌", { Name: "刺厌", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 100000, MaxCount: 1 }],
    ["科技斧", { Name: "科技斧", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 450000, MaxCount: 1 }],
    ["熔岩剑", { Name: "熔岩剑", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 1200000, MaxCount: 1 }],
    ["赤牙", { Name: "赤牙", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 1600000, MaxCount: 1 }],
    ["魔刀", { Name: "魔刀", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 2000000, MaxCount: 1 }],
])


// 道具描述：结合道具名称及图标外观，用于详情、商店和仓库界面展示。
export const ZRSJZ_PROP_DESCRIPTION: ReadonlyMap<string, string> = new Map([
    ["核桃", "掌间文玩核桃，棱角已被岁月磨圆，转动的每一声轻响，都藏着时光的回音。"],
    ["剪刀", "裁缝铺的老剪刀，双刃交错间，剪断过愁绪，也裁出过生活崭新的形状。"],
    ["手套", "沾着机油的芬芳，掌心的破洞处，漏出了守护的暖光。"],
    ["营养罐头", "密封的铁罐里，封存着浓缩的能量与暖意，拧开时释放出被时间珍藏的营养承诺。"],
    ["磁轴键盘", "霍尔磁轴静立桌面，触发如蜻蜓点水，每一次指尖轻触都是精准的无声应答。"],
    ["工业图纸", "泛蓝的卷轴铺展开来，线条与数字交织成建筑的骨骼，画的是钢铁，写的是梦想。"],
    ["垃圾桶", "角落里的沉默守护者，吞下所有废弃与烦恼，在黎明前清空自己，重获崭新的一天。"],
    ["高档座椅", "真皮包裹的云端坐感，腰背被温柔托起，伏案时光从此不再疲惫，只有沉浸的从容。"],
    ["海鲜大罐头", "铁皮掀开的瞬间，海风扑面而来，虾贝鱼肉层层堆叠，一口尝尽深海的馈赠。"],
    ["黑咖啡", "杯中琥珀色漩涡，苦香氤氲如晨雾，不加修饰的本味，是清醒世界里最诚实的开场。"],
    ["油漆桶", "铁皮桶身斑驳沾彩，撬开时刺鼻的彩色风暴，刷过的地方，灰白世界重新发芽。"],
    ["汽车燃油", "透明液体在油箱暗涌，燃烧时爆发的无形之力，一滴千里，是钢铁心脏的血液。"],
    ["食物粉碎机", "电机轰鸣如野兽低吼，刀盘旋转间残羹化为齑粉，吞下厨余，吐出沃土的种子。"],
    ["八宝粥", "一罐方便携带的八宝粥，密封完好，可在行动间隙快速补充体力。"],
    ["切割刀", "带有防滑握柄的小型切割工具，刀口锋利，适合处理绳索和薄板。"],
    ["实验数据", "记录着关键实验结果的数据文件，内容专业，具有一定研究价值。"],
    ["柠檬茶", "清爽的瓶装柠檬茶，酸甜适口，是紧张行动中的常见饮品。"],
    ["黑色手表", "造型低调的黑色腕表，表盘坚固，兼具计时与收藏价值。"],
    ["地图", "标注了道路与重要区域的折叠地图，可为探索和撤离提供参考。"],
    ["怀表", "带有金属外壳的复古怀表，做工精细，仍在安静地走时。"],
    ["无线便携电钻", "紧凑的无线电钻，配有独立电池，适合现场维修与拆卸作业。"],
    ["苹果", "色泽鲜亮的新鲜苹果，清脆多汁，可以直接食用。"],
    ["量子U盘", "采用特殊封装的高性能存储设备，内部数据可能远比外观更有价值。"],
    ["化石", "保留着远古生物纹理的岩石标本，完整度较高，值得收藏。"],
    ["手雷", "装有高爆炸药的投掷武器，拔出保险后可对一定范围造成杀伤。"],
    ["脑机数据", "保存脑机接口测试记录的加密载体，对相关技术研究十分重要。"],
    ["鱼子酱", "包装考究的珍贵鱼子酱，颗粒饱满，是昂贵的高级食品。"],
    ["古玩钱币", "带有岁月痕迹的古代钱币，纹饰清晰，具有历史与收藏价值。"],
    ["镜子", "装饰精美的随身镜，镜面保存良好，看起来并非普通日用品。"],
    ["香槟", "保存完好的高档香槟，瓶身与标签彰显着不菲的价值。"],
    ["纵横", "造型独特的珍贵藏品，线条纵横交错，似乎蕴含特殊寓意。"],
    ["金条", "成色上佳的标准金条，沉甸甸的重量代表着稳定而直接的价值。"],
    ["高速阵列", "由多块高速存储模块组成的阵列，能够承载大量重要数据。"],
    ["万金泪冠", "镶嵌名贵宝石的华丽冠饰，泪滴形装饰在光线下格外耀眼。"],
    ["劳力士", "经典款高端机械腕表，工艺精密，是身份与财富的象征。"],
    ["曼德尔", "封装在精密容器中的神秘物品，结构复杂，拥有极高的研究价值。"],
    ["哑铃", "结实耐用的训练哑铃，可用于力量锻炼，也是一件颇有分量的物品。"],
    ["沙袋", "装填饱满的训练沙袋，表面耐磨，适合进行击打与体能训练。"],
    ["高精数显卡尺", "带电子显示屏的精密量具，可快速测量零件的内外尺寸。"],
    ["各种红蛋", "一盒外观鲜红、大小各异的蛋状物，来历不明但保存完整。"],
    ["太阳能板", "可将阳光转换为电能的便携面板，是野外供电的重要部件。"],
    ["扫地机器", "小型自动清洁设备，内部电机与传感器仍有拆解利用价值。"],
    ["万金", "外观华贵的珍稀摆件，用料讲究，在收藏市场上颇受欢迎。"],
    ["刀片服务器", "高密度服务器模块，体积紧凑，可提供强大的数据处理能力。"],
    ["显卡", "装有大型散热器的高性能显卡，可用于图形运算和设备升级。"],
    ["封存音源卫", "经过严密封存的音源设备，内部保存着难以复制的珍贵音频资料。"],
    ["电动马达", "工业用电动马达，线圈与转轴状态良好，可为机械设备提供动力。"],
    ["终端", "便携式电子终端，可进行数据读取、运算与远程设备控制。"],
    ["军用地图匣", "坚固的军用地图收纳匣，能够防水防尘，内部资料可能十分重要。"],
    ["外星人笔记本", "性能强劲的高端游戏笔记本，醒目的外壳下藏着昂贵硬件。"],
    ["炮弹", "沉重的制式炮弹，弹体保存完整，运输和存放时必须格外谨慎。"],
    ["155炮弹", "大口径155毫米炮弹，威力惊人，是极为危险且稀有的军用物资。"],
    ["供能单元", "高密度能源组件，可持续为大型设备输出稳定能量。"],
    ["装甲车电池", "为装甲车辆设计的大容量电池，耐冲击并能提供强劲启动电流。"],
    ["金玫瑰", "以黄金打造的玫瑰摆件，花瓣细节精致，兼具艺术与贵金属价值。"],
    ["水泥石砖", "厚重坚硬的建筑材料，可用于修筑掩体或进行基础施工。"],
    ["留声机", "保存较好的古典留声机，机械结构完整，喇叭造型颇具年代感。"],
    ["瞪铃", "造型奇特的大型铃铛，金属表面留有使用痕迹，声音十分洪亮。"],
    ["军用电话", "采用加固外壳的野战电话，线路接口完整，适合建立临时通信。"],
    ["摄影机", "专业级摄影设备，镜头和机身保存完好，可记录高质量影像。"],
    ["阿萨拉时尚周刊", "一期保存完整的阿萨拉时尚杂志，收录了当地流行文化与珍贵影像。"],
    ["克小圈玩偶", "以克小圈为原型制作的可爱玩偶，做工细致，深受收藏者喜爱。"],
    ["天圆地方", "体现天圆地方理念的精致器物，造型庄重，带有浓厚文化气息。"],
    ["笔记本电脑", "功能完整的便携电脑，可用于办公、数据处理或拆取电子元件。"],
    ["绿瓦斯罐", "绿色涂装的高压瓦斯罐，装有可燃气体，应远离火源与撞击。"],
    ["麦小蛋玩偶", "圆润可爱的麦小蛋主题玩偶，外观干净，具有不错的纪念价值。"],
    ["云存储", "大型网络存储设备，内部可能保存着尚未上传或无法替代的重要数据。"],
    ["信息大终端", "集成显示与运算模块的大型终端，可处理复杂的信息和控制任务。"],
    ["军用电台", "加固型远距离通信电台，频段稳定，是建立战场联络的关键设备。"],
    ["动力电池组", "由多块高性能电芯组成的动力组件，可为载具或工业机械供电。"],
    ["信息终端", "高规格信息处理终端，接口丰富，能够读取并分析加密资料。"],
    ["烽火奖杯", "象征特殊荣誉的金色奖杯，底座刻有烽火赛事的纪念铭文。"],
    ["玄武", "以玄武为主题打造的厚重艺术摆件，工艺繁复，寓意坚固与守护。"],
    ["除颤器", "专业医疗除颤设备，可通过电击帮助心脏恢复正常节律。"],
    ["飞行记录仪", "坚固醒目的飞行数据记录装置，内部资料可还原事故发生前的情况。"],
    ["反应炉", "结构复杂的小型反应炉核心，可释放大量能量，技术价值极高。"],
    ["呼吸机", "维持患者呼吸的专业医疗设备，在紧急救治中不可或缺。"],
    ["欧洲之心", "切割璀璨的巨型珍贵宝石，被称作欧洲之心，价值难以估量。"],
    ["步战车", "重型步兵战车模型或核心组件，装甲轮廓清晰，极具军事收藏价值。"],
    ["勇士半身像", "刻画无名勇士形象的半身雕像，姿态坚毅，带有纪念意义。"],
    ["咖啡豆", "装在大袋中的烘焙咖啡豆，香气浓郁，可加工成提神饮品。"],
    ["水泥", "袋装建筑水泥，受潮前可用于修补墙体、铺设地面和构筑工事。"],
    ["八音盒", "精巧的机械八音盒，转动发条后会奏出一段柔和旋律。"],
    ["半身像", "人物半身雕塑，细节刻画细腻，适合作为艺术品收藏。"],
    ["吸尘器", "大功率清洁设备，机身和软管齐全，电机仍具使用价值。"],
    ["协议箱", "装有专用通信与认证组件的设备箱，可用于建立安全数据连接。"],
    ["无人机", "配备摄像头的多旋翼无人机，可执行侦察、测绘和远程观察任务。"],
    ["机器人", "具备机械臂与移动能力的智能机器人，可协助完成多种作业。"],
    ["卫星锅", "用于接收卫星信号的抛物面天线，可在偏远区域建立信息通道。"],
    ["印象派名画", "色彩与笔触鲜明的印象派画作，保存状况良好，艺术价值很高。"],
    ["碳纤维", "轻量而高强度的碳纤维材料，是制造高端装备的重要原料。"],
    ["ECMO", "体外膜肺氧合设备，可暂时代替心肺功能，是极其珍贵的医疗装备。"],
    ["军用雷达", "高灵敏度军用雷达设备，可搜索并追踪远距离移动目标。"],
    ["黄金鳄鱼头", "以黄金制作的鳄鱼头雕塑，造型凶猛，贵金属用量十分可观。"],
    ["医疗机器人", "集成诊断与救治模块的先进机器人，可在危险环境中辅助医疗。"],
    ["坦克", "重型坦克模型或关键总成，厚重装甲与炮塔彰显强大的战斗能力。"],
    ["浮力机器设备", "结构复杂的浮力控制设备，可为水上或水下机械提供稳定支撑。"],
    ["火箭燃料", "装在专用容器中的高能推进剂，是航天与导弹系统的关键物资。"],

    ["七彩鸟蛋", "蛋壳流转着七彩光泽的珍稀鸟蛋，保存完好，具有极高的收藏与研究价值。"],
    ["特供香槟", "皇家酒庄限量酿制的年份香槟，酒香细腻优雅，是宴会与收藏市场上的珍品。"],
    ["彩金色鲤鱼", "鳞片呈现彩金般绚丽光泽的珍稀鲤鱼，寓意富贵吉祥，深受收藏家追捧。"],
    ["极品平安果", "经过严格甄选与精心培育的极品平安果，果形圆润饱满，象征平安与好运。"],
    ["特供咖啡豆", "产自限定庄园的特供咖啡豆，经过精细处理与烘焙，拥有浓郁而层次丰富的香气。"],
    ["白金鸟蛋", "蛋壳泛着白金般光泽的罕见鸟蛋，数量极少，是价值不菲的珍贵收藏品。"],
    ["红珊瑚鲤鱼", "通体呈红珊瑚色泽的稀有鲤鱼，鳞光艳丽，被视为吉祥与财富的象征。"],
    ["钻石级鱼子酱", "采用顶级鱼卵精制而成的钻石级鱼子酱，颗粒饱满、风味醇厚，是奢华宴席中的珍品。"],
    ["黄金方苹果", "外形方正、果皮泛着黄金光泽的珍稀苹果，果肉清甜爽脆，兼具观赏与收藏价值。"],
    ["极品大红袍茶", "精选核心产区优质茶叶精制而成，茶香馥郁持久、滋味醇厚回甘，是难得的茶中珍品。"],


    ["野生狗奶", "狗儿也有狗儿奶，内含时间宝石，保质期永久。"],
    ["幸运修勾", "佩戴红色蝴蝶结与幸运徽章的修勾玩偶，圆润的爪垫和明亮的眼睛仿佛能为收藏者带来一整天的好运。"],
    ["快乐小熊", "系着红色蝴蝶结的棕色小熊玩偶，柔软憨厚的模样令人安心，是能驱散疲惫、珍藏快乐的温暖陪伴。"],
    ["魔术兔子", "头戴魔术礼帽、手持星光魔杖的兔子玩偶，精致披风下似乎藏着无数惊喜，随时准备献上一场奇妙演出。"],
    ["嘟嘟骑士", "我的订单都敢抢，你的胆子真是肥嘟嘟的。"],

    ["光头弹药箱", "采用军用复合材料打造的重型弹药箱，内部整齐封存着大口径弹药；坚固外壳布满实战痕迹，是火力与胆识的象征。"],
    ["战神勋章", "以猩红战斧与狰狞铁面铸成的荣誉勋章，只有从无数恶战中凯旋的勇士才有资格佩戴，冰冷锋芒间仍残留着战场的肃杀气息。"],
    ["混乱勋章", "金色左轮与黑鸦羽翼交织而成的神秘勋章，中央红宝石闪烁着危险微光，据说它曾见证秩序崩塌前最疯狂的一场决斗。"],
    ["裂空之弩", "搭载高倍率瞄具与赤红能量核心的战术强弩，精密弩臂可将力量汇聚于一点，离弦弩箭仿佛连空气都能撕裂。"],
    ["高科技护目镜", "集成目标识别、环境扫描与战术标记模块的智能护目镜，湛蓝显示屏能实时捕捉战场信息，是尖端科技凝结而成的珍贵装备。"],

    //房卡
    ["低级房卡", "用于开启普通封锁房间的电子门禁卡，卡片上的紫色权限标识仍然有效。"],
    ["中级房卡", "拥有较高区域权限的加密门禁卡，可开启存放稀有物资的金色房间。"],
    ["高级房卡", "最高安全等级的红色门禁卡，可进入戒备森严的核心物资区域。"],

    //子弹
    ["1级子弹", "基础级弹药，穿透与杀伤能力有限，适合应对防护较弱的目标。"],
    ["2级子弹", "改良级弹药，拥有更稳定的弹道和略高的护甲穿透能力。"],
    ["3级子弹", "中等级弹药，在伤害、穿透力和获取成本之间较为均衡。"],
    ["4级子弹", "高级弹药，能够有效穿透常见护甲，对高威胁目标更具优势。"],
    ["5级子弹", "军用级高穿透弹药，可对重型防护目标造成显著伤害。"],
    ["6级子弹", "顶级特种弹药，拥有极强穿透力，是对付精锐敌人的稀有物资。"],

    //头盔
    ["一级头", "基础防护头盔，可减轻低强度冲击和弹片对头部造成的伤害。"],
    ["二级头", "经过加固的战术头盔，能为头部提供更可靠的战场防护。"],
    ["三级头", "高等级复合材料头盔，可抵御强力冲击，是珍贵的防护装备。"],
    ["四级头", "采用多层复合装甲的高级头盔，能够有效抵御高威力弹药和猛烈冲击。"],
    ["五级头", "军用重型防护头盔，配备强化面罩，可在高危交火中保护头部。"],
    ["六级头", "以顶级防弹材料打造的全覆盖头盔，能为最危险的行动提供极限防护。"],
    //防弹衣
    ["一级甲", "轻型基础防弹衣，可保护躯干免受低等级弹药与碎片伤害。"],
    ["二级甲", "强化防弹衣，在防护能力和行动灵活性之间取得良好平衡。"],
    ["三级甲", "采用高级装甲板的重型防弹衣，可有效抵御高威力攻击。"],
    ["四级甲", "内置复合防弹插板的高级护甲，能承受连续射击并保护重要躯干部位。"],
    ["五级甲", "专为正面攻坚设计的军用重甲，在高强度战斗中拥有出色生存保障。"],
    ["六级甲", "覆盖核心区域的顶级战术装甲，以极高重量换取近乎极限的防护能力。"],
    //背包
    ["一级包", "小型基础背包，结构简单，可额外携带少量行动物资。"],
    ["二级包", "容量适中的战术背包，分区合理，能够容纳更多补给。"],
    ["三级包", "大容量军用背包，结实耐磨，适合长时间搜集与行动。"],
    ["四级包", "顶级扩容背包，拥有优秀承重与收纳能力，可携带大量战利品。"],
    ["五级包", "采用模块化分区的军用运输背包，容量巨大且能稳定固定贵重物资。"],
    ["六级包", "为极限搜集行动打造的重型扩容背包，拥有当前最高的物资携带能力。"],
    //枪
    ["CN8-突击步枪", "性能均衡的制式突击步枪，后坐力稳定，适合中近距离持续交火。"],
    ["DX9-冲锋枪", "紧凑轻便的高速冲锋枪，射速突出，擅长在狭窄区域快速压制目标。"],
    ["K50-轻机枪", "便携式班用轻机枪，火力持续性良好，能够有效封锁敌人的移动路线。"],
    ["RK77-轻机枪", "经过强化的重枪管轻机枪，单发威力更高，适合稳定进行中距离压制。"],
    ["FS-霰弹枪", "结构可靠的泵动霰弹枪，近距离弹丸覆盖广，可对无甲目标造成重创。"],
    ["KK41-霰弹枪", "强化弹仓与枪管的战术霰弹枪，爆发力更强，适合近距离连续作战。"],
    ["ssv-狙击枪", "高威力远程狙击步枪，配有精密光学瞄具，擅长一击重创关键目标。"],
    ["W76-狙击枪", "为超远距离射击设计的精确步枪，射程与弹容量兼顾，容错率更高。"],
    //刀
    ["战术匕首", "轻巧锋利的战术短刀，便于隐藏，可用于快速近身攻击。"],
    ["刺厌", "造型凌厉的特殊近战兵器，尖锐刃口适合穿刺与连续攻击。"],
    ["科技斧", "采用高强度材料打造的科技战斧，兼具劈砍威力与未来感。"],
    ["熔岩剑", "剑身仿佛流淌着炽热熔岩，锋利而危险，是稀有的高级近战武器。"],
    ["赤牙", "剑身呈现出炽热的红色光泽，锋利无比，是极为罕见的近战武器。"],
    ["魔刀", "剑身散发着神秘的魔力，攻击力强大，是传说中的神器。"],
]);


ZRSJZ_PROP_CONFIG.forEach((config, name) => {
    config.Description = ZRSJZ_PROP_DESCRIPTION.get(name) || `一件名为“${name}”的道具。`;
});

//配置道具的属性
export const ZRSJZ_PROP_PROPERTY: Map<string, { [Key: string]: number }> = new Map([
    //子弹
    ["1级子弹", { "增伤": 0 }],
    ["2级子弹", { "增伤": 4 }],
    ["3级子弹", { "增伤": 8 }],
    ["4级子弹", { "增伤": 12 }],
    ["5级子弹", { "增伤": 16 }],
    ["6级子弹", { "增伤": 20 }],
    //头盔
    ["一级头", { "护甲等级": 1, "减伤": 5, }],
    ["二级头", { "护甲等级": 2, "减伤": 10, }],
    ["三级头", { "护甲等级": 3, "减伤": 15, }],
    ["四级头", { "护甲等级": 4, "减伤": 20, }],
    ["五级头", { "护甲等级": 5, "减伤": 25, }],
    ["六级头", { "护甲等级": 6, "减伤": 30, }],
    //防弹衣
    ["一级甲", { "护甲等级": 1, "减伤": 5, }],
    ["二级甲", { "护甲等级": 2, "减伤": 10, }],
    ["三级甲", { "护甲等级": 3, "减伤": 15, }],
    ["四级甲", { "护甲等级": 4, "减伤": 20, }],
    ["五级甲", { "护甲等级": 5, "减伤": 25, }],
    ["六级甲", { "护甲等级": 6, "减伤": 30, }],
    //背包
    ["一级包", { "背包等级": 1, "容量": 3 * 4, }],
    ["二级包", { "背包等级": 2, "容量": 4 * 4, }],
    ["三级包", { "背包等级": 3, "容量": 6 * 4, }],
    ["四级包", { "背包等级": 4, "容量": 8 * 4, }],
    ["五级包", { "背包等级": 5, "容量": 10 * 4, }],
    ["六级包", { "背包等级": 6, "容量": 13 * 4, }],
    //枪
    ["CN8-突击步枪", { "伤害": 22, "射程": 1200, "射速": 700, "弹夹": 30 }],
    ["DX9-冲锋枪", { "伤害": 24, "射程": 1300, "射速": 700, "弹夹": 35 }],
    ["K50-轻机枪", { "伤害": 26, "射程": 1400, "射速": 700, "弹夹": 35 }],
    ["RK77-轻机枪", { "伤害": 25, "射程": 1400, "射速": 700, "弹夹": 35 }],
    ["FS-霰弹枪", { "伤害": 60, "射程": 800, "射速": 300, "弹夹": 6 }],
    ["KK41-霰弹枪", { "伤害": 72, "射程": 800, "射速": 240, "弹夹": 8 }],
    ["ssv-狙击枪", { "伤害": 200, "射程": 2000, "射速": 100, "弹夹": 5 }],
    ["W76-狙击枪", { "伤害": 150, "射程": 2300, "射速": 120, "弹夹": 8 }],
    //刀
    ["战术匕首", { "伤害": 65 }],
    ["刺厌", { "伤害": 85 }],
    ["科技斧", { "伤害": 100 }],
    ["熔岩剑", { "伤害": 105 }],
    ["赤牙", { "伤害": 115 }],
    ["魔刀", { "伤害": 125 }],
])

export const ZRSJZ_PROP_PROPERTY_MAX: Map<string, number> = new Map([
    ["增伤", 20],
    ["背包等级", 6],
    ["容量", 80],
    ["护甲等级", 6],
    ["减伤", 50],
    ["伤害", 200],
    ["射程", 2300],
    ["射速", 800],
    ["弹夹", 35],
])


export const ZRSJZ_WEAPONRY_TYPE: Map<string, string[]> = new Map([
    ["步枪", ["CN8-突击步枪", "DX9-冲锋枪", "K50-轻机枪", "RK77-轻机枪"]],
    ["狙击枪", ["ssv-狙击枪", "W76-狙击枪"]],
    ["散弹枪", ["FS-霰弹枪", "KK41-霰弹枪"]],
])

export const ZRSJZ_KNIFE: string[] = ["战术匕首", "刺厌", "科技斧", "熔岩剑", "赤牙", "魔刀"];

export interface ZRSJZ_WeaponSkinConfig {
    Name: string;
    Quality: ZRSJZ_PROP_QUALITY;
    UnlockType: "默认" | "金币" | "视频";
    /** 金币解锁时为购买价格，默认或视频解锁时填 0。 */
    Price: number;
}

export const ZRSJZ_WEAPON_SKIN: ReadonlyMap<string, ReadonlyArray<Readonly<ZRSJZ_WeaponSkinConfig>>> = new Map([
    ["CN8-突击步枪", [
        { Name: "CN8-突击步枪", Quality: ZRSJZ_PROP_QUALITY.绿色, UnlockType: "默认", Price: 0 },
        { Name: "CN8-毒剂", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "金币", Price: 200000 },
        { Name: "CN8-红魔", Quality: ZRSJZ_PROP_QUALITY.红色, UnlockType: "金币", Price: 500000 },
    ]],
    ["DX9-冲锋枪", [
        { Name: "DX9-冲锋枪", Quality: ZRSJZ_PROP_QUALITY.绿色, UnlockType: "默认", Price: 0 },
        { Name: "DX9-零", Quality: ZRSJZ_PROP_QUALITY.蓝色, UnlockType: "视频", Price: 0 },
        { Name: "DX9-未来金属", Quality: ZRSJZ_PROP_QUALITY.金色, UnlockType: "金币", Price: 500000 },
    ]],
    ["K50-轻机枪", [
        { Name: "K50-轻机枪", Quality: ZRSJZ_PROP_QUALITY.绿色, UnlockType: "默认", Price: 0 },
        { Name: "K50-云雾", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "金币", Price: 1800000 },
    ]],
    ["RK77-轻机枪", [
        { Name: "RK77-轻机枪", Quality: ZRSJZ_PROP_QUALITY.绿色, UnlockType: "默认", Price: 0 },
        { Name: "RK77-鼓手", Quality: ZRSJZ_PROP_QUALITY.金色, UnlockType: "视频", Price: 0 },
    ]],
    ["FS-霰弹枪", [
        { Name: "FS-霰弹枪", Quality: ZRSJZ_PROP_QUALITY.蓝色, UnlockType: "默认", Price: 0 },
        { Name: "FS-白弧", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "视频", Price: 0 },
        { Name: "FS-橙灼", Quality: ZRSJZ_PROP_QUALITY.红色, UnlockType: "金币", Price: 2000000 },
    ]],
    ["KK41-霰弹枪", [
        { Name: "KK41-霰弹枪", Quality: ZRSJZ_PROP_QUALITY.蓝色, UnlockType: "默认", Price: 0 },
        { Name: "KK41-见雪", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "金币", Price: 3200000 },
        { Name: "KK41-绫虹", Quality: ZRSJZ_PROP_QUALITY.金色, UnlockType: "金币", Price: 3000000 },
    ]],
    ["ssv-狙击枪", [
        { Name: "ssv-狙击枪", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "默认", Price: 0 },
        { Name: "ssv-星零", Quality: ZRSJZ_PROP_QUALITY.金色, UnlockType: "金币", Price: 5000000 },
        { Name: "ssv-鎏光", Quality: ZRSJZ_PROP_QUALITY.红色, UnlockType: "视频", Price: 0 },
    ]],
    ["W76-狙击枪", [
        { Name: "W76-狙击枪", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "默认", Price: 0 },
        { Name: "W76-寒汐", Quality: ZRSJZ_PROP_QUALITY.金色, UnlockType: "视频", Price: 0 },
        { Name: "W76-紫墟", Quality: ZRSJZ_PROP_QUALITY.红色, UnlockType: "视频", Price: 0 },
    ]],
]);
export type ZRSJZ_UpgradeMaterial = {
    PropName: string,
    Count: number,
};

export type ZRSJZ_UpgradeFacilityName = "靶场" | "研究所" | "健身";

export type ZRSJZ_FacilityLevelConfig = {
    /** 升级完成后的等级。 */
    Level: number,
    /** 本次升级消耗的金币。 */
    Gold: number,
    /** 本次升级消耗的两种物资。 */
    Materials: [ZRSJZ_UpgradeMaterial, ZRSJZ_UpgradeMaterial],
    /** 到达该等级后的累计属性提升。 */
    BonusValue: number,
};

/**
 * 主页设施逐级升级配置。
 * Levels 中的 Level 必须从 1 连续递增，BonusValue 为对应等级的累计提升。
 */
export const ZRSJZ_FACILITY_UPGRADE_CONFIG: Record<ZRSJZ_UpgradeFacilityName, {
    AttributeName: string,
    ValueSuffix: string,
    Levels: ZRSJZ_FacilityLevelConfig[],
}> = {
    "靶场": {
        AttributeName: "攻击力",
        ValueSuffix: "%",
        Levels: [
            { Level: 1, Gold: 10000, Materials: [{ PropName: "切割刀", Count: 1 }, { PropName: "工业图纸", Count: 1 }], BonusValue: 5 },
            { Level: 2, Gold: 30000, Materials: [{ PropName: "高精数显卡尺", Count: 1 }, { PropName: "电动马达", Count: 1 }], BonusValue: 10 },
            { Level: 3, Gold: 80000, Materials: [{ PropName: "协议箱", Count: 1 }, { PropName: "汽车燃油", Count: 1 }], BonusValue: 15 },
            { Level: 4, Gold: 200000, Materials: [{ PropName: "高速阵列", Count: 1 }, { PropName: "供能单元", Count: 1 }], BonusValue: 20 },
            { Level: 5, Gold: 500000, Materials: [{ PropName: "军用电台", Count: 1 }, { PropName: "军用雷达", Count: 1 }], BonusValue: 30 },
        ],
    },
    "研究所": {
        AttributeName: "生命上限",
        ValueSuffix: "",
        Levels: [
            { Level: 1, Gold: 10000, Materials: [{ PropName: "黑色手表", Count: 1 }, { PropName: "量子U盘", Count: 1 }], BonusValue: 10 },
            { Level: 2, Gold: 30000, Materials: [{ PropName: "太阳能板", Count: 1 }, { PropName: "脑机数据", Count: 1 }], BonusValue: 20 },
            { Level: 3, Gold: 80000, Materials: [{ PropName: "脑机数据", Count: 2 }, { PropName: "除颤器", Count: 1 }], BonusValue: 35 },
            { Level: 4, Gold: 200000, Materials: [{ PropName: "信息终端", Count: 1 }, { PropName: "呼吸机", Count: 1 }], BonusValue: 50 },
            { Level: 5, Gold: 500000, Materials: [{ PropName: "反应炉", Count: 1 }, { PropName: "医疗机器人", Count: 1 }], BonusValue: 75 },
        ],
    },
    "健身": {
        AttributeName: "移动速度",
        ValueSuffix: "%",
        Levels: [
            { Level: 1, Gold: 10000, Materials: [{ PropName: "哑铃", Count: 1 }, { PropName: "沙袋", Count: 1 }], BonusValue: 5 },
            { Level: 2, Gold: 30000, Materials: [{ PropName: "哑铃", Count: 4 }, { PropName: "沙袋", Count: 4 }], BonusValue: 10 },
            { Level: 3, Gold: 80000, Materials: [{ PropName: "哑铃", Count: 8 }, { PropName: "沙袋", Count: 8 }], BonusValue: 15 },
            { Level: 4, Gold: 200000, Materials: [{ PropName: "电动马达", Count: 2 }, { PropName: "汽车燃油", Count: 2 }], BonusValue: 20 },
            { Level: 5, Gold: 500000, Materials: [{ PropName: "供能单元", Count: 1 }, { PropName: "反应炉", Count: 1 }], BonusValue: 30 },
        ],
    },
};

export const ZRSJZ_FIRING_RANGE_LEVEL_CONFIG = ZRSJZ_FACILITY_UPGRADE_CONFIG["靶场"].Levels;

export function GetFacilityBonusValue(facilityName: ZRSJZ_UpgradeFacilityName, level: number): number {
    const safeLevel = Math.max(0, Math.floor(level || 0));
    if (safeLevel === 0) return 0;

    const levels = ZRSJZ_FACILITY_UPGRADE_CONFIG[facilityName].Levels;
    return levels.find(config => config.Level === safeLevel)?.BonusValue
        ?? levels[levels.length - 1]?.BonusValue
        ?? 0;
}

export function GetFiringRangeAttackBonusPercent(level: number): number {
    return GetFacilityBonusValue("靶场", level);
}


//道具存储类型
export class ZRSJZ_PropData {
    public InstanceID: string;//唯一ID(可区分两把相同的枪)
    public Name: string;//道具名称
    public PropType: string;//道具分类
    public CurInventory: ZRSJZ_INVENTORY;
    /** -1 表示共享/非角色库存，0 和 1 分别表示玩家1、玩家2的随身库存。 */
    public OwnerPlayerIndex: number = -1;
    /** 道具仍在箱子中时，记录所属箱子的唯一 ID。 */
    public SourceBoxID: string = "";
    /** 搜索动画尚未完成时禁止显示和拖动；普通道具默认为 false。 */
    public IsSearchLocked: boolean = false;
    /** 空投保底红色物资的视频锁；观看激励视频后解除。 */
    public IsRewardVideoLocked: boolean = false;
    public UnitPrice: number;//单价
    public MaxCount: number;//最大堆叠数
    public CurCount: number;//当前堆叠数
    public Width: number;//道具所占的格子宽
    public Height: number;//道具所占的格子高
    public GridData: ZRSJZ_GridData[];//GridData[0]为仓库--全部的数据-----GridData[0]为--当前位置的数据
}

export class ZRSJZ_GridData {
    public IsRotate: boolean;//是否旋转
    public GridX: number;//道具所在背包的X坐标
    public GridY: number;//道具所在背包的Y坐标
}

//存储类型
export enum ZRSJZ_INVENTORY {
    仓库_全部 = "仓库_全部",
    仓库_装备 = "仓库_装备",
    仓库_武器 = "仓库_武器",
    仓库_弹药 = "仓库_弹药",
    仓库_物品 = "仓库_物品",
    卡包 = "卡包",
    弹药 = "弹药",
    保险箱 = "保险箱",
    武器_枪 = "武器_枪",
    武器_头盔 = "武器_头盔",
    武器_防弹衣 = "武器_防弹衣",
    武器_背包 = "武器_背包",
    武器_刀 = "武器_刀",
    背包 = "背包",
    物资 = "物资",
}

export const ZRSJZ_INVENTORY_CONFIG: Map<ZRSJZ_INVENTORY, { Row: number, Col: number, IsDilatation: boolean }> = new Map([
    [ZRSJZ_INVENTORY.仓库_全部, { Row: 10, Col: 7, IsDilatation: false }],
    [ZRSJZ_INVENTORY.仓库_装备, { Row: 6, Col: 7, IsDilatation: false }],
    [ZRSJZ_INVENTORY.仓库_武器, { Row: 6, Col: 7, IsDilatation: false }],
    [ZRSJZ_INVENTORY.仓库_弹药, { Row: 6, Col: 7, IsDilatation: false }],
    [ZRSJZ_INVENTORY.仓库_物品, { Row: 6, Col: 7, IsDilatation: false }],
    [ZRSJZ_INVENTORY.卡包, { Row: 1, Col: 3, IsDilatation: false }],
    [ZRSJZ_INVENTORY.弹药, { Row: 2, Col: 3, IsDilatation: false }],
    [ZRSJZ_INVENTORY.保险箱, { Row: 2, Col: 3, IsDilatation: false }],
    [ZRSJZ_INVENTORY.武器_枪, { Row: 1, Col: 2, IsDilatation: false }],
    [ZRSJZ_INVENTORY.武器_头盔, { Row: 1, Col: 1, IsDilatation: false }],
    [ZRSJZ_INVENTORY.武器_防弹衣, { Row: 1, Col: 1, IsDilatation: false }],
    [ZRSJZ_INVENTORY.武器_背包, { Row: 1, Col: 1, IsDilatation: false }],
    [ZRSJZ_INVENTORY.武器_刀, { Row: 1, Col: 1, IsDilatation: false }],
    [ZRSJZ_INVENTORY.背包, { Row: 2, Col: 4, IsDilatation: false }],
    [ZRSJZ_INVENTORY.物资, { Row: 4, Col: 4, IsDilatation: true }],
])

export const ZRSJZ_SHOP_CONFIG: Map<string, string[]> = new Map([
    ["武器", ["CN8-突击步枪", "DX9-冲锋枪", "K50-轻机枪", "RK77-轻机枪", "FS-霰弹枪", "KK41-霰弹枪", "ssv-狙击枪", "W76-狙击枪"]],
    ["头盔", ["一级头", "二级头", "三级头", "四级头", "五级头", "六级头"]],
    ["防弹衣", ["一级甲", "二级甲", "三级甲", "四级甲", "五级甲", "六级甲"]],
    ["背包", ["一级包", "二级包", "三级包", "四级包", "五级包", "六级包"]],
    ["匕首", ["战术匕首", "刺厌", "科技斧", "熔岩剑", "赤牙", "魔刀"]],
    ["弹药", ["1级子弹", "2级子弹", "3级子弹", "4级子弹", "5级子弹", "6级子弹"]],
    ["房卡", ["低级房卡", "中级房卡", "高级房卡"]],
])

//#region 角色配置
export interface ZRSJZ_RoleConfig {
    Name: string,
    RoleDesc: string,
    SkillName: string,
    SkillDesc: string,
    Skin: string[],
    SkillPath: string,
}

export const ZRSJZ_ROLE_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_RoleConfig>> = new Map([
    ["威蓝", {
        Name: "威蓝",
        RoleDesc: "擅长爆破作战的突击手，能够快速清理聚集的敌人。",
        SkillName: "轰炸",
        SkillDesc: "投放炸弹，对范围内的敌人造成爆炸伤害。",
        Skin: ["威蓝", "烬猎"],
        SkillPath: "Prefabs/Controller/Bomb",
    }],
    ["泠汐", {
        Name: "泠汐",
        RoleDesc: "精通能量武器的远程输出角色，适合持续压制敌人。",
        SkillName: "激光",
        SkillDesc: "发射高能激光，对直线范围内的敌人造成伤害。",
        Skin: ["泠汐", "夜喵"],
        SkillPath: "Prefabs/Controller/Laser",
    }],
    ["灼戈", {
        Name: "灼戈",
        RoleDesc: "攻守兼备的支援角色，能够提高队伍的生存能力。",
        SkillName: "护盾",
        SkillDesc: "展开能量护盾，在持续时间内抵挡敌人的攻击。",
        Skin: ["灼戈", "星栗"],
        SkillPath: "Prefabs/Controller/Shield",
    }],
])

export interface ZRSJZ_SkinConfig {
    Name: string,
    Quality: ZRSJZ_PROP_QUALITY,
    UnlockType: "金币" | "视频",
    UnlockPrice: number,
    Skin: string,
    Headset: string[],
    EntranceAnis: string[];
}

export const ZRSJZ_SKIN_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_SkinConfig>> = new Map([
    ["威蓝", { Name: "威蓝", Quality: ZRSJZ_PROP_QUALITY.蓝色, UnlockType: "金币", UnlockPrice: 100, Skin: "js/ll1", Headset: ["ll-_0000_前刘海_蓝狼"], EntranceAnis: ["cc_ll"] }],
    ["烬猎", { Name: "烬猎", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "金币", UnlockPrice: 100000, Skin: "js/ll2", Headset: ["llpf1__0000s_0001_前刘海"], EntranceAnis: ["cc_ll"] }],
    ["泠汐", { Name: "泠汐", Quality: ZRSJZ_PROP_QUALITY.白色, UnlockType: "视频", UnlockPrice: 1, Skin: "js/m1", Headset: [], EntranceAnis: ["cc_m", "cc_m2"] }],
    ["夜喵", { Name: "夜喵", Quality: ZRSJZ_PROP_QUALITY.金色, UnlockType: "视频", UnlockPrice: 1, Skin: "js/m2", Headset: [], EntranceAnis: ["cc_m", "cc_m2"] }],
    ["灼戈", { Name: "灼戈", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "视频", UnlockPrice: 1, Skin: "js/w1", Headset: [], EntranceAnis: ["cc_w"] }],
    ["星栗", { Name: "星栗", Quality: ZRSJZ_PROP_QUALITY.红色, UnlockType: "视频", UnlockPrice: 1, Skin: "js/w2", Headset: ["wzt"], EntranceAnis: ["cc_w"] }],
])

//玩家动画
export enum ZRSJZ_ANI {
    Appear1 = "cc_1",
    Appear2 = "cc_2",
    Idle_D1 = "daiji_dao1",
    Idle_D2 = "daiji_dao2",
    Idle_Q = "daiji_q",
    Attack_D1 = "gj_dao3",
    Attack_D2 = "gj_dao4",
    Fire = "kq",
    Walk_D = "zl_dao",
    Walk_Q = "zl_q",
    HC_Q = "hc",
    HC_D = "hc_dao",
    SW = "sw",
}

//#region 普通敌人配置
export interface ZRSJZ_EnemyConfig {
    /** 最大生命值。 */
    MaxHealth: number;
    /** 目标进入该范围后，敌人开始追击。 */
    DetectionRange: number;
    /** 追击过程中目标超出该范围后，敌人丢失目标并返回巡逻。 */
    LoseRange: number;
    /** 以敌人出生点为中心的巡逻半径。 */
    PatrolRadius: number;
    /** 巡逻时的移动速度。 */
    PatrolSpeed: number;
    /** 追击及移动攻击时的移动速度。 */
    ChaseSpeed: number;
    /** 到达巡逻点后的停留时间，单位为秒。 */
    PatrolWaitTime: number;
    /** 判定敌人已经到达巡逻点的距离。 */
    PatrolArriveDistance: number;
    /** 进入该范围后，敌人会一边靠近目标一边攻击。 */
    MovingAttackRange: number;
    /** 进入该范围后，敌人停止移动并站立攻击。 */
    StandingAttackRange: number;
    /** 两次攻击之间的冷却时间，单位为秒。 */
    AttackInterval: number;
    /** 待机动画名称。 */
    IdleAnimation: string;
    /** 巡逻或普通追击时播放的移动动画名称。 */
    MoveAnimation: string;
    /** 边移动边攻击时播放的动画名称。 */
    MovingAttackAnimation: string[];
    /** 停止移动并站立攻击时播放的动画名称。 */
    StandingAttackAnimation: string[];
    /** 敌人默认装备的武器名称。 */
    WeaponName: string;
}

/**
 * 敌人配置统一入口。
 * ZRSJZ_EnemyBase 只按 EnemyName（未填写时使用节点名）读取这里的配置。
 */
export const ZRSJZ_ENEMY_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_EnemyConfig>> = new Map([
    ["持枪小兵", {
        MaxHealth: 100,
        DetectionRange: 1500,
        LoseRange: 2000,
        PatrolRadius: 500,
        PatrolSpeed: 420,
        ChaseSpeed: 560,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        MovingAttackRange: 800,
        StandingAttackRange: 300,
        AttackInterval: 1.15,
        IdleAnimation: ZRSJZ_ANI.Idle_Q,
        MoveAnimation: ZRSJZ_ANI.Walk_Q,
        MovingAttackAnimation: ["gj_qiang2"],
        StandingAttackAnimation: ["gj_qiang"],
        WeaponName: "突击步枪",
    }],
    ["持刀小兵", {
        MaxHealth: 110,
        DetectionRange: 1500,
        LoseRange: 2000,
        PatrolRadius: 500,
        PatrolSpeed: 480,
        ChaseSpeed: 680,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        MovingAttackRange: 500,
        StandingAttackRange: 200,
        AttackInterval: 0.9,
        IdleAnimation: ZRSJZ_ANI.Idle_D1,
        MoveAnimation: ZRSJZ_ANI.Walk_D,
        MovingAttackAnimation: ["gj_dao3_2", "gj_dao4_2"],
        StandingAttackAnimation: [ZRSJZ_ANI.Attack_D1, ZRSJZ_ANI.Attack_D2],
        WeaponName: "战术匕首",
    }],
    ["喷火兵", {
        MaxHealth: 150,
        DetectionRange: 1500,
        LoseRange: 2000,
        PatrolRadius: 500,
        PatrolSpeed: 380,
        ChaseSpeed: 500,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        MovingAttackRange: 800,
        StandingAttackRange: 300,
        AttackInterval: 4.5,
        IdleAnimation: ZRSJZ_ANI.Idle_Q,
        MoveAnimation: ZRSJZ_ANI.Walk_Q,
        MovingAttackAnimation: ["gj_ph"],
        StandingAttackAnimation: ["gj_ph"],
        WeaponName: "喷火枪",
    }],
    ["盾牌兵", {
        MaxHealth: 220,
        DetectionRange: 1500,
        LoseRange: 2000,
        PatrolRadius: 500,
        PatrolSpeed: 350,
        ChaseSpeed: 460,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        MovingAttackRange: 800,
        StandingAttackRange: 300,
        AttackInterval: 1.4,
        IdleAnimation: ZRSJZ_ANI.Idle_Q,
        MoveAnimation: ZRSJZ_ANI.Walk_Q,
        MovingAttackAnimation: ["gj_qiang2"],
        StandingAttackAnimation: ["gj_qiang"],
        WeaponName: "盾牌兵武器",
    }],
]);


//#region Boss配置
export interface ZRSJZ_BossSkillConfig {
    /** 技能名称，也是子类处理技能效果时使用的唯一标识。 */
    Name: string;
    /** 目标进入该距离后才允许释放技能。 */
    Range: number;
    /** 技能造成的基础伤害。 */
    DamageRange: number;
    /** 技能造成的基础伤害。 */
    Damage: number;
    /** 两次释放该技能之间的冷却时间，单位为秒。 */
    Cooldown: number;
    /** 技能使用的动画名称。 */
    Animation: string;
    /** Spine 动画中用于真正结算攻击效果的事件名称。 */
    TriggerEvent: string;
    /** 释放技能期间是否可以继续向目标移动。 */
    CanMoveWhileCasting: boolean;
}

export interface ZRSJZ_BossConfig {
    /** Boss 最大生命值。 */
    MaxHealth: number;
    /** Boss 发现玩家的距离。 */
    DetectionRange: number;
    /** 追击过程中超过该距离后丢失目标。 */
    LoseRange: number;
    /** 巡逻半径。 */
    PatrolRadius: number;
    /** 巡逻速度。 */
    PatrolSpeed: number;
    /** 追击速度。 */
    ChaseSpeed: number;
    /** 到达巡逻点后的停留时间。 */
    PatrolWaitTime: number;
    /** 判定到达巡逻点的距离。 */
    PatrolArriveDistance: number;
    /** 待机动画。 */
    IdleAnimation: string;
    /** 移动动画。 */
    MoveAnimation: string;
    /** 默认武器名称。 */
    WeaponName: string;
    /** 死亡动画。 */
    DieAnimation: string;
    /** 脱离战斗后每秒恢复的最大生命值比例，0.02 表示每秒恢复 2%。 */
    OutOfCombatRegenPercentPerSecond: number;
    /** Boss 普攻，配置结构与技能完全一致。 */
    NormalAttack: ZRSJZ_BossSkillConfig;
    /** Boss 可释放的技能列表，按照数组顺序选择已就绪且在范围内的技能。 */
    Skills: ZRSJZ_BossSkillConfig[];
}

/** Boss配置统一入口，Boss基类按节点名或 EnemyName 读取。 */
export const ZRSJZ_BOSS_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_BossConfig>> = new Map([
    ["Boss1", {
        MaxHealth: 1000,
        DetectionRange: 2000,
        LoseRange: 2500,
        PatrolRadius: 500,
        PatrolSpeed: 400,
        ChaseSpeed: 550,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        IdleAnimation: "daiji",
        MoveAnimation: "pao",
        WeaponName: "突击步枪",
        DieAnimation: "daodi",
        OutOfCombatRegenPercentPerSecond: 0.02,
        NormalAttack: {
            Name: "普通攻击",
            Range: 400,
            DamageRange: 300,
            Damage: 12,
            Cooldown: 2.6,
            Animation: "pg",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        },
        Skills: [{
            Name: "超级陀螺",
            Range: 400,
            DamageRange: 500,
            Damage: 28,
            Cooldown: 7.5,
            Animation: "1",
            TriggerEvent: "dz",
            CanMoveWhileCasting: false,
        }],
    }],
    ["Boss2", {
        MaxHealth: 1050,
        DetectionRange: 2000,
        LoseRange: 2500,
        PatrolRadius: 500,
        PatrolSpeed: 380,
        ChaseSpeed: 520,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        IdleAnimation: "idle",
        MoveAnimation: "zl",
        WeaponName: "突击步枪",
        DieAnimation: "dead",
        OutOfCombatRegenPercentPerSecond: 0.02,
        NormalAttack: {
            Name: "普通攻击",
            Range: 400,
            DamageRange: 300,
            Damage: 9,
            Cooldown: 2.2,
            Animation: "atk1",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        },
        Skills: [{
            Name: "死亡剪刀",
            Range: 400,
            DamageRange: 500,
            Damage: 36,
            Cooldown: 9,
            Animation: "atk2",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        }],
    }],
    ["Boss3", {
        MaxHealth: 1350,
        DetectionRange: 2000,
        LoseRange: 2500,
        PatrolRadius: 500,
        PatrolSpeed: 360,
        ChaseSpeed: 480,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        IdleAnimation: "idle",
        MoveAnimation: "zl",
        WeaponName: "突击步枪",
        DieAnimation: "dead",
        OutOfCombatRegenPercentPerSecond: 0.02,
        NormalAttack: {
            Name: "普通攻击",
            Range: 400,
            DamageRange: 300,
            Damage: 14,
            Cooldown: 3,
            Animation: "atk1",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        },
        Skills: [{
            Name: "超级炸弹",
            Range: 400,
            DamageRange: 500,
            Damage: 45,
            Cooldown: 10,
            Animation: "atk2",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        }],
    }],
]);


//#region 寻路配置
export interface ZRSJZ_PathConfig {
    /** 是否启用遇墙后的智能寻路。 */
    EnablePathFinding: boolean;
    /** A* 寻路网格的边长。 */
    GridSize: number;
    /** 寻路时为敌人身体预留的半径。 */
    AgentRadius: number;
    /** 敌人节点位置到碰撞体中心的 Y 轴偏移。 */
    AgentOffsetY: number;
    /** 通路检测射线相对敌人半径的内缩比例，避免贴墙时射线起点落入墙内。 */
    RaycastRadiusScale: number;
    /** 每次卡住检测之间的时间，单位为秒。 */
    StuckCheckInterval: number;
    /** 一次检测中位移小于该值时视为没有正常移动。 */
    StuckDistance: number;
    /** 持续卡住多久后强制重新计算路径，单位为秒。 */
    StuckTime: number;
    /** 两次寻路计算之间的最短间隔，单位为秒。 */
    RepathInterval: number;
    /** 目标移动超过该距离后重新计算路径。 */
    TargetMoveDistance: number;
    /** 距离路径节点小于该值时切换至下一个节点。 */
    WaypointDistance: number;
    /** 单次 A* 寻路允许搜索的最大节点数量。 */
    MaxSearchNodes: number;
    /** A* 暂时失败时，沿障碍边缘尝试绕行的步长。 */
    FallbackAvoidanceDistance: number;
}

/** 敌人智能寻路的统一配置。 */
export const ZRSJZ_PATH_CONFIG: Readonly<ZRSJZ_PathConfig> = {
    EnablePathFinding: true,
    GridSize: 60,
    AgentRadius: 82,
    AgentOffsetY: 100,
    RaycastRadiusScale: 0.75,
    StuckCheckInterval: 0.25,
    StuckDistance: 3,
    StuckTime: 0.5,
    RepathInterval: 0.5,
    TargetMoveDistance: 100,
    WaypointDistance: 25,
    MaxSearchNodes: 4000,
    FallbackAvoidanceDistance: 120,
};
//#region 地图配置

//掉落物资箱配置
export interface ZRSJZ_BoxConfig {
    BoxName: string;
    MinPropCount: number;
    MaxPropCount: number;
    Probability: number[];//各个品质的概率--白色/绿色/蓝色/紫色/金色/红色
    /** 随机物资之外必定额外生成的道具类型，每种类型生成一件。 */
    GuaranteedPropTypes?: string[];
}
//地图中敌人配置
export interface ZRSJZ_MapEnemyConfig {
    HP: number;
    Harm: number;
    /** 相对于兵种基础配置的移动速度倍率。 */
    SpeedMultiplier: number;
    /** 相对于兵种基础配置的攻击间隔倍率，越低攻击越频繁。 */
    AttackIntervalMultiplier: number;
    Box: ZRSJZ_BoxConfig;
}
export interface ZRSJZ_MapBossConfig {
    HP: number;
    HarmMultiple: number;
    SpeedMultiplier: number;
    CooldownMultiplier: number;
    Box: ZRSJZ_BoxConfig;
}

/** 地图空投配置。SpawnTimeSeconds <= 0 表示该关卡不生成空投。 */
export interface ZRSJZ_ParacargoConfig {
    SpawnTimeSeconds: number;
    DropHeight: number;
    DropDuration: number;
    MinPropCount: number;
    MaxPropCount: number;
    GuaranteedEquipmentCount: number;
    /** 0~5 对应白、绿、蓝、紫、金、红，空投装备不会低于该品质。 */
    MinEquipmentQualityIndex: number;
    /** 非保底栏位生成金/红物资的概率，其余栏位优先生成装备。 */
    PropSlotChance: number;
    /** 金色与红色物资的相对权重。 */
    GoldPropWeight: number;
    RedPropWeight: number;
}

/** 轰炸区刷新配置；所有随机时间均为闭区间内的均匀随机。 */
export const ZRSJZ_BOMB_PLOT_SPAWN_CONFIG = Object.freeze({
    FirstSpawnMinSeconds: 60,
    FirstSpawnMaxSeconds: 90,
    RepeatSpawnMinSeconds: 60,
    RepeatSpawnMaxSeconds: 90,
});

export interface ZRSJZ_MapConfig {
    /** 选关界面显示的区域名称。 */
    DisplayName: string;
    /** 行动名称，与 DisplayName 一起组成地图配置键。 */
    ActionName: string;
    /** 模式难度等级，六个模式依次为 1~6；选关界面最多显示五颗星。 */
    Difficulty: number;
    /** 玩家当前随身配置的最低总价值；0 表示不限制。 */
    RequiredLoadoutValue: number;
    /** 选关界面展示的额外任务限制。 */
    MissionLimit: string;
    /** 行动时限，单位为分钟；0 表示不限时。 */
    TimeLimitMinutes: number;
    MapName: string;
    MapEnemy: Map<string, ZRSJZ_MapEnemyConfig>
    MapBoss: Map<string, ZRSJZ_MapBossConfig>
    MapBox: Map<string, ZRSJZ_BoxConfig>
    /** 本关卡特有的红色物资，同时用于选关界面的专属掉落展示。 */
    ExclusiveRedProps: readonly string[]
    /** 所有关卡都能开出的通用红色物资，不在选关界面的专属掉落中展示。 */
    UniversalRedProps: readonly string[]
    /** 本关卡的定时空投设置。 */
    Paracargo: Readonly<ZRSJZ_ParacargoConfig>
    MapProp: string[][]
}

/**
 * 六个模式的品质权重，顺序为白、绿、蓝、紫、金、红。
 * 权重随模式提高持续向高品质倾斜；箱子生成时会按这些权重进行加权随机。
 */
const ZRSJZ_MAP_LOOT_WEIGHTS: readonly (readonly number[])[] = [
    [60, 25, 10, 4, 0.8, 0.2],
    [48, 28, 15, 6, 2.3, 0.7],
    [36, 28, 20, 10, 4.5, 1.5],
    [26, 25, 23, 15, 8, 3],
    [17, 21, 25, 20, 12, 5],
    [10, 15, 22, 24, 19, 10],
];

const ZRSJZ_MAP_REQUIRED_VALUES: readonly number[] = [
    0, 150_000, 500_000, 1_200_000, 3_000_000, 7_000_000,
];

/** 助战礼包内容。装备名称直接关联 ZRSJZ_PROP_CONFIG，修改后会同步影响展示和实际发放。 */
export interface ZRSJZ_AssistFightingGiftConfig {
    WeaponName: string;
    HelmetName: string;
    ArmorName: string;
    BackpackName: string;
    AmmoName: string;
    /** 随身弹药栏固定为六格，此处配置发放的满额弹匣数量。 */
    AmmoStackCount: number;
}

/**
 * 按关卡 Difficulty（1~6）配置助战礼包。
 * 各件装备的实际价值取自 ZRSJZ_PROP_CONFIG，便于后续独立调整装备或单价。
 */
export const ZRSJZ_ASSIST_FIGHTING_GIFT_CONFIG: ReadonlyMap<
    number,
    Readonly<ZRSJZ_AssistFightingGiftConfig>
> = new Map([
    [1, {
        WeaponName: "CN8-突击步枪", HelmetName: "二级头", ArmorName: "二级甲",
        BackpackName: "二级包", AmmoName: "1级子弹", AmmoStackCount: 6,
    }],
    [2, {
        WeaponName: "DX9-冲锋枪", HelmetName: "三级头", ArmorName: "三级甲",
        BackpackName: "三级包", AmmoName: "2级子弹", AmmoStackCount: 6,
    }],
    [3, {
        WeaponName: "K50-轻机枪", HelmetName: "四级头", ArmorName: "四级甲",
        BackpackName: "四级包", AmmoName: "3级子弹", AmmoStackCount: 6,
    }],
    [4, {
        WeaponName: "RK77-轻机枪", HelmetName: "五级头", ArmorName: "五级甲",
        BackpackName: "五级包", AmmoName: "4级子弹", AmmoStackCount: 6,
    }],
    [5, {
        WeaponName: "FS-霰弹枪", HelmetName: "六级头", ArmorName: "六级甲",
        BackpackName: "六级包", AmmoName: "5级子弹", AmmoStackCount: 6,
    }],
    [6, {
        WeaponName: "W76-狙击枪", HelmetName: "六级头", ArmorName: "六级甲",
        BackpackName: "六级包", AmmoName: "6级子弹", AmmoStackCount: 6,
    }],
]);

const ZRSJZ_MAP_TIME_LIMITS: readonly number[] = [18, 16, 14, 13, 12, 11];
const ZRSJZ_MAP_HP_MULTIPLIERS: readonly number[] = [0.9, 1.15, 1.5, 1.95, 2.55, 3.25];
const ZRSJZ_MAP_HARM_MULTIPLIERS: readonly number[] = [0.9, 1.1, 1.35, 1.65, 2.05, 2.5];
const ZRSJZ_MAP_BOSS_HARM_MULTIPLIERS: readonly number[] = [0.9, 1.1, 1.3, 1.55, 1.85, 2.2];
const ZRSJZ_MAP_SPEED_MULTIPLIERS: readonly number[] = [0.95, 1, 1.05, 1.1, 1.15, 1.2];
const ZRSJZ_MAP_ATTACK_INTERVAL_MULTIPLIERS: readonly number[] = [1.05, 1, 0.95, 0.9, 0.85, 0.8];
/** 六个模式进入战斗后触发空投的时间（秒），高难度更早提供争夺目标。 */
export const ZRSJZ_PARACARGO_SPAWN_TIMES: readonly number[] = [180, 150, 135, 120, 105, 90];
const ZRSJZ_MAP_PROP_TYPES: readonly string[] = ["物品", "房卡", "弹药", "头盔", "防弹衣"];//地图中允许掉落的类型
/** 宝箱不掉落背包，其他装备最高只允许紫色（四级）；普通物资与弹药不受此限制。 */
const ZRSJZ_MAP_BOX_EQUIPMENT_TYPES: readonly string[] = ["枪", "刀", "头盔", "防弹衣", "背包"];
const ZRSJZ_MAP_BOX_EQUIPMENT_QUALITIES: readonly ZRSJZ_PROP_QUALITY[] = [
    ZRSJZ_PROP_QUALITY.白色,
    ZRSJZ_PROP_QUALITY.绿色,
    ZRSJZ_PROP_QUALITY.蓝色,
    ZRSJZ_PROP_QUALITY.紫色,
];

/**
 * 各关卡的专属特产大红。
 *
 * 配置按关卡难度逐步提高物资价值和占用空间；关卡原有的红色品质概率仍决定
 * 是否出红；这些物资只加入对应关卡的掉落池，界面展示也直接读取同一份数据。
 */
export const ZRSJZ_MAP_EXCLUSIVE_RED_CONFIG: ReadonlyMap<string, readonly string[]> = new Map([
    ["新手村", []],
    ["五号小镇_机密行动", ["野生狗奶", "化石", "白金鸟蛋", "黄金方苹果"]],
    ["五号小镇_绝密行动", ["实验数据", "嘟嘟骑士", "曼德尔", "七彩鸟蛋", "极品平安果"]],
    ["沙漠古迹_机密行动", ["金条", "劳力士", "终端", "扫地机器"]],
    ["沙漠古迹_绝密行动", ["军用地图匣", "外星人笔记本", "万金", "刀片服务器"]],
    ["极北之地_机密行动", ["显卡", "留声机", "动力电池组", "卫星锅", "半身像"]],
    ["极北之地_绝密行动", ["军用雷达", "ECMO", "飞行记录仪", "火箭燃料", "医疗机器人"]],
]);

/**
 * 跨地图通用大红。
 * 所有未被分配为地图专属特产的红色“物品”都会自动进入这里；新增红色物品时，
 * 如果没有放入上面的专属配置，也会自动成为通用大红，避免意外从游戏中消失。
 */
const ZRSJZ_EXCLUSIVE_RED_PROP_SET: ReadonlySet<string> = new Set(
    Array.from(ZRSJZ_MAP_EXCLUSIVE_RED_CONFIG.values()).flatMap(props => [...props]),
);
export const ZRSJZ_UNIVERSAL_RED_CONFIG: readonly string[] = Object.freeze(
    Array.from(ZRSJZ_PROP_CONFIG.values())
        .filter(prop =>
            prop.Quality === ZRSJZ_PROP_QUALITY.红色
            && prop.PropType === "物品"
            && !ZRSJZ_EXCLUSIVE_RED_PROP_SET.has(prop.Name)
        )
        .map(prop => prop.Name),
);

function CanEquipmentDropFromMapBox(prop: { PropType: string, Quality: ZRSJZ_PROP_QUALITY }): boolean {
    return prop.PropType !== "背包"
        && (!ZRSJZ_MAP_BOX_EQUIPMENT_TYPES.includes(prop.PropType)
            || ZRSJZ_MAP_BOX_EQUIPMENT_QUALITIES.includes(prop.Quality));
}

const ZRSJZ_MAP_PROP_POOL: string[][] = [
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.白色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType) && CanEquipmentDropFromMapBox(prop)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.绿色 && (ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType) || prop.Name == "CN8-突击步枪") && CanEquipmentDropFromMapBox(prop)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.蓝色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType) && CanEquipmentDropFromMapBox(prop)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.紫色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType) && CanEquipmentDropFromMapBox(prop)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.金色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType) && CanEquipmentDropFromMapBox(prop)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.红色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType) && CanEquipmentDropFromMapBox(prop)).map(prop => prop.Name),
];

function CreateMapBoxConfig(
    boxName: string,
    modeIndex: number,
    minPropCount: number,
    maxPropCount: number,
    qualityBonus: number = 0,
    guaranteedPropTypes: readonly string[] = [],
): ZRSJZ_BoxConfig {
    const lootIndex = Math.max(
        0,
        Math.min(ZRSJZ_MAP_LOOT_WEIGHTS.length - 1, modeIndex + qualityBonus),
    );
    return {
        BoxName: boxName,
        MinPropCount: minPropCount,
        MaxPropCount: Math.max(minPropCount, maxPropCount),
        Probability: [...ZRSJZ_MAP_LOOT_WEIGHTS[lootIndex]],
        GuaranteedPropTypes: [...guaranteedPropTypes],
    };
}

function CreateMapModeConfig(
    mapKey: string,
    displayName: string,
    actionName: string,
    mapName: string,
    modeIndex: number,
): ZRSJZ_MapConfig {
    const hpMultiplier = ZRSJZ_MAP_HP_MULTIPLIERS[modeIndex];
    const harmMultiplier = ZRSJZ_MAP_HARM_MULTIPLIERS[modeIndex];
    const bossHarmMultiplier = ZRSJZ_MAP_BOSS_HARM_MULTIPLIERS[modeIndex];
    const speedMultiplier = ZRSJZ_MAP_SPEED_MULTIPLIERS[modeIndex];
    const attackIntervalMultiplier = ZRSJZ_MAP_ATTACK_INTERVAL_MULTIPLIERS[modeIndex];
    const requiredValue = ZRSJZ_MAP_REQUIRED_VALUES[modeIndex];
    const commonMin = 2 + Math.floor(modeIndex / 3);
    const commonMax = 4 + Math.ceil(modeIndex / 2);
    const eliteMin = 3 + Math.floor(modeIndex / 3);
    const eliteMax = 5 + Math.ceil(modeIndex / 2);
    const exclusiveRedProps = [...(ZRSJZ_MAP_EXCLUSIVE_RED_CONFIG.get(mapKey) ?? [])];
    const universalRedProps = [...ZRSJZ_UNIVERSAL_RED_CONFIG];
    // 红色房卡、弹药等不是“大红物资”，继续保留原有跨地图掉落规则。
    const otherRedProps = ZRSJZ_MAP_PROP_POOL[5].filter(propName =>
        ZRSJZ_PROP_CONFIG.get(propName)?.PropType !== "物品"
    );
    const paracargoConfig: ZRSJZ_ParacargoConfig = {
        SpawnTimeSeconds: mapKey === "新手村" ? 0 : ZRSJZ_PARACARGO_SPAWN_TIMES[modeIndex],
        DropHeight: 1800,
        DropDuration: Math.max(3, 5 - modeIndex * 0.25),
        MinPropCount: 5 + Math.floor(modeIndex / 2),
        MaxPropCount: 7 + Math.floor(modeIndex / 2),
        GuaranteedEquipmentCount: 2 + Math.floor(modeIndex / 3),
        // 与普通箱子一致，装备最高只到第四级（紫色）；低难度空投最低蓝色，高难度最低紫色。
        MinEquipmentQualityIndex: Math.min(3, 2 + Math.floor(modeIndex / 3)),
        // 空投仍保底一件高价值物资，其余栏位只以较低概率继续生成物资。
        PropSlotChance: Math.min(0.4, 0.25 + modeIndex * 0.03),
        GoldPropWeight: 90 - modeIndex * 3,
        RedPropWeight: 10 + modeIndex * 3,
    };

    return {
        DisplayName: displayName,
        ActionName: actionName,
        Difficulty: modeIndex + 1,
        RequiredLoadoutValue: requiredValue,
        MissionLimit: requiredValue > 0 ? `战备价值达到${requiredValue}` : "无战备价值限制",
        TimeLimitMinutes: ZRSJZ_MAP_TIME_LIMITS[modeIndex],
        MapName: mapName,
        MapEnemy: new Map([
            ["持枪小兵", {
                HP: Math.round(100 * hpMultiplier),
                Harm: Math.round(10 * harmMultiplier),
                SpeedMultiplier: speedMultiplier,
                AttackIntervalMultiplier: attackIntervalMultiplier,
                Box: CreateMapBoxConfig(
                    "物资箱1", modeIndex, commonMin, commonMax, 0,
                    ["枪", "防弹衣", "头盔"],
                ),
            }],
            ["持刀小兵", {
                HP: Math.round(110 * hpMultiplier),
                Harm: Math.round(12 * harmMultiplier),
                SpeedMultiplier: speedMultiplier,
                AttackIntervalMultiplier: attackIntervalMultiplier,
                Box: CreateMapBoxConfig(
                    "物资箱1", modeIndex, commonMin, commonMax, 0,
                    ["防弹衣", "头盔"],
                ),
            }],
            ["喷火兵", {
                HP: Math.round(150 * hpMultiplier),
                Harm: Math.round(18 * harmMultiplier),
                SpeedMultiplier: speedMultiplier,
                AttackIntervalMultiplier: attackIntervalMultiplier,
                Box: CreateMapBoxConfig(
                    "物资箱3", modeIndex, eliteMin, eliteMax, 1,
                    ["防弹衣", "头盔"],
                ),
            }],
            ["盾牌兵", {
                HP: Math.round(220 * hpMultiplier),
                Harm: Math.round(11 * harmMultiplier),
                SpeedMultiplier: speedMultiplier,
                AttackIntervalMultiplier: attackIntervalMultiplier,
                Box: CreateMapBoxConfig(
                    "物资箱4", modeIndex, eliteMin, eliteMax, 1,
                    ["防弹衣", "头盔"],
                ),
            }],
        ]),
        MapBoss: new Map([
            ["Boss1", {
                HP: Math.round(1200 * hpMultiplier),
                HarmMultiple: bossHarmMultiplier,
                SpeedMultiplier: speedMultiplier,
                CooldownMultiplier: attackIntervalMultiplier,
                Box: CreateMapBoxConfig(
                    "物资箱5",
                    modeIndex,
                    5 + Math.floor(modeIndex / 2),
                    8 + Math.ceil(modeIndex / 2),
                    2,
                ),
            }],
            ["Boss2", {
                HP: Math.round(1050 * hpMultiplier),
                HarmMultiple: bossHarmMultiplier,
                SpeedMultiplier: speedMultiplier,
                CooldownMultiplier: attackIntervalMultiplier,
                Box: CreateMapBoxConfig(
                    "物资箱6",
                    modeIndex,
                    5 + Math.floor(modeIndex / 2),
                    8 + Math.ceil(modeIndex / 2),
                    2,
                ),
            }],
            ["Boss3", {
                HP: Math.round(1350 * hpMultiplier),
                HarmMultiple: bossHarmMultiplier,
                SpeedMultiplier: speedMultiplier,
                CooldownMultiplier: attackIntervalMultiplier,
                Box: CreateMapBoxConfig(
                    "物资箱7",
                    modeIndex,
                    5 + Math.floor(modeIndex / 2),
                    8 + Math.ceil(modeIndex / 2),
                    2,
                ),
            }],
        ]),
        MapBox: new Map([
            ["军备箱", CreateMapBoxConfig(
                "军备箱", modeIndex,
                4 + Math.floor(modeIndex / 2), 7 + modeIndex, 1,
            )],
            ["小木箱", CreateMapBoxConfig(
                "小木箱", modeIndex,
                2 + Math.floor(modeIndex / 3), 4 + modeIndex,
            )],
            ["小纸箱", CreateMapBoxConfig(
                "小纸箱", modeIndex,
                1 + Math.floor(modeIndex / 3), 3 + modeIndex, -1,
            )],
            ["木箱", CreateMapBoxConfig(
                "木箱", modeIndex,
                3 + Math.floor(modeIndex / 2), 6 + modeIndex,
            )],
            ["柜子", CreateMapBoxConfig(
                "柜子", modeIndex,
                3 + Math.floor(modeIndex / 2), 6 + modeIndex,
            )],
            ["密码箱", CreateMapBoxConfig(
                "密码箱", modeIndex,
                4 + Math.floor(modeIndex / 2), 7 + modeIndex, 2,
            )],
        ]),
        ExclusiveRedProps: exclusiveRedProps,
        UniversalRedProps: universalRedProps,
        Paracargo: paracargoConfig,
        MapProp: ZRSJZ_MAP_PROP_POOL.map((props, qualityIndex) =>
            qualityIndex === 5
                ? [...universalRedProps, ...exclusiveRedProps, ...otherRedProps]
                : [...props]
        ),
    };
}

/** 三张地图、两种行动，共六个由易到难的模式。 */
export const ZRSJZ_MAP_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_MapConfig>> = new Map([
    ["新手村", CreateMapModeConfig("新手村", "新手村", "机密行动", "新手村", 0)],
    ["五号小镇_机密行动", CreateMapModeConfig("五号小镇_机密行动", "五号小镇", "机密行动", "城镇", 0)],
    ["五号小镇_绝密行动", CreateMapModeConfig("五号小镇_绝密行动", "五号小镇", "绝密行动", "城镇", 1)],
    ["沙漠古迹_机密行动", CreateMapModeConfig("沙漠古迹_机密行动", "沙漠古迹", "机密行动", "沙漠", 2)],
    ["沙漠古迹_绝密行动", CreateMapModeConfig("沙漠古迹_绝密行动", "沙漠古迹", "绝密行动", "沙漠", 3)],
    ["极北之地_机密行动", CreateMapModeConfig("极北之地_机密行动", "极北之地", "机密行动", "雪地", 4)],
    ["极北之地_绝密行动", CreateMapModeConfig("极北之地_绝密行动", "极北之地", "绝密行动", "雪地", 5)],
]);

//#region 任务

// 主线任务
//任务目标
export interface ZRSJZ_MainTaskTargetConfig {
    TaskTargetName: string;//任务目标名字
    TaskTargetCount: number;//任务目标数量
}
//任务奖励
export interface ZRSJZ_MainTaskAwardConfig {
    TaskAwardName: string;//任务奖励名字
    TaskAwardCount: number;//任务奖励数量
}

export interface ZRSJZ_MainTaskConfig {
    TaskName: string;//任务名字
    TaskDesc: string;//任务描述
    TaskTargets: ReadonlyArray<ZRSJZ_MainTaskTargetConfig>;//任务目标
    TaskAwards: ReadonlyArray<ZRSJZ_MainTaskAwardConfig>;//任务奖励
}

/**
 * 主线奖励固定提供钞票和一组满额弹药，额外奖励用于发放当前阶段的装备或成长物资。
 * 将数值集中在任务配置中，方便后续按关卡难度继续调整。
 */
function CreateMainTaskAwards(
    gold: number,
    exp: number,
    ammoName: string,
    ...extraAwards: Array<string | ZRSJZ_MainTaskAwardConfig>
): ZRSJZ_MainTaskAwardConfig[] {
    return [
        { TaskAwardName: "钞票", TaskAwardCount: gold },
        { TaskAwardName: "经验", TaskAwardCount: exp },
        { TaskAwardName: ammoName, TaskAwardCount: ZRSJZ_AMMO_MAX_COUNT },
        ...extraAwards.map(award => typeof award === "string"
            ? { TaskAwardName: award, TaskAwardCount: 1 }
            : award
        ),
    ];
}

function CreateMainTaskPropAward(TaskAwardName: string, TaskAwardCount: number): ZRSJZ_MainTaskAwardConfig {
    return { TaskAwardName, TaskAwardCount };
}

export const ZRSJZ_MAIN_TASK_CONFIG: Map<string, Readonly<ZRSJZ_MainTaskConfig>> = new Map([
    ["初入禁区", {
        TaskName: "初入禁区",
        TaskDesc: "完成新手教程，熟悉移动、战斗、搜索物资与撤离等基础操作，为接下来的行动做好准备。",
        TaskTargets: [
            {
                TaskTargetName: "完成新手教程",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(50000, 100, "1级子弹", "CN8-突击步枪", "黑色手表", "量子U盘"),
    }],
    ["弹药补给", {
        TaskName: "弹药补给",
        TaskDesc: "前往商城购买1级子弹。充足的弹药是每次行动顺利完成的基础保障。",
        TaskTargets: [
            {
                TaskTargetName: "在商城购买[1级子弹]",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(60000, 100, "1级子弹", "一级头", "哑铃", "沙袋"),
    }],
    ["物资变现", {
        TaskName: "物资变现",
        TaskDesc: "出售一件任意物品，熟悉物资交易流程，并为后续战备积累钞票。",
        TaskTargets: [

            {
                TaskTargetName: "出售任意物品",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(70000, 100, "1级子弹", "一级甲", "切割刀", "工业图纸"),
    }],
    ["强化", {
        TaskName: "强化",
        TaskDesc: "完成一次强化，提升自身战斗能力，以应对禁区中更危险的敌人。",
        TaskTargets: [
            {
                TaskTargetName: "强化1次",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(80000, 200, "2级子弹", "一级包", "高精数显卡尺", "电动马达"),
    }],
    ["小镇初探", {
        TaskName: "小镇初探",
        TaskDesc: "进入五号小镇的机密行动区域，在搜集物资后抵达撤离点并成功撤离。",
        TaskTargets: [
            {
                TaskTargetName: "进入[五号小镇_机密行动]并成功撤离",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(100000, 200, "2级子弹", "二级头", "太阳能板", "脑机数据"),
    }],
    ["街区清剿", {
        TaskName: "街区清剿",
        TaskDesc: "五号小镇的敌人正在封锁主要街区。进入机密行动区域，击杀5名敌人以削弱他们的力量。",
        TaskTargets: [
            {
                TaskTargetName: "击杀[五号小镇_机密行动]中的敌人",
                TaskTargetCount: 5,
            },
        ],
        TaskAwards: CreateMainTaskAwards(
            120000,
            200,
            "2级子弹",
            "二级甲",
            CreateMainTaskPropAward("哑铃", 4),
            CreateMainTaskPropAward("沙袋", 4),
        ),
    }],
    ["解放小镇", {
        TaskName: "解放小镇",
        TaskDesc: "敌方首领仍在控制五号小镇。进入机密行动区域击败Boss，彻底解除小镇的威胁。",
        TaskTargets: [
            {
                TaskTargetName: "打败[五号小镇_机密行动]Boss",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(180000, 200, "3级子弹", "二级包", "K50-轻机枪", "协议箱", "汽车燃油"),
    }],
    ["重返小镇", {
        TaskName: "重返小镇",
        TaskDesc: "更危险的敌人已重新占据五号小镇。进入绝密行动区域完成侦察，并携带情报成功撤离。",
        TaskTargets: [
            {
                TaskTargetName: "进入[五号小镇_绝密行动]并成功撤离",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(
            200000,
            200,
            "3级子弹",
            "三级头",
            CreateMainTaskPropAward("脑机数据", 2),
            "除颤器",
        ),
    }],
    ["暗巷肃清", {
        TaskName: "暗巷肃清",
        TaskDesc: "绝密行动区域内的敌人正在集结。深入五号小镇，击杀10名敌人，打乱他们的部署。",
        TaskTargets: [
            {
                TaskTargetName: "击杀[五号小镇_绝密行动]中的敌人",
                TaskTargetCount: 10,
            },
        ],
        TaskAwards: CreateMainTaskAwards(
            250000,
            200,
            "3级子弹",
            "三级甲",
            CreateMainTaskPropAward("哑铃", 8),
            CreateMainTaskPropAward("沙袋", 8),
        ),
    }],
    ["小镇决战", {
        TaskName: "小镇决战",
        TaskDesc: "敌方精锐首领藏身于五号小镇深处。进入绝密行动区域击败Boss，结束小镇争夺战。",
        TaskTargets: [
            {
                TaskTargetName: "打败[五号小镇_绝密行动]Boss",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(350000, 200, "4级子弹", "三级包", "RK77-轻机枪", "高速阵列", "供能单元"),
    }],
    ["踏入古迹", {
        TaskName: "踏入古迹",
        TaskDesc: "新的线索指向沙漠古迹。进入机密行动区域调查遗迹周边，并在确认安全路线后成功撤离。",
        TaskTargets: [
            {
                TaskTargetName: "进入[沙漠古迹_机密行动]并成功撤离",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(400000, 200, "4级子弹", "四级头", "信息终端", "呼吸机"),
    }],
    ["遗迹清剿", {
        TaskName: "遗迹清剿",
        TaskDesc: "敌人已在遗迹外围建立据点。进入沙漠古迹的机密行动区域，击杀10名敌人，清理推进路线。",
        TaskTargets: [
            {
                TaskTargetName: "击杀[沙漠古迹_机密行动]中的敌人",
                TaskTargetCount: 10,
            },
        ],
        TaskAwards: CreateMainTaskAwards(
            500000,
            200,
            "4级子弹",
            "四级甲",
            CreateMainTaskPropAward("电动马达", 2),
            CreateMainTaskPropAward("汽车燃油", 2),
        ),
    }],
    ["黄沙守卫", {
        TaskName: "黄沙守卫",
        TaskDesc: "遗迹守卫者阻断了深入沙漠的道路。进入机密行动区域击败Boss，夺取古迹外围的控制权。",
        TaskTargets: [
            {
                TaskTargetName: "打败[沙漠古迹_机密行动]Boss",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(700000, 200, "5级子弹", "四级包", "FS-霰弹枪", "军用电台", "军用雷达"),
    }],
    ["深入禁地", {
        TaskName: "深入禁地",
        TaskDesc: "古迹深处出现高价值信号。进入沙漠古迹的绝密行动区域完成侦察，并带着调查结果成功撤离。",
        TaskTargets: [
            {
                TaskTargetName: "进入[沙漠古迹_绝密行动]并成功撤离",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(800000, 200, "5级子弹", "五级头", "反应炉", "医疗机器人"),
    }],
    ["沙海歼敌", {
        TaskName: "沙海歼敌",
        TaskDesc: "大批敌方精锐盘踞在古迹核心区域。进入绝密行动区域，击杀15名敌人，为最终进攻扫清障碍。",
        TaskTargets: [
            {
                TaskTargetName: "击杀[沙漠古迹_绝密行动]中的敌人",
                TaskTargetCount: 15,
            },
        ],
        TaskAwards: CreateMainTaskAwards(1000000, 200, "5级子弹", "五级甲", "供能单元", "反应炉"),
    }],
    ["古迹终战", {
        TaskName: "古迹终战",
        TaskDesc: "盘踞古迹的首领掌握着北境行动的关键线索。进入绝密行动区域击败Boss，结束沙漠战役。",
        TaskTargets: [
            {
                TaskTargetName: "打败[沙漠古迹_绝密行动]Boss",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(1300000, 200, "6级子弹", "五级包", "ssv-狙击枪", "金条", "无人机"),
    }],
    ["北境远征", {
        TaskName: "北境远征",
        TaskDesc: "追踪古迹中的线索前往极北之地。进入机密行动区域勘察雪原环境，并成功撤离。",
        TaskTargets: [
            {
                TaskTargetName: "进入[极北之地_机密行动]并成功撤离",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(1500000, 200, "6级子弹", "六级头", "军用电台", "动力电池组"),
    }],
    ["雪原清剿", {
        TaskName: "雪原清剿",
        TaskDesc: "敌人依托严寒环境封锁了雪原通道。进入极北之地的机密行动区域，击杀15名敌人。",
        TaskTargets: [
            {
                TaskTargetName: "击杀[极北之地_机密行动]中的敌人",
                TaskTargetCount: 15,
            },
        ],
        TaskAwards: CreateMainTaskAwards(1800000, 200, "6级子弹", "六级甲", "信息大终端", "军用雷达"),
    }],
    ["冰原霸主", {
        TaskName: "冰原霸主",
        TaskDesc: "雪原据点的首领正在阻止远征队继续前进。进入机密行动区域击败Boss，打开北境通道。",
        TaskTargets: [
            {
                TaskTargetName: "打败[极北之地_机密行动]Boss",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(2200000, 200, "6级子弹", "六级包", "W76-狙击枪", "飞行记录仪", "火箭燃料"),
    }],
    ["终极潜入", {
        TaskName: "终极潜入",
        TaskDesc: "最后的敌方据点位于极北之地深处。进入绝密行动区域取得核心情报，并从封锁中成功撤离。",
        TaskTargets: [
            {
                TaskTargetName: "进入[极北之地_绝密行动]并成功撤离",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(2500000, 200, "6级子弹", "高级房卡", "碳纤维", "医疗机器人"),
    }],
    ["极寒决战", {
        TaskName: "极寒决战",
        TaskDesc: "敌方残余力量正在绝密区域集结。深入极北之地，击杀20名敌人，瓦解他们最后的防线。",
        TaskTargets: [
            {
                TaskTargetName: "击杀[极北之地_绝密行动]中的敌人",
                TaskTargetCount: 20,
            },
        ],
        TaskAwards: CreateMainTaskAwards(3000000, 200, "6级子弹", "动力电池组", "坦克", "特供咖啡豆"),
    }],
    ["北境终局", {
        TaskName: "北境终局",
        TaskDesc: "幕后首领已在极北之地的核心据点现身。进入绝密行动区域击败Boss，完成禁区主线行动。",
        TaskTargets: [
            {
                TaskTargetName: "打败[极北之地_绝密行动]Boss",
                TaskTargetCount: 1,
            },
        ],
        TaskAwards: CreateMainTaskAwards(5000000, 200, "6级子弹", "KK41-霰弹枪", "反应炉", "烽火奖杯"),
    }],
])

//局内任务----特别行动

/** 特别行动中的概率物资奖励。Probability 使用 0~1，例如 0.06 表示 6%。 */
export interface ZRSJZ_SpecialOperationPropAwardConfig {
    PropName: string;
    Count: number;
    Probability: number;
}

export type ZRSJZ_SpecialOperationTaskType = "高价值目标" | "坚守轰炸区" | "破壁行动" | "待定";

/** 局内特别行动配置，后续调整任务难度、奖励或限时时只需修改此处。 */
export interface ZRSJZ_SpecialOperationConfig {
    TaskType: ZRSJZ_SpecialOperationTaskType;
    TaskName: string;
    TaskDesc: string;
    TargetKillCount: number;
    GoldReward: number;
    PropAwards: ReadonlyArray<ZRSJZ_SpecialOperationPropAwardConfig>;
    TimeLimitSeconds: number;
}

function CreateSpecialOperationPropAward(
    PropName: string,
    Probability: number,
    Count: number = 1,
): ZRSJZ_SpecialOperationPropAwardConfig {
    return {
        PropName,
        Count: Math.max(1, Math.floor(Count)),
        // 即使后续配置时误填过高数值，也保证特别行动单项掉率不超过 30%。
        Probability: Math.max(0, Math.min(0.3, Probability)),
    };
}

/**
 * 局内任务----特别行动
 * 难度顺序：小镇机密 → 小镇绝密 → 沙漠机密 → 沙漠绝密 → 极北机密 → 极北绝密。
 * 概率物资为逐项独立判定，因此可能不掉落，也可能同时获得多件物资。
 */
export const ZRSJZ_SPECIAL_OPERATION_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_SpecialOperationConfig>> = new Map([
    ["五号小镇_机密行动", {
        TaskType: "高价值目标",
        TaskName: "高价值目标",
        TaskDesc: "击败行动开始后出现的高价值目标。",
        TargetKillCount: 1,
        GoldReward: 60000,
        PropAwards: [
            CreateSpecialOperationPropAward("化石", 0.06),
            CreateSpecialOperationPropAward("黄金方苹果", 0.04),
        ],
        TimeLimitSeconds: 180,
    }],
    ["五号小镇_绝密行动", {
        TaskType: "坚守轰炸区",
        TaskName: "坚守轰炸区",
        TaskDesc: "必须在规定时间内留在轰炸区范围内，离开范围任务立即失败。",
        TargetKillCount: 0,
        GoldReward: 100000,
        PropAwards: [
            CreateSpecialOperationPropAward("实验数据", 0.09),
            CreateSpecialOperationPropAward("曼德尔", 0.07),
        ],
        TimeLimitSeconds: 30,
    }],
    ["沙漠古迹_机密行动", {
        TaskType: "高价值目标",
        TaskName: "高价值目标",
        TaskDesc: "击败行动开始后出现的高价值目标。",
        TargetKillCount: 1,
        GoldReward: 160000,
        PropAwards: [
            CreateSpecialOperationPropAward("金条", 0.13),
            CreateSpecialOperationPropAward("劳力士", 0.10),
        ],
        TimeLimitSeconds: 160,
    }],
    ["沙漠古迹_绝密行动", {
        TaskType: "坚守轰炸区",
        TaskName: "坚守轰炸区",
        TaskDesc: "必须在规定时间内留在轰炸区范围内，离开范围任务立即失败。",
        TargetKillCount: 0,
        GoldReward: 260000,
        PropAwards: [
            CreateSpecialOperationPropAward("军用地图匣", 0.18),
            CreateSpecialOperationPropAward("刀片服务器", 0.14),
        ],
        TimeLimitSeconds: 28,
    }],
    ["极北之地_机密行动", {
        TaskType: "高价值目标",
        TaskName: "高价值目标",
        TaskDesc: "击败行动开始后出现的高价值目标。",
        TargetKillCount: 1,
        GoldReward: 400000,
        PropAwards: [
            CreateSpecialOperationPropAward("显卡", 0.23),
            CreateSpecialOperationPropAward("动力电池组", 0.18),
        ],
        TimeLimitSeconds: 140,
    }],
    ["极北之地_绝密行动", {
        TaskType: "坚守轰炸区",
        TaskName: "坚守轰炸区",
        TaskDesc: "必须在规定时间内留在轰炸区范围内，离开范围任务立即失败。",
        TargetKillCount: 0,
        GoldReward: 600000,
        PropAwards: [
            CreateSpecialOperationPropAward("军用雷达", 0.28),
            CreateSpecialOperationPropAward("医疗机器人", 0.23),
        ],
        TimeLimitSeconds: 25,
    }],
]);

/**
 * 获取任务点最终配置。任务类别由特别行动预制体实例的 TaskName 决定；
 * 可填写“高价值目标 / 坚守轰炸区 / 破壁行动 / 待定”。无效值才回退到关卡默认类型。
 */
export function GetSpecialOperationConfig(
    mapKey: string,
    taskType?: ZRSJZ_SpecialOperationTaskType,
): Readonly<ZRSJZ_SpecialOperationConfig> | undefined {
    const baseConfig = ZRSJZ_SPECIAL_OPERATION_CONFIG.get(mapKey);
    if (!baseConfig || !taskType || taskType === baseConfig.TaskType) return baseConfig;
    const difficulty = ZRSJZ_MAP_CONFIG.get(mapKey)?.Difficulty ?? 1;
    if (taskType === "高价值目标") {
        return {
            ...baseConfig,
            TaskType: taskType,
            TaskName: "高价值目标",
            TaskDesc: "击败行动开始后出现的高价值目标。",
            TargetKillCount: 1,
            TimeLimitSeconds: Math.max(120, 190 - difficulty * 10),
        };
    }
    if (taskType === "坚守轰炸区") {
        return {
            ...baseConfig,
            TaskType: taskType,
            TaskName: "坚守轰炸区",
            TaskDesc: "必须在规定时间内留在轰炸区范围内，离开范围任务立即失败。",
            TargetKillCount: 0,
            TimeLimitSeconds: Math.max(22, 34 - difficulty * 2),
        };
    }
    if (taskType === "破壁行动") {
        return {
            ...baseConfig,
            TaskType: taskType,
            TaskName: "破壁行动",
            TaskDesc: "保险门将自动开启，请在限时内破解并开启邮箱中的全部9个箱位。",
            TargetKillCount: 0,
            TimeLimitSeconds: Math.max(120, 240 - difficulty * 10),
        };
    }
    return {
        ...baseConfig,
        TaskType: "待定",
        TaskName: "待定任务",
        TaskDesc: "第三种特别行动暂未开放。",
        TargetKillCount: 0,
    };
}

//#region 增强针
//增强针配置
export interface ZRSJZ_BoosterShotConfig {
    Name: string;// 名称
    UnlockType: string;//解锁类型--钞票/视频
    Price: number;//金额/次数
    Booster: string;//增强类型
    Count: number;//增强额度
    Desc: string;//描述
}

export const ZRSJZ_BOOSTER_SHOT_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_BoosterShotConfig>> = new Map([
    ["生命针", {
        Name: "生命针",
        UnlockType: "钞票",
        Price: 100000,
        Booster: "生命",
        Count: 50,
        Desc: "增加50点生命值"
    }],
    ["防御针", {
        Name: "防御针",
        UnlockType: "钞票",
        Price: 300000,
        Booster: "防御",
        Count: 20,
        Desc: "敌人伤害降低20%"
    }],
    ["攻击针", {
        Name: "攻击针",
        UnlockType: "钞票",
        Price: 1000000,
        Booster: "攻击力",
        Count: 15,
        Desc: "玩家伤害增加15%"
    }],
    ["爆率针", {
        Name: "爆率针",
        UnlockType: "视频",
        Price: 1,
        Booster: "爆率",
        Count: 50,
        Desc: "大红掉落的概率增加50%"
    }],
    ["移速针", {
        Name: "移速针",
        UnlockType: "视频",
        Price: 1,
        Booster: "移速",
        Count: 20,
        Desc: "玩家移速增加20%"
    }],
])

//#region 邮件

export enum ZRSJZ_MAIL_TYPE {
    仓库已满 = "仓库已满",
    其他模式中获取道具 = "文字大乱斗",
}

export const ZRSJZ_MAIL_DESC: ReadonlyMap<string, string> = new Map([
    [ZRSJZ_MAIL_TYPE.仓库已满, "    干员请注意，仓库容量已达上限，请立即清查整理仓库，售出无用物品。该任务存在一定难度，请审慎取舍。请认真完成，此举既能解决当前库容问题，也能保障团队后续稳定运转与工作效率。"],
    [ZRSJZ_MAIL_TYPE.其他模式中获取道具, "    干员您好！这是您于文字大乱斗中获取的专属道具，奖励现已为您下发，请及时查收领取。期待见证您在对局中的精彩发挥，祝您游戏顺遂，日日愉快！"],
])

/** 邮件中的一项道具附件。旧存档中的字符串附件会在 MailService 中自动转换。 */
export interface ZRSJZ_MailPropAward {
    PropName: string;
    Count: number;
}

export interface ZRSJZ_MailConfig {
    Type: string;//邮件类型
    Time: string;//时间
    PropAwards: Array<string | ZRSJZ_MailPropAward>;//道具奖励（string 用于兼容旧存档）
}
