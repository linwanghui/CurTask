// Run: node tests/zrsjz-native-tilemap.test.cjs
// Uses the installed 3.8.6 implementation to reproduce the original corruption.
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const engine = process.env.COCOS_ENGINE_ROOT || 'D:/cocos/Creator/3.8.6/resources/resources/3d/engine';
const source = fs.readFileSync(engine + '/cocos/tiledmap/tiled-layer.ts', 'utf8');
const tree = ts.createSourceFile('tiled-layer.ts', source, ts.ScriptTarget.Latest, true);
const cls = tree.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'TiledLayer');
const method = cls.members.find(n => n.name?.getText(tree) === 'fillIndicesBuffer');
const transpile = text => ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const OriginalLayer = vm.runInNewContext(transpile(`class TiledLayer { ${method.getText(tree)} }; TiledLayer;`));
const patch = transpile(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Service/ZRSJZ_NativeTileMapFix.ts', 'utf8'));

function loadPatch(native, version = '3.8.6') {
    class Layer extends OriginalLayer { _drawInfoList = []; valid = true; }
    // Use a distinct prototype for each test environment, as the engine does per process.
    Layer.prototype.fillIndicesBuffer = OriginalLayer.prototype.fillIndicesBuffer;
    const output = {}, logs = [], beforeDraw = [];
    vm.runInNewContext(patch, { exports: output,
        console: { info: text => logs.push(text), warn: text => logs.push(text) },
        require: name => name === 'cc' ? { TiledLayer: Layer, VERSION: version,
            isValid: layer => layer.valid,
            Director: { EVENT_BEFORE_DRAW: 'before-draw' },
            director: { on(event, callback) { assert.equal(event, 'before-draw'); beforeDraw.push(callback); } },
        } : { NATIVE: native },
    });
    return { Layer, install: output.InstallZRSJZNativeTileMapFix, logs, beforeDraw,
        nextFrame() { beforeDraw.forEach(callback => callback()); } };
}
function bufferFixture() {
    const buffer = { iData: new Uint16Array(512), indexOffset: 0, dirty: true };
    const accessor = { reset() { buffer.indexOffset = 0; buffer.dirty = false; } };
    const make = (vertexOffset, vertexCount) => ({ vertexCount,
        chunk: { vertexOffset, meshBuffer: buffer, vertexAccessor: accessor } });
    return { buffer, accessor, make };
}
function drawInfo() {
    return { offset: -1, count: 0, setIndexOffset(n) { this.offset = n; }, setIBCount(n) { this.count = n; } };
}
function assertDraw(data, info) {
    const indices = data.chunk.meshBuffer.iData.slice(info.offset, info.offset + info.count);
    const expected = [];
    for (let v = data.chunk.vertexOffset; v < data.chunk.vertexOffset + data.vertexCount; v += 4) {
        expected.push(v, v + 1, v + 2, v + 2, v + 1, v + 3);
    }
    assert.deepEqual(Array.from(indices), expected, 'A retained DrawInfo must still address its own vertices');
}

// Frame 1: A and B share a mesh buffer. Frame 2: only B becomes dirty after culling.
{
    const { accessor, make } = bufferFixture(), layer = new OriginalLayer();
    const a = make(0, 4), b = make(4, 8), da = drawInfo(), db = drawInfo();
    layer.fillIndicesBuffer(a, da); layer.fillIndicesBuffer(b, db);
    assertDraw(a, da); assertDraw(b, db);
    accessor.reset(); layer.fillIndicesBuffer(b, db);
    assert.throws(() => assertDraw(a, da), /retained DrawInfo/, 'Unpatched 3.8.6 must reproduce the overwrite');
    console.log('REPRODUCED: installed 3.8.6 overwrites an unchanged layer when another layer is culled');
}
{
    const env = loadPatch(true); env.install();
    const installed = env.Layer.prototype.fillIndicesBuffer;
    env.install(); assert.equal(env.Layer.prototype.fillIndicesBuffer, installed); assert.equal(env.logs.length, 1);
    const layer = new env.Layer(), { buffer, accessor, make } = bufferFixture();
    const a = make(0, 4), b = make(4, 8), c = make(16, 4);
    const da = drawInfo(), db = drawInfo(), dc = drawInfo();
    layer.fillIndicesBuffer(a, da); layer.fillIndicesBuffer(b, db); layer.fillIndicesBuffer(c, dc);
    const countBeforeReset = buffer.indexOffset;
    accessor.reset(); assert.equal(buffer.indexOffset, countBeforeReset); assert.equal(buffer.dirty, true);
    for (let frame = 0; frame < 500; frame++) {
        // Reallocation, changed quad count, changed update order, and retained clean layers.
        b.chunk.vertexOffset = frame % 2 ? 24 : 4;
        b.vertexCount = frame % 3 ? 8 : 4;
        accessor.reset();
        if (frame % 2) layer.fillIndicesBuffer(c, dc);
        layer.fillIndicesBuffer(b, db);
        if (frame % 5 === 0) layer.fillIndicesBuffer(a, da);
        assertDraw(a, da); assertDraw(b, db); assertDraw(c, dc);
        assert.ok(buffer.indexOffset <= buffer.iData.length, 'Index offsets must not accumulate between frames');
    }
    // A new map may allocate another buffer from the same accessor; separate buffers can use offset zero.
    const other = bufferFixture(), d = other.make(0, 12), dd = drawInfo();
    layer.fillIndicesBuffer(d, dd); other.accessor.reset();
    assertDraw(d, dd); assertDraw(a, da);
    console.log('PASS: partial updates, quad resizing, chunk reuse, retained layers, buffer resets and multiple buffers');
}
for (const [native, version] of [[false, '3.8.6'], [true, '3.8.7'], [true, '3.8.9']]) {
    const env = loadPatch(native, version), original = env.Layer.prototype.fillIndicesBuffer;
    env.install(); assert.equal(env.Layer.prototype.fillIndicesBuffer, original); assert.equal(env.logs.length, 0);
}
console.log('PASS: no patch in web/quick-game runtime or newer engine versions; repeated installation is safe');

// Mirror 3.8.6 native handleMiddlewareDraw: compatible adjacent entries merge by
// mutating the first persistent DrawInfo. generateBatch does not restore it.
const nativeBatcher = fs.readFileSync(engine + '/native/cocos/2d/renderer/Batcher2d.cpp', 'utf8');
assert.match(nativeBatcher, /_currDrawInfo->setIbCount\(ibCount \+ drawInfo->getIbCount\(\)\)/);
function nativeMerge(infos) {
    let current;
    const batches = [];
    for (const info of infos) {
        if (current && info.offset === current.offset + current.count) {
            current.setIBCount(current.count + info.count);
        } else {
            if (current) batches.push({ offset: current.offset, count: current.count });
            current = info;
        }
    }
    if (current) batches.push({ offset: current.offset, count: current.count });
    return batches;
}
function shadowDraws(batches, index) {
    return batches.filter(b => index >= b.offset && index < b.offset + b.count).length;
}
{
    const a = drawInfo(), shadow = drawInfo();
    a.setIndexOffset(0); a.setIBCount(6); shadow.setIndexOffset(6); shadow.setIBCount(6);
    assert.equal(shadowDraws(nativeMerge([a, shadow]), 6), 1);
    assert.equal(shadowDraws(nativeMerge([a, shadow]), 6), 2);
    console.log('REPRODUCED: retained native batch count draws a translucent shadow twice on the next frame');
}
{
    const env = loadPatch(true); env.install(); env.install();
    assert.equal(env.beforeDraw.length, 1);
    const ground = new env.Layer(), shadow = new env.Layer(), fixture = bufferFixture();
    const a = drawInfo(), b = drawInfo(), subNode = drawInfo();
    subNode.setIBCount(123);
    ground._drawInfoList = [a]; shadow._drawInfoList = [b, subNode];
    ground.fillIndicesBuffer(fixture.make(0, 4), a);
    shadow.fillIndicesBuffer(fixture.make(4, 4), b);
    for (let frame = 0; frame < 500; frame++) {
        env.nextFrame();
        // Dirty renderers update after BEFORE_DRAW; clean renderers retain their DrawInfos.
        if (frame % 7 === 0) shadow.fillIndicesBuffer(fixture.make(4, frame % 2 ? 8 : 4), b);
        const batches = nativeMerge([a, b]);
        assert.equal(shadowDraws(batches, 6), 1, 'Shadow must be blended exactly once');
        assert.equal(subNode.count, 123, 'User-node DrawInfo must remain unchanged');
    }
    // Rebuilt/culled layers discard old native handles. The next frame must not touch them.
    a.setIBCount = () => { throw Error('Touched a discarded DrawInfo'); };
    ground._drawInfoList = [];
    shadow.valid = false;
    b.setIBCount = () => { throw Error('Touched a destroyed layer'); };
    env.nextFrame(); env.nextFrame();
    console.log('PASS: 500 native batch frames blend shadows once; dirty updates, subnodes and destroyed layers are safe');
}
