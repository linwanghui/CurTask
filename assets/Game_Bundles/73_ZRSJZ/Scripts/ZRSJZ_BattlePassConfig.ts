/** 战令的等级、奖励、日/周任务和刷新规则统一在此配置。 */
export type ZRSJZ_BattlePassMetric = 'login' | 'battle' | 'extract' | 'kill' | 'search' | 'heal' | 'special';
export type ZRSJZ_BattlePassPeriod = 'daily' | 'weekly';
export type ZRSJZ_BattlePassTrack = 'normal' | 'advanced';
export interface ZRSJZ_BattlePassTask { id: string; name: string; description: string; metric: ZRSJZ_BattlePassMetric; target: number; exp: number; }
export interface ZRSJZ_BattlePassReward { level: number; type: 'gold' | 'prop' | 'fragment' | 'weaponSkin' | 'heroSkin'; name: string; count: number; special: boolean; weaponName?: string; roleName?: string; }
export interface ZRSJZ_BattlePassTaskState { key: string; taskIds: string[]; progress: Record<string, number>; claimed: string[]; }
export interface ZRSJZ_BattlePassState { exp: number; claimed: number[]; advancedClaimed: number[]; advancedUnlocked: boolean; daily: ZRSJZ_BattlePassTaskState; weekly: ZRSJZ_BattlePassTaskState; }
const emptyTasks = (): ZRSJZ_BattlePassTaskState => ({ key: '', taskIds: [], progress: {}, claimed: [] });
export function CreateBattlePassState(): ZRSJZ_BattlePassState { return { exp: 0, claimed: [], advancedClaimed: [], advancedUnlocked: false, daily: emptyTasks(), weekly: emptyTasks() }; }
const r = (level: number, type: ZRSJZ_BattlePassReward['type'], name: string, count: number, special = false, weaponName?: string, roleName?: string): ZRSJZ_BattlePassReward => ({ level, type, name, count, special, weaponName, roleName });

/** 每一级均独立配置，调整单级奖励不会影响其它等级。 */
const rewards: ZRSJZ_BattlePassReward[] = [
 r(1,'gold','钞票',10000),r(2,'prop','八宝粥',5),r(3,'prop','切割刀',6),r(4,'prop','黑色手表',6),r(5,'prop','核桃',6),
 r(6,'prop','苹果',4),r(7,'prop','地图',4),r(8,'prop','量子U盘',4),r(9,'prop','剪刀',4),r(10,'weaponSkin','CN8-毒剂',1,true,'CN8-突击步枪'),
 r(11,'gold','钞票',30000),r(12,'prop','无线便携电钻',3),r(13,'prop','手雷',3),r(14,'prop','手套',3),r(15,'prop','鱼子酱',3),
 r(16,'prop','古玩钱币',2),r(17,'prop','镜子',2),r(18,'prop','香槟',2),r(19,'prop','脑机数据',2),r(20,'weaponSkin','DX9-未来金属',1,true,'DX9-冲锋枪'),
 r(21,'gold','钞票',100000),r(22,'prop','怀表',2),r(23,'prop','刀蓝图',3),r(24,'prop','头盔蓝图',3),r(25,'prop','枪蓝图',3),
 r(26,'prop','背包蓝图',4),r(27,'prop','防弹衣蓝图',4),r(28,'prop','化石',2),r(29,'prop','实验数据',2),r(30,'weaponSkin','K50-云雾',1,true,'K50-轻机枪'),
 r(31,'gold','钞票',400000),r(32,'prop','怀表',8),r(33,'prop','枪蓝图',9),r(34,'prop','背包蓝图',10),r(35,'prop','防弹衣蓝图',11),
 r(36,'prop','化石',4),r(37,'prop','实验数据',4),r(38,'prop','高速阵列',4),r(39,'prop','金条',4),r(40,'weaponSkin','FS-橙灼',1,true,'FS-霰弹枪'),
 r(41,'gold','钞票',900000),r(42,'prop','纵横',4),r(43,'prop','终端',4),r(44,'prop','扫地机器',4),r(45,'prop','军用地图匣',4),
 r(46,'prop','外星人笔记本',4),r(47,'prop','显卡',4),r(48,'prop','留声机',4),r(49,'prop','动力电池组',4),r(50,'prop','焚天龙',1,true),
];
const advancedRewards: ZRSJZ_BattlePassReward[] = [
 r(1,'gold','钞票',30000),r(2,'prop','鱼子酱',3),r(3,'prop','封存音源卫',2),r(4,'prop','电动马达',2),r(5,'prop','古玩钱币',3),
 r(6,'prop','香槟',3),r(7,'prop','磁轴键盘',1),r(8,'prop','金玫瑰',2),r(9,'prop','终端',1),r(10,'fragment','英雄碎片',15,true),
 r(11,'gold','钞票',260000),r(12,'prop','扫地机器',1),r(13,'prop','军用地图匣',1),r(14,'prop','外星人笔记本',1),r(15,'prop','炮弹',1),
 r(16,'prop','万金',1),r(17,'prop','刀片服务器',1),r(18,'prop','显卡',1),r(19,'prop','留声机',1),r(20,'fragment','宠物碎片',25,true),
 r(21,'gold','钞票',450000),r(22,'prop','军用电台',1),r(23,'prop','装甲车电池',1),r(24,'prop','瞪铃',1),r(25,'prop','特供香槟',1),
 r(26,'prop','彩金色鲤鱼',1),r(27,'prop','各种红蛋',1),r(28,'prop','动力电池组',1),r(29,'prop','终端',3),r(30,'fragment','英雄碎片',30,true),
 r(31,'gold','钞票',800000),r(32,'prop','扫地机器',3),r(33,'prop','军用地图匣',3),r(34,'prop','外星人笔记本',3),r(35,'prop','显卡',3),
 r(36,'prop','留声机',3),r(37,'prop','动力电池组',3),r(38,'prop','各种红蛋',4),r(39,'prop','显卡',5),r(40,'fragment','宠物碎片',50,true),
 r(41,'gold','钞票',2200000),r(42,'prop','动力电池组',4),r(43,'prop','军用地图匣',8),r(44,'prop','外星人笔记本',8),r(45,'prop','终端',12),
 r(46,'prop','扫地机器',12),r(47,'prop','显卡',8),r(48,'prop','留声机',8),r(49,'prop','动力电池组',7),r(50,'heroSkin','黯祁',1,true,undefined,'灼戈'),
];

