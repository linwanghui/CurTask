const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const source = fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Panel/ZRSJZ_GunCastPanel.ts', 'utf8');
const ast = ts.createSourceFile('panel.ts', source, ts.ScriptTarget.Latest, true);
const names = ['setItemQuality', 'playItemUseEffect', 'removeImpactNode', 'clearImpactEffects'];
const members = ast.statements.find(ts.isClassDeclaration).members.filter(m => names.includes(m.name?.getText(ast))).map(m => m.getText(ast)).join('\n');
const tweens = [], stopped = [], loads = [];
const v3 = (x, y, z = 0) => ({x, y, z, clone() { return v3(this.x, this.y, this.z); }});
class UITransform {
    setContentSize(w, h) { this.width = w; this.height = h; }
    convertToNodeSpaceAR(p) { return v3(p.x - 10, p.y - 20, p.z); }
}
class Sprite { static SizeMode = {CUSTOM: 0}; }
class UIOpacity {}
class Node {
    constructor(name) { this.name = name; this.children = []; this.components = new Map(); }
    set parent(value) { this.owner = value; value.children.push(this); }
    addComponent(type) { const component = new type(); this.components.set(type, component); return component; }
    getComponent(type) { return this.components.get(type); }
    setPosition(p) { this.position = p.clone(); }
    setSiblingIndex(index) { const children = this.owner.children; children.splice(children.indexOf(this), 1); children.splice(index, 0, this); }
    destroy() { this.destroyed = true; if (this.owner) this.owner.children.splice(this.owner.children.indexOf(this), 1); }
}
const UI = {Instance: {
    GetPropGridUI: name => new Promise(resolve => loads.push({name, resolve})),
    GetPropUI: name => new Promise(resolve => loads.push({name, resolve})),
}};
const Panel = vm.runInNewContext(ts.transpileModule(`class Panel {${members}}\nPanel`, {
    compilerOptions: {target: ts.ScriptTarget.ES2020},
}).outputText, {
    Node, Sprite, UITransform, UIOpacity, v3, UI, console,
    isValid: value => !!value && !value.destroyed,
    Tween: {stopAllByTarget: value => stopped.push(value)},
    tween: target => {
        const record = {target, steps: [], to(...args) { this.steps.push(['to', ...args]); return this; },
            delay(time) { this.steps.push(['delay', time]); return this; },
            call(callback) { this.callback = callback; return this; }, start() { return this; }};
        tweens.push(record); return record;
    },
});
(async () => {
    const quality = new Sprite();
    const panel = Object.assign(new Panel(), {itemPopupKind: '铸枪护盾', itemUseEffectVersion: 0,
        impactNodes: new Set(), resultVersion: 0, node: {activeInHierarchy: true},
        at: path => path.endsWith('/品质') ? {getComponent: () => quality} : null,
    });
    const shield = panel.setItemQuality('铸枪护盾');
    panel.itemPopupKind = '铸枪必成券';
    const ticket = panel.setItemQuality('铸枪必成券');
    assert.deepEqual(loads.map(v => v.name), ['金色格子1_1', '红色格子1_1']);
    loads[1].resolve('red'); await ticket;
    loads[0].resolve('gold'); await shield;
    assert.equal(quality.spriteFrame, 'red', 'late shield loading cannot overwrite the ticket background');
    const closing = panel.setItemQuality('铸枪必成券');
    panel.itemPopupKind = null; loads.at(-1).resolve('stale'); await closing;
    assert.equal(quality.spriteFrame, 'red');

    const root = panel.Panel = new Node('Panel'); root.layer = 7; root.addComponent(UITransform);
    const modal = new Node('道具弹窗'); modal.parent = root;
    const icon = new Node('Icon'); icon.worldPosition = v3(110, 70); icon.addComponent(Sprite).spriteFrame = 'shield-icon';
    panel.at = path => path === '铸枪道具/铸枪护盾/Icon' ? icon : null;
    await panel.playItemUseEffect('铸枪护盾');
    const effect = [...panel.impactNodes][0];
    assert(effect); assert.equal(effect.layer, root.layer);
    assert.equal(root.children[0], effect, 'effect stays below modal masks');
    assert.equal(effect.getComponent(Sprite).spriteFrame, 'shield-icon');
    assert.equal(effect.getComponent(UITransform).width, 100);
    assert.equal(effect.getComponent(UITransform).height, 100);
    assert.equal(effect.position.x, 100); assert.equal(effect.position.y, 50);
    const movement = tweens.find(t => t.target === effect);
    assert.equal(movement.steps[0][1], 1.6);
    assert.equal(movement.steps[0][2].position.y, 230, 'icon slowly rises 180 units');
    const fade = tweens.find(t => t.target === effect.getComponent(UIOpacity));
    assert.deepEqual(JSON.parse(JSON.stringify(fade.steps)), [['delay', .45], ['to', 1.15, {opacity: 0}]]);
    assert.equal(icon.worldPosition.y, 70, 'the original inventory icon is not moved');
    fade.callback(); assert(effect.destroyed); assert.equal(panel.impactNodes.size, 0);
    await panel.playItemUseEffect('铸枪护盾');
    const remaining = [...panel.impactNodes][0];
    panel.clearImpactEffects();
    assert(remaining.destroyed); assert(stopped.includes(remaining));
    assert(stopped.includes(remaining.getComponent(UIOpacity))); assert.equal(panel.impactNodes.size, 0);
    const pending = panel.playItemUseEffect('铸枪必成券');
    panel.itemUseEffectVersion++; loads.at(-1).resolve('ticket-icon'); await pending;
    assert.equal(panel.impactNodes.size, 0, 'leaving the panel cancels delayed image effects');
    assert.equal(root.children.length, 1);
    console.log('PASS: quality image switching/races, 100px item effect, slow rise/fade, layering and exit cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
