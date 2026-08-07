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
    升级弹窗 = "73_ZRSJZ/Prefabs/Panel/升级弹窗",
    密码箱弹窗 = "73_ZRSJZ/Prefabs/Panel/密码箱弹窗",
    医疗箱弹窗 = "73_ZRSJZ/Prefabs/Panel/医疗箱弹窗",
    死亡弹窗 = "73_ZRSJZ/Prefabs/Panel/死亡弹窗",
    加载界面 = "73_ZRSJZ/Prefabs/Panel/加载界面",
    签到弹窗 = "73_ZRSJZ/Prefabs/Panel/签到弹窗",
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
    ["实验数据", { Name: "实验数据", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 1800, MaxCount: 1 }],
    ["柠檬茶", { Name: "柠檬茶", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 1600, MaxCount: 1 }],
    ["黑色手表", { Name: "黑色手表", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 2200, MaxCount: 1 }],
    //1x1 --  绿
    ["地图", { Name: "地图", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 5400, MaxCount: 1 }],
    ["怀表", { Name: "怀表", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 4700, MaxCount: 1 }],
    ["无线便携电钻", { Name: "无线便携电钻", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 5500, MaxCount: 1 }],
    ["苹果", { Name: "苹果", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 4400, MaxCount: 1 }],
    ["量子U盘", { Name: "量子U盘", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 5600, MaxCount: 1 }],
    //1x1 --  蓝
    ["化石", { Name: "化石", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 13000, MaxCount: 1 }],
    ["手雷", { Name: "手雷", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 11000, MaxCount: 1 }],
    ["脑机数据", { Name: "脑机数据", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 11000, MaxCount: 1 }],
    ["鱼子酱", { Name: "鱼子酱", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 13000, MaxCount: 1 }],
    //1x1 --  紫
    ["古玩钱币", { Name: "古玩钱币", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 29000, MaxCount: 1 }],
    ["镜子", { Name: "镜子", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 29000, MaxCount: 1 }],
    ["香槟", { Name: "香槟", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 36000, MaxCount: 1 }],
    //1x1 --  金
    ["纵横", { Name: "纵横", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 74000, MaxCount: 1 }],
    ["金条", { Name: "金条", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 81000, MaxCount: 1 }],
    ["高速阵列", { Name: "高速阵列", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 94000, MaxCount: 1 }],
    //1x1 --  红
    ["万金泪冠", { Name: "万金泪冠", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 218000, MaxCount: 1 }],
    ["劳力士", { Name: "劳力士", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 236000, MaxCount: 1 }],
    ["曼德尔", { Name: "曼德尔", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "物品", UnitPrice: 194000, MaxCount: 1 }],

    //1x2 --  白
    ["哑铃", { Name: "哑铃", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 3600, MaxCount: 1 }],
    ["沙袋", { Name: "沙袋", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 3200, MaxCount: 1 }],
    ["高精数显卡尺", { Name: "高精数显卡尺", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 3300, MaxCount: 1 }],
    //1x2 --  绿
    ["太阳能板", { Name: "太阳能板", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 11000, MaxCount: 1 }],
    ["扫地机器", { Name: "扫地机器", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 9000, MaxCount: 1 }],
    //1x2 --  蓝
    ["万金", { Name: "万金", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 20000, MaxCount: 1 }],
    ["刀片服务器", { Name: "刀片服务器", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 26000, MaxCount: 1 }],
    ["显卡", { Name: "显卡", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 28000, MaxCount: 1 }],
    //1x2 --  紫
    ["封存音源卫", { Name: "封存音源卫", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 67000, MaxCount: 1 }],
    ["电动马达", { Name: "电动马达", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 63000, MaxCount: 1 }],
    ["终端", { Name: "终端", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 58000, MaxCount: 1 }],
    //1x2 --  金
    ["军用地图匣", { Name: "军用地图匣", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 189000, MaxCount: 1 }],
    ["外星人笔记本", { Name: "外星人笔记本", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 146000, MaxCount: 1 }],
    ["炮弹", { Name: "炮弹", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 184000, MaxCount: 1 }],
    //1x2 --  红
    ["各种红蛋", { Name: "各种红蛋", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 500000, MaxCount: 1 }],
    ["155炮弹", { Name: "155炮弹", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 420000, MaxCount: 1 }],
    ["供能单元", { Name: "供能单元", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 412000, MaxCount: 1 }],
    ["装甲车电池", { Name: "装甲车电池", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 476000, MaxCount: 1 }],
    ["金玫瑰", { Name: "金玫瑰", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 344000, MaxCount: 1 }],

    //2x2 --  白
    ["水泥石砖", { Name: "水泥石砖", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 8200, MaxCount: 1 }],
    ["留声机", { Name: "留声机", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 6700, MaxCount: 1 }],
    ["瞪铃", { Name: "瞪铃", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 9200, MaxCount: 1 }],
    //2x2 --  绿
    ["军用电话", { Name: "军用电话", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 21000, MaxCount: 1 }],
    ["摄影机", { Name: "摄影机", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 23000, MaxCount: 1 }],
    ["阿萨拉时尚周刊", { Name: "阿萨拉时尚周刊", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 21000, MaxCount: 1 }],
    //2x2 --  蓝
    ["克小圈玩偶", { Name: "克小圈玩偶", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 54000, MaxCount: 1 }],
    ["天圆地方", { Name: "天圆地方", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 52000, MaxCount: 1 }],
    ["笔记本电脑", { Name: "笔记本电脑", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 43000, MaxCount: 1 }],
    ["绿瓦斯罐", { Name: "绿瓦斯罐", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 50000, MaxCount: 1 }],
    ["麦小蛋玩偶", { Name: "麦小蛋玩偶", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 47000, MaxCount: 1 }],
    //2x2 --  紫
    ["云存储", { Name: "云存储", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 139000, MaxCount: 1 }],
    ["信息大终端", { Name: "信息大终端", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 97000, MaxCount: 1 }],
    ["军用电台", { Name: "军用电台", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 133000, MaxCount: 1 }],
    ["动力电池组", { Name: "动力电池组", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 124000, MaxCount: 1 }],
    //2x2 --  金
    ["信息终端", { Name: "信息终端", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 365000, MaxCount: 1 }],
    ["烽火奖杯", { Name: "烽火奖杯", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 278000, MaxCount: 1 }],
    ["玄武", { Name: "玄武", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 294000, MaxCount: 1 }],
    ["除颤器", { Name: "除颤器", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 314000, MaxCount: 1 }],
    ["飞行记录仪", { Name: "飞行记录仪", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 374000, MaxCount: 1 }],
    //2x2 --  红
    ["反应炉", { Name: "反应炉", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 760000, MaxCount: 1 }],
    ["呼吸机", { Name: "呼吸机", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 712000, MaxCount: 1 }],
    ["欧洲之心", { Name: "欧洲之心", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 784000, MaxCount: 1 }],
    ["步战车", { Name: "步战车", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "物品", UnitPrice: 712000, MaxCount: 1 }],

    //2x3 --  白
    ["勇士半身像", { Name: "勇士半身像", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 10000, MaxCount: 1 }],
    ["水泥", { Name: "水泥", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 13000, MaxCount: 1 }],
    //2x3 --  绿
    ["八音盒", { Name: "八音盒", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 33000, MaxCount: 1 }],
    ["半身像", { Name: "半身像", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 29000, MaxCount: 1 }],
    ["吸尘器", { Name: "吸尘器", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 33000, MaxCount: 1 }],
    //2x3 --  蓝
    ["协议箱", { Name: "协议箱", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 77000, MaxCount: 1 }],
    ["无人机", { Name: "无人机", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 67000, MaxCount: 1 }],
    ["机器人", { Name: "机器人", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 80000, MaxCount: 1 }],
    //2x3 --  紫
    ["卫星锅", { Name: "卫星锅", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 176000, MaxCount: 1 }],
    ["印象派名画", { Name: "印象派名画", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 205000, MaxCount: 1 }],
    ["碳纤维", { Name: "碳纤维", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 166000, MaxCount: 1 }],
    //2x3 --  金
    ["ECMO", { Name: "ECMO", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 533000, MaxCount: 1 }],
    ["军用雷达", { Name: "军用雷达", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 552000, MaxCount: 1 }],
    ["黄金鳄鱼头", { Name: "黄金鳄鱼头", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 475000, MaxCount: 1 }],
    //2x3 --  红
    ["咖啡豆", { Name: "咖啡豆", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1250000, MaxCount: 1 }],
    ["医疗机器人", { Name: "医疗机器人", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1224000, MaxCount: 1 }],
    ["坦克", { Name: "坦克", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1332000, MaxCount: 1 }],
    ["浮力机器设备", { Name: "浮力机器设备", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1368000, MaxCount: 1 }],
    ["火箭燃料", { Name: "火箭燃料", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1068000, MaxCount: 1 }],

    //房卡
    ["低级房卡", { Name: "低级房卡", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "房卡", UnitPrice: 26000, MaxCount: 1 }],
    ["中级房卡", { Name: "中级房卡", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "房卡", UnitPrice: 79000, MaxCount: 1 }],
    ["高级房卡", { Name: "高级房卡", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "房卡", UnitPrice: 218000, MaxCount: 1 }],

    //子弹
    ["1级子弹", { Name: "1级子弹", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 1900, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["2级子弹", { Name: "2级子弹", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 4700, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["3级子弹", { Name: "3级子弹", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 13000, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["4级子弹", { Name: "4级子弹", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 26000, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["5级子弹", { Name: "5级子弹", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 79000, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    ["6级子弹", { Name: "6级子弹", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 218000, MaxCount: ZRSJZ_AMMO_MAX_COUNT }],
    //头盔
    ["一级头", { Name: "一级头", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 2200, MaxCount: 1 }],
    ["二级头", { Name: "二级头", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 5100, MaxCount: 1 }],
    ["三级头", { Name: "三级头", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 13000, MaxCount: 1 }],
    ["四级头", { Name: "四级头", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 32000, MaxCount: 1 }],
    ["五级头", { Name: "五级头", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 78000, MaxCount: 1 }],
    ["六级头", { Name: "六级头", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 196000, MaxCount: 1 }],
    //防弹衣
    ["一级甲", { Name: "一级甲", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 8800, MaxCount: 1 }],
    ["二级甲", { Name: "二级甲", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 16000, MaxCount: 1 }],
    ["三级甲", { Name: "三级甲", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 49000, MaxCount: 1 }],
    ["四级甲", { Name: "四级甲", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 112000, MaxCount: 1 }],
    ["五级甲", { Name: "五级甲", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 286000, MaxCount: 1 }],
    ["六级甲", { Name: "六级甲", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 720000, MaxCount: 1 }],
    //背包
    ["一级包", { Name: "一级包", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 9300, MaxCount: 1 }],
    ["二级包", { Name: "二级包", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 19000, MaxCount: 1 }],
    ["三级包", { Name: "三级包", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 47000, MaxCount: 1 }],
    ["四级包", { Name: "四级包", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 106000, MaxCount: 1 }],
    ["五级包", { Name: "五级包", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 258000, MaxCount: 1 }],
    ["六级包", { Name: "六级包", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 640000, MaxCount: 1 }],
    //枪
    ["CN8-突击步枪", { Name: "CN8-突击步枪", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 9000, MaxCount: 1 }],
    ["DX9-冲锋枪", { Name: "DX9-冲锋枪", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 10500, MaxCount: 1 }],
    ["K50-轻机枪", { Name: "K50-轻机枪", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 12500, MaxCount: 1 }],
    ["RK77-轻机枪", { Name: "RK77-轻机枪", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 15000, MaxCount: 1 }],
    ["FS-霰弹枪", { Name: "FS-霰弹枪", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 28000, MaxCount: 1 }],
    ["KK41-霰弹枪", { Name: "KK41-霰弹枪", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 36000, MaxCount: 1 }],
    ["ssv-狙击枪", { Name: "ssv-狙击枪", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 55000, MaxCount: 1 }],
    ["W76-狙击枪", { Name: "W76-狙击枪", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 68000, MaxCount: 1 }],
    //刀
    ["战术匕首", { Name: "战术匕首", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 8400, MaxCount: 1 }],
    ["刺厌", { Name: "刺厌", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 16000, MaxCount: 1 }],
    ["科技斧", { Name: "科技斧", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 56000, MaxCount: 1 }],
    ["熔岩剑", { Name: "熔岩剑", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 139000, MaxCount: 1 }],
    ["赤牙", { Name: "赤牙", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 168000, MaxCount: 1 }],
    ["魔刀", { Name: "魔刀", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 196000, MaxCount: 1 }],
])

// 道具描述：结合道具名称及图标外观，用于详情、商店和仓库界面展示。
export const ZRSJZ_PROP_DESCRIPTION: ReadonlyMap<string, string> = new Map([
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
    ["2级子弹", { "增伤": 2 }],
    ["3级子弹", { "增伤": 8 }],
    ["4级子弹", { "增伤": 10 }],
    ["5级子弹", { "增伤": 15 }],
    ["6级子弹", { "增伤": 18 }],
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
    ["一级包", { "背包等级": 1, "容量": 4 * 4, }],
    ["二级包", { "背包等级": 2, "容量": 6 * 4, }],
    ["三级包", { "背包等级": 3, "容量": 9 * 4, }],
    ["四级包", { "背包等级": 4, "容量": 13 * 4, }],
    ["五级包", { "背包等级": 5, "容量": 16 * 4, }],
    ["六级包", { "背包等级": 6, "容量": 20 * 4, }],
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
    /** 默认皮肤填 0，非默认皮肤为购买价格。 */
    Price: number;
}

export const ZRSJZ_WEAPON_SKIN: ReadonlyMap<string, ReadonlyArray<Readonly<ZRSJZ_WeaponSkinConfig>>> = new Map([
    ["CN8-突击步枪", [
        { Name: "CN8-突击步枪", Quality: ZRSJZ_PROP_QUALITY.绿色, Price: 0 },
        { Name: "CN8-毒剂", Quality: ZRSJZ_PROP_QUALITY.紫色, Price: 25000 },
        { Name: "CN8-红魔", Quality: ZRSJZ_PROP_QUALITY.红色, Price: 50000 },
    ]],
    ["DX9-冲锋枪", [
        { Name: "DX9-冲锋枪", Quality: ZRSJZ_PROP_QUALITY.绿色, Price: 0 },
        { Name: "DX9-零", Quality: ZRSJZ_PROP_QUALITY.蓝色, Price: 28000 },
        { Name: "DX9-未来金属", Quality: ZRSJZ_PROP_QUALITY.金色, Price: 56000 },
    ]],
    ["K50-轻机枪", [
        { Name: "K50-轻机枪", Quality: ZRSJZ_PROP_QUALITY.绿色, Price: 0 },
        { Name: "K50-云雾", Quality: ZRSJZ_PROP_QUALITY.紫色, Price: 36000 },
    ]],
    ["RK77-轻机枪", [
        { Name: "RK77-轻机枪", Quality: ZRSJZ_PROP_QUALITY.绿色, Price: 0 },
        { Name: "RK77-鼓手", Quality: ZRSJZ_PROP_QUALITY.金色, Price: 42000 },
    ]],
    ["FS-霰弹枪", [
        { Name: "FS-霰弹枪", Quality: ZRSJZ_PROP_QUALITY.蓝色, Price: 0 },
        { Name: "FS-白弧", Quality: ZRSJZ_PROP_QUALITY.紫色, Price: 65000 },
        { Name: "FS-橙灼", Quality: ZRSJZ_PROP_QUALITY.红色, Price: 110000 },
    ]],
    ["KK41-霰弹枪", [
        { Name: "KK41-霰弹枪", Quality: ZRSJZ_PROP_QUALITY.蓝色, Price: 0 },
        { Name: "KK41-见雪", Quality: ZRSJZ_PROP_QUALITY.紫色, Price: 78000 },
        { Name: "KK41-绫虹", Quality: ZRSJZ_PROP_QUALITY.金色, Price: 130000 },
    ]],
    ["ssv-狙击枪", [
        { Name: "ssv-狙击枪", Quality: ZRSJZ_PROP_QUALITY.紫色, Price: 0 },
        { Name: "ssv-星零", Quality: ZRSJZ_PROP_QUALITY.金色, Price: 120000 },
        { Name: "ssv-鎏光", Quality: ZRSJZ_PROP_QUALITY.红色, Price: 200000 },
    ]],
    ["W76-狙击枪", [
        { Name: "W76-狙击枪", Quality: ZRSJZ_PROP_QUALITY.紫色, Price: 0 },
        { Name: "W76-寒汐", Quality: ZRSJZ_PROP_QUALITY.金色, Price: 150000 },
        { Name: "W76-紫墟", Quality: ZRSJZ_PROP_QUALITY.红色, Price: 260000 },
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
            { Level: 1, Gold: 10000, Materials: [{ PropName: "切割刀", Count: 2 }, { PropName: "实验数据", Count: 2 }], BonusValue: 5 },
            { Level: 2, Gold: 30000, Materials: [{ PropName: "高精数显卡尺", Count: 2 }, { PropName: "显卡", Count: 1 }], BonusValue: 10 },
            { Level: 3, Gold: 80000, Materials: [{ PropName: "刀片服务器", Count: 2 }, { PropName: "军用电台", Count: 1 }], BonusValue: 15 },
            { Level: 4, Gold: 200000, Materials: [{ PropName: "高速阵列", Count: 1 }, { PropName: "信息终端", Count: 1 }], BonusValue: 20 },
            { Level: 5, Gold: 500000, Materials: [{ PropName: "供能单元", Count: 1 }, { PropName: "动力电池组", Count: 1 }], BonusValue: 30 },
        ],
    },
    "研究所": {
        AttributeName: "生命上限",
        ValueSuffix: "",
        Levels: [
            { Level: 1, Gold: 10000, Materials: [{ PropName: "实验数据", Count: 2 }, { PropName: "八宝粥", Count: 2 }], BonusValue: 10 },
            { Level: 2, Gold: 30000, Materials: [{ PropName: "脑机数据", Count: 2 }, { PropName: "显卡", Count: 1 }], BonusValue: 20 },
            { Level: 3, Gold: 80000, Materials: [{ PropName: "除颤器", Count: 1 }, { PropName: "动力电池组", Count: 1 }], BonusValue: 35 },
            { Level: 4, Gold: 200000, Materials: [{ PropName: "呼吸机", Count: 1 }, { PropName: "ECMO", Count: 1 }], BonusValue: 50 },
            { Level: 5, Gold: 500000, Materials: [{ PropName: "医疗机器人", Count: 1 }, { PropName: "反应炉", Count: 1 }], BonusValue: 75 },
        ],
    },
    "健身": {
        AttributeName: "移动速度",
        ValueSuffix: "%",
        Levels: [
            { Level: 1, Gold: 10000, Materials: [{ PropName: "哑铃", Count: 2 }, { PropName: "沙袋", Count: 2 }], BonusValue: 5 },
            { Level: 2, Gold: 30000, Materials: [{ PropName: "哑铃", Count: 4 }, { PropName: "沙袋", Count: 4 }], BonusValue: 10 },
            { Level: 3, Gold: 80000, Materials: [{ PropName: "哑铃", Count: 6 }, { PropName: "高精数显卡尺", Count: 2 }], BonusValue: 15 },
            { Level: 4, Gold: 200000, Materials: [{ PropName: "电动马达", Count: 2 }, { PropName: "动力电池组", Count: 1 }], BonusValue: 20 },
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
    /** 道具仍在箱子中时，记录所属箱子的唯一 ID。 */
    public SourceBoxID: string = "";
    /** 搜索动画尚未完成时禁止显示和拖动；普通道具默认为 false。 */
    public IsSearchLocked: boolean = false;
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
    [ZRSJZ_INVENTORY.仓库_全部, { Row: 4, Col: 7, IsDilatation: true }],
    [ZRSJZ_INVENTORY.仓库_装备, { Row: 4, Col: 7, IsDilatation: true }],
    [ZRSJZ_INVENTORY.仓库_武器, { Row: 4, Col: 7, IsDilatation: true }],
    [ZRSJZ_INVENTORY.仓库_弹药, { Row: 4, Col: 7, IsDilatation: true }],
    [ZRSJZ_INVENTORY.仓库_物品, { Row: 4, Col: 7, IsDilatation: true }],
    [ZRSJZ_INVENTORY.卡包, { Row: 1, Col: 3, IsDilatation: false }],
    [ZRSJZ_INVENTORY.弹药, { Row: 2, Col: 3, IsDilatation: false }],
    [ZRSJZ_INVENTORY.保险箱, { Row: 3, Col: 3, IsDilatation: false }],
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
        Skin: ["威蓝", "威蓝2"],
        SkillPath: "Prefabs/Controller/Bomb",
    }],
    ["小温", {
        Name: "小温",
        RoleDesc: "精通能量武器的远程输出角色，适合持续压制敌人。",
        SkillName: "激光",
        SkillDesc: "发射高能激光，对直线范围内的敌人造成伤害。",
        Skin: ["小温", "小温2"],
        SkillPath: "Prefabs/Controller/Laser",
    }],
    ["小雅", {
        Name: "小雅",
        RoleDesc: "攻守兼备的支援角色，能够提高队伍的生存能力。",
        SkillName: "护盾",
        SkillDesc: "展开能量护盾，在持续时间内抵挡敌人的攻击。",
        Skin: ["小雅", "小雅2"],
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
}

export const ZRSJZ_SKIN_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_SkinConfig>> = new Map([
    ["威蓝", { Name: "威蓝", Quality: ZRSJZ_PROP_QUALITY.蓝色, UnlockType: "金币", UnlockPrice: 100, Skin: "js/ll1", Headset: ["ll-_0000_前刘海_蓝狼"] }],
    ["威蓝2", { Name: "威蓝2", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "金币", UnlockPrice: 100000, Skin: "js/ll2", Headset: ["llpf1__0000s_0001_前刘海"] }],
    ["小温", { Name: "小温", Quality: ZRSJZ_PROP_QUALITY.白色, UnlockType: "视频", UnlockPrice: 1, Skin: "js/m1", Headset: [] }],
    ["小温2", { Name: "小温2", Quality: ZRSJZ_PROP_QUALITY.金色, UnlockType: "视频", UnlockPrice: 1, Skin: "js/m2", Headset: [] }],
    ["小雅", { Name: "小雅", Quality: ZRSJZ_PROP_QUALITY.紫色, UnlockType: "视频", UnlockPrice: 1, Skin: "js/w1", Headset: [] }],
    ["小雅2", { Name: "小雅2", Quality: ZRSJZ_PROP_QUALITY.红色, UnlockType: "视频", UnlockPrice: 1, Skin: "js/w2", Headset: ["wzt"] }],
])

//玩家动画
export enum ZRSJZ_ANI {
    Appear1 = "cc_1",
    Appear2 = "cc_2",
    Idle_D1 = "daiji_dao1",
    Idle_D2 = "daiji_dao2",
    Idle_Q = "daiji_q",
    Attack_Idle_D2 = "gj_dao3",
    Attack_Move_D2 = "gj_dao3_2",
    Attack_Idle_D3 = "gj_dao4",
    Attack_Move_D3 = "gj_dao4_2",
    Attack_Idle_Q = "gj_qiang",
    Attack_Move_Q = "gj_qiang2",
    Attack_Idle_Q2 = "gj_jjq",
    Attack_Move_Q2 = "gj_jjq2",
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
        PatrolSpeed: 500,
        ChaseSpeed: 600,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        MovingAttackRange: 800,
        StandingAttackRange: 300,
        AttackInterval: 1,
        IdleAnimation: ZRSJZ_ANI.Idle_Q,
        MoveAnimation: ZRSJZ_ANI.Walk_Q,
        MovingAttackAnimation: [ZRSJZ_ANI.Attack_Move_Q],
        StandingAttackAnimation: [ZRSJZ_ANI.Attack_Idle_Q],
        WeaponName: "突击步枪",
    }],
    ["持刀小兵", {
        MaxHealth: 100,
        DetectionRange: 1500,
        LoseRange: 2000,
        PatrolRadius: 500,
        PatrolSpeed: 500,
        ChaseSpeed: 600,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        MovingAttackRange: 500,
        StandingAttackRange: 200,
        AttackInterval: 1,
        IdleAnimation: ZRSJZ_ANI.Idle_D1,
        MoveAnimation: ZRSJZ_ANI.Walk_D,
        MovingAttackAnimation: [ZRSJZ_ANI.Attack_Move_D2, ZRSJZ_ANI.Attack_Move_D3],
        StandingAttackAnimation: [ZRSJZ_ANI.Attack_Idle_D2, ZRSJZ_ANI.Attack_Idle_D3],
        WeaponName: "战术匕首",
    }],
    ["喷火兵", {
        MaxHealth: 100,
        DetectionRange: 1500,
        LoseRange: 2000,
        PatrolRadius: 500,
        PatrolSpeed: 500,
        ChaseSpeed: 600,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        MovingAttackRange: 800,
        StandingAttackRange: 300,
        AttackInterval: 5,
        IdleAnimation: ZRSJZ_ANI.Idle_Q,
        MoveAnimation: ZRSJZ_ANI.Walk_Q,
        MovingAttackAnimation: ["gj_ph"],
        StandingAttackAnimation: ["gj_ph"],
        WeaponName: "喷火枪",
    }],
    ["盾牌兵", {
        MaxHealth: 100,
        DetectionRange: 1500,
        LoseRange: 2000,
        PatrolRadius: 500,
        PatrolSpeed: 500,
        ChaseSpeed: 600,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        MovingAttackRange: 800,
        StandingAttackRange: 300,
        AttackInterval: 1,
        IdleAnimation: ZRSJZ_ANI.Idle_Q,
        MoveAnimation: ZRSJZ_ANI.Walk_Q,
        MovingAttackAnimation: [ZRSJZ_ANI.Attack_Move_Q],
        StandingAttackAnimation: [ZRSJZ_ANI.Attack_Idle_Q],
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
        OutOfCombatRegenPercentPerSecond: 0.1,
        NormalAttack: {
            Name: "普通攻击",
            Range: 400,
            DamageRange: 300,
            Damage: 10,
            Cooldown: 3,
            Animation: "pg",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        },
        Skills: [{
            Name: "超级陀螺",
            Range: 400,
            DamageRange: 500,
            Damage: 30,
            Cooldown: 8,
            Animation: "1",
            TriggerEvent: "dz",
            CanMoveWhileCasting: false,
        }],
    }],
    ["Boss2", {
        MaxHealth: 1000,
        DetectionRange: 2000,
        LoseRange: 2500,
        PatrolRadius: 500,
        PatrolSpeed: 400,
        ChaseSpeed: 550,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        IdleAnimation: "idle",
        MoveAnimation: "zl",
        WeaponName: "突击步枪",
        DieAnimation: "dead",
        OutOfCombatRegenPercentPerSecond: 0.1,
        NormalAttack: {
            Name: "普通攻击",
            Range: 400,
            DamageRange: 300,
            Damage: 10,
            Cooldown: 3,
            Animation: "atk1",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        },
        Skills: [{
            Name: "死亡剪刀",
            Range: 400,
            DamageRange: 500,
            Damage: 30,
            Cooldown: 8,
            Animation: "atk2",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        }],
    }],
    ["Boss3", {
        MaxHealth: 1000,
        DetectionRange: 2000,
        LoseRange: 2500,
        PatrolRadius: 500,
        PatrolSpeed: 400,
        ChaseSpeed: 550,
        PatrolWaitTime: 1,
        PatrolArriveDistance: 50,
        IdleAnimation: "idle",
        MoveAnimation: "zl",
        WeaponName: "突击步枪",
        DieAnimation: "dead",
        OutOfCombatRegenPercentPerSecond: 0.1,
        NormalAttack: {
            Name: "普通攻击",
            Range: 400,
            DamageRange: 300,
            Damage: 10,
            Cooldown: 3,
            Animation: "atk1",
            TriggerEvent: "gj",
            CanMoveWhileCasting: false,
        },
        Skills: [{
            Name: "超级炸弹",
            Range: 400,
            DamageRange: 500,
            Damage: 30,
            Cooldown: 8,
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
}
//地图中敌人配置
export interface ZRSJZ_MapEnemyConfig {
    HP: number;
    Harm: number;
    Box: ZRSJZ_BoxConfig;
}
export interface ZRSJZ_MapBossConfig {
    HP: number;
    HarmMultiple: number;
    Box: ZRSJZ_BoxConfig;
}

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
    1_000, 8_000, 20_000, 40_000, 80_000, 150_000,
];

const ZRSJZ_MAP_TIME_LIMITS: readonly number[] = [15, 14, 13, 12, 11, 10];
const ZRSJZ_MAP_HP_MULTIPLIERS: readonly number[] = [1, 1.3, 1.7, 2.15, 2.75, 3.5];
const ZRSJZ_MAP_HARM_MULTIPLIERS: readonly number[] = [1, 1.2, 1.45, 1.75, 2.15, 2.6];
const ZRSJZ_MAP_PROP_TYPES: readonly string[] = ["物品", "房卡", "弹药"];//地图中允许掉落的类型

const ZRSJZ_MAP_PROP_POOL: string[][] = [
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.白色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.绿色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.蓝色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.紫色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.金色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType)).map(prop => prop.Name),
    Array.from(ZRSJZ_PROP_CONFIG.values()).filter(prop => prop.Quality === ZRSJZ_PROP_QUALITY.红色 && ZRSJZ_MAP_PROP_TYPES.includes(prop.PropType)).map(prop => prop.Name),
];

function CreateMapBoxConfig(
    boxName: string,
    modeIndex: number,
    minPropCount: number,
    maxPropCount: number,
    qualityBonus: number = 0,
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
    };
}

function CreateMapModeConfig(
    displayName: string,
    actionName: string,
    mapName: string,
    modeIndex: number,
): ZRSJZ_MapConfig {
    const hpMultiplier = ZRSJZ_MAP_HP_MULTIPLIERS[modeIndex];
    const harmMultiplier = ZRSJZ_MAP_HARM_MULTIPLIERS[modeIndex];
    const requiredValue = ZRSJZ_MAP_REQUIRED_VALUES[modeIndex];
    const commonMin = 2 + Math.floor(modeIndex / 2);
    const commonMax = 4 + modeIndex;
    const eliteMin = 3 + Math.floor(modeIndex / 2);
    const eliteMax = 5 + modeIndex;

    return {
        DisplayName: displayName,
        ActionName: actionName,
        Difficulty: modeIndex + 1,
        RequiredLoadoutValue: requiredValue,
        MissionLimit: `战备价值达到${requiredValue}`,
        TimeLimitMinutes: ZRSJZ_MAP_TIME_LIMITS[modeIndex],
        MapName: mapName,
        MapEnemy: new Map([
            ["持枪小兵", {
                HP: Math.round(100 * hpMultiplier),
                Harm: Math.round(10 * harmMultiplier),
                Box: CreateMapBoxConfig("物资箱1", modeIndex, commonMin, commonMax),
            }],
            ["持刀小兵", {
                HP: Math.round(110 * hpMultiplier),
                Harm: Math.round(12 * harmMultiplier),
                Box: CreateMapBoxConfig("物资箱1", modeIndex, commonMin, commonMax),
            }],
            ["喷火兵", {
                HP: Math.round(150 * hpMultiplier),
                Harm: Math.round(18 * harmMultiplier),
                Box: CreateMapBoxConfig("物资箱3", modeIndex, eliteMin, eliteMax, 1),
            }],
            ["盾牌兵", {
                HP: Math.round(220 * hpMultiplier),
                Harm: Math.round(11 * harmMultiplier),
                Box: CreateMapBoxConfig("物资箱4", modeIndex, eliteMin, eliteMax, 1),
            }],
        ]),
        MapBoss: new Map([
            ["Boss1", {
                HP: Math.round(1200 * hpMultiplier),
                HarmMultiple: Number((1 + modeIndex * 0.25).toFixed(2)),
                Box: CreateMapBoxConfig(
                    "物资箱5",
                    modeIndex,
                    5 + modeIndex,
                    8 + modeIndex,
                    2,
                ),
            }],
            ["Boss2", {
                HP: Math.round(1200 * hpMultiplier),
                HarmMultiple: Number((1 + modeIndex * 0.25).toFixed(2)),
                Box: CreateMapBoxConfig(
                    "物资箱6",
                    modeIndex,
                    5 + modeIndex,
                    8 + modeIndex,
                    2,
                ),
            }],
            ["Boss3", {
                HP: Math.round(1200 * hpMultiplier),
                HarmMultiple: Number((1 + modeIndex * 0.25).toFixed(2)),
                Box: CreateMapBoxConfig(
                    "物资箱7",
                    modeIndex,
                    5 + modeIndex,
                    8 + modeIndex,
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
        MapProp: ZRSJZ_MAP_PROP_POOL.map(props => [...props]),
    };
}

/** 三张地图、两种行动，共六个由易到难的模式。 */
export const ZRSJZ_MAP_CONFIG: ReadonlyMap<string, Readonly<ZRSJZ_MapConfig>> = new Map([
    ["五号小镇_机密行动", CreateMapModeConfig("五号小镇", "机密行动", "城镇", 0)],
    ["五号小镇_绝密行动", CreateMapModeConfig("五号小镇", "绝密行动", "城镇", 1)],
    ["沙漠古迹_机密行动", CreateMapModeConfig("沙漠古迹", "机密行动", "沙漠", 2)],
    ["沙漠古迹_绝密行动", CreateMapModeConfig("沙漠古迹", "绝密行动", "沙漠", 3)],
    ["极北之地_机密行动", CreateMapModeConfig("极北之地", "机密行动", "雪地", 4)],
    ["极北之地_绝密行动", CreateMapModeConfig("极北之地", "绝密行动", "雪地", 5)],
]);
