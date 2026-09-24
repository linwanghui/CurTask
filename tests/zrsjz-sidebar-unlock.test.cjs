const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const source = ts.createSourceFile('start.ts', fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Start.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const cls = source.statements.find(ts.isClassDeclaration);
const methods = ['GetUnlockLevel', 'HasFirstUnlockReminder', 'RefreshSidebarUnlocks', 'RefreshMainReminders', 'OnButtonClick'];
const code = `class Start { ${cls.members.filter(m => methods.includes(m.name?.getText(source))).map(m => m.getText(source)).join('\n')} } Start;`;
class Button {}
class Sprite {}
class Label {}
class Node {
    constructor(name) { this.name = name; this.active = true; this.children = []; this.sprite = {}; this.label = {}; }
    getChildByName(name) { return this.children.find(c => c.name === name); }
    getComponent(type) { return type === Sprite ? this.sprite : type === Label ? this.label : null; }
    getComponentInChildren(type) { return this.getComponent(type); }
    setParent(parent) { parent.children.push(this); }
    setScale() {}
}
let data = { Grade: 1 }, saves = 0, opened = [], hints = [];
const names = ['锻造台', '宠物', '曼德尔箱', '战令', '活动'];
const buttons = [...names, '成就'].map(name => {
    const node = new Node(name);
    new Node('等级解锁').setParent(node);
    if (name !== '锻造台') new Node('红点').setParent(node);
    return { node };
});
const ui = { ZRSJZ_UI: true, ZRSJZ_DLC: true, Dragging: false,
    Instance: { ShowTip: text => hints.push(text), ShowPanel: panel => opened.push(panel) } };
const tweenChain = { to() { return this; }, union() { return this; }, repeatForever() { return this; }, start() {} };
const globals = { Button, Sprite, Label, isValid: n => !!n,
    instantiate: n => new Node(n.name), Tween: { stopAllByTarget() {} }, tween: () => tweenChain, v3() {},
    ZRSJZ_GradeService: { GetGradeInfo: () => ({ Level: data.Grade }) },
    ZRSJZ_GameData: { get Instance() { return data; }, SaveData() { saves++; } },
    ZRSJZ_UIManager: ui, ZRSJZ_AudioManager: { Instance: { PlaySound() {} } },
    ZRSJZ_PANEL: { 锻造界面: 'forge', 宠物界面: 'pet', 曼德尔箱界面: 'box', 战令界面: 'pass', 活动界面: 'activity' },
    ZRSJZ_MainReminderService: { GetReminders: () => ({ 宠物: true, 活动: true, 战令: true, 成就: true }) }
};
const Start = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, globals);
function create() {
    return Object.assign(new Start(), { ForgeUnlockLevel: 5, PetUnlockLevel: 2, MandellBoxUnlockLevel: 8,
        BattlePassUnlockLevel: 6, ActivityUnlockLevel: 6, _mainReminderNodes: new Map(),
        UIPanel: { getComponentsInChildren: () => buttons } });
}
let start = create();
const click = name => start.OnButtonClick({ getCurrentTarget: () => ({ name }) });
// Boundary checks include already-claimable rewards and old saves with no visited field.
for (const [name, level] of [['锻造台', 5], ['宠物', 2], ['曼德尔箱', 8], ['战令', 6], ['活动', 6]]) {
    const node = buttons.find(b => b.node.name === name).node;
    data.Grade = level - 1;
    start.RefreshMainReminders();
    assert.equal(node.sprite.grayscale, true);
    assert.equal(node.getChildByName('等级解锁').label.string, `${level}级解锁`);
    assert.equal(node.getChildByName('第一次解锁红点').active, false);
    if (node.getChildByName('红点')) assert.equal(node.getChildByName('红点').active, false);
    const count = opened.length;
    click(name); assert.equal(opened.length, count);
    data.Grade = level;
    start.RefreshMainReminders();
    assert.equal(node.sprite.grayscale, false);
    assert.equal(node.getChildByName('等级解锁').active, false);
    assert.equal(node.getChildByName('第一次解锁红点').active, true);
    ui.ZRSJZ_DLC = false; click(name);
    assert.equal(data.ViewedSidebarFeatures?.[name], undefined);
    ui.ZRSJZ_DLC = true; click(name);
    assert.equal(opened.length, count + 1);
    assert.equal(node.getChildByName('第一次解锁红点').active, false);
    data = JSON.parse(JSON.stringify(data)); start = create(); start.RefreshMainReminders();
    assert.equal(node.getChildByName('第一次解锁红点').active, false, 'must remain dismissed after reload');
}
assert.equal(saves, 5);
assert.equal(buttons.find(b => b.node.name === '宠物').node.getChildByName('红点').active, true, 'reward reminders remain independent');
assert.equal(buttons.find(b => b.node.name === '成就').node.getChildByName('红点').active, true);
console.log('PASS: five unlock boundaries, grayscale, lock labels, click gating, DLC readiness, persistent first reminder, independent reward reminders');
