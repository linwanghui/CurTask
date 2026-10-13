const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ts = require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
function load(file, deps, log = console) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(root + file, 'utf8'), { compilerOptions: {
  target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true,
 } }).outputText;
 vm.runInNewContext(code, { exports, require: name => {
  if (!(name in deps)) throw Error('Unmocked dependency: ' + name);
  return deps[name];
 }, console: log });
 return exports;
}
const constantText = fs.readFileSync(root + 'ZRSJZ_Constant.ts', 'utf8');
const configExports = {};
vm.runInNewContext(ts.transpileModule(constantText.slice(constantText.indexOf('/** 名称必须与 DLC/')), {
 compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: configExports });
const config = configExports.ZRSJZ_ACTION_CONFIG;
for (const item of config) {
 assert.equal(item.Unlock.Type, 'default');
 assert(fs.existsSync('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/动作系统/动作/' + item.Name + '.png'));
}
const constants = { ...configExports, ZRSJZ_PROP_CONFIG: new Map(), ZRSJZ_INVENTORY: { 仓库_全部: '仓库_全部' } };
const holder = { ZRSJZ_GameData: { Versions: 30 } };
const defaults = load('Service/ZRSJZ_GameDataDefaults.ts', {
 '../ZRSJZ_Constant': constants,
 '../ZRSJZ_GameData': holder,
 '../ZRSJZ_TaskLines': { ZRSJZ_SIDE_TASK_LINES: [] },
 '../ZRSJZ_EnhancementConfig': {}, '../ZRSJZ_BattlePassConfig': {},
 './ZRSJZ_MidAutumnService': {}, '../ZRSJZ_MatrixState': {},
}).ZRSJZ_GameDataDefaults;
const storage = new Map();
const Data = load('ZRSJZ_GameData.ts', {
 cc: { sys: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } } },
 './ZRSJZ_Constant': constants,
 './Service/ZRSJZ_GameDataDefaults': { ZRSJZ_GameDataDefaults: defaults },
 './Service/ZRSJZ_MailService': { ZRSJZ_MailService: { CheckExpired() {} } },
 './ZRSJZ_BattlePassConfig': { CreateBattlePassState: () => ({}) },
 './ZRSJZ_MatrixState': { CreateMatrixState: () => ({}) },
}).ZRSJZ_GameData;
holder.ZRSJZ_GameData = Data;
function readFixture(extra) {
 const fixture = { Versions: 29, Gold: 456789, Grade: 12, PropData: { abc: { Name: 'existing', CurCount: 8 } },
  HaveRole: ['existing hero'], OwnedTitles: ['勇者'], EquippedTitle: '勇者', OwnedAvatarFrames: ['1'], CurrentAvatarFrame: '1', ...extra };
 const json = JSON.stringify(fixture);
 storage.set('ZRSJZ_GameData', json);
 const data = Data.ReadData();
 assert.equal(data.Gold, fixture.Gold); assert.deepEqual(JSON.parse(JSON.stringify(data.PropData)), fixture.PropData);
 assert.deepEqual(JSON.parse(JSON.stringify(data.HaveRole)), fixture.HaveRole);
 return { data, json };
}
const names = config.map(item => item.Name);
let fixture = readFixture({});
assert.equal(fixture.data.Versions, 30);
assert.equal(storage.get('ZRSJZ_GameData_before_v30'), fixture.json);
assert.deepEqual(Array.from(fixture.data.UnlockedActions), Array.from(names));
assert.deepEqual(Array.from(fixture.data.EquippedActions), Array.from(names));
fixture = readFixture({ UnlockedActions: names, EquippedActions: [names[2], names[0]] });
assert.deepEqual(Array.from(fixture.data.EquippedActions), [names[2], names[0]]);
fixture = readFixture({ UnlockedActions: null, EquippedActions: null });
assert.deepEqual(Array.from(fixture.data.EquippedActions), Array.from(names));
fixture = readFixture({ Versions: 31, EquippedActions: ['future action'] });
assert.equal(fixture.data.Versions, 31); assert.deepEqual(Array.from(fixture.data.EquippedActions), ['future action']);
readFixture({});
const plays = [];
const service = load('Service/ZRSJZ_ActionService.ts', {
 cc: {}, '../ZRSJZ_Constant': constants, '../ZRSJZ_GameData': { ZRSJZ_GameData: Data },
 '../ZRSJZ_Tools': { ZRSJZ_Tools: { LoadSpriteByBundle: async () => ({}) } },
}, { log: value => plays.push(value) }).ZRSJZ_ActionService;
service.Unequip(names[1]);
assert.deepEqual(Array.from(Data.Instance.EquippedActions), [names[0], names[2]]);
assert.equal(service.Equip(names[1]), ''); assert.equal(service.Equip(names[1]), '');
assert.deepEqual(Array.from(Data.Instance.EquippedActions), [names[0], names[2], names[1]]);
// 配置扩展到五个动作后验证第5个不能装备；默认图标配置仍只有真实的三个。
config.push({ Name: 'test4', Unlock: { Type: 'manual' } }, { Name: 'test5', Unlock: { Type: 'manual' } });
Data.Instance.UnlockedActions.push('test4', 'test5');
assert.equal(service.Equip('test4'), ''); assert.equal(service.Equip('test5'), '动作已满');
assert.equal(Data.Instance.EquippedActions.length, 4);
assert.equal(service.Equip('unknown'), '动作不存在');
service.Play(3); service.Play(4); assert.equal(plays.length, 1);
for (const [x, y, expected] of [[0, 100, 0], [100, 0, 1], [0, -100, 2], [-100, 0, 3], [0, 0, -1], [90, 80, 1]]) {
 assert.equal(service.GetDirection(x, y), expected);
}

