const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const source = fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_PlayerSkeleton.ts', 'utf8');
const tree = ts.createSourceFile('aim.ts', source, ts.ScriptTarget.Latest, true);
const cls = tree.statements.find(n => ts.isClassDeclaration(n));
const names = ['onEnable', 'onDisable', 'QueueAttackAfterAim', 'UpdateAimAndAttack', 'ApplyAimDirection', 'SetPlayerDir'];
const methods = cls.members.filter(n => names.includes(n.name?.getText(tree))).map(n => n.getText(tree)).join('\n');
const event = tree.statements.find(n => ts.isVariableStatement(n) && n.getText(tree).startsWith('const AIM_UPDATE_EVENT'));
const js = ts.transpileModule(`${event.getText(tree)}\nclass Aim { ${methods} }; Aim;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
function fixture(native, oldEvent = false) {
    const events = new Map();
    const director = {
        on(e, fn, target) { const list = events.get(e) || []; list.push([fn, target]); events.set(e, list); },
        off(e, fn, target) { events.set(e, (events.get(e) || []).filter(x => x[0] !== fn || x[1] !== target)); },
        emit(e) { for (const [fn, target] of [...(events.get(e) || [])]) fn.call(target); },
    };
    const Director = { EVENT_AFTER_UPDATE: 'after-update', EVENT_BEFORE_DRAW: 'before-draw' };
    const Aim = vm.runInNewContext(js, { director, Director, NATIVE: native && !oldEvent,
        ZRSJZ_EventManager: { OnPersist() {}, OffPersist() {} }, ZRSJZ_MyEvent: {},
    });
    const aim = new Aim();
    Object.assign(aim, { _mzBone: { x: 0, y: 0 }, HasDirection: true, Facing: 1,
        AimAngleOffset: 17, _baseScale: { x: 1, y: 1, z: 1 }, _trackCompleteCallbacks: new Map(),
        Show() {}, ClearAttackAnimation() { this._afterAimAttack = null; }, ClearUluSkill() {},
        node: { setScale(x) { aim.scale = x; } },
        Skeleton: { _skeleton: { updateWorldTransform() { aim.pose = [aim._mzBone.x, aim._mzBone.y, aim.scale]; } } },
    });
    let rendered;
    // Engine registers native geometry generation before component onEnable.
    director.on('before-draw', () => { if (native) rendered = aim.pose?.slice(); });
    aim.onEnable();
    return { aim, director, frame(x, y) {
        aim.pose = [1000, 0, 1]; // animation pose before custom aim
        aim.AttackX = x; aim.AttackY = y;
        director.emit('after-update');
        if (!native) aim.pose = [1000, 0, 1]; // Web Spine postUpdate
        director.emit('before-draw');
        if (!native) rendered = aim.pose.slice();
        return rendered;
    } };
}
{
    const f = fixture(true, true);
    const rendered = f.frame(0, 1);
    assert.notDeepEqual(rendered, f.aim.pose);
    console.log('REPRODUCED: native BEFORE_DRAW renders animation pose before business aim executes');
}
for (const native of [true, false]) {
    const f = fixture(native);
    for (let i = 0; i < 64; i++) {
        const angle = i * Math.PI / 4, x = Math.cos(angle), y = Math.sin(angle);
        let shotPose, shots = 0;
        f.aim.QueueAttackAfterAim(() => { shotPose = f.aim.pose.slice(); shots++; });
        const rendered = f.frame(x, y);
        assert.deepEqual(rendered, shotPose, 'Shot and rendered gun must use the same current-frame pose');
        assert.equal(shots, 1);
        const facing = x > 0 ? 1 : -1, offset = 17 * Math.PI / 180;
        assert.ok(Math.abs(rendered[0] - (x * facing * Math.cos(offset) - y * Math.sin(offset)) * 1000) < 1e-6);
        assert.ok(Math.abs(rendered[1] - (x * facing * Math.sin(offset) + y * Math.cos(offset)) * 1000) < 1e-6);
        assert.equal(rendered[2], facing);
    }
    f.aim.onDisable();
    f.aim.pose = null;
    f.director.emit('after-update'); f.director.emit('before-draw');
    assert.equal(f.aim.pose, null, 'Disable must remove the platform-specific listener');
}
console.log('PASS: native/web frame order, 64 direction changes each, mirrored facing, shot alignment and listener cleanup');
