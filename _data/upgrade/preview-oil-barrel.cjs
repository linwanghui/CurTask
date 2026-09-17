const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const base=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const prefix=base.slice(0,base.indexOf("  console.log('open',"));
const launch=boot.slice(boot.indexOf("  console.log('launch',"),boot.indexOf("  console.log('runtime',"));
eval(prefix+"  page.on('console', m=>{if(m.text().startsWith('BARREL'))console.log(m.text());});\n"+launch+`
  console.log('oil barrel',await page.evaluate(async()=>{
   const game=t.get('ZRSJZ_Game').Instance;
   const enemies=game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase'));
   enemies.forEach(e=>e.enabled=false);
   const player=game.Players[0],enemy=enemies[0];
   if(!player||!enemy)throw Error('Missing targets');
   player.enabled=false;
   t.UI.Instance.CloseAllPanelsImmediately();game.GamePaused=false;
   const prefab=await new Promise((res,rej)=>cc.assetManager.getBundle('73_ZRSJZ_DLC').load('Prefabs/Unit/油桶',cc.Prefab,(e,p)=>e?rej(e):res(p)));
   const hits={player:[],enemy:[]};player.BeHit=d=>hits.player.push(d);enemy.BeHit=d=>hits.enemy.push(d);
   const origin=player.node.worldPosition.clone();enemy.node.setWorldPosition(origin);
   const make=()=>{const n=cc.instantiate(prefab);n.parent=game.node;n.setWorldPosition(origin);return n.getComponent(cc.js.getClassByName('ZRSJZ_OilBarrel'));};
   const barrel=make();if(!barrel||!barrel.Explosion?.skeletonData||!barrel.BarrelVisual)throw Error('Prefab bindings missing');
   console.log('BARREL '+JSON.stringify({components:barrel.node.components.map(c=>cc.js.getClassName(c)),errors:0}));
   barrel.ExplosionRadius=321;barrel.ExplosionDamage=77;
   barrel.BeHit(0);if(barrel.detonated)throw Error('Zero damage triggered');
   barrel.BeHit(1);barrel.BeHit(10);
   await new Promise(r=>setTimeout(r,100));
   if(JSON.stringify(hits)!==JSON.stringify({player:[77],enemy:[77]}))throw Error('Damage/dedup failed '+JSON.stringify(hits));
   if(barrel.BarrelVisual.active||barrel.getComponent('cc.BoxCollider2D').enabled)throw Error('Barrel not removed');
   if(barrel.Explosion.getCurrent(0)?.animation?.name!=='eff')throw Error('Wrong explosion animation');
   const out=make();out.ExplosionRadius=1;out.node.setWorldPosition(origin.x+3000,origin.y,origin.z);out.BeHit(1);
   await new Promise(r=>setTimeout(r,100));
   if(hits.player.length!==1||hits.enemy.length!==1)throw Error('Out of range damage');
   for(const bulletName of ['PlayerBullet','EnemyBullet']){
    const b=make();b.ExplosionDamage=13;
    const n=new cc.Node(bulletName);n.parent=game.node;
    const bullet=n.addComponent(cc.js.getClassByName('ZRSJZ_Bullet'));bullet._harm=10;
    bullet.scheduleOnce=()=>{};
    bullet.BeginContact(null,b.getComponent('cc.BoxCollider2D'),null);
    if(!b.detonated||!bullet._isRemove)throw Error(bulletName+' did not trigger');
    n.destroy();
   }
   await new Promise(r=>setTimeout(r,100));
   if(hits.player.length!==3||hits.enemy.length!==3)throw Error('Bullet explosions failed');
   await new Promise(r=>setTimeout(r,3500));
   if(cc.isValid(barrel.node,true))throw Error('Explosion did not clean up');
   game.GamePaused=true;
   return {hits,configuredRadius:321,configuredDamage:77,animation:'eff',cleanup:true};
  }));
  console.log('errors',errors);fs.writeFileSync(path.join(__dirname,'oil-barrel-preview-errors.json'),JSON.stringify(errors,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
