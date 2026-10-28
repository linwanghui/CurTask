const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const base = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
function evaluate(source, globals) {
    return vm.runInNewContext(ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    }).outputText, globals);
}
const constants = { exports: {} };
evaluate(fs.readFileSync(base + 'ZRSJZ_Constant.ts', 'utf8'), constants);
const config = constants.exports.ZRSJZ_MAIN_TASK_CONFIG;
for (const [id, task] of config) assert.equal(id, task.TaskName, 'Main task lookup key must match saved task name');
const data = { MainTaskComplete: [], MainTaskExperienceAwards: {}, NewMainTask: '初入禁区', CurMainTask: null };
let saved;
const gameData = { Instance: data, SaveData() { saved = JSON.stringify(this.Instance); } };
gameData.Versions = 31;
let expansions = 0;
function loadClass(file, name, globals, member) {
    const tree = ts.createSourceFile(file, fs.readFileSync(base + file, 'utf8'), ts.ScriptTarget.Latest, true);
    const cls = tree.statements.find(n => ts.isClassDeclaration(n));
    const members = member ? (Array.isArray(member) ? member : [member]) : null;
    const body = cls.members.filter(n => !members || members.includes(n.name?.getText(tree))).map(n => n.getText(tree)).join('\n');
    return evaluate(`class ${name} { ${body} }; ${name};`, globals);
}
const Task = loadClass('Service/ZRSJZ_TaskService.ts', 'Task', {
    ...constants.exports, ZRSJZ_GameData: gameData,
    ZRSJZ_SIDE_TASK_LINES: [], ZRSJZ_SIDE_TASK_CONFIG: new Map(),
    ZRSJZ_GradeService: { GetExperienceToNextLevel: () => 100 },
    ZRSJZ_EventManager: { Emit() {} }, ZRSJZ_MyEvent: {},
    ZRSJZ_InventoryService: {
        GetInventoryRow: () => gameData.Instance.InventoryRow?.[constants.exports.ZRSJZ_INVENTORY.保险箱] ?? 2,
        AddInventoryRow(type, count) { gameData.Instance.InventoryRow ??= {}; gameData.Instance.InventoryRow[type] = 2 + count; expansions++; },
    },
});
Task.GetNewTask('初入禁区');
Task.CompleteTask('完成新手教程');
assert.equal(Task.GetTaskAward('初入禁区'), true);
assert.equal(gameData.Instance.NewMainTask, '弹药补给');
assert.equal(Task.GetTaskState('弹药补给'), 0);
Task.GetNewTask('弹药补给');
assert.equal(Task.GetTaskState('弹药补给'), 1, 'Accepted second task must remain visible');
gameData.Instance = JSON.parse(saved);
assert.equal(Task.GetTaskState('弹药补给'), 1, 'Reopening saved task must not throw');
Task.CompleteTask('在商城购买[1级子弹]');
assert.equal(Task.GetTaskState('弹药补给'), 2);
assert.equal(Task.GetTaskAward('弹药补给'), true);
assert.equal(Task.GetTaskAward('弹药补给'), false, 'Reward cannot be claimed twice');
assert.equal(gameData.Instance.NewMainTask, '物资变现');
gameData.Instance.CurMainTask = { TaskName: 'missing', CurCount: 1 };
assert.equal(Task.GetTaskState('missing'), -1, 'Unknown saved task must not dereference missing config');

const Defaults = loadClass('Service/ZRSJZ_GameDataDefaults.ts', 'Defaults', {}, 'RepairMainTaskNames');
const legacy = '\uFFFD'.repeat(6) + '补给';
const old = { NewMainTask: legacy, CurMainTask: null, MainTaskComplete: ['初入禁区'], MainTaskExperienceAwards: { [legacy]: 275 } };
assert.equal(Defaults.RepairMainTaskNames(old), true);
assert.equal(old.NewMainTask, '弹药补给');
assert.equal(old.MainTaskExperienceAwards['弹药补给'], 275);
assert.equal(Defaults.RepairMainTaskNames(old), false, 'Migration is idempotent');
old.NewMainTask = '';
old.CurMainTask = { TaskName: '弹药补给', TaskTargetName: '在商城购买[1级子弹]', CurCount: 1 };
const before = JSON.stringify(old);
assert.equal(Defaults.RepairMainTaskNames(old), false);
assert.equal(JSON.stringify(old), before, 'Existing accepted task progress is preserved');
old.CurMainTask.TaskName = legacy;
old.MainTaskComplete = [legacy, '弹药补给'];
old.MainTaskExperienceAwards[legacy] = 900;
Defaults.RepairMainTaskNames(old);
assert.equal(old.CurMainTask.TaskName, '弹药补给');
assert.equal(old.CurMainTask.CurCount, 1);
assert.equal(old.MainTaskComplete.length, 1);
assert.equal(old.MainTaskExperienceAwards['弹药补给'], 275, 'Canonical snapshot takes precedence');
console.log('PASS: config IDs, first-to-third task progression, save/reload, duplicate claims, missing config and legacy save repair');