export const ZRSJZ_BATTLE_PASS_CONFIG = {
 name:'火线战令',maxLevel:50,expPerLevel:100,groupSize:10,taskSelectionCount:5,timezoneOffsetMinutes:480,dailyRefreshHour:0,weeklyRefreshDay:1,progressAnimationSeconds:0.8,
 rewards,advancedRewards,
 daily:[
  {id:'d_login',name:'每日集结',description:'今日登录游戏',metric:'login',target:1,exp:40},
  {id:'d_battle',name:'行动开始',description:'完成 1 场对局',metric:'battle',target:1,exp:40},
  {id:'d_battle_3',name:'连续出击',description:'完成 3 场对局',metric:'battle',target:3,exp:40},
  {id:'d_kill',name:'火力训练',description:'累计击败 15 名敌人',metric:'kill',target:15,exp:40},
  {id:'d_kill_30',name:'歼灭行动',description:'累计击败 30 名敌人',metric:'kill',target:30,exp:40},
  {id:'d_search',name:'物资搜寻',description:'搜索 8 个容器',metric:'search',target:8,exp:40},
  {id:'d_search_15',name:'满载而归',description:'搜索 15 个容器',metric:'search',target:15,exp:40},
  {id:'d_extract',name:'平安归来',description:'成功撤离 1 次',metric:'extract',target:1,exp:40},
  {id:'d_heal',name:'及时救治',description:'有效治疗 5 次',metric:'heal',target:5,exp:40},
  {id:'d_special',name:'临机任务',description:'完成 1 个局内特殊任务',metric:'special',target:1,exp:40},
 ] as ZRSJZ_BattlePassTask[],
 weekly:[
  {id:'w_battle',name:'久经沙场',description:'完成 10 场对局',metric:'battle',target:10,exp:220},
  {id:'w_battle_20',name:'百战不殆',description:'完成 20 场对局',metric:'battle',target:20,exp:220},
  {id:'w_kill',name:'战场精英',description:'累计击败 100 名敌人',metric:'kill',target:100,exp:220},
  {id:'w_kill_200',name:'王牌火力',description:'累计击败 200 名敌人',metric:'kill',target:200,exp:220},
  {id:'w_search',name:'搜刮能手',description:'搜索 50 个容器',metric:'search',target:50,exp:220},
  {id:'w_search_100',name:'资源大亨',description:'搜索 100 个容器',metric:'search',target:100,exp:220},
  {id:'w_extract',name:'撤离专家',description:'成功撤离 5 次',metric:'extract',target:5,exp:220},
  {id:'w_extract_10',name:'生存大师',description:'成功撤离 10 次',metric:'extract',target:10,exp:220},
  {id:'w_heal',name:'战地支援',description:'有效治疗 20 次',metric:'heal',target:20,exp:220},
  {id:'w_special',name:'特别行动',description:'完成 3 个局内特殊任务',metric:'special',target:3,exp:220},
 ] as ZRSJZ_BattlePassTask[],
};
