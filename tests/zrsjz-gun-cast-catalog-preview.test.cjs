const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
const source = fs.readFileSync(root + 'Panel/ZRSJZ_GunCastPanel.ts', 'utf8');
const ast = ts.createSourceFile('panel.ts', source, ts.ScriptTarget.Latest, true);
const names = ['at', 'bind', 'CanClose', 'bindCatalogWeapons', 'bindOutsideClose'];
const members = ast.statements.find(ts.isClassDeclaration).members.filter(m => names.includes(m.name?.getText(ast))).map(m => m.getText(ast)).join('\n');
const constants = ts.createSourceFile('constants.ts', fs.readFileSync(root + 'ZRSJZ_Constant.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = constants.statements.filter(ts.isVariableStatement).flatMap(s => Array.from(s.declarationList.declarations)).find(d => d.name.getText(constants) === 'ZRSJZ_GUN_CAST_CONFIG');
const C = vm.runInNewContext(ts.transpileModule('(' + declaration.initializer.getText(constants) + ')', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);
class Button { static EventType = { CLICK: 'click' }; static Transition = { SCALE: 1, NONE: 0 }; }
const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/枪械图鉴弹窗.prefab'));
function node(index, prefabData = prefab) {
    const data = prefabData[index];
    const n = { name: data._name, active: data._active, children: [], listeners: {}, button: null,
        getChildByName(name) { return this.children.find(child => child.name === name); },
        getComponent(type) { return type === Button ? this.button : null; },
        addComponent(type) { assert.equal(type, Button); return this.button = new Button(); },
        on(event, fn, receiver) { assert(!this.listeners[event], 'button gets one listener'); this.listeners[event] = () => fn.call(receiver); },
    };
    n.children = data._children.map(c => node(c.__id__, prefabData)); return n;
}
const opened = [], sounds = [];
const Subject = vm.runInNewContext(ts.transpileModule(`class Subject {${members}}\nSubject`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    C, Button, Node: { EventType: { TOUCH_END: 'touch-end' } }, UI: { Instance: { ShowPanel(...args) { opened.push(args); } } }, ZRSJZ_PANEL: { 道具弹窗: 'prop-details' },
    ZRSJZ_AudioManager: { Instance: { PlaySound(name) { sounds.push(name); } } },
});
const panel = Object.assign(new Subject(), { Panel: node(1).getChildByName('Panel'), busy: false, hammerPlaying: false, breakingWeapon: false });
panel.bindCatalogWeapons();
for (let i = 0; i < C.weapons.length; i++) {
    const slot = panel.at('Layout/Lv' + (i + 1)); assert(slot.button);
    assert.equal(slot.button.transition, Button.Transition.NONE); assert.equal(slot.button.zoomScale, 1);
    assert(slot.getChildByName('Icon')); assert(slot.getChildByName('lock'));
    slot.listeners.click(); assert.deepEqual(opened.at(-1), ['prop-details', C.weapons[i], 0, true]);
}
for (const [element, expected] of [['冰','冰霜裁决'],['毒','蚀骨毒牙'],['火','烈焰破军']]) {
    const slot = panel.at('LV13/特殊武器底-' + element); assert(slot.button);
    assert.equal(slot.button.transition, Button.Transition.NONE); assert.equal(slot.button.zoomScale, 1);
    slot.getChildByName('lock').active = true;
    slot.listeners.click(); assert.deepEqual(opened.at(-1), ['prop-details', expected, 0, true], 'locked weapons still support read-only preview');
}
assert.equal(opened.length, 15); assert.equal(sounds.length, 15);
panel.busy = true; panel.at('Layout/Lv1').listeners.click(); assert.equal(opened.length, 15);
const entranceData = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/铸枪入口弹窗.prefab'));
const entranceNode = node(1, entranceData);
let closed = 0;
const entrance = Object.assign(new Subject(), { node: entranceNode, Panel: entranceNode.getChildByName('Panel'), busy: false, close() { closed++; } });
entrance.bindCatalogWeapons(true); entrance.bindOutsideClose();
for (const [element, expected] of [['冰','冰霜裁决'],['毒','蚀骨毒牙'],['火','烈焰破军']]) {
    const slot = entrance.at('Layout/特殊武器底-' + element);
    assert.equal(slot.button.transition, Button.Transition.NONE); assert.equal(slot.button.zoomScale, 1);
    slot.listeners.click(); assert.deepEqual(opened.at(-1), ['prop-details', expected, 0, true]);
    assert.equal(closed, 0, 'preview does not close entrance');
}
assert.equal(opened.length, 18); assert.equal(sounds.length, 18);
const mask = entranceNode.getChildByName('Mask');
assert(entranceData[2]._components.some(c => entranceData[c.__id__].__type__ === 'cc.BlockInputEvents'));
assert(entranceData[12]._components.some(c => entranceData[c.__id__].__type__ === 'cc.BlockInputEvents'));
mask.listeners['touch-end'](); assert.equal(closed, 1);
entrance.busy = true; mask.listeners['touch-end'](); assert.equal(closed, 1);
entrance.bind('关闭', () => {});
assert.equal(entrance.at('关闭').button.transition, Button.Transition.SCALE, 'other buttons retain feedback');
assert.match(source, /this\.bindCatalogWeapons\(true\)/);
assert.match(source, /this\.bindCatalogWeapons\(\)/);
const prop = fs.readFileSync(root + 'Panel/ZRSJZ_PropPanel.ts','utf8');
assert.match(prop, /this\.ShowProp\(args\[0\], args\[2\] === true\)/);
console.log('PASS: catalogue and entrance weapon previews match, retain sound without scale; entrance mask closes safely and other buttons retain feedback.');