const order = Array.from(constants.exports.ZRSJZ_MAIN_TASK_ORDER);
const oldOrder = Array.from(config.keys());
assert.equal(new Set(order).size, config.size);
assert.deepEqual([...order].sort(), [...oldOrder].sort(), 'Reorder must neither remove nor rename tasks');
const expectedMaps = ['五号小镇_机密行动','沙漠古迹_机密行动','极北之地_机密行动','五号小镇_绝密行动','沙漠古迹_绝密行动','极北之地_绝密行动'];
order.slice(3).forEach((name, i) => assert.ok(config.get(name).TaskTargets[0].TaskTargetName.includes(expectedMaps[Math.floor(i / 3)])));
const FullDefaults = loadClass('Service/ZRSJZ_GameDataDefaults.ts', 'Defaults', {
    ...constants.exports, ZRSJZ_GameData: gameData, ZRSJZ_SIDE_TASK_LINES: [],
});
function fixture() {
    return {
        Versions: 30, MainTaskComplete: [], MainTaskExperienceAwards: {}, NewMainTask: '', CurMainTask: null,
        OwnedTitles: ['勇者'], EquippedTitle: '勇者', OwnedAvatarFrames: ['1'], CurrentAvatarFrame: '1',
        DefeatedTitleBosses: [], AvatarFrameBossDifficulties: [], AvatarFrameNormalKills: 0,
        PropData: {}, InventoryRow: { [constants.exports.ZRSJZ_INVENTORY.保险箱]: 2 }, Gold: 12345,
        TaskLines: { warehouse: { index: 2, count: 7, accepted: true } },
    };
}
function finishAll() {
    const claimed = [];
    while (gameData.Instance.CurMainTask || gameData.Instance.NewMainTask) {
        assert.ok(claimed.length < order.length, 'Task progression must terminate');
        if (!gameData.Instance.CurMainTask) Task.GetNewTask(gameData.Instance.NewMainTask);
        const current = gameData.Instance.CurMainTask;
        assert.ok(current);
        current.CurCount = config.get(current.TaskName).TaskTargets[0].TaskTargetCount;
        const id = current.TaskName;
        assert.equal(Task.GetTaskAward(id), true);
        assert.equal(Task.GetTaskAward(id), false);
        claimed.push(id);
        gameData.Instance = JSON.parse(saved); // Every task transition survives a restart.
    }
    return claimed;
}
for (let index = 0; index < oldOrder.length; index++) {
    for (const state of ['pending', 'active', 'ready']) {
        const f = fixture(), id = oldOrder[index], target = config.get(id).TaskTargets[0];
        f.MainTaskComplete = oldOrder.slice(0, index);
        f.MainTaskExperienceAwards[id] = 357;
        if (state === 'pending') f.NewMainTask = id;
        else f.CurMainTask = { TaskName: id, TaskTargetName: target.TaskTargetName, CurCount: state === 'ready' ? target.TaskTargetCount : 0 };
        const original = JSON.parse(JSON.stringify(f));
        assert.equal(FullDefaults.Migrate(f, original), true);
        assert.equal(f.Versions, 31);
        assert.deepEqual(f.CurMainTask, original.CurMainTask);
        assert.deepEqual(f.MainTaskComplete, original.MainTaskComplete);
        assert.deepEqual(f.MainTaskExperienceAwards, original.MainTaskExperienceAwards);
        assert.deepEqual(f.InventoryRow, original.InventoryRow);
        assert.deepEqual(f.TaskLines, original.TaskLines);
        assert.equal(f.Gold, original.Gold);
        const remaining = order.filter(name => !f.MainTaskComplete.includes(name));
        assert.equal(f.NewMainTask, state === 'pending' ? remaining[0] : '');
        const once = JSON.stringify(f);
        assert.equal(FullDefaults.Migrate(f, JSON.parse(once)), false);
        assert.equal(JSON.stringify(f), once, 'Reloading migration must be idempotent');
        gameData.Instance = f;
        if (state === 'ready') assert.equal(Task.GetTaskState(id), 2);
        const claims = finishAll();
        assert.deepEqual(claims, state === 'pending' ? remaining : [id, ...remaining.filter(name => name !== id)]);
        assert.equal(gameData.Instance.MainTaskComplete.length, order.length);
        assert.equal(new Set(gameData.Instance.MainTaskComplete).size, order.length);
    }
}
const allDone = fixture();
allDone.MainTaskComplete = [...oldOrder];
allDone.InventoryRow[constants.exports.ZRSJZ_INVENTORY.保险箱] = 3;
allDone.NewMainTask = '北境终局'; // Clear stale published task on completed saves.
const expansionCount = expansions;
FullDefaults.Migrate(allDone, JSON.parse(JSON.stringify(allDone)));
gameData.Instance = allDone;
assert.equal(allDone.NewMainTask, '');
assert.deepEqual(finishAll(), []);
assert.equal(expansions, expansionCount);
assert.equal(allDone.InventoryRow[constants.exports.ZRSJZ_INVENTORY.保险箱], 3);
const newPlayer = fixture();
newPlayer.WeaponryID = []; newPlayer.Player2WeaponryID = []; newPlayer.PropID = 0;
FullDefaults.Initialize(newPlayer);
gameData.Instance = newPlayer;
assert.equal(newPlayer.Versions, 31);
assert.deepEqual(finishAll(), order, 'New players follow the complete new difficulty curve');
console.log('PASS: all 63 legacy task states, real v30→v31 migration, repeated reload, new player full route, completed saves and safe-box preservation');

