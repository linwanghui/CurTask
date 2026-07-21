//格子大小
export const ZRSJZ_GRID_SIZE = 132;//格子大小
export const ZRSJZ_GRID_INTERVAL = 5;//格子间隔

//界面路径
export enum ZRSJZ_PANEL {
    商店界面 = "Prefabs/Panel/商店界面",
    仓库界面 = "Prefabs/Panel/仓库界面",
    角色界面 = "Prefabs/Panel/角色界面",
    作弊界面 = "Prefabs/Panel/作弊界面",
}

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
    Walk_D = "zl_dao",
    Walk_Q = "zl_q",
    HC = "hc",
}

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
 * @param PropType 物品类别 --(装备（头盔/防弹衣/背包）、武器（枪/刀）、弹药、物品(门禁卡/物品))
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
    ["各种红蛋", { Name: "各种红蛋", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "物品", UnitPrice: 9000, MaxCount: 1 }],
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
    ["咖啡豆", { Name: "咖啡豆", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 13000, MaxCount: 1 }],
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
    ["医疗机器人", { Name: "医疗机器人", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1224000, MaxCount: 1 }],
    ["坦克", { Name: "坦克", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1332000, MaxCount: 1 }],
    ["浮力机器设备", { Name: "浮力机器设备", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1368000, MaxCount: 1 }],
    ["火箭燃料", { Name: "火箭燃料", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._2x3, PropType: "物品", UnitPrice: 1068000, MaxCount: 1 }],

    //子弹
    ["1级子弹", { Name: "1级子弹", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 1900, MaxCount: 1 }],
    ["2级子弹", { Name: "2级子弹", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 4700, MaxCount: 1 }],
    ["3级子弹", { Name: "3级子弹", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 13000, MaxCount: 1 }],
    ["4级子弹", { Name: "4级子弹", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 26000, MaxCount: 1 }],
    ["5级子弹", { Name: "5级子弹", Quality: ZRSJZ_PROP_QUALITY.金色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 79000, MaxCount: 1 }],
    ["6级子弹", { Name: "6级子弹", Quality: ZRSJZ_PROP_QUALITY.红色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "弹药", UnitPrice: 218000, MaxCount: 1 }],
    //头盔
    ["一级头", { Name: "一级头", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 2200, MaxCount: 1 }],
    ["二级头", { Name: "二级头", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 5100, MaxCount: 1 }],
    ["三级头", { Name: "三级头", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x1, PropType: "头盔", UnitPrice: 13000, MaxCount: 1 }],
    //防弹衣
    ["一级甲", { Name: "一级甲", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 8800, MaxCount: 1 }],
    ["二级甲", { Name: "二级甲", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 16000, MaxCount: 1 }],
    ["三级甲", { Name: "三级甲", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "防弹衣", UnitPrice: 49000, MaxCount: 1 }],
    //背包
    ["一级包", { Name: "一级包", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 9300, MaxCount: 1 }],
    ["二级包", { Name: "二级包", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 19000, MaxCount: 1 }],
    ["三级包", { Name: "三级包", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 47000, MaxCount: 1 }],
    ["四级包", { Name: "四级包", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "背包", UnitPrice: 106000, MaxCount: 1 }],
    //枪
    ["突击步枪", { Name: "突击步枪", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 9000, MaxCount: 1 }],
    ["散弹枪", { Name: "散弹枪", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 28000, MaxCount: 1 }],
    ["ssv狙击枪", { Name: "ssv狙击枪", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._1x2, PropType: "枪", UnitPrice: 55000, MaxCount: 1 }],
    //刀
    ["战术匕首", { Name: "战术匕首", Quality: ZRSJZ_PROP_QUALITY.白色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 8400, MaxCount: 1 }],
    ["刺厌", { Name: "刺厌", Quality: ZRSJZ_PROP_QUALITY.绿色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 16000, MaxCount: 1 }],
    ["科技斧", { Name: "科技斧", Quality: ZRSJZ_PROP_QUALITY.蓝色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 56000, MaxCount: 1 }],
    ["熔岩剑", { Name: "熔岩剑", Quality: ZRSJZ_PROP_QUALITY.紫色, GridType: ZRSJZ_GRID_TYPE._2x2, PropType: "刀", UnitPrice: 139000, MaxCount: 1 }],
])