class Vec3 {
 constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
 set(x, y, z) { if (typeof x === 'object') ({ x, y, z } = x); Object.assign(this, { x, y, z }); return this; }
 clone() { return new Vec3(this.x, this.y, this.z); }
}
class UITransform {
 constructor() { this.width = 100; this.height = 100; this.anchorX = this.anchorY = 0.5; }
 convertToNodeSpaceAR(v, out = new Vec3()) { return out.set(v); }
}
class Sprite { spriteFrame = null; }
class Node {
 static EventType = { TOUCH_START: 'start', TOUCH_MOVE: 'move', TOUCH_END: 'end', TOUCH_CANCEL: 'cancel' };
 constructor(name) { this.name = name; this.active = true; this.scale = new Vec3(1, 1, 1); this.angle = 0; this.events = {}; this.children = []; this.area = new UITransform(); this.sprite = new Sprite(); }
 get activeInHierarchy() { return this.active; }
 getChildByName(name) { return this.children.find(node => node.name === name); }
 getComponent(type) { return type === UITransform ? this.area : type === Sprite ? this.sprite : null; }
 setScale(x, y, z) { this.scale.set(x, y, z); }
 on(type, cb) { this.events[type] = cb; }
}
const running = new Map();
function tween(target) {
 const steps = [];
 return { to(duration, props) { steps.push(() => Object.assign(target, props)); return this; },
  call(fn) { steps.push(fn); return this; }, start() { running.set(target, () => { for (const step of steps) step(); }); return this; } };
}
function finishTween(target) { const fn = running.get(target); running.delete(target); assert(fn); fn(); }
const selected = [], panels = [];
let sceneName = 'ZRSJZ_Start';
const globalTouches = new Map();
const ButtonClass = load('Controller/ZRSJZ_ActionButton.ts', {
 cc: { _decorator: { ccclass: () => c => c }, Component: class {}, director: { getScene: () => ({ name: sceneName }) },
  input: { on(type, callback, target) { globalTouches.set(type, callback.bind(target)); }, off(type) { globalTouches.delete(type); } },
  Input: { EventType: Node.EventType }, isValid: obj => !!obj,
  Node, Sprite, UITransform, Vec3, Tween: { stopAllByTarget: target => running.delete(target) }, tween },
 '../ZRSJZ_GameData': { ZRSJZ_GameData: Data },
 '../Service/ZRSJZ_ActionService': { ZRSJZ_ActionService: { ...service, GetDirection: service.GetDirection,
  Play: index => selected.push(index), LoadIcon: async () => ({}) } },
 '../Manager/ZRSJZ_UIManager': { ZRSJZ_UIManager: { Instance: { ShowPanel: name => panels.push(name) } } },
}).ZRSJZ_ActionButton;
const button = new ButtonClass(); button.node = new Node('动作按钮');
const disc = new Node('动作圆盘'), pointer = new Node('动作拖动'), custom = new Node('自定义');
button.node.children = [disc, custom]; disc.children = [pointer, ...[1, 2, 3, 4].map(i => new Node('动作' + i))];
button.onLoad();
button.onEnable();
assert(button.node.events.cancel, 'Node boundary release has its own handler');
function event(x = 0, y = 0, originalType = 'end', id = 1) {
 return { target: button.node, getID: () => id, getUILocation: () => ({ x, y }), getEventCode: () => originalType };
}
button.StartPress(event()); button.EndPress(event());
assert(button.animating); assert(disc.active); assert.equal(disc.angle, -90);
button.Select(0); assert.equal(selected.length, 0, 'Opening animation cannot select');
finishTween(disc); assert(!button.animating); assert(custom.active); assert.equal(disc.scale.x, 1);
button.Select(1); assert.equal(selected.length, 1); assert(button.animating);
button.Select(2); assert.equal(selected.length, 1, 'Closing animation cannot select');
finishTween(disc); assert(!disc.active); assert(!custom.active);
button.StartPress(event()); button.update(0.31); assert(button.dragging); assert(!custom.active);
button.MovePress(event(100, 0)); finishTween(disc);
assert.equal(pointer.angle, -90); assert(pointer.active); assert(!custom.active);
globalTouches.get('end')(event(100, 0)); assert.deepEqual(selected, [1, 1]); finishTween(disc);
// 松手发生在展开动画中，不选择，并在展开完成后自动收起。
button.StartPress(event()); button.update(0.31); button.EndPress(event(0, 100));
assert(button.pendingClose); finishTween(disc); assert(button.animating); finishTween(disc);
assert.equal(selected.length, 2); assert(!disc.active);
button.StartPress(event()); button.EndPress(event()); finishTween(disc);
button.OutsidePress(event(500, 500)); assert(button.animating); finishTween(disc); assert(!disc.active);
button.StartPress(event()); button.update(0.31); finishTween(disc); button.CancelPress(event()); finishTween(disc);
assert.equal(selected.length, 2, 'Cancel cannot select');
button.onDisable(); assert.equal(running.size, 0); assert.equal(globalTouches.size, 0);
button.StartPress(event()); button.EndPress(event()); finishTween(disc);
custom.events.end(event()); assert.equal(panels.length, 1); finishTween(disc);
sceneName = 'ZRSJZ_Game';
button.StartPress(event()); button.EndPress(event()); finishTween(disc);
assert(!custom.active, 'Customize is hidden outside home');
custom.events.end(event()); assert.equal(panels.length, 1, 'Customize cannot open outside home');
button.onDisable();