const storage = new Map();
const Reader = loadClass('ZRSJZ_GameData.ts', 'ZRSJZ_GameData', {
    sys: { localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) } },
    ZRSJZ_GameDataDefaults: FullDefaults, ZRSJZ_MailService: { CheckExpired() {} },
}, ['Versions', 'STORAGE_KEY', '_instance', 'ReadData', 'SaveData']);
const pendingSave = fixture();
pendingSave.MainTaskComplete = oldOrder.slice(0, 6);
pendingSave.NewMainTask = '重返小镇';
const rawSave = JSON.stringify(pendingSave);
storage.set('ZRSJZ_GameData', rawSave);
const migrated = Reader.ReadData();
assert.equal(storage.get('ZRSJZ_GameData_before_v31'), rawSave, 'Backup preserves exact original save');
assert.equal(migrated.NewMainTask, '踏入古迹');
assert.equal(JSON.parse(storage.get('ZRSJZ_GameData')).Versions, 31);
Reader.ReadData();
assert.equal(storage.get('ZRSJZ_GameData_before_v31'), rawSave, 'Reload must not overwrite pre-upgrade backup');
const older = fixture();
older.Versions = 29; older.MainTaskComplete = oldOrder.slice(0, 6); older.NewMainTask = '重返小镇';
FullDefaults.Migrate(older, JSON.parse(JSON.stringify(older)));
assert.equal(older.Versions, 31);
assert.equal(older.NewMainTask, '踏入古迹');
assert.ok(older.EquippedActions.length > 0, 'Previous version migrations must still run');
const MainPanel = loadClass('Panel/ZRSJZ_MainTaskPanel.ts', 'MainPanel', {
    ...constants.exports,
}, 'GetLineTasks');
assert.deepEqual(Array.from(new MainPanel().GetLineTasks('main')), order);
console.log('PASS: actual save read/write and backup, v29 chained upgrade and panel ordering');

