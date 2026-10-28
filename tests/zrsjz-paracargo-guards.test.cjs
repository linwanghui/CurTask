const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
function load(file, names, globals) {
    const ast = ts.createSourceFile(file, fs.readFileSync(root + file, 'utf8'), ts.ScriptTarget.Latest, true);
    const cls = ast.statements.find(ts.isClassDeclaration);
    return vm.runInNewContext(ts.transpileModule('class Subject {' + cls.members.filter(n => names.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join('\n') + '} Subject;',
        { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, globals);
}
class Vector {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    clone() { return new Vector(this.x, this.y, this.z); }
    set(value) { Object.assign(this, value); }
    static distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
}
const options = { GridSize: 60, AgentRadius: 82, AgentOffsetY: 100 };
function fixture() {
    const created = [], loads = [], recycled = [], dropped = [], warnings = [];
    const point = { isValid: true, worldPosition: new Vector(300, 400) };
    const unit = { isValid: true };
    const map = { Unit: unit, node: { getChildByName: () => ({ children: [point] }) },
        Map: { getComponent: () => ({ getBoundingBoxToWorld: () => ({ xMin: -2000, xMax: 2000, yMin: -2000, yMax: 2000 }) }) } };
    let blocked = false, pending;
    const loader = { async LoadPrefab(path) { loads.push(path); if (pending) await pending; return { path }; } };
    const box = { parent: null, getComponent: () => ({ Deploy: (...args) => dropped.push(args) }) };
    const pool = { async GetNode() { return box; }, PutNode: node => recycled.push(node) };
    const Subject = load('ZRSJZ_Game.ts', ['TrySpawnParacargo', 'SpawnParacargoGuards', 'FindParacargoGuardPosition'], {
        ZRSJZ_MAP_CONFIG: new Map([['map', { MapName: '城镇', Paracargo: { SpawnTimeSeconds: 5 } }]]),
        ZRSJZ_GameData: { Instance: { CurMap: 'map' } }, ZRSJZ_ParacargoBox: {}, ZRSJZ_PoolManager: { Instance: pool },
        ZRSJZ_Tools: loader, Vec3: Vector, UITransform: {}, ZRSJZ_PATH_CONFIG: options, ZRSJZ_TIER: { 地形: 1 },
        ZRSJZ_PathFinder: { IsPositionWalkable: () => !blocked }, math: { randomRangeInt: () => 0 },
        instantiate: prefab => { const node = { prefab, setWorldPosition(position) { this.position = position; } }; created.push(node); return node; },
        console: { warn: (...args) => warnings.push(args), error: (...args) => warnings.push(args) },
    });
    const game = new Subject(); Object.assign(game, { node: { isValid: true, activeInHierarchy: true }, _elapsedGameTime: 10,
        _isGameFinished: false, _paracargoSpawnRequested: false, _paracargoTargetWorldPosition: new Vector(), CurMap: map });
    return { game, map, box, point, created, loads, recycled, dropped, warnings, loader, appear: () => dropped[0][3](),
        block: () => blocked = true, defer: promise => pending = promise };
}
(async () => {
    let f = fixture(); await Promise.all([f.game.TrySpawnParacargo(), f.game.TrySpawnParacargo()]);
    assert.equal(f.created.length, 0, 'guards wait for the actual airdrop appearance callback');
    await f.appear();
    assert.equal(f.dropped.length, 1); assert.equal(f.created.length, 2);
    assert.deepEqual(f.loads, ['Prefabs/Unit/Enemy/盾牌兵', 'Prefabs/Unit/Enemy/喷火兵']);
    for (const enemy of f.created) {
        assert.equal(enemy.parent, f.map.Unit); assert.equal(enemy.active, true);
        assert(Vector.distance(enemy.position, f.point.worldPosition) <= 360.001);
    }
    assert(Vector.distance(f.created[0].position, f.created[1].position) >= 184);
    for (const invalid of [f => f.game._elapsedGameTime = 1, f => f.game._isGameFinished = true,
        f => f.map.node.getChildByName = () => null, f => f.box.getComponent = () => null]) {
        f = fixture(); invalid(f); await f.game.TrySpawnParacargo(); assert.equal(f.created.length, 0); assert.equal(f.loads.length, 0);
    }
    for (const expire of [f => f.game._isGameFinished = true, f => f.map.Unit.isValid = false,
        f => f.game.CurMap = {}, f => f.game.node.activeInHierarchy = false]) {
        f = fixture(); let release; f.defer(new Promise(resolve => release = resolve));
        const spawning = f.game.SpawnParacargoGuards(f.point.worldPosition, f.map); expire(f); release(); await spawning;
        assert.equal(f.created.length, 0, 'late prefab load must not spawn into ended/changed scene');
    }
    f = fixture(); f.block(); await f.game.TrySpawnParacargo(); await f.appear(); assert.equal(f.dropped.length, 1); assert.equal(f.created.length, 0);
    f = fixture(); f.loader.LoadPrefab = async path => { if (path.endsWith('盾牌兵')) throw Error('load failed'); return { path }; };
    await f.game.TrySpawnParacargo(); await f.appear(); assert.equal(f.created.length, 1); assert(f.created[0].prefab.path.endsWith('喷火兵'));
    f = fixture(); const position = f.game.FindParacargoGuardPosition(new Vector(0, 0), [], { xMin: -500, xMax: 500, yMin: -500, yMax: 500 });
    assert(position.x - 82 >= -500 && position.x + 82 <= 500 && position.y + 100 - 82 >= -500 && position.y + 100 + 82 <= 500);
    console.log('PASS: one shield + one firebat per deployed airdrop, local randomized positions, separation/bounds/terrain, duplicate requests, load failures and late callbacks');
    let colliders = [], query;
    class Rectangle { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); } }
    class Shape {}
    const PathFinder = load('Controller/ZRSJZ_PathFinder.ts', ['IsPositionWalkable', 'IsWalkable', 'CellKey'], {
        Rect: Rectangle, PhysicsSystem2D: { instance: { testAABB: rect => { query = rect; return colliders; } } },
        BoxCollider2D: Shape, PolygonCollider2D: Shape, CircleCollider2D: Shape, Intersection2D: {},
    });
    const opts = { ...options, ObstacleMask: 1, PreciseObstacles: true };
    assert.equal(PathFinder.IsPositionWalkable(new Vector(123, 456), opts), true);
    assert(Math.abs(query.x - (123 - 82)) < 1e-6); assert(Math.abs(query.y - (456 + 100 - 82)) < 1e-6);
    colliders = [{ group: 1, enabledInHierarchy: true, sensor: false }]; assert.equal(PathFinder.IsPositionWalkable(new Vector(), opts), false);
    colliders[0].sensor = true; assert.equal(PathFinder.IsPositionWalkable(new Vector(), opts), true);
    colliders[0].sensor = false; colliders[0].group = 8; assert.equal(PathFinder.IsPositionWalkable(new Vector(), opts), true);
    console.log('PASS: exact world-coordinate standing checks reuse terrain mask, body radius/offset and sensor filtering');
})().catch(error => { console.error(error); process.exitCode = 1; });
