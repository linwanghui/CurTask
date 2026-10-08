const fs = require('fs'), vm = require('vm'), assert = require('assert'), path = require('path');
const ts = require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const file = path.resolve('assets/Game_Bundles/73_ZRSJZ/Scripts/Skill/ZRSJZ_UluMissile.ts');
const config = ts.getParsedCommandLineOfConfigFile(path.resolve('tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: console.error });
const program = ts.createProgram([file], { ...config.options, skipLibCheck: true, noEmit: true });
const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => !d.file || path.resolve(d.file.fileName) === file);
for (const d of diagnostics) console.error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
assert.equal(diagnostics.length, 0, 'Missile TypeScript diagnostics');
class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { if (typeof x === 'object') ({ x, y, z } = x); Object.assign(this, { x, y, z }); return this; }
    lengthSqr() { return this.x ** 2 + this.y ** 2 + this.z ** 2; }
    normalize() { const len = Math.sqrt(this.lengthSqr()); this.x /= len; this.y /= len; this.z /= len; return this; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    static scaleAndAdd(out, a, b, s) { out.set(a.x + b.x * s, a.y + b.y * s, a.z + b.z * s); }
    static lerp(out, a, b, t) { out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); }
}
let recycled = 0;
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    experimentalDecorators: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
} }).outputText, { exports: exportsObject, require: n => n === 'cc' ? {
    _decorator: { ccclass: () => c => c, property: () => () => {} }, Component: class {}, sp: { Skeleton: class {} }, Vec3,
} : { ZRSJZ_PoolManager: { Instance: { PutNode: () => recycled++ } } } });
const node = () => ({ active: true, worldPosition: new Vec3(), setWorldPosition(v) { this.worldPosition.set(v); },
    setWorldRotationFromEuler() {}, destroy() { this.destroyed = true; } });
const skeleton = () => ({ node: node(), setAnimation(track, name, loop) { this.animation = name; this.loop = loop; },
    setCompleteListener(fn) { this.complete = fn; } });
function make() { const m = new exportsObject.ZRSJZ_UluMissile(); m.node = node(); m.Missile = skeleton(); m.Explosion = skeleton(); return m; }
for (const direction of [new Vec3(1, 0), new Vec3(-1, 0), new Vec3(0, -1), new Vec3(0, 1), new Vec3()]) {
    for (const target of [new Vec3(650, 0), new Vec3(-650, 0), new Vec3(0, 0), new Vec3(100, 800)]) {
        const m = make(); let hits = 0;
        m.Show(new Vec3(), direction, target, p => { hits++; assert.deepEqual(p, target); });
        m.update(m._launchTime / 2);
        assert(Math.abs(Math.hypot(m.node.worldPosition.x, m.node.worldPosition.y) - 60) < 1e-8, 'Straight launch distance');
        assert(m._turnAngle <= Math.PI / 2 && m._turnTime <= 0.15, 'Small, fast turn');
        const spiralStart = new Vec3(), spiralEnd = new Vec3(), arcStart = new Vec3();
        m.SampleTurn(0, spiralStart); m.SampleTurn(1, spiralEnd); m.SampleArc(0, arcStart);
        assert.deepEqual(spiralStart, m._launchEnd, 'No jump into spiral');
        assert.deepEqual(spiralEnd, arcStart, 'No jump into arc');
        const arcFirst = new Vec3();
        const sampleSeconds = 0.0001;
        m.SampleArc(m.GetArcParameter(sampleSeconds / m._flightTime), arcFirst);
        const entrySpeed = Math.hypot(arcFirst.x - arcStart.x, arcFirst.y - arcStart.y) / sampleSeconds;
        const turnSpeed = m._turnRadius * m._turnAngle / m._turnTime;
        assert(Math.abs(entrySpeed / turnSpeed - 1) < 0.05, 'Speed stays continuous into the arc');
        let lastParameter = 0;
        for (let i = 1; i <= 120; i++) {
            const parameter = m.GetArcParameter(i / 120);
            assert(parameter > lastParameter && parameter <= 1, 'Smooth flight never stalls or reverses');
            lastParameter = parameter;
        }
        assert(Math.hypot(spiralEnd.x - spiralStart.x, spiralEnd.y - spiralStart.y) < 100, 'Short turning displacement');
        const nearEnd = new Vec3(), arcAfter = new Vec3(); m.SampleTurn(0.99999, nearEnd); m.SampleArc(0.00001, arcAfter); const ax = spiralEnd.x - nearEnd.x, ay = spiralEnd.y - nearEnd.y, bx = arcAfter.x - arcStart.x, by = arcAfter.y - arcStart.y; assert((ax * bx + ay * by) / Math.hypot(ax, ay) / Math.hypot(bx, by) > 0.999, 'Smooth tangent from turn into arc');
        m.update(m._launchTime / 2 + m._turnTime * 0.5);
        assert.equal(hits, 0, 'Spiral stage must not explode');
        const points = [];
        for (let t = 0; t <= 100; t++) { const p = new Vec3(); m.SampleArc(t / 100, p); points.push(p); }
        assert.deepEqual(points[100], target);
        assert(Math.max(...points.map(p => p.y)) > Math.max(points[0].y, target.y), 'Arc rises above both endpoints');
        assert(points[99].y > points[100].y, 'Final approach descends');
        m.update(10); m.update(10);
        assert.equal(hits, 1); assert.equal(m.Explosion.animation, 'eff'); assert.equal(m.Explosion.loop, false);
        assert.deepEqual(m.node.worldPosition, target);
        const complete = m.Explosion.complete, before = recycled;
        complete(); complete(); assert.equal(recycled, before + 1);
        m.Show(new Vec3(10, 20), new Vec3(1, 0), target); assert(m.Missile.node.active); assert(!m.Explosion.node.active);
        m.onDisable(); m.update(10); assert.equal(m._state, 'idle');
    }
}
const zero = make(); zero.LaunchDistance = 0; zero.Show(new Vec3(), new Vec3(), new Vec3()); zero.update(5);
assert.equal(zero._state, 'exploding');
const framePositions = [30, 60, 120].map(fps => {
    const m = make(); m.Show(new Vec3(), new Vec3(1, 0), new Vec3(650, 0));
    for (let i = 0; i < fps; i++) m.update(1 / fps);
    return m.node.worldPosition;
});
for (const p of framePositions) assert(Math.hypot(p.x - framePositions[0].x, p.y - framePositions[0].y) < 0.001, 'Same path and timing at 30/60/120 FPS');
console.log('PASS: TypeScript, 20 direction/target cases, straight launch, fast small-angle turn, continuous stage boundaries, rise/descent, exact landing, single explosion/recycle, reuse, zero-distance launch.');
