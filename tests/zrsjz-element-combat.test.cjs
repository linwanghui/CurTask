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

const harmEffectRequests = [];
const hitSounds = []; let hitFlashes = 0;
const DamageEnemy = selected('Controller/ZRSJZ_EnemyBase.ts', ['BeHit'], {
    Coop, Online, ZRSJZ_Game: { Instance: game },
    ZRSJZ_AudioManager: { Instance: { PlaySound(name) { hitSounds.push(name); } } },
    ZRSJZ_PoolManager: { Instance: { GetNode: path => { harmEffectRequests.push(path); return Promise.resolve(null); } } }, console,
});
const d = Object.assign(new DamageEnemy(), { IsDead: false, ArmorReduction: 40, _elements: new State(), _health: 10000,
    node: { worldPosition: { clone: () => ({}) } }, HP: { Show() {} }, beHitEffect() { hitFlashes++; }, _hitFeedbackSerial: 0,
    _recoilCooldown: 0, _recoilOffset: { x: 0, y: 0 }, _pendingRecoil: { set() { throw Error('poison must never recoil'); } },
});
d.BeHit(100); near(d._health, 9940);
for (let i = 0; i < 10; i++) d._elements.hit(fire, false, false);
d.BeHit(100); near(d._health, 9860, 'shared armor debuff applies without personal growth');
for (let i = 0; i < 10; i++) d._elements.hit({ ...fire, source: 'b' }, false, false);
d.BeHit(100); near(d._health, 9780, 'public armor shred uses maximum rather than sum');
const flashesBeforePoison = hitFlashes, soundsBeforePoison = hitSounds.length, serialBeforePoison = d._hitFeedbackSerial;
d.BeHit(72, 1, 1, true); near(d._health, 9708, 'poison ignores armor and hit direction');
assert.equal(hitFlashes, flashesBeforePoison, 'poison ticks never flash or scale the enemy');
assert.equal(hitSounds.length, soundsBeforePoison, 'poison ticks never play hit audio');
assert.equal(d._hitFeedbackSerial, serialBeforePoison, 'poison does not create remote hit feedback');
d.ArmorReduction = 0; d.BeHit(100); near(d._health, 9608, 'shred cannot turn armor negative');
assert.deepEqual(harmEffectRequests, ['Prefabs/Effect/HarmEffect', 'Prefabs/Effect/HarmEffect', 'Prefabs/Effect/HarmEffect',
    '73_ZRSJZ_DLC/Prefabs/Effect/HarmEffect', 'Prefabs/Effect/HarmEffect'], 'only poison ticks use the DLC damage display');
assert.equal(hitFlashes, 4); assert.deepEqual(hitSounds, ['受击', '受击', '受击', '受击']);
d._health = 10; let poisonDeath = false;
d.Die = () => { poisonDeath = d._poisonDeath; }; d.BeHit(72, 0, 0, true);
assert(poisonDeath); assert.equal(d._poisonDeath, false, 'death feedback suppression stays scoped to the poison death');
assert.equal(hitFlashes, 4); assert.equal(hitSounds.length, 4);

class NetVec { constructor(x=0,y=0,z=0) { Object.assign(this,{x,y,z}); } static distance() { return 0; } }
const ReplicaEnemy = selected('Controller/ZRSJZ_EnemyBase.ts', ['ApplyOnlineState'], { Vec3: NetVec });
let remoteFlashes = 0, remotePoisonDeath = false;
const replica = Object.assign(new ReplicaEnemy(), { onlineStarted: true, IsDead: false, _health: 100, _onlineHitFeedbackSerial: 0,
    node: { worldPosition: new NetVec(), setWorldPosition() {}, setScale() {} }, HP: { Show() {} }, EnemySkeleton: null,
    StopMoving() {}, beHitEffect() { remoteFlashes++; }, Die() { remotePoisonDeath = this._poisonDeath; }, RefreshElementLabel() {},
});
const sync = (hp, hitFeedback, poisonDamage, dead = false) => replica.ApplyOnlineState({ x:0,y:0,hp,hitFeedback,poisonDamage,dead });
sync(90,0,true); assert.equal(remoteFlashes,0);
sync(80,1,false); assert.equal(remoteFlashes,1);
sync(70,1,true); assert.equal(remoteFlashes,1);
sync(50,2,true); assert.equal(remoteFlashes,2,'a direct hit followed by poison in the same network snapshot still gets direct-hit feedback');
sync(0,2,true,true); assert(remotePoisonDeath); assert.equal(replica._poisonDeath,false);

let kills = 0, deathFlashes = 0; const deathSounds = [];
const DeathEnemy = selected('Controller/ZRSJZ_EnemyBase.ts', ['Die'], {
    Online: { Battle: false }, ZRSJZ_Game: { Instance: { IsTutorial: true, RecordKill() { kills++; } } },
    ZRSJZ_ENEMY_STATE: { DEAD: 4 }, ZRSJZ_AudioManager: { Instance: { PlaySound(name) { deathSounds.push(name); } } },
    ZRSJZ_KillTipPanel: { NotifyKill() {} }, ZRSJZ_TaskService: { CompleteTask() {} }, ZRSJZ_GameData: { Instance: { CurMap: 'test' } },
});
const death = poison => Object.assign(new DeathEnemy(), { _poisonDeath: poison, IsDead: false, _elements: new State(),
    _pendingRecoil: { set() {} }, _recoilOffset: { set() {} }, node: {}, Colliders: [{ enabled: true }],
    unschedule() {}, changeColor() {}, SetTaskTargetMarker() {}, ChangeState() { this.IsDead = true; },
    ClearNavigation() {}, StopMoving() {}, OnDeath() {}, beHitEffect() { deathFlashes++; },
});
const toxicDeath = death(true); toxicDeath.Die(); assert.equal(kills,1); assert.equal(deathFlashes,0); assert.deepEqual(deathSounds,['击杀']);
assert.equal(toxicDeath.Colliders[0].enabled,false,'poison kills still complete normal death cleanup');
death(false).Die(); assert.equal(kills,2); assert.equal(deathFlashes,1); assert.deepEqual(deathSounds,['击杀','击杀']);

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
