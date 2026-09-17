const fs=require('fs'),base=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8'),boss=fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const prefix=base.slice(0,base.indexOf("  console.log('open',")),launch=boss.slice(boss.indexOf("  console.log('launch',"),boss.indexOf("  console.log('runtime',"));
eval(prefix+launch+`
 console.log('muzzle',await page.evaluate(async()=>{
  const game=t.get('ZRSJZ_Game').Instance,p=game.Players[0],sk=p.PlayerSkeleton;
  t.UI.Instance.CloseAllPanelsImmediately();game.GamePaused=false;p._isStop=false;p.BeHit=()=>{};p.enabled=false;
  game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(e=>{e.enabled=false;e.StopMoving();});
  if(!sk.QKBone||p.WeaponType!=='枪')throw Error('No equipped gun');
  const pool=t.get('ZRSJZ_PoolManager').Instance;
  let results=[];
  for(const direction of [[-1,.6],[1,-.4],[-1,0],[1,1]]){
   const n=await pool.GetNode('Prefabs/Unit/PlayerBullet'),bullet=n.getComponent(cc.js.getClassByName('ZRSJZ_Bullet'));
   const show=bullet.Show;let spawned=null;
   bullet.Show=function(pos,...args){spawned=pos.clone();return show.call(this,pos,...args);};
   sk.AttackX=-direction[0];sk.AttackY=0;sk.UpdateAimAndAttack();
   const stale=p.getMuzzlePos();
   p._reservedGunBullet=n;p._reservedGunAmmoName='1级子弹';p._waitingFirstGunShot=true;p._gunAttackAnimationActive=true;p._gunAttackAnimationPlayedOnce=false;p._magazineAmmo=['1级子弹'];
   p.QueueReservedGunBullet();if(spawned)throw Error('Spawned during event');
   sk.AttackX=direction[0];sk.AttackY=direction[1];const pos=p.node.worldPosition;p.node.setWorldPosition(pos.x+30,pos.y+12,pos.z);
   sk.UpdateAimAndAttack();const expected=p.getMuzzlePos();
   if(!spawned||cc.Vec3.distance(spawned,expected)>.001)throw Error('Spawn not aligned');
   results.push({direction,error:cc.Vec3.distance(spawned,expected),staleOffset:cc.Vec3.distance(stale,expected)});
   bullet.Show=show;p.CancelGunAttackState();
  }
  game.GamePaused=true;return results;
 }));console.log('errors',errors);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
