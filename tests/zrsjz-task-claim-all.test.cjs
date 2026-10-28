const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const base = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
function evaluate(code, globals) { return vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, globals); }
function load(file, names, globals, parent = '') {
    const ast = ts.createSourceFile(file, fs.readFileSync(base + file, 'utf8'), ts.ScriptTarget.Latest, true);
    const cls = ast.statements.find(ts.isClassDeclaration);
    return evaluate('class Subject ' + parent + '{' + cls.members.filter(n => !names || names.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join('\n') + '} Subject;', globals);
}
const constants = {}; evaluate(fs.readFileSync(base + 'ZRSJZ_Constant.ts', 'utf8'), { exports: constants });
const lines = {}; evaluate(fs.readFileSync(base + 'ZRSJZ_TaskLines.ts', 'utf8'), { exports: lines, require: () => constants });
const data = { MainTaskComplete: [], MainTaskExperienceAwards: {}, NewMainTask: '初入禁区', CurMainTask: null,
    TaskLines: Object.fromEntries(lines.ZRSJZ_SIDE_TASK_LINES.map(line => [line.ID, { index: 0, accepted: false, count: 0 }])) };
const expansions = [], popups = [], tips = [], sounds = [], received = []; let gold = 0, experience = 0;
const game = { Instance: data, SaveData() {} };
const Task = load('Service/ZRSJZ_TaskService.ts', null, { ...constants, ...lines, ZRSJZ_GameData: game,
    ZRSJZ_GradeService: { GetExperienceToNextLevel: () => 123 }, ZRSJZ_EventManager: { Emit() {} }, ZRSJZ_MyEvent: {},
    ZRSJZ_InventoryService: { AddInventoryRow: (type, rows) => expansions.push([type, rows]) } });
const ui = { Dragging: false, Instance: { ShowPanel: (...args) => popups.push(args), ShowTip: text => tips.push(text), ShowCurrencyEffect() {},
    ReceivePropAwards: async awards => { received.push(...awards); return { MailAwards: [] }; } } };
const globals = { ...constants, ...lines, ZRSJZ_GameData: game, ZRSJZ_TaskService: Task, ZRSJZ_UIManager: ui,
    ZRSJZ_AudioManager: { Instance: { PlaySound: name => sounds.push(name) } } };
const Panel = load('Panel/ZRSJZ_MainTaskPanel.ts', ['ClaimAll', 'ResolveAwards', 'OnButtonClick'], globals);
const panel = new Panel(); panel.Refresh = () => {}; panel._claiming = false;
const click = () => panel.OnButtonClick({ getCurrentTarget: () => ({ name: '全部领取' }) });
click();
assert.equal(popups.length, 0); assert(tips.at(-1).includes('已领取'));
assert.equal(Task.GetTaskState('初入禁区'), 1);
assert(lines.ZRSJZ_SIDE_TASK_LINES.every(line => Task.GetTaskState(line.Tasks[0].ID) === 1));
click(); assert.equal(tips.at(-1), '暂无可领取的任务或任务奖励');
Task.CompleteTask('完成新手教程');
for (const line of lines.ZRSJZ_SIDE_TASK_LINES) data.TaskLines[line.ID].count = line.Tasks[0].Objective.count;
click();
assert.equal(popups.length, 1, 'all completed lines share one popup');
assert.equal(expansions.length, lines.ZRSJZ_SIDE_TASK_LINES.length, 'each expansion granted once');
assert.equal(Task.GetTaskState('弹药补给'), 1, 'new main task accepted in same click');
assert(lines.ZRSJZ_SIDE_TASK_LINES.every(line => Task.GetTaskState(line.Tasks[1].ID) === 1));
const options = popups[0][1];
assert.equal(new Set(options.Awards.map(a => a.TaskAwardName)).size, options.Awards.length, 'same-name rewards merged');
assert(options.Awards.some(a => a.TaskAwardName.endsWith('扩容')));
assert(options.PendingAwards.every(a => !a.TaskAwardName.startsWith('仓库_')));
assert.equal(options.PendingAwards.find(a => a.TaskAwardName === '经验').TaskAwardCount, 123);
const Reward = load('Panel/ZRSJZ_GetAwardPanel.ts', ['Show', 'GetAwards', 'OnButtonClick'], {
    ...globals, Parent: class { Show() {} }, ZRSJZ_AccountService: { ChangeGold: value => gold += value },
    ZRSJZ_GradeService: { AddExperience: value => experience += value },
}, 'extends Parent');
const reward = new Reward(); let displayed;
reward.ShowAward = (...awards) => { displayed = awards; reward._awards = awards; };
(async () => {
    reward.Show(options); assert.equal(displayed.length, options.Awards.length); assert.equal(reward._displayOnly, false);
    await reward.GetAwards(); await reward.GetAwards();
    assert.equal(experience, 123); assert.equal(gold, options.PendingAwards.filter(a => a.TaskAwardName === '钞票').reduce((n, a) => n + a.TaskAwardCount, 0));
    assert(received.every(a => !a.PropName.endsWith('扩容')), 'already granted expansions never become inventory items');
    click(); assert.equal(popups.length, 1); assert.equal(expansions.length, lines.ZRSJZ_SIDE_TASK_LINES.length);
    data.TaskLines[lines.ZRSJZ_SIDE_TASK_LINES[0].ID].count = lines.ZRSJZ_SIDE_TASK_LINES[0].Tasks[1].Objective.count;
    click(); assert.equal(popups.length, 2); assert.equal(popups[1][1].DisplayOnly, true, 'side-only popup is display only');
    reward.Show(popups[1][1]); assert.equal(reward._displayOnly, true); assert.equal(reward._awards.length, 0);
    panel._claiming = true; const before = sounds.length; click(); assert.equal(popups.length, 2); assert.equal(sounds.length, before + 1);
    const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/主线任务界面.prefab'));
    const button = prefab.find(item => item.__type__ === 'cc.Node' && item._name === '全部领取');
    const component = button._components.map(ref => prefab[ref.__id__]).find(item => item.__type__ === 'cc.Button');
    assert.equal(component.clickEvents.length, 1); assert.equal(prefab[component.clickEvents[0].__id__].handler, 'OnButtonClick');
    console.log('PASS: accept all lines, claim mixed rewards once, merged popup, no double expansion/payout, follow-up acceptance, side-only popup, empty hint and existing button binding');
})().catch(error => { console.error(error); process.exitCode = 1; });