// 模拟引擎吞掉全局事件后，将按钮范围外的正常松手转换成节点取消事件。
const outsideSelections = selected.length;
for (const [x, y, direction] of [[0, 500, 0], [500, 0, 1], [0, -500, 2], [-500, 0, 3]]) {
 button.StartPress(event()); button.update(0.31); finishTween(disc);
 button.node.events.move.call(button, event(x, y, 'move'));
 assert.equal(button.selected, direction); assert.equal(pointer.angle, -90 * direction);
 button.node.events.cancel.call(button, event(x, y, 'end'));
 assert.equal(selected[selected.length - 1], direction);
 assert(!button.holding); finishTween(disc); assert(!disc.active);
 // 后到的全局松手不能重复选择。
 button.EndPress(event(x, y, 'end'));
}
assert.equal(selected.length, outsideSelections + 4);
button.StartPress(event()); button.update(0.31); finishTween(disc);
button.node.events.cancel.call(button, event(500, 0, 'end', 2));
assert(button.holding, 'Other finger cannot finish the gesture');
button.node.events.cancel.call(button, event(500, 0, 'cancel'));
finishTween(disc); assert.equal(selected.length, outsideSelections + 4, 'Actual system cancellation does not select');
button.StartPress(event()); button.update(0.31); finishTween(disc);
button.node.events.move.call(button, event(500, 0, 'move'));
button.node.events.move.call(button, event(0, 0, 'move'));
button.node.events.cancel.call(button, event(0, 0, 'end'));
finishTween(disc); assert.equal(selected.length, outsideSelections + 4, 'Returning to dead zone does not select');

