const assert = require('node:assert/strict'), fs = require('node:fs');
const { environment } = require('./helpers/zrsjz-element-fx-harness.cjs');
const flush = () => new Promise(setImmediate);
(async () => {
    const e = environment(), { Node, V3, Visual } = e;
    const map = new Node('map'), units = new Node('Unit'), enemy = new Node('enemy'); units.parent = map; enemy.parent = units; enemy.setScale(.2, .2, 1);
    const visual = new Visual(enemy, { x: 0, y: 300, width: 200, height: 600 });
    e.UI.ZRSJZ_DLC = false; visual.UpdateState({ cold: 3, fire: 5, poison: 20 }); visual.Tick(.5, false);
    assert.equal(e.requests.length, 0);
    e.UI.ZRSJZ_DLC = true; visual.UpdateState({ cold: 3, fire: 5, poison: 20 }); visual.Tick(0, false); visual.Tick(0, false);
    assert.equal(e.requests.length, 2, 'only fire and poison request attached auras');
    for (let i = 0; i < 2; i++) e.requests[i].resolve(e.createFX(['fire', 'poison'][i]).node);
    await flush(); assert.equal(enemy.children.length, 2);
    assert.equal(enemy.children[0].position.y, 300);
    visual.Tick(.5, false); assert.equal(e.requests.length, 2, 'standing still emits no trail');
    enemy.position.x = 100; visual.Tick(.2, false); const traceRequest = e.requests.at(-1); assert(traceRequest.path.endsWith('冰霜残留'));
    const trace = e.createFX('trail'); traceRequest.resolve(trace.node); await flush();
    const oldX = trace.node.worldPosition.x; enemy.position.x = 200; assert.equal(trace.node.worldPosition.x, oldX, 'trail stays on the ground');
    assert.notEqual(trace.node.parent, enemy); assert.equal(trace.node.worldScale.x, 1);
    const n = e.requests.length; enemy.position.x += 100; visual.Tick(1, true); assert.equal(e.requests.length, n, 'pause emits nothing');
    e.game.GamePaused = true; const clock = trace.controller.clock; trace.controller.update(1); assert.equal(trace.controller.clock, clock);
    e.game.GamePaused = false; trace.controller.update(2); assert(e.recycled.includes(trace.node), 'traces expire and recycle');
    visual.UpdateState({ frozen: true, fire: 5, poison: 20 }); visual.Tick(0, false);
    assert.equal(enemy.children.length, 2, 'hard freeze preserves fire and poison auras');
    visual.UpdateState({}); visual.Tick(0, false);
    assert.equal(enemy.children.length, 2, 'expiry plays exit animation before recycling');
    for (const node of [...enemy.children]) {
        const fx = node.getComponent('ZRSJZ_ElementStatusFX');
        if (fx.Mode === 'fire') for (const flame of fx.flames) if (flame.getCurrent()) flame.getCurrent().complete = true;
        fx.update(.9);
    }
    assert.equal(enemy.children.length, 0, 'completed exit animations recycle all attached effects');
    visual.UpdateState({ poison: 1 }); visual.Tick(0, false); const stale = e.requests.at(-1); visual.Clear();
    const late = e.createFX('poison'); stale.resolve(late.node); await flush(); assert(e.recycled.includes(late.node)); assert.equal(enemy.children.length, 0);
    for (const mode of ['fire', 'poison', 'trail']) {
        const fx = e.createFX(mode); fx.controller.Configure(200, mode === 'trail' ? 70 : 600, mode === 'trail' ? 1.7 : 0);
        if (mode === 'poison') {
            assert.equal(fx.controller.bubbles.length, 4);
            assert(fx.controller.bubbles.every(bubble => bubble.getCurrent().name === '气泡'));
        } else if (mode === 'fire') {
            assert.equal(fx.controller.flames.length, 3);
            assert.equal(fx.controller.flames.filter(flame => flame.node.active).length, 1, 'initial ignition is staggered');
            assert(fx.controller.flames.filter(flame => flame.node.active).every(flame => flame.entry.name === 'in' && !flame.entry.loop));
            assert(fx.controller.flames.filter(flame => flame.node.active).every(flame => flame.queue[0].name === 'loop' && !flame.queue[0].loop && flame.queue[1].name === 'out'));
            assert.equal(fx.controller.parts.length, 0, 'burning uses real Spine animation instead of stretched projectile sprites');
        } else assert(fx.controller.parts.length >= 7 && fx.controller.parts.every(part => part.sprite.spriteFrame), mode + ' uses element-gun image resources');
        const before = fx.controller.clock; e.Coop.Stopped = true; fx.controller.update(1); assert.equal(fx.controller.clock, before); e.Coop.Stopped = false;
    }
    const burning = e.createFX('fire'); burning.controller.Configure(200, 600); burning.controller.update(.3);
    burning.controller.End(); burning.controller.update(.2);
    assert(burning.controller.flames.filter(flame => flame.node.active).every(flame => flame.entry.name === 'out' && !flame.entry.loop && !flame.queue.length));
    assert(burning.node.active, 'fire remains visible while the full out animation is playing');
    const pausedClock = burning.controller.clock; e.game.GamePaused = true; burning.controller.update(.5);
    assert.equal(burning.controller.clock, pausedClock); assert(burning.controller.flames.every(flame => flame.paused)); e.game.GamePaused = false;
    burning.controller.Resume(); assert.equal(burning.controller.ending, -1, 'reapplying a debuff resumes its existing aura');
    assert(burning.controller.flames.filter(flame => flame.node.active).every(flame => flame.entry.name === 'out'), 'reapplying does not interrupt the current slow fade');
    burning.controller.End(); burning.controller.update(.81); assert(burning.node.active, 'out segment is not cut short');
    for (const flame of burning.controller.flames) if (flame.getCurrent()) flame.getCurrent().complete = true;
    burning.controller.update(.02); assert(e.recycled.includes(burning.node));
    assert(burning.controller.flames.every(flame => flame.paused), 'pooled fire animations stop updating');
    burning.node.active = true; burning.controller.Configure(200, 600); assert.equal(burning.controller.flames.length, 3);
    assert(burning.controller.flames.filter(flame => flame.node.active).every(flame => flame.entry.name === 'in' && !flame.paused), 'pool reuse starts ignition again');
    const single = e.createFX('fire'); single.controller.Configure(200, 600);
    single.controller.update(.7); single.controller.update(.7);
    const flame = single.controller.flames[0];
    for (let cycle = 0; cycle < 6; cycle++) {
        const position = flame.node.position.clone();
        assert.equal(single.controller.flames.length, 3); assert.equal(flame.timeScale, .8);
        assert(single.controller.flames[1].node.active && single.controller.flames[2].node.active, 'other flames continue their own cycles');
        flame.setAnimation(0, 'out', false); single.controller.update(2);
        assert(flame.node.active, 'position remains visible until Spine reports fade completion');
        assert.equal(flame.node.position.x, position.x); assert.equal(flame.node.position.y, position.y);
        flame.getCurrent().complete = true; single.controller.update(.01); assert(!flame.node.active);
        single.controller.update(.19); assert(!flame.node.active, 'one location fully disappears before the next one appears');
        single.controller.update(.02); assert(flame.node.active); assert.equal(flame.getCurrent().name, 'in');
        assert(flame.node.position.x !== position.x || flame.node.position.y !== position.y);
        assert.equal(new Set(single.controller.fireSpots).size, 3, 'three flames never occupy the same location');
    }
    const staggered = e.createFX('fire'); staggered.controller.Configure(200, 600);
    const visible = () => staggered.controller.flames.filter(flame => flame.node.active).length;
    assert.equal(visible(), 1); staggered.controller.update(.69); assert.equal(visible(), 1);
    staggered.controller.update(.01); assert.equal(visible(), 2); staggered.controller.update(.7); assert.equal(visible(), 3);
    staggered.controller.End();
    const names = () => Array.from(staggered.controller.flames, flame => flame.getCurrent().name);
    assert.deepEqual(names(), ['out','in','in']); staggered.controller.update(.24); assert.deepEqual(names(), ['out','in','in']);
    staggered.controller.update(.01); assert.deepEqual(names(), ['out','out','in']);
    staggered.controller.update(.26); assert.deepEqual(names(), ['out','out','out']);
    staggered.controller.flames[0].getCurrent().complete = true; staggered.controller.update(.1); assert(staggered.node.active);
    for (const flame of staggered.controller.flames) flame.getCurrent().complete = true;
    staggered.controller.update(.1); assert(!staggered.node.active, 'recycle waits for all staggered exit animations');
    const dropped = e.createFX('fire'); dropped.controller.Configure(200, 600); dropped.controller.update(2);
    assert.equal(dropped.controller.flames.filter(flame => flame.node.active).length, 2, 'a dropped frame never ignites both pending flames together');
    dropped.controller.update(.7); assert.equal(dropped.controller.flames.filter(flame => flame.node.active).length, 3);
    for (let i = 0; i < 90; i++) { const fx = e.createFX('trail'); fx.controller.Configure(40, 14, 1.7); }
    assert(e.FX.trails.size <= 72, 'global trail cap is enforced');
    e.UI.ZRSJZ_DLC = false; visual.Tick(1, false); assert.equal(enemy.children.length, 0);
    for (const trail of Array.from(e.FX.trails)) trail.update(.1); assert.equal(e.FX.trails.size, 0, 'DLC unload cleans all traces');
    for (const [name, mode] of [['灼甲烈焰','fire'], ['毒素气泡','poison'], ['冰霜残留','trail']]) {
        const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/元素减益/' + name + '.prefab'));
        assert(prefab.some(component => component.Mode === mode));
    }
    assert(!fs.existsSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/元素减益/寒霜环绕.prefab'));
    assert(e.requests.every(request => !request.path.includes('寒霜环绕')));
    const bubble = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Spine/元素减益/毒素气泡.json'));
    assert.equal(bubble.slots.length, 2); assert(bubble.slots.every(slot => slot.name.startsWith('39_')));
    assert(!bubble.skins[0].attachments.zz, 'isolated bubble animation contains no swamp ground');
    assert(bubble.animations['气泡'].slots['39_00006'].attachment.length > 10, 'bubble growth and bursting reuse the swamp animation sequence');
    const fireData = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Spine/火把/lrsc568.json'));
    assert(fireData.animations.in && fireData.animations.loop && fireData.animations.out);
    assert(new Set(fireData.animations.loop.slots.honghuo2.attachment.map(frame => frame.name)).size >= 9);
    assert(fireData.animations.out.slots.honghuo2.color.at(-1).color.endsWith('00'), 'out animation fades the fire to transparent');
    console.log('PASS: DLC gate, three simultaneous status auras, ground-fixed trails, throttling, lifetime/cap, pause, stale loads, expiry and DLC unload cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
