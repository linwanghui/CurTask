import { ZRSJZ_INVENTORY, ZRSJZ_MainTaskConfig } from './ZRSJZ_Constant';

export type ZRSJZ_TaskObjective =
    | { kind: 'kills'; count: number }
    | { kind: 'armedKills'; item: string; count: number }
    | { kind: 'extractItem'; item: string; count: number }
    | { kind: 'extractValue'; value: number; count: number }
    | { kind: 'boss'; map: string; count: number }
    | { kind: 'forge'; item: string; count: number };

export interface ZRSJZ_SideTask extends ZRSJZ_MainTaskConfig {
    ID: string;
    Objective: ZRSJZ_TaskObjective;
}
export interface ZRSJZ_TaskLine {
    ID: string;
    Name: string;
    Warehouse: ZRSJZ_INVENTORY;
    Tasks: ZRSJZ_SideTask[];
}
export interface ZRSJZ_TaskLineProgress {
    /** 下一待接取/正在进行的任务序号；等于任务数时整条线完成。 */
    index: number;
    accepted: boolean;
    count: number;
}

export function DescribeTaskObjective(o: ZRSJZ_TaskObjective): string {
    switch (o.kind) {
        case 'kills': return `累计击败${o.count}名敌人`;
        case 'armedKills': return `携带并装备「${o.item}」累计击败${o.count}名敌人`;
        case 'extractItem': return `成功撤离时带出「${o.item}」累计${o.count}个`;
        case 'extractValue': return `单局成功撤离，背包与保险箱物资总价值达到${o.value / 10000}万`;
        case 'boss': return `击败「${o.map}」的Boss${o.count}次`;
        case 'forge': return `在锻造台制造并领取「${o.item}」${o.count}件`;
    }
}

type Entry = [string, ZRSJZ_TaskObjective];
function line(id: string, name: string, warehouse: ZRSJZ_INVENTORY, entries: Entry[]): ZRSJZ_TaskLine {
    return {
        ID: id, Name: name, Warehouse: warehouse,
        Tasks: entries.map(([title, objective], index) => ({
            ID: `${id}_${index + 1}`, TaskName: title, Objective: objective,
            TaskDesc: `${name} · 第${index + 1}阶段\n${DescribeTaskObjective(objective)}。接取后开始统计，完成后可永久扩容${warehouse === ZRSJZ_INVENTORY.仓库_全部 ? '主库' : warehouse.replace('仓库_', '') + '仓库'}2行。`
                + (objective.kind === 'extractItem' ? '带出物品不会因任务扣除。' : '')
                + (objective.kind === 'armedKills' ? '双人模式以存活队员装备的枪械为准，同一次击杀只计一次。' : ''),
            TaskTargets: [{ TaskTargetName: DescribeTaskObjective(objective), TaskTargetCount: objective.count }],
            TaskAwards: [{ TaskAwardName: `${warehouse}扩容`, TaskAwardCount: 2 }],
        })),
    };
}