console.log('PASS: v29 migration/backup/future version, ownership and order, four-action limit, icon filenames, four directions, tap/hold/release/cancel, outside close, rotation/scale animation input locks.');

// 使用真实场景层级验证挂载：控制脚本节点与 Canvas 为兄弟节点。
const sceneAsset = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scenes/ZRSJZ_Start.scene', 'utf8'));
const nodes = sceneAsset.map(value => ({ name: value._name, activeInHierarchy: value._active !== false, layer: value._layer }));
sceneAsset.forEach((value, index) => { nodes[index].children = (value._children ?? []).map(ref => nodes[ref.__id__]); });
const controller = sceneAsset.find(value => value.ForgeUnlockLevel !== undefined && value.UIPanel);
const controllerNode = nodes[controller.node.__id__], homeUI = nodes[controller.UIPanel.__id__];
const source = fs.readFileSync(root + 'ZRSJZ_Start.ts', 'utf8');
const syntax = ts.createSourceFile('ZRSJZ_Start.ts', source, ts.ScriptTarget.Latest, true);
const startClass = syntax.statements.find(statement => ts.isClassDeclaration(statement) && statement.name.text === 'ZRSJZ_Start');
const method = startClass.members.find(member => member.name?.getText(syntax) === 'EnsureActionButton');
const mountExports = {};
let loadCount = 0;
const mounted = [];
vm.runInNewContext(ts.transpileModule('export class MountFixture {' + method.getText(syntax) + '}', {
 compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: mountExports, console,
 isValid: node => !!node, director: { getScene: () => nodes[1] },
 ZRSJZ_UIManager: { ZRSJZ_DLC: true }, ZRSJZ_ActionService: { RefreshUnlocks() {} },
 ZRSJZ_Tools: { LoadPrefabByBundle: async () => { loadCount++; return {}; } },
 ZRSJZ_ActionButton: class {},
 instantiate: () => { const node = { children: [], getComponent: () => ({}), setPosition(x, y, z) { this.position = [x, y, z]; } }; mounted.push(node); return node; },
});
(async () => {
 const fixture = new mountExports.MountFixture(); fixture.node = controllerNode; fixture.UIPanel = homeUI;
 await fixture.EnsureActionButton();
 assert.equal(mounted.length, 1); assert.equal(mounted[0].parent.name, '动作_主页');
 assert.deepEqual(mounted[0].position, [0, 0, 0]);
 await fixture.EnsureActionButton(); assert.equal(loadCount, 1, 'Repeated DLC events do not duplicate button');
 console.log('PASS: actual ZRSJZ_Start scene hierarchy mounts button under 动作_主页 exactly once.');
})().catch(error => { console.error(error); process.exitCode = 1; });
