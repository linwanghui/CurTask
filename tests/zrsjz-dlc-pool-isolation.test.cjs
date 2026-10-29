const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const source = fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Manager/ZRSJZ_PoolManager.ts', 'utf8');
const ast = ts.createSourceFile('pool.ts', source, ts.ScriptTarget.Latest, true);
const members = ast.statements.find(ts.isClassDeclaration).members.filter(m => !['Instance', '_instance'].includes(m.name?.getText(ast))).map(m => m.getText(ast)).join('\n');
class NodePool {
    constructor() { this.items = []; }
    size() { return this.items.length; }
    put(node) { this.items.push(node); }
    get() { return this.items.pop(); }
    clear() { this.items = []; }
}
const loads = [];
const Pool = vm.runInNewContext(ts.transpileModule(`class Pool {${members}}\nPool`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText, { NodePool, instantiate: prefab => ({ name: 'HarmEffect', isValid: true, variant: prefab.variant, removeFromParent() {} }),
    ZRSJZ_Tools: {
        LoadPrefab: async path => { loads.push('main:' + path); return { variant: 'main' }; },
        LoadPrefabByBundle: async (bundle, path) => { loads.push(bundle + ':' + path); return { variant: 'poison' }; },
    },
});
(async () => {
    const pool = new Pool(), ordinary = 'Prefabs/Effect/HarmEffect', poison = '73_ZRSJZ_DLC/Prefabs/Effect/HarmEffect';
    const normal = await pool.GetNode(ordinary), special = await pool.GetNode(poison);
    assert.equal(normal.name, special.name); assert.equal(normal.variant, 'main'); assert.equal(special.variant, 'poison');
    pool.PutNode(special); pool.PutNode(normal);
    assert.equal(await pool.GetNode(poison), special); assert.equal(await pool.GetNode(ordinary), normal);
    assert.equal(loads.length, 2, 'same-named prefabs have independent caches');
    pool.PutNode(normal); pool.ClearPool(poison);
    assert.equal(await pool.GetNode(ordinary), normal, 'clearing DLC pool preserves ordinary damage display');
    const preloaded = new Pool();
    await preloaded.Preload(ordinary, 2); await preloaded.Preload(poison, 2);
    await new Promise(setImmediate);
    const first = await preloaded.GetNode(poison); assert.equal(first.variant, 'poison');
    preloaded.PutNode(first); assert.equal((await preloaded.GetNode(ordinary)).variant, 'main');
    const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/HarmEffect.prefab'));
    assert(prefab.some(item => item.__type__ === 'cc.Node' && item._name === 'Harm'));
    assert(prefab.some(item => item.__type__ === '0212bvH3QlCE6PGY0OT+K8Z'), 'DLC effect uses the shared damage-number component');
    console.log('PASS: ordinary/poison HarmEffect prefab caches, recycling, preloading and targeted clearing stay isolated.');
})().catch(error => { console.error(error); process.exitCode = 1; });
