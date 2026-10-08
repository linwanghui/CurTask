const fs = require('fs');
const boot = fs.readFileSync(__dirname + '/preview-enhancement-v2.cjs', 'utf8');
const boss = fs.readFileSync(__dirname + '/preview-boss-motion.cjs', 'utf8');
const prefix = boot.slice(0, boot.indexOf("  console.log('open',")).replace(
  'await page.waitForTimeout(18000);await page.mouse.click(1010,615);await page.waitForTimeout(10000);',
  "await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director.getScene(), null, { timeout: 45000 });");
const launch = boss.slice(boss.indexOf("  console.log('launch',"), boss.indexOf("  console.log('runtime',"));
eval(prefix + launch + String.raw`
  console.log('tracking', await page.evaluate(async () => {
    const game = t.get('ZRSJZ_Game').Instance, player = game.Players[0];
    const Skill = cc.js.getClassByName('ZRSJZ_UluSkill'), Missile = cc.js.getClassByName('ZRSJZ_UluMissile');
    await Skill.LoadPrefab();
    t.UI.Instance.CloseAllPanelsImmediately(); game.GamePaused = false;
    player.FindTarget = () => {}; player.BeHit = () => {}; player.CurHP = 1000;
    const enemies = game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).filter(e => !e.IsDead && e.node.activeInHierarchy);
    const eq = (a,b,label) => { if (cc.Vec3.distance(a,b) > .001) throw Error(label + JSON.stringify({a,b})); };
    let count = 0;
    for (const mode of ['death','destroy']) {
      const enemy = enemies[count++]; enemy.enabled = false; enemy._health = 10000;
      game.node.addChild(enemy.node); enemy.node.active = true;
      const origin = new cc.Vec3(500,500,0); enemy.node.setWorldPosition(origin);
      player.TargetEnemy = enemy.node;
      player.PlayerSkeleton.PlayUluSkill = emit => {
        emit('p1', new cc.Vec3(), new cc.Vec3(1,0,0));
        const missiles = game.node.scene.getComponentsInChildren(Missile).filter(m => m._state === 'flying');
        const m = missiles[missiles.length-1]; if(!m) throw Error('No missile');
        m.update(.001);
        enemy.node.setWorldPosition(550,500,0); m.update(.001); eq(m._target,origin,'Exactly 50 must not update');
        enemy.node.setWorldPosition(551,500,0); m.update(.001); eq(m._target,new cc.Vec3(551,500,0),'Over 50 must update');
        enemy.node.setWorldPosition(580,500,0); m.update(.001); eq(m._target,new cc.Vec3(551,500,0),'Small movement must not update');
        if(mode === 'death') { Object.defineProperty(enemy, 'IsDead', { configurable:true, value:true }); enemy.node.setWorldPosition(900,900,0); }
        else enemy.node.destroy();
        m.update(.001); eq(m._target,new cc.Vec3(580,500,0),'Last seen fallback');
        if(mode === 'death') { Object.defineProperty(enemy, 'IsDead', { configurable:true, value:false }); enemy.node.setWorldPosition(1200,1200,0); }
        m.update(.001); eq(m._target,new cc.Vec3(580,500,0),'Lost target must stay frozen');
        let impact = null; m._onExplode = p => impact = p;
        m.update(10); eq(impact,new cc.Vec3(580,500,0),'Impact position');
        eq(m.node.worldPosition,impact,'Visual impact position');
        if(m._getTarget !== null) throw Error('Tracking retained after explosion');
        player.TargetEnemy = null;
        return true;
      };
      await player.CastUluSkill();
    }
    game.GamePaused = true;
    return { threshold50:true, threshold51:true, smallMovementIgnored:true, deathFallback:true, destroyedFallback:true, noReacquire:true, impactMatches:true };
  }));
  console.log('errors', errors);
  if(errors.some(e => /TypeError|Cannot read|乌鲁.*失败/.test(e))) throw Error(errors.join('\n'));
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
`);
