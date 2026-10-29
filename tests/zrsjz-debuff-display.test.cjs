const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
class Sprite { constructor() { this.spriteFrame = null; } }
class Label { constructor() { this.string = 'x1'; } }
class UITransform { constructor() { this.width = 41; } }
class V3 {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    clone() { return new V3(this.x, this.y, this.z); }
}
class Node {
    constructor(name) { this.name = name; this.children = []; this.active = this.activeInHierarchy = this.isValid = true; this.position = new V3(); this.scale = new V3(1, 1, 1); this.components = new Map(); }
    getChildByName(name) { return this.children.find(node => node.name === name); }
    getComponent(type) { return this.components.get(type); }
    set parent(value) { this._parent = value; value.children.push(this); }
    get parent() { return this._parent; }
    setPosition(position) { this.position = position.clone(); }
}
function instantiate(source) {
    const node = new Node(source.name); node.position = source.position.clone(); node.scale = source.scale.clone();
    for (const [type, component] of source.components) node.components.set(type, Object.assign(new type(), component));
    return node;
}
const UI = { ZRSJZ_DLC: false }, requests = [], exportsObject = {};
const source = fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/UI/ZRSJZ_DebuffDisplay.ts', 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: exportsObject, console,
    require(name) {
        if (name === 'cc') return { Sprite, Label, UITransform, instantiate, isValid: object => !!object && object.isValid !== false };
        if (name.includes('UIManager')) return { ZRSJZ_UIManager: UI };
        if (name.includes('Tools')) return { ZRSJZ_Tools: { LoadSpriteByBundle: (bundle, path) => new Promise(resolve => requests.push({ bundle, path, resolve })) } };
        throw Error('Unexpected import: ' + name);
    },
});
const Display = exportsObject.ZRSJZ_DebuffDisplay;
function enemy(scale = 1) {
    const root = new Node('enemy'), icon = new Node('DebuffIcon'), num = new Node('DebuffNum');
    icon.components.set(Sprite, new Sprite()); icon.components.set(UITransform, new UITransform()); num.components.set(Label, new Label());
    icon.position = new V3(161, 695); num.position = new V3(176, 686);
    icon.scale = num.scale = new V3(scale, scale, 1); icon.parent = num.parent = root;
    return { root, icon, num, display: new Display(root) };
}
const flush = () => new Promise(setImmediate);
(async () => {
    const a = enemy(), b = enemy(2);
    a.display.Update({ cold: 2 }); assert.equal(requests.length, 0); assert(!a.icon.active); assert(!a.num.active);
    UI.ZRSJZ_DLC = true;
    a.display.Update({ cold: 2 }); b.display.Update({ cold: 1 }); a.display.Update({ cold: 3 });
    assert.equal(requests.length, 1, 'all enemies share one pending icon request');
    assert.equal(requests[0].bundle, '73_ZRSJZ_DLC'); assert(requests[0].path.endsWith('三元素枪/冰buff'));
    requests[0].resolve({ isValid: true, name: 'ice' }); await flush();
    assert(a.icon.active && a.num.active); assert.equal(a.num.getComponent(Label).string, 'x3');
    assert.equal(b.icon.getComponent(Sprite).spriteFrame.name, 'ice');
    a.display.Update({ cold: 5, fire: 7, poison: 50 });
    assert.equal(requests.length, 3); assert.equal(a.root.children.length, 6);
    const fireRequest = requests.find(r => r.path.endsWith('火buff')), poisonRequest = requests.find(r => r.path.endsWith('毒buff'));
    fireRequest.resolve({ isValid: true, name: 'fire' }); poisonRequest.resolve({ isValid: true, name: 'poison' }); await flush();
    assert.deepEqual(a.root.children.filter(n => n.name.startsWith('DebuffNum')).map(n => n.getComponent(Label).string), ['x5', 'x7', 'x50']);
    const extra = a.root.getChildByName('DebuffIcon_1'); assert(extra.position.x > a.icon.position.x); assert.equal(extra.position.y, 695);
    a.display.Update({ frozen: true }); await flush(); assert.equal(a.num.getComponent(Label).string, '冻结');
    assert(a.icon.active); assert(!extra.active, 'expired fire and poison slots hide independently');
    a.display.Update({ cold: 5, resist: true }); assert.equal(a.num.getComponent(Label).string, '抗性 x5');
    a.display.Update({}); assert(a.root.children.every(n => !n.active));
    // 状态切换/死亡后，旧的异步结果不得重新显示；后续状态读取最新图标。
    Display.frames.clear();
    const c = enemy(); c.display.Update({ fire: 1 }); const stale = requests.at(-1);
    c.display.Update({ poison: 4 }); const current = requests.at(-1);
    current.resolve({ isValid: true, name: 'poison2' }); await flush();
    stale.resolve({ isValid: true, name: 'fire2' }); await flush();
    assert.equal(c.icon.getComponent(Sprite).spriteFrame.name, 'poison2'); assert.equal(c.num.getComponent(Label).string, 'x4');
    Display.frames.clear(); c.display.Update({ cold: 1 }); const dying = requests.at(-1); c.display.Hide();
    dying.resolve({ isValid: true, name: 'late-ice' }); await flush(); assert(!c.icon.active && !c.num.active);
    UI.ZRSJZ_DLC = false; b.display.Update({ poison: 1 }); assert(!b.icon.active && !b.num.active);
    const prefabs = ['持枪小兵', '持刀小兵', '盾牌兵', '喷火兵', 'Boss1'].map(name => 'assets/Game_Bundles/73_ZRSJZ/Prefabs/Unit/Enemy/' + name + '.prefab')
        .concat(['Boss2', 'Boss3'].map(name => 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Unit/Enemy/' + name + '.prefab'));
    for (const path of prefabs) {
        const data = JSON.parse(fs.readFileSync(path));
        for (const [name, type] of [['DebuffIcon', 'cc.Sprite'], ['DebuffNum', 'cc.Label']]) {
            const node = data.find(n => n.__type__ === 'cc.Node' && n._name === name); assert(node, path + ': ' + name);
            assert(node._components.some(ref => data[ref.__id__].__type__ === type));
        }
    }
    console.log('PASS: DLC gate, shared icon loading, live stack counts, multiple effects, freeze/resistance, expiry, stale async callbacks, cleanup and all seven enemy prefabs.');
})().catch(error => { console.error(error); process.exitCode = 1; });