// 已经升级到31的存档不会再进入30→31迁移：旧代码在这些状态下会隐藏全部主线。
const expansionsBeforeRepair = expansions;
for (const pointer of ['', '已移除任务']) {
    const f = fixture(); f.Versions = 31; f.NewMainTask = pointer;
    gameData.Instance = f;
    assert(order.every(name => Task.GetTaskState(name) === -1), 'reproduce empty 0/21 main list');
    const unaffected = JSON.stringify([f.Gold, f.PropData, f.InventoryRow, f.TaskLines]);
    assert.equal(FullDefaults.Migrate(f, JSON.parse(JSON.stringify(f))), true);
    assert.equal(f.NewMainTask, order[0]); assert.equal(Task.GetTaskState(order[0]), 0);
    assert.equal(JSON.stringify([f.Gold, f.PropData, f.InventoryRow, f.TaskLines]), unaffected);
    assert.equal(FullDefaults.Migrate(f, JSON.parse(JSON.stringify(f))), false, 'same-version repair is idempotent');
}
const renamed = fixture(); renamed.Versions = 31; renamed.NewMainTask = '';
renamed.CurMainTask = { TaskName: '旧任务名', TaskTargetName: config.get('弹药补给').TaskTargets[0].TaskTargetName, CurCount: 1 };
renamed.MainTaskExperienceAwards = { 旧任务名: 357 };
FullDefaults.Migrate(renamed, JSON.parse(JSON.stringify(renamed)));
assert.equal(renamed.CurMainTask.TaskName, '弹药补给'); assert.equal(renamed.CurMainTask.CurCount, 1);
assert.equal(renamed.MainTaskExperienceAwards['弹药补给'], 357); assert.equal(renamed.NewMainTask, '');
gameData.Instance = renamed; assert.equal(Task.GetTaskState('弹药补给'), 2, 'recovered target preserves pending reward');
const invalid = fixture(); invalid.Versions = 31;
invalid.CurMainTask = { TaskName: '强化', TaskTargetName: '强化1次', CurCount: 1 };
const invalidRaw = JSON.stringify(invalid);
storage.delete('ZRSJZ_GameData_before_main_task_repair'); storage.set('ZRSJZ_GameData', invalidRaw);
const repaired = Reader.ReadData();
assert.equal(repaired.CurMainTask, null); assert.equal(repaired.NewMainTask, order[0]);
assert.equal(storage.get('ZRSJZ_GameData_before_main_task_repair'), invalidRaw, 'retain exact unknown task progress in original backup');
Reader.ReadData(); assert.equal(storage.get('ZRSJZ_GameData_before_main_task_repair'), invalidRaw);
const healthy = fixture(); healthy.Versions = 31; healthy.NewMainTask = '';
healthy.MainTaskComplete = order.slice(0, 5);
healthy.CurMainTask = { TaskName: order[5], TaskTargetName: config.get(order[5]).TaskTargets[0].TaskTargetName, CurCount: 7 };
healthy.MainTaskExperienceAwards[order[5]] = 357;
const healthyBefore = JSON.stringify(healthy);
assert.equal(FullDefaults.Migrate(healthy, JSON.parse(healthyBefore)), false); assert.equal(JSON.stringify(healthy), healthyBefore);
const finished = fixture(); finished.Versions = 31; finished.MainTaskComplete = [...order]; finished.NewMainTask = '';
const finishedBefore = JSON.stringify(finished);
assert.equal(FullDefaults.Migrate(finished, JSON.parse(finishedBefore)), false); assert.equal(JSON.stringify(finished), finishedBefore);
const stale = fixture(); stale.Versions = 31; stale.MainTaskComplete = order.slice(0, 2);
stale.CurMainTask = { TaskName: order[1], TaskTargetName: config.get(order[1]).TaskTargets[0].TaskTargetName, CurCount: 1 };
FullDefaults.Migrate(stale, JSON.parse(JSON.stringify(stale)));
assert.equal(stale.CurMainTask, null); assert.equal(stale.NewMainTask, order[2]); assert.equal(stale.MainTaskComplete.length, 2);
assert.equal(expansions, expansionsBeforeRepair, 'repair never grants expansions or rewards');
console.log('PASS: reproduced empty 0/21, same-version invalid/missing pointers, target recovery, original backup, healthy/finished save preservation and no duplicate awards');
