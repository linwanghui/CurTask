const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
const source = fs.readFileSync(root + 'Panel/ZRSJZ_GunCastPanel.ts', 'utf8');
const ast = ts.createSourceFile('panel.ts', source, ts.ScriptTarget.Latest, true);
const cls = ast.statements.find(ts.isClassDeclaration);
const methods = cls.members.filter(m => ['CanClose', 'at', 'bind', 'init', 'close', 'Show', 'openItemPopup', 'closeItemPopup'].includes(m.name?.getText(ast)))
    .map(m => m.getText(ast)).join('\n');
const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/铸枪界面.prefab', 'utf8'));
class Button {
    static EventType = { CLICK: 'click' };
    static Transition = { SCALE: 1, NONE: 0 };
}
// 使用真实预制体层级，验证点到有 Sprite 的实际按钮会触发退出。
function nodeFrom(index) {
    const data = prefab[index];
    const node = {
        name: data._name, children: [], listeners: {},
        button: data._components.some(c => prefab[c.__id__].__type__ === 'cc.Button') ? new Button() : null,
        getChildByName(name) { return this.children.find(n => n.name === name); },
        getComponent(type) { return type === Button ? this.button : null; },
        addComponent() { return this.button = new Button(); },
        on(event, fn) { this.listeners[event] = fn; },
    };
    node.children = data._children.map(c => nodeFrom(c.__id__));
    return node;
}
const constants = fs.readFileSync(root + 'ZRSJZ_Constant.ts', 'utf8').split('export const ZRSJZ_GUN_CAST_CONFIG =')[1];
let storage = {}, balance = 2000000;
const serviceCode = 'const C =' + constants + '\n' + fs.readFileSync(root + 'Service/ZRSJZ_GunCastService.ts', 'utf8')
    .replace(/^import .*;$/gm, '').replace(/^export type .*;$/gm, '').replace('export class', 'class') + '\nZRSJZ_GunCastService';
function loadService() {
    return vm.runInNewContext(ts.transpileModule(serviceCode, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
        sys: { localStorage: { getItem: k => storage[k], setItem: (k, v) => storage[k] = v } },
        ZRSJZ_GameData: { Instance: { get Gold() { return balance; } } },
        ZRSJZ_AccountService: { ChangeGold: n => balance += n },
    });
}
const S = loadService();
let closed = 0, rendered;
const Subject = vm.runInNewContext(ts.transpileModule('class Subject extends Base {' + methods + '}\nSubject', {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText, {
    Base: class { Show() { this.node.active = true; } }, S, Button,
    sp: { Skeleton: Symbol() },
    ZRSJZ_AudioManager: { Instance: { PlaySound() {} } },
    UI: { Instance: { HidePanel(path) { assert(path.endsWith('/铸枪界面')); closed++; } } },
});
const panel = new Subject();
Object.assign(panel, {
    node: nodeFrom(1), busy: false, hammerPlaying: false, breakingWeapon: false,
    initialized: false, prepareImpactEffects() {}, breathe() {}, image() {}, setItemQuality() {},
    active(path, value) { const node = this.at(path); if (node) node.active = value; },
    refresh() { rendered = JSON.stringify(S.load().round); },
});
panel.Show();
const back = panel.at('返回/返回');
assert(back.button); assert(back.listeners.click, 'actual return button is bound');
for (const broken of [false, true]) {
    const round = { id: 42, level: 7, branch: 0, hits: 6, superUntil: 0, broken, recovered: false, ads: broken ? 1 : 0 };
    S.save({ date: S.today(), seen: ['0', '7'], round });
    const saved = storage[S.key];
    if (!broken) {
        const slot=panel.at('铸枪道具/铸枪护盾');assert(slot.listeners.click,'actual icon slot is bound');
        slot.listeners.click();assert.equal(panel.itemPopupKind,'铸枪护盾');assert(panel.at('道具弹窗').active);
        assert.equal(storage[S.key],saved,'opening item details does not forge or consume saved progress');
        panel.at('道具弹窗/Panel/关闭').listeners.click();assert.equal(panel.itemPopupKind,null);assert(!panel.at('道具弹窗').active);
        slot.listeners.click();panel.at('道具弹窗/Mask').listeners.click();assert(!panel.at('道具弹窗').active,'outside mask closes details');
    }
    if (broken) panel.at('损毁弹板/Panel/关闭').listeners.click();
    else back.listeners.click();
    assert.equal(storage[S.key], saved, 'exit preserves all progress');
    assert.equal(balance, 2000000, 'exit grants no rewards or entry charge');
    const reloaded = loadService();
    assert.equal(JSON.stringify(reloaded.load().round), JSON.stringify(round), 'survives script/game reload');
    panel.Show();
    assert.equal(rendered, JSON.stringify(round), 'reopening refreshes from saved progress');
    assert.equal(reloaded.enter(false), '');
    assert.equal(balance, 2000000, 'resume does not charge again');
    assert.equal(storage[S.key], saved);
}
assert.equal(closed, 2);
// 执行主页真实 switch 分支，检查有存档直接续接、结束本炉后恢复入场弹窗。
const start = fs.readFileSync(root + 'ZRSJZ_Start.ts', 'utf8');
const entry = start.match(/case '铸枪':([\s\S]*?)break;/)[1];
let opened;
const context = { ZRSJZ_GunCastService: S, ZRSJZ_UIManager: { Instance: { ShowPanel(path) { opened = path; } } } };
vm.runInNewContext(entry, context);
assert(opened.endsWith('/铸枪界面'));
S.finish();
vm.runInNewContext(entry, context);
assert(opened.endsWith('/铸枪入口弹窗'));
console.log('PASS: actual prefab return button, normal/damaged exits, saved progress across reload, refreshed resume, no repeat charge and homepage routing.');
