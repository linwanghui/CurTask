const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const base = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
const elements = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(base + 'Service/ZRSJZ_ElementCombat.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: elements });
function selected(path, names, globals) {
    const ast = ts.createSourceFile(path, fs.readFileSync(base + path, 'utf8'), ts.ScriptTarget.Latest, true);
    const methods = ast.statements.find(ts.isClassDeclaration).members.filter(m => names.includes(m.name?.getText(ast))).map(m => m.getText(ast)).join('\n');
    return vm.runInNewContext(ts.transpileModule(`class Subject {${methods}}\nSubject`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText, globals);
}
class V3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(v) { Object.assign(this, v); return this; }
    clone() { return new V3(this.x, this.y, this.z); }
}
class Animation {
    static EventType = { FINISHED: 'finished' };
    stop() { this.stopped = true; }
    play() { this.played = (this.played || 0) + 1; }
    off() { this.finished = null; }
    once(event, fn) { assert.equal(event, 'finished'); this.finished = fn; }
}
class Effect {}
class Enemy {}
class N {
    constructor(name) { this.name = name; this.isValid = this.activeInHierarchy = this.active = true; this.scale = new V3(1, 1, 1); this.worldPosition = new V3(); this.components = new Map(); this.children = []; }
    getComponent(type) { return this.components.get(type) ?? null; }
    getChildByName(name) { return this.children.find(n => n.name === name); }
    setScale(v) { this.scale.set(v); }
    setWorldPosition(v) { this.worldPosition.set(v); }
    setWorldRotationFromEuler(x, y, z) { this.angle = z; }
}
const parent = new N('bullets'), pending = [], recycled = [], callbacks = [], packets = [], hit = [];
const Online = { Paused: false, Battle: true, BattleHost: true, Combat: packet => packets.push(packet) };
let destructibleHits = 0;
const Bullet = selected('Controller/ZRSJZ_Bullet.ts', ['Show', 'BeginContact', 'FindEnemy', 'Recycle', 'CreateEffect', 'CreateEffect2', 'ElementHitEffectPath', 'CreateHitEffect'], {
    ...elements, Animation, ZRSJZ_EnemyBase: Enemy, ZRSJZ_Effect: Effect, Online, console, Math,
    ZRSJZ_BulletTrail: { Begin: () => ({ Finish() {}, Push() {} }) },
    ZRSJZ_PoolManager: { Instance: { GetNode: path => new Promise(resolve => pending.push({ path, resolve })), PutNode: node => { recycled.push(node); node.active = false; } } },
    ZRSJZ_DestructibleService: { HitNode: () => { destructibleHits++; return false; } },
    ZRSJZ_FriendlyDamageService: { DamageNode: () => false },
    ZRSJZ_TIER: { 地形: 1, 玩家: 2, 敌人: 4 }, ZRSJZ_AudioManager: { Instance: { PlaySound() {} } },
});
const node = new N('元素子弹'); node.parent = parent;
for (const name of ['冰弹', '毒弹', '火弹']) { const n = new N(name); n.components.set(Animation, new Animation()); node.children.push(n); }
const bullet = Object.assign(new Bullet(), { node, _isInit: true, _initialScale: new V3(1, 1, 1), MoveSpeed: 5000, RotationOffset: 0,
    scheduleOnce: fn => callbacks.push(fn), unscheduleAllCallbacks() {} });
const snapshot = { weapon: '冰霜裁决', source: 'host:0', attack: 88 };
bullet.Show(new V3(10, 20), 1, 0, 1000, 100, 1, false, snapshot);
assert.deepEqual(node.children.map(n => n.active), [true, false, false]);
assert.equal(packets[0].kind, 'player_shot'); assert.equal(packets[0].elementShot.weapon, '冰霜裁决');
snapshot.weapon = '烈焰破军'; assert(bullet.ElementHitEffectPath().endsWith('打击_冰'));
const root = new N('enemy'); root.components.set(Enemy, { ReceiveElementHit: (...args) => hit.push(args), BeHit: () => { throw Error('ordinary damage used'); } });
const child = new N('enemy collider'); child.parent = root;
bullet.BeginContact(null, { group: 4, node: child }, { disabled: false });
bullet.BeginContact(null, { group: 4, node: child }, null); assert.equal(hit.length, 1, 'one projectile only hits once');
assert(pending[0].path.endsWith('打击_冰')); callbacks.splice(0).forEach(fn => fn());
assert.equal(bullet._elementShot, null); assert(recycled.includes(node));
bullet.Show(new V3(300, 400), 1, 0, 1000, 100, 1, false, { weapon: '蚀骨毒牙', source: 'host:0', attack: 72 });
assert.deepEqual(node.children.map(n => n.active), [false, true, false]); assert.equal(node.children[1].components.get(Animation).played, 1);
const animation = new Animation(), effect = new N('打击_冰'); effect.components.set(Animation, animation);
(async () => {
    pending[0].resolve(effect); await new Promise(setImmediate);
    assert.equal(effect.worldPosition.x, 10); assert.equal(effect.worldPosition.y, 20, 'async effect uses old impact position after bullet reuse');
    assert.equal(effect.parent, parent); assert.equal(animation.played, 1); animation.finished(); assert(recycled.includes(effect));
    const before = destructibleHits;
    bullet.Show(new V3(), 1, 0, 1000, 0, 1, true, { weapon: '烈焰破军', source: 'peer:0', attack: 90 });
    assert.deepEqual(node.children.map(n => n.active), [false, false, true]);
    bullet.BeginContact(null, { group: 4, node: child }, null);
    assert.equal(hit.length, 1, 'remote visual bullet does not damage or apply status'); assert.equal(destructibleHits, before);
    bullet.Show(new V3(), 1, 0, 1000, 100, 1, false, null);
    assert.equal(bullet._elementShot, null); assert.equal(bullet.ElementHitEffectPath(), ''); assert(node.children.every(n => !n.active));
    // 真实玩家预取方法：装备决定资源路径，装填与开火动画仍走原流程。
    let gunID = 'gun', resolveLoad = null;
    const data = { PropData: { gun: { Name: '' }, other: { Name: '普通枪' } } };
    const game = { UnlimitedFirepower: false, CurMap: { BulletParent: parent } }, paths = [], reserved = new N('reserved');
    const BulletToken = {};
    reserved.components.set(BulletToken, {});
    const loader = { GetNode(path) { paths.push(path); return Promise.resolve(reserved); }, PutNode(n) { recycled.push(n); } };
    const Player = selected('Controller/ZRSJZ_Player.ts', ['BeginGunAttackAnimation'], {
        ...elements, Online, ZRSJZ_Game: { Instance: game }, ZRSJZ_GameData: { Instance: data },
        ZRSJZ_InventoryService: { GetWeaponryIDs: () => [gunID] },
        ZRSJZ_BoosterShotService: { GetBooster: () => 0 }, ZRSJZ_EnhancementService: { GetBonus: () => 0 },
        ZRSJZ_Bullet: BulletToken, ZRSJZ_PoolManager: { Instance: loader }, ZRSJZ_ANI: { Fire: 'fire' }, console,
    });
    const player = () => Object.assign(new Player(), { _isFireing: true, WeaponType: '枪', _magazineAmmo: ['1级子弹'], _gunAttackRequestId: 0,
        node: { uuid: 'player' }, PlayerIndex: 0, EnsureMagazineMatchesGun() {}, CanUseAsyncResult: () => true,
        GetGunProperty: (key, fallback) => key === '伤害' ? 72 : key === '射程' ? 1000 : fallback,
        PlayerSkeleton: { QKBone: {}, PlayGunAttackAni() {} }, OnGunAttackAnimationComplete() {},
    });
    for (const name of ['冰霜裁决', '烈焰破军', '蚀骨毒牙', '普通枪']) {
        data.PropData.gun.Name = name; const p = player(); await p.BeginGunAttackAnimation();
        assert.equal(paths.at(-1), elements.ZRSJZ_ElementBulletPath(name));
        assert.equal(p._reservedGunID, 'gun'); assert.equal(p._magazineAmmo.length, 0);
        assert(p._waitingFirstGunShot);
        if (name !== '普通枪') { assert.equal(p._reservedElementShot.weapon, name); assert.equal(p._reservedElementShot.attack, 72); }
        else assert.equal(p._reservedElementShot, null);
    }
    loader.GetNode = () => new Promise(resolve => resolveLoad = resolve);
    const switching = player(), preparing = switching.BeginGunAttackAnimation(); gunID = 'other'; resolveLoad(reserved); await preparing;
    assert.equal(switching._reservedGunBullet, undefined); assert.equal(switching._magazineAmmo.length, 1);
    const GuardPlayer = selected('Controller/ZRSJZ_Player.ts', ['FireReservedGunBullet'], { ZRSJZ_InventoryService: { GetWeaponryIDs: () => [gunID] } });
    let cancelled = 0;
    const guarded = Object.assign(new GuardPlayer(), { _waitingFirstGunShot: true, _reservedGunBullet: reserved, _reservedGunID: 'gun', CancelGunAttackState() { cancelled++; } });
    guarded.FireReservedGunBullet(); assert.equal(cancelled, 1, 'switching guns before the animation event cancels the old shot');
    console.log('PASS: projectile variants, animation restart, weapon snapshot, child colliders, duplicate contacts, pool reuse, async hit-effect position and remote visual-only damage guards.');
})().catch(error => { console.error(error); process.exitCode = 1; });
