const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const boss=fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',"));
const launch=boss.slice(boss.indexOf("  console.log('launch',"),boss.indexOf("  console.log('runtime',"));
eval(prefix+launch+`
  console.log('patrol',await page.evaluate(async()=>{
   const game=t.get('ZRSJZ_Game').Instance;
   const enemies=game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase'));
   enemies.forEach(e=>{e.enabled=false;e.StopMoving();});
   const e=enemies.find(e=>e.EnemyConfig.PatrolSpeed>0);if(!e)throw Error('No patrol enemy');
   const pos=e.node.worldPosition.clone();e._patrolCenter.set(pos);e._patrolTarget.set(pos.x+400,pos.y,pos.z);
   e._patrolWaitRemaining=0;e._patrolProgressTime=0;e._patrolBlockedTime=0;e._patrolLastPosition.set(pos);
   let selections=0;const select=e.SelectNextPatrolPoint.bind(e);e.SelectNextPatrolPoint=()=>{selections++;select();};
   // 模拟持续被墙阻挡，A* 每轮都会重置通用 stuckTime。
   const navigate=e.NavigateTo;e.NavigateTo=()=>{e._stuckTime=0;};
   for(let i=0;i<4;i++)e.Patrol(.25);
   if(selections!==1)throw Error('Patrol failed to replace blocked target');
   e.NavigateTo=navigate;
   e._path=[new cc.Vec3(pos.x+999,pos.y,0)];select();if(e._path.length)throw Error('Old path survived target change');
   const wall=new cc.Node('PatrolTestWall');wall.parent=game.node;wall.setWorldPosition(20000,20000,0);
   const rb=wall.addComponent('cc.RigidBody2D');rb.type=0;rb.group=1;
   const c=wall.addComponent('cc.BoxCollider2D');c.size=new cc.Size(400,400);c.group=1;c.apply();
   await new Promise(r=>setTimeout(r,100));
   const rejectsWall=!e.CanPatrolTo(new cc.Vec3(20000,19900,0));wall.destroy();
   if(!rejectsWall)throw Error('Patrol endpoint accepted solid wall');
   game.GamePaused=true;
   return{blockedTargetReplaced:selections===1,oldPathCleared:true,solidWallRejected:rejectsWall};
  }));
  console.log('errors',errors);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
