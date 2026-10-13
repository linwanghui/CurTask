const fs=require('fs');
const boot=fs.readFileSync('_data/upgrade/preview-snow-prayer.cjs','utf8').split("  console.log('entry'")[0].replace('极北之地_机密行动','五号小镇_机密行动');
const checks=`
  await page.waitForFunction(()=>getModule('ZRSJZ_Game').Instance.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_Fishing'))?._prefab);
  await page.evaluate(()=>{
   window.assert=(v,m)=>{if(!v)throw Error(m);};window.game=getModule('ZRSJZ_Game').Instance;window.player=game.GetPlayer(0);
   game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(n=>n.node.active=false);
   window.fishing=game.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_Fishing'));
   window.attack=game.OnePlayerModel.getComponentInChildren(cc.js.getClassByName('ZRSJZ_Joystick_Attack'));
   player.node.setWorldPosition(fishing._stations[0].getChildByName('PlayerPoint').worldPosition);
   fishing.Enter(attack);window.session=fishing._sessions[0];assert(session,'Fishing enters');
   window.rod=player.PlayerSkeleton.Skeleton.findSlot('4_三合一螺纹钢');
   rod.setAttachment(null);rod.color.a=0;player.PlayerSkeleton.RefreshEquipmentAppearance();
   assert(rod.getAttachment()&&rod.color.a===1,'Equipment refresh restores missing transparent rod');
   fishing.Cast(session);fishing.UpdateSession(session,999);
   assert(session.state==='casting'&&!session.line.node.active&&!session.line._ripple.active,'Elapsed time cannot prematurely show line');
   game.GamePaused=true;fishing.update(0);window.castTime=player.PlayerSkeleton.Skeleton.getCurrent(0).trackTime;
  });
  await page.waitForTimeout(400);
  await page.evaluate(()=>{
   assert(session.state==='casting'&&!session.line.node.active,'Paused cast keeps line hidden');
   assert(player.PlayerSkeleton.Skeleton.getCurrent(0).trackTime===castTime,'Pause stops cast animation');game.GamePaused=false;
  });
  await page.waitForFunction(()=>session.state==='waiting',null,{timeout:5000});
  await page.evaluate(()=>{
   assert(session.line.node.active,'Line appears after actual cast completion');
   assert(rod.getAttachment()&&rod.color.a===1,'Rod visible after cast');
   assert(session.elapsed<0.2,'Bite timer starts after casting');
  });
  for(let i=0;i<3;i++){
   await page.evaluate(()=>{
    fishing.Exit(session);fishing.Enter(attack);session=fishing._sessions[0];
    assert(session,'Can re-enter fishing');fishing.Cast(session);
    assert(!session.line.node.active,'Recast hides line');
   });
   await page.waitForTimeout(50);
   await page.evaluate(()=>{
    fishing.Exit(session);fishing.Enter(attack);session=fishing._sessions[0];
    assert(session,'Quickly cancelled cast can re-enter');
   });
   await page.waitForTimeout(100);
   await page.evaluate(()=>{
    const slot=player.PlayerSkeleton.Skeleton.findSlot('4_三合一螺纹钢');
    assert(slot.getAttachment()&&slot.color.a===1,'Repeated early cast exits do not leave rod invisible');
   });
  }
  await page.screenshot({path:'_data/upgrade/fishing-rod-checked.png'});
  if(errors.length)throw Error(errors.join('\\n'));
  console.log('PASS: rod attachment/alpha recovery, casting completion gate, pause, delayed line, bite timing and repeated interrupted casts');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
`;
new Function('require',boot+checks)(require);
