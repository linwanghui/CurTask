const fs=require('fs');
const base=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8'),boss=fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const prefix=base.slice(0,base.indexOf("  console.log('open',")),launch=boss.slice(boss.indexOf("  console.log('launch',"),boss.indexOf("  console.log('runtime',"));
eval(prefix+launch+`
  console.log('far patrol',await page.evaluate(async()=>{
   const game=t.get('ZRSJZ_Game').Instance;t.UI.Instance.CloseAllPanelsImmediately();game.GamePaused=false;
   const enemies=game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase'));
   const p=game.Players[0];p.BeHit=()=>{};
   const before=enemies.map(e=>e.node.worldPosition.clone());
   await new Promise(r=>setTimeout(r,3000));
   return enemies.slice(0,20).map((e,i)=>({name:e.node.name,distance:Math.round(cc.Vec3.distance(e.node.worldPosition,p.node.worldPosition)),moved:Math.round(cc.Vec3.distance(e.node.worldPosition,before[i])),state:e.State,wait:e._patrolWaitRemaining,target:e._patrolTarget,position:e.node.worldPosition,speed:e.EnemyConfig.PatrolSpeed,velocity:e.RigidBody.linearVelocity}));
  }));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
