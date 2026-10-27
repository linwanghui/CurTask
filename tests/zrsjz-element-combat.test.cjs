const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root + 'Service/ZRSJZ_ElementCombat.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject });
const { ZRSJZ_ElementState: State, ZRSJZ_CopyElementShot: copy, ZRSJZ_ElementBulletPath: bulletPath } = exportsObject;
const ice = { weapon: '冰霜裁决', source: 'a', attack: 88 };
const fire = { weapon: '烈焰破军', source: 'a', attack: 90 };
const poison = { weapon: '蚀骨毒牙', source: 'a', attack: 72 };
const advance = (s, dt) => s.advance(dt, () => {});
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

let s = new State();
for (let i = 0; i < 5; i++) assert(!s.hit(ice, false, false));
near(s.slow(false), .3); assert(s.hit(ice, false, false)); assert(s.frozen); assert.equal(s.cold, 0);
for (let i = 0; i < 30; i++) s.hit(ice, false, false);
assert.equal(s.cold, 0); near(s.frozenUntil, .8);
advance(s, .8); assert(!s.frozen);
for (let i = 0; i < 10; i++) s.hit(ice, false, false);
assert.equal(s.cold, 5); assert(!s.frozen);
advance(s, 1.9); s.hit(ice, false, false); advance(s, 1.1);
assert(!s.frozen, 'immunity expiry never auto-freezes');
assert(s.hit(ice, false, false), 'fresh sixth hit freezes after immunity');
s = new State(); for (let i = 0; i < 6; i++) s.hit(ice, false, true); near(s.frozenUntil, .4); near(s.immuneUntil, 3.4);
s = new State(); for (let i = 0; i < 100; i++) s.hit(ice, true, false);
assert(!s.frozen); near(s.slow(true), .15); assert.equal(s.cold, 5);
advance(s, 1.9); s.hit(ice, true, false); advance(s, .2); assert.equal(s.cold, 5);
advance(s, 1.8); assert.equal(s.cold, 0);

s = new State(); near(s.growth('a'), 0); s.hit(fire, false, false); near(s.growth('a'), .025);
for (let i = 0; i < 40; i++) s.hit(fire, false, false);
near(s.growth('a'), .5); near(s.armorShred(), .4); near(s.growth('b'), 0);
s.hit({ ...fire, source: 'b' }, false, false); near(s.armorShred(), .4); near(s.growth('b'), .025);
advance(s, 3); assert.equal(s.fire.size, 0);

s = new State(); s.hit(poison, false, false); let ticks = [];
s.advance(.2, n => ticks.push(n)); assert.equal(ticks.length, 0);
s.hit(poison, false, false); s.advance(.05, n => ticks.push(n)); assert.equal(ticks.length, 1); near(ticks[0], 2.88);
s = new State(); for (let i = 0; i < 60; i++) s.hit(poison, false, false);
assert.equal(s.poison.size, 1); assert.equal(s.poisonStacks, 50); ticks = [];
s.advance(1, n => ticks.push(n)); assert.equal(ticks.length, 4); near(ticks.reduce((a, b) => a + b, 0), 288);
s.advance(3.5, n => ticks.push(n)); assert.equal(ticks.length, 16); assert.equal(s.poison.size, 0);
near(ticks[15], 72); // 到期4秒仍先跳一次，再清除。
s = new State(); s.hit(poison, false, false); s.hit({ ...poison, source: 'b', attack: 100 }, false, false);
ticks = []; s.advance(.25, n => ticks.push(n)); assert.equal(ticks.length, 2); near(ticks[0], 1.44); near(ticks[1], 2);
const snapshot = copy(poison); poison.attack = 1000; assert.equal(snapshot.attack, 72); poison.attack = 72;
assert.equal(copy({ ...poison, attack: NaN }), null); assert.equal(copy({ ...poison, weapon: '霜月狼' }), null);
assert(bulletPath(ice.weapon).endsWith('元素子弹')); assert.equal(bulletPath('霜月狼'), 'Prefabs/Unit/PlayerBullet');
s.clear(); assert.equal(s.poison.size, 0); assert.equal(s.cold, 0); assert(!s.frozen);

