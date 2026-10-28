// Run: node tests/zrsjz-freeze-disposal.test.cjs
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const file = 'assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_Player.ts';
const tree = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const cls = tree.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'ZRSJZ_Player');
const clear = cls.members.find(n => n.name?.getText(tree) === 'ClearFrozen').getText(tree);
const js = ts.transpileModule(`class Player { ${clear} }; Player;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

// Native 3.8.6 order: middleware.update -> Player.update -> deferredDestroy
// -> middleware.render -> AFTER_DRAW. removeTimer only queues an operation.
function fixture() {
    const afterDraw = [], destroyQueue = [], timers = new Set(), pendingRemovals = new Set();
    const effect = {
        valid: true, entity: {}, parent: {}, _active: true,
        get active() { return this._active; },
        set active(value) { this._active = value; if (!value) pendingRemovals.add(this); },
        removeFromParent() { this.parent = null; },
        destroy() { pendingRemovals.add(this); destroyQueue.push(this); this.valid = false; },
    };
    timers.add(effect);
    const Player = vm.runInNewContext(js, {
        isValid: object => !!object?.valid,
        Director: { EVENT_AFTER_DRAW: 'after-draw' },
        director: { once(event, callback) { assert.equal(event, 'after-draw'); afterDraw.push(callback); } },
    });
    const player = new Player();
    Object.assign(player, { _freezeEffect: effect, _freezeVersion: 1, _freezeRemaining: 1,
        _freezeDamageElapsed: 0.5, _freezeBreakSoundPlayed: true,
        _freezeBodyType: 2, RigidBody: { type: 1 }, _freezeSpineSpeed: 1.25,
        PlayerSkeleton: { Skeleton: { valid: true, timeScale: 0 } }, ResetMovement() {},
    });
    return { player, effect, afterDraw, destroyQueue,
        update() { for (const item of pendingRemovals) timers.delete(item); pendingRemovals.clear(); },
        destroyPending() { for (const item of destroyQueue.splice(0)) item.entity = null; },
        render() { for (const item of timers) assert.ok(item.entity, 'Spine render dereferences a cleared entity'); },
        endFrame() { for (const callback of afterDraw.splice(0)) callback(); },
    };
}
{
    const f = fixture(); f.update(); f.effect.destroy(); f.destroyPending();
    assert.throws(() => f.render(), /cleared entity/);
    console.log('REPRODUCED: immediate freeze destruction clears the entity before native timer removal');
}
for (let cycle = 0; cycle < 100; cycle++) {
    const f = fixture(); f.update(); f.player.ClearFrozen(); f.player.ClearFrozen();
    assert.equal(f.afterDraw.length, 1, 'Repeated cleanup must not schedule duplicate destruction');
    assert.equal(f.player._freezeEffect, null);
    assert.equal(f.player._freezeRemaining, 0);
    assert.equal(f.player.RigidBody.type, 2);
    assert.equal(f.player.PlayerSkeleton.Skeleton.timeScale, 1.25);
    assert.equal(f.effect.active, false);
    assert.equal(f.effect.parent, null, 'Player/scene destruction cannot recursively destroy the retired effect');
    f.destroyPending(); f.render(); f.endFrame();
    f.update(); f.destroyPending(); f.render();
    assert.equal(f.effect.entity, null, 'Effect is eventually released, not permanently pooled');
}
console.log('PASS: 100 freeze cleanup cycles, repeated cleanup, immediate control recovery and deferred native disposal');
