const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8'),boss=fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',")).replace('await page.waitForTimeout(18000);await page.mouse.click(1010,615);await page.waitForTimeout(10000);',"await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director.getScene(), null, {timeout:45000});");
const launch=boss.slice(boss.indexOf("  console.log('launch',"),boss.indexOf("  console.log('runtime',"));
eval(prefix+launch+String.raw`
 console.log('luna',await page.evaluate(async()=>{
  const game=t.get('ZRSJZ_Game').Instance,p=game.Players[0],Luna=cc.js.getClassByName('ZRSJZ_LunaSkill');
  const check=(x,s)=>{if(!x)throw Error(s);};
  game.GamePaused=false;t.UI.Instance.CloseAllPanelsImmediately();p.enabled=false;p.BeHit=()=>{};p.CurHP=p.MaxHP;
  p.PlayerSkeleton.AttackX=1;p.PlayerSkeleton.AttackY=0;p.TargetEnemy=null;
  await p.CastLuna();
  const skill=game.node.scene.getComponentsInChildren(Luna)[0];check(!!skill,'Cast missing');
  const advance=(s,dt)=>{s.update(dt);if(s._game&&!game.GamePaused){s._spine.getCurrent(0).trackTime+=dt;s.lateUpdate();}};
  check(!skill._spine.getCurrent(0).loop,'Animation loops');
  const center=skill.node.worldPosition.clone();
  check(Math.abs(center.x-p.node.worldPosition.x-skill.ForwardDistance)<.01,'Forward location');
  check(skill._spine.animation==='action','Wrong animation');
  const enemies=game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).filter(e=>!e.IsDead&&e.node.activeInHierarchy);
  check(enemies.length>=3,'Not enough enemies');
  enemies.forEach(e=>{e.enabled=false;e.StopMoving();});
  const target=enemies[0],outside=enemies[1],dead=enemies[2];
  for(const e of [target,outside,dead]){game.node.addChild(e.node);e.node.active=true;}
  let hits=[],outsideHits=0,deadHits=0;
  target._health=10000;const hit=target.BeHit;target.BeHit=function(d){hits.push(d);hit.call(this,d);};
  outside.BeHit=()=>outsideHits++;dead.BeHit=()=>deadHits++;dead._state=t.get('ZRSJZ_ENEMY_STATE').DEAD;
  // 在同一帧设置位置并检查，避免地图物理系统覆盖测试位置。
  target.node.setWorldPosition(center.x+100,center.y,center.z);
  outside.node.setWorldPosition(center.x+2000,center.y,center.z);
  dead.node.setWorldPosition(center.x+50,center.y,center.z);
  if(outside.Other)outside.Other.setWorldPosition(center.x+2000,center.y,center.z);
  // 场景障碍另由已有 HasDirectPath 负责；测试使用可通行路径隔离拉扯计算。
  target.HasDirectPath=()=>true;
  const start=cc.Vec3.distance(target.node.worldPosition,center);
  advance(skill,.15);check(cc.Vec3.distance(target.node.worldPosition,center)<start,'Pull failed');check(hits.length===0,'Damage too early');
  advance(skill,.15);check(hits.length===1,'First damage missing');
  const elapsed=skill._elapsed,position=target.node.worldPosition.clone();
  game.GamePaused=true;advance(skill,1);check(skill._elapsed===elapsed&&hits.length===1,'Pause failed');check(cc.Vec3.distance(position,target.node.worldPosition)<.001,'Paused pull');
  game.GamePaused=false;
  for(let i=0;i<6;i++)advance(skill,.3);
  advance(skill,.31);
  check(hits.length===8,'Expected 8 small hits: '+hits.length);
  const singleCycleHits=hits.length;
  check(hits.every(d=>d===skill._damage),'Wrong tick damage');
  check(outsideHits===0&&deadHits===0,'Invalid targets damaged');
  check(!cc.isValid(skill.node,true),'No cleanup');
  const hp=p.CurHP;check(hp===p.MaxHP,'Self damaged');
  p.TargetEnemy=target.node;
  await p.CastLuna();const second=game.node.scene.getComponentsInChildren(Luna).find(x=>cc.isValid(x,true));
  check(!!second,'Second cast missing');
  check(cc.Vec3.distance(second.node.worldPosition,target.node.worldPosition)<.001,'Locked target center');
  const fixed=second.node.worldPosition.clone();target.node.setWorldPosition(fixed.x+100,fixed.y,fixed.z);second.update(.01);
  check(cc.Vec3.distance(second.node.worldPosition,fixed)<.001,'Center should remain fixed');
  game._isGameFinished=true;second.update(.1);check(!cc.isValid(second.node,true),'Battle cleanup');
  game._isGameFinished=false;await p.CastLuna();
  const live=game.node.scene.getComponentsInChildren(Luna).find(x=>cc.isValid(x,true));
  await new Promise(r=>setTimeout(r,700));check(cc.isValid(live,true)&&live._elapsed>0,'Real animation not advancing');
  await new Promise(r=>setTimeout(r,2400));check(!cc.isValid(live,true),'Real single cycle not cleaned up');
  return {lockedTargetCenter:true,fixedCenter:true,forwardFallback:true,pull:true,ticksPerCycle:singleCycleHits,damagePerTick:hits[0],outsideAndDeadExcluded:true,pause:true,cleanup:true,realAnimationCleanup:true};
 }));
 console.log('errors',errors);if(errors.some(e=>/TypeError|Cannot read|露娜技能释放失败/.test(e)))throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
`);