// 道具描述：结合道具名称及图标外观，用于详情、商店和仓库界面展示。
const ZRSJZ_PROP_DESCRIPTION: Map<string, string> = new Map([
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
    //防弹衣
    ["一级甲", "轻型基础防弹衣，可保护躯干免受低等级弹药与碎片伤害。"],
    ["二级甲", "强化防弹衣，在防护能力和行动灵活性之间取得良好平衡。"],
    ["三级甲", "采用高级装甲板的重型防弹衣，可有效抵御高威力攻击。"],
    //背包
    ["一级包", "小型基础背包，结构简单，可额外携带少量行动物资。"],
    ["二级包", "容量适中的战术背包，分区合理，能够容纳更多补给。"],
    ["三级包", "大容量军用背包，结实耐磨，适合长时间搜集与行动。"],
    ["四级包", "顶级扩容背包，拥有优秀承重与收纳能力，可携带大量战利品。"],
    //枪
    ["突击步枪", "射速与精度均衡的自动步枪，适合处理中近距离的多种战斗。"],
    ["散弹枪", "近距离威力强大的霰弹武器，一次射击可覆盖较宽范围。"],
    ["ssv狙击枪", "高精度远程狙击步枪，配有光学瞄具，擅长打击远距离目标。"],
    //刀
    ["战术匕首", "轻巧锋利的战术短刀，便于隐藏，可用于快速近身攻击。"],
    ["刺厌", "造型凌厉的特殊近战兵器，尖锐刃口适合穿刺与连续攻击。"],
    ["科技斧", "采用高强度材料打造的科技战斧，兼具劈砍威力与未来感。"],
    ["熔岩剑", "剑身仿佛流淌着炽热熔岩，锋利而危险，是稀有的高级近战武器。"],
]);

ZRSJZ_PROP_CONFIG.forEach((config, name) => {
    config.Description = ZRSJZ_PROP_DESCRIPTION.get(name) || `一件名为“${name}”的道具。`;
});

//道具存储类型
export class ZRSJZ_PropData {
    public InstanceID: string;//唯一ID(可区分两把相同的枪)
    public Name: string;//道具名称
    public PropType: string;//道具分类
    public CurInventory: ZRSJZ_INVENTORY;
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
])

export const ZRSJZ_SHOP_CONFIG: Map<string, string[]> = new Map([
    ["武器", ["突击步枪", "散弹枪", "ssv狙击枪"]],
    ["头盔", ["一级头", "二级头", "三级头"]],
    ["防弹衣", ["一级甲", "二级甲", "三级甲"]],
    ["背包", ["一级包", "二级包", "三级包", "四级包"]],
    ["匕首", ["战术匕首", "刺厌", "科技斧", "熔岩剑"]],
    ["弹药", ["1级子弹", "2级子弹", "3级子弹", "4级子弹", "5级子弹", "6级子弹"]],
    ["房卡", ["曼德尔", "哑铃", "沙袋", "高速阵列", "6级子弹", "万金泪冠", "劳力士"]],
])

export const ZRSJZ_ROLE_CONFIG: Map<string, {
    Name: string,
    Skin: string[],
}> = new Map([
    ["洛克", { Name: "洛克", Skin: ["洛克", "洛克2"] }],
    ["安娜", { Name: "安娜", Skin: ["安娜", "安娜2"] }],
])

export const ZRSJZ_SKIN_CONFIG: Map<string, {
    Name: string,
    UnlockType: string,
    UnlockPrice: number,
    Skin: string,
    Headset: string[],
}> = new Map([
    ["洛克", { Name: "洛克", UnlockType: "金币", UnlockPrice: 100, Skin: "js/ll1", Headset: ["ll-_0002_耳机_蓝狼", "ll-_0000_前刘海_蓝狼"] }],
    ["洛克2", { Name: "洛克", UnlockType: "金币", UnlockPrice: 100000, Skin: "js/ll2", Headset: ["llpf1__0000s_0003_曲线-3-拷贝-3", "llpf1_0000s_0001_前刘海"] }],
    ["安娜", { Name: "安娜", UnlockType: "视频", UnlockPrice: 1, Skin: "js/m1", Headset: [] }],
    ["安娜2", { Name: "安娜", UnlockType: "视频", UnlockPrice: 1, Skin: "js/m2", Headset: [] }],
])