function selected(file, names, globals) {
    const source = fs.readFileSync(root + file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const methods = ast.statements.find(ts.isClassDeclaration).members.filter(m => names.includes(m.name?.getText(ast))).map(m => m.getText(ast)).join('\n');
    return vm.runInNewContext(ts.transpileModule('class Subject {' + methods + '}\nSubject', {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText, globals);
}
const packets = [], Coop = { Replica: false, Stopped: false }, Online = { Battle: false, Combat: p => packets.push(p) };
const game = { GamePaused: false, IsGameFinished: false };
const Enemy = selected('Controller/ZRSJZ_EnemyBase.ts', ['ReceiveElementHit'], {
    ...exportsObject, Coop, Online, ZRSJZ_Game: { Instance: game },
});
const e = new Enemy(); let damage = [], freezes = 0;
Object.assign(e, { _elements: new State(), IsDead: false, ElementIsBoss: false, ElementElite: false, OnlineID: 'e1',
    BeHit(n) { damage.push(n); }, BeginElementFreeze() { freezes++; }, ElementDisplayState() { return {}; }, RefreshElementLabel() {} });
e.ReceiveElementHit(100, 1, 0, fire); e.ReceiveElementHit(100, 1, 0, fire);
near(damage[0], 100); near(damage[1], 102.5);
e.BeHit = () => e.IsDead = true; e.ReceiveElementHit(100, 1, 0, ice); assert.equal(e._elements.cold, 0, 'lethal hit cannot add status');
e.IsDead = false; Coop.Replica = true; e.ReceiveElementHit(100, 1, 0, poison);
assert.equal(packets.length, 1); assert.equal(packets[0].kind, 'element_hit'); assert.equal(e._elements.poison.size, 0);
Coop.Replica = false; game.GamePaused = true; e.ReceiveElementHit(100, 1, 0, poison); assert.equal(e._elements.poison.size, 0);
game.GamePaused = false;

const DamageEnemy = selected('Controller/ZRSJZ_EnemyBase.ts', ['BeHit'], {
    Coop, Online, ZRSJZ_Game: { Instance: game },
    ZRSJZ_AudioManager: { Instance: { PlaySound() {} } },
    ZRSJZ_PoolManager: { Instance: { GetNode: () => Promise.resolve(null) } }, console,
});
const d = Object.assign(new DamageEnemy(), { IsDead: false, ArmorReduction: 40, _elements: new State(), _health: 10000,
    node: { worldPosition: { clone: () => ({}) } }, HP: { Show() {} }, beHitEffect() {},
    _recoilCooldown: 0, _recoilOffset: { x: 0, y: 0 }, _pendingRecoil: { set() { throw Error('poison must never recoil'); } },
});
d.BeHit(100); near(d._health, 9940);
for (let i = 0; i < 10; i++) d._elements.hit(fire, false, false);
d.BeHit(100); near(d._health, 9860, 'shared armor debuff applies without personal growth');
for (let i = 0; i < 10; i++) d._elements.hit({ ...fire, source: 'b' }, false, false);
d.BeHit(100); near(d._health, 9780, 'public armor shred uses maximum rather than sum');
d.BeHit(72, 1, 1, true); near(d._health, 9708, 'poison ignores armor and hit direction');
d.ArmorReduction = 0; d.BeHit(100); near(d._health, 9608, 'shred cannot turn armor negative');

const FreezeEnemy = selected('Controller/ZRSJZ_EnemyBase.ts', ['BeginElementFreeze', 'lateUpdate', 'IsElementFrozen', 'OnAnimationEvent'], {
    Coop, Online, ZRSJZ_Game: { Instance: game },
});
let interrupted = 0, attacks = 0, recoilClears = 0;
const frozen = Object.assign(new FreezeEnemy(), {
    _elements: new State(), ElementActionVersion: 0, IsDead: false, IsPetStunned: false, Target: {},
    _pendingRecoil: { set() { recoilClears++; } }, _recoilOffset: { set() { recoilClears++; } },
    EnemyConfig: { IdleAnimation: 'idle' }, EnemySkeleton: { Skeleton: { paused: false }, HasDirection: true },
    OnElementFreeze() { interrupted++; }, ClearNavigation() {}, StopMoving() {},
    RestartAnimation(name) { assert.equal(name, 'idle'); }, ElementDisplayState() {}, RefreshElementLabel() {},
    OnAttack() { attacks++; }, BeHit() {},
});
for (let i = 0; i < 6; i++) frozen._elements.hit(ice, false, false);
frozen.BeginElementFreeze(); assert.equal(interrupted, 1); assert.equal(recoilClears, 2); assert.equal(frozen.Target, null);
assert(frozen.EnemySkeleton.Skeleton.paused); frozen.OnAnimationEvent('kq'); assert.equal(attacks, 0);
game.GamePaused = true; frozen.lateUpdate(10); assert(frozen.IsElementFrozen, 'pause preserves freeze timer');
game.GamePaused = false; frozen.lateUpdate(.8); assert(!frozen.IsElementFrozen); assert(!frozen.EnemySkeleton.Skeleton.paused);
assert.equal(frozen.Target, null); frozen.OnAnimationEvent('kq'); assert.equal(attacks, 1);

const deathState = new State(); deathState.hit(poison, false, false); let lethalTicks = 0;
deathState.advance(4, () => { lethalTicks++; deathState.clear(); }); assert.equal(lethalTicks, 1, 'no extra damage ticks after death cleanup');

for (const [name, child] of [['冰霜裁决', '冰弹'], ['烈焰破军', '火弹'], ['蚀骨毒牙', '毒弹']]) {
    const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Unit/元素子弹.prefab'));
    assert(prefab.some(n => n.__type__ === 'cc.Node' && n._name === child));
    const element = exportsObject.ZRSJZ_GetElement(name);
    const effect = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Unit/打击_' + element + '.prefab'));
    assert(effect.some(n => n.__type__ === 'cc.Animation' && n._defaultClip));
}
console.log('PASS: freeze/immunity/boss/elite, next-shot growth and shared armor, poison timing/expiry/snapshots, pause/death/network guards and prefab variants.');
