const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const UI = { ZRSJZ_DLC: true }, requests = [], instances = [], afterDraw = [];
const C = { EffectPath: 'Prefabs/Unit/Map/冰冻', AnimationName: 'bd', EffectCenter: { x: 252.46, y: 130.87 } };
const Skeleton = {};
function effect() {
    const visual = { name: 'Spine', children: [], scale: { x: 2.4, y: 2.4 }, setPosition(x, y, z) { this.position = { x, y, z }; } };
    const skeleton = { isValid: true, paused: false, findAnimation: () => ({ duration: 2 }), setAnimation(...args) { this.animation = args; } };
    const node = { isValid: true, active: true, children: [visual], entity: {}, getChildByName: () => visual,
        getComponentInChildren: type => { assert.equal(type, Skeleton); return skeleton; },
        setPosition(x, y, z) { this.position = { x, y, z }; }, removeFromParent() { this.parent = null; },
        destroy() { this.entity = null; this.isValid = false; },
    };
    instances.push({ node, visual, skeleton }); return node;
}
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Effect/ZRSJZ_EnemyFreezeVisual.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject, console,
    require(name) {
        if (name === 'cc') return { sp: { Skeleton }, instantiate: effect, isValid: node => !!node && node.isValid !== false,
            Director: { EVENT_AFTER_DRAW: 'after-draw' }, director: { once(event, fn) { assert.equal(event, 'after-draw'); afterDraw.push(fn); } } };
        if (name.includes('UIManager')) return { ZRSJZ_UIManager: UI };
        if (name.includes('Tools')) return { ZRSJZ_Tools: { LoadPrefabByBundle: (bundle, path) => new Promise(resolve => requests.push({ bundle, path, resolve })) } };
        if (name.includes('Constant')) return { ZRSJZ_ICE_BUTTERFLY_CONFIG: C };
        throw Error('Unexpected module: ' + name);
    },
});
const Visual = exportsObject.ZRSJZ_EnemyFreezeVisual;
const flush = () => new Promise(setImmediate);
(async () => {
    const root = { isValid: true, activeInHierarchy: true, layer: 4 }, v = new Visual(root);
    UI.ZRSJZ_DLC = false; v.Update(true, .8, { x: 0, y: 200 }, false); assert.equal(requests.length, 0);
    UI.ZRSJZ_DLC = true;
    v.Update(true, .8, { x: 0, y: 200 }, false); v.Update(true, .6, { x: 0, y: 200 }, false);
    assert.equal(requests.length, 1); assert.equal(requests[0].bundle, '73_ZRSJZ_DLC'); assert.equal(requests[0].path, C.EffectPath);
    requests[0].resolve({}); await flush();
    const first = instances[0]; assert.equal(first.node.parent, root); assert.equal(first.node.position.x, 0);
    assert.equal(first.visual.position.x, -C.EffectCenter.x * 2.4); assert.equal(first.visual.position.y, 200 - C.EffectCenter.y * 2.4);
    assert.equal(first.visual.layer, root.layer); assert.equal(first.skeleton.timeScale, 2 / .6);
    assert.deepEqual(first.skeleton.animation, [0, 'bd', false]);
    v.SetPaused(true); assert(first.skeleton.paused); v.SetPaused(false); assert(!first.skeleton.paused);
    v.Update(false, 0, { x: 0, y: 0 }, false); v.Clear(); assert.equal(afterDraw.length, 1);
    assert(!first.node.active); assert.equal(first.node.parent, null); assert(first.node.entity, 'entity stays alive through the current native render');
    afterDraw.splice(0).forEach(fn => fn()); assert.equal(first.node.entity, null);
    v.Update(true, .4, { x: 10, y: 300 }, false); const stale = requests.at(-1); v.Clear();
    stale.resolve({}); await flush(); assert.equal(instances.length, 1, 'late load cannot create ice after death or thaw');
    v.Update(true, .4, { x: 0, y: 200 }, true); requests.at(-1).resolve({}); await flush();
    assert.equal(instances[1].skeleton.timeScale, 5); assert(instances[1].skeleton.paused);
    root.activeInHierarchy = false; v.Update(true, .3, { x: 0, y: 200 }, false); assert(!instances[1].node.active);
    afterDraw.splice(0).forEach(fn => fn());
    const enemySource = fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_EnemyBase.ts', 'utf8');
    assert.match(enemySource, /!!state\?\.frozen && !this\.ElementIsBoss && !this\.IsDead/);
    assert.match(enemySource, /frozenRemaining: Math\.max/);
    console.log('PASS: shared player ice resource, body alignment, ordinary/elite duration, pause, deferred native disposal, stale loads and lifecycle cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