/** ID 用于存档，发布后不可改名或重排；展示名称可以调整。每条线第4关为锻造等待关。 */
export const ZRSJZ_SIDE_TASK_LINES: readonly ZRSJZ_TaskLine[] = [
    line('supply', '后勤枢纽', ZRSJZ_INVENTORY.仓库_全部, [
        ['落脚之地', { kind: 'kills', count: 3 }],
        ['施工备料', { kind: 'extractItem', item: '水泥', count: 1 }],
        ['运输护卫', { kind: 'armedKills', item: 'CN8-突击步枪', count: 5 }],
        ['开炉立业', { kind: 'forge', item: '三级包', count: 1 }],
        ['首批周转', { kind: 'extractValue', value: 2000000, count: 1 }],
        ['清障行动', { kind: 'kills', count: 30 }],
        ['小镇通途', { kind: 'boss', map: '五号小镇_机密行动', count: 1 }],
        ['重载归航', { kind: 'extractValue', value: 4000000, count: 1 }],
        ['据点肃清', { kind: 'armedKills', item: 'RK77-轻机枪', count: 10 }],
        ['枢纽落成', { kind: 'boss', map: '极北之地_绝密行动', count: 1 }],
    ]),
    line('armor', '钢铁堡垒', ZRSJZ_INVENTORY.仓库_装备, [
        ['护具储备', { kind: 'extractItem', item: '一级头', count: 1 }],
        ['防线试炼', { kind: 'kills', count: 8 }],
        ['近距压制', { kind: 'armedKills', item: 'DX9-冲锋枪', count: 5 }],
        ['铸甲为盾', { kind: 'forge', item: '三级甲', count: 1 }],
        ['防务基金', { kind: 'extractValue', value: 2000000, count: 1 }],
        ['装甲补给', { kind: 'extractItem', item: '四级甲', count: 2 }],
        ['坚守阵地', { kind: 'kills', count: 40 }],
        ['破阵先锋', { kind: 'boss', map: '五号小镇_绝密行动', count: 1 }],
        ['精锐换装', { kind: 'extractItem', item: '五级头', count: 3 }],
        ['堡垒之证', { kind: 'boss', map: '极北之地_绝密行动', count: 2 }],
    ]),
    line('weapon', '尖兵军械', ZRSJZ_INVENTORY.仓库_武器, [
        ['新兵校枪', { kind: 'armedKills', item: 'CN8-突击步枪', count: 3 }],
        ['战场拾械', { kind: 'extractItem', item: 'DX9-冲锋枪', count: 1 }],
        ['火力认证', { kind: 'armedKills', item: 'K50-轻机枪', count: 5 }],
        ['精工开刃', { kind: 'forge', item: 'RK77-轻机枪', count: 1 }],
        ['枪火洗礼', { kind: 'kills', count: 25 }],
        ['小镇夺旗', { kind: 'boss', map: '五号小镇_机密行动', count: 1 }],
        ['重火突进', { kind: 'armedKills', item: 'FS-霰弹枪', count: 8 }],
        ['军械回收', { kind: 'extractValue', value: 4000000, count: 1 }],
        ['远距封锁', { kind: 'armedKills', item: 'ssv-狙击枪', count: 10 }],
        ['王牌军械', { kind: 'boss', map: '极北之地_绝密行动', count: 2 }],
    ]),
    line('ammo', '持续火力', ZRSJZ_INVENTORY.仓库_弹药, [
        ['弹链起点', { kind: 'kills', count: 5 }],
        ['弹药回收', { kind: 'extractItem', item: '2级子弹', count: 60 }],
        ['压制训练', { kind: 'armedKills', item: 'K50-轻机枪', count: 5 }],
        ['供火核心', { kind: 'forge', item: 'K50-轻机枪', count: 1 }],
        ['火线补给', { kind: 'extractValue', value: 2000000, count: 1 }],
        ['穿甲储备', { kind: 'extractItem', item: '4级子弹', count: 150 }],
        ['弹雨推进', { kind: 'kills', count: 50 }],
        ['古迹火线', { kind: 'boss', map: '沙漠古迹_机密行动', count: 1 }],
        ['终极弹链', { kind: 'extractItem', item: '6级子弹', count: 300 }],
        ['火力无尽', { kind: 'boss', map: '极北之地_绝密行动', count: 2 }],
    ]),
    line('goods', '珍藏密库', ZRSJZ_INVENTORY.仓库_物品, [
        ['拾荒入门', { kind: 'extractItem', item: '手套', count: 1 }],
        ['清理路线', { kind: 'kills', count: 8 }],
        ['精密寻宝', { kind: 'extractItem', item: '高精数显卡尺', count: 2 }],
        ['远行之囊', { kind: 'forge', item: '四级包', count: 1 }],
        ['百万藏品', { kind: 'extractValue', value: 2000000, count: 1 }],
        ['数据回收', { kind: 'extractItem', item: '脑机数据', count: 3 }],
        ['遗迹秘藏', { kind: 'boss', map: '沙漠古迹_机密行动', count: 1 }],
        ['黄金归途', { kind: 'extractItem', item: '金条', count: 3 }],
        ['满载珍宝', { kind: 'extractValue', value: 6000000, count: 1 }],
        ['密库封顶', { kind: 'boss', map: '极北之地_绝密行动', count: 2 }],
    ]),
];

export const ZRSJZ_SIDE_TASK_CONFIG = new Map<string, ZRSJZ_SideTask>();
ZRSJZ_SIDE_TASK_LINES.forEach(line => line.Tasks.forEach(task => ZRSJZ_SIDE_TASK_CONFIG.set(task.ID, task)));
