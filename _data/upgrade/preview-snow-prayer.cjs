const fs=require('fs');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe'});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1560,height:720}});
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  await page.goto('http://localhost:7456',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.cc&&cc.assetManager,{timeout:30000});
  await page.waitForTimeout(8000);
  await page.mouse.click(1010,615);
  await page.waitForTimeout(10000);
  await page.evaluate(async()=>{
   const core=await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ',(e,b)=>e?reject(e):resolve(b)));
   const scene=await new Promise((resolve,reject)=>core.loadScene('ZRSJZ_Start',(e,s)=>e?reject(e):resolve(s)));
   cc.director.runSceneImmediate(scene);
   await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ_DLC',(e,b)=>e?reject(e):resolve(b)));
  });
  await page.waitForTimeout(6000);
  await page.evaluate(()=>{
   window.getModule=name=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[name])?.[name];
   const ui=getModule('ZRSJZ_UIManager'),data=getModule('ZRSJZ_GameData');
   ui.ZRSJZ_DLC=true;ui.Instance.CloseAllPanelsImmediately();
   data.Instance.IsTutorial=true;
   data.Instance.CurMap='极北之地_机密行动';data.Instance.CurModel='1p';
   const inv=getModule('ZRSJZ_InventoryService');
   inv.SetWeaponry(0,inv.AddPropByName('AK12-突击步枪'),0);inv.SetWeaponry(4,inv.AddPropByName('魔刀'),0);
   inv.GetBattleEntryError=()=>'';
  });
  await page.evaluate(async()=>{
   const scene=await new Promise((resolve,reject)=>cc.assetManager.getBundle('73_ZRSJZ').loadScene('ZRSJZ_Game',(e,s)=>e?reject(e):resolve(s)));
   cc.director.runSceneImmediate(scene);
  });
  await page.waitForFunction(()=>getModule('ZRSJZ_Game').Instance?.Players.length,{timeout:45000});
  await page.waitForTimeout(1000);
  console.log('entry',await page.evaluate(async()=>{
   window.assert=(v,m)=>{if(!v)throw Error(m);};
   window.game=getModule('ZRSJZ_Game').Instance;
   window.prayer=game.CurMap.getComponent(cc.js.getClassByName('ZRSJZ_SnowPrayer'));
   window.player=game.GetPlayer(0);
   game.CurMap.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).forEach(enemy=>enemy.node.active=false);
   assert(prayer?._range&&prayer._rewardPoint,'Range and reward point resolved: '+JSON.stringify({map:game.CurMap.node.name,controller:!!prayer,range:prayer?._range?.name,children:game.CurMap.node.children.map(n=>n.name)}));
   player.node.setWorldPosition(prayer._range.worldPosition);
   assert(prayer.CanPray(0),'Inside range can pray');
   player.node.setWorldPosition(prayer._range.worldPosition.clone().add(new cc.Vec3(1000,0,0)));
   assert(!prayer.CanPray(0),'Outside range cannot pray');
   player.node.setWorldPosition(prayer._range.worldPosition);
   prayer.UpdateButtons();
   const attack=game.OnePlayerModel.getComponentInChildren(cc.js.getClassByName('ZRSJZ_Joystick_Attack'));
   assert(attack.node.getChildByName('祈祷').active,'Prayer button visible');
   attack.node.getChildByName('祈祷').emit(cc.Button.EventType.CLICK);
   return {radius:prayer._range.getComponent(cc.js.getClassByName('cc.CircleCollider2D')).radius};
  }));
  await page.waitForFunction(()=>cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_SnowPrayerPanel'))?.node.activeInHierarchy,{timeout:15000});
  await page.waitForTimeout(600);
  console.log('drag',await page.evaluate(()=>{
   window.panel=cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_SnowPrayerPanel'));
   assert(game.GamePaused,'Puzzle pauses battle');
   assert(panel._stones.length===4&&panel._slots.length===4,'Four draggable stones and slots');
   assert(panel._stones.some((s,i)=>!cc.Vec3.equals(s.home,panel._homes[i])),'Opening shuffles initial positions');
   window.drag=(stone,target,cancel=false)=>{
    const start=stone.node.worldPosition.clone(),end=target.clone();
    const e=p=>({getUILocation:()=>({x:p.x,y:p.y}),getID:()=>1});
    stone.node.emit(cc.Node.EventType.TOUCH_START,e(start));
    stone.node.emit(cc.Node.EventType.TOUCH_MOVE,e(end));
    stone.node.emit(cancel?cc.Node.EventType.TOUCH_CANCEL:cc.Node.EventType.TOUCH_END,e(end));
   };
   const stone=panel._stones[0],slot=panel._slots[0];
   drag(stone,slot.worldPosition);assert(stone.slot===slot,'Drop snaps to slot');
   drag(stone,new cc.Vec3(0,-2000,0));assert(!stone.slot&&cc.Vec3.equals(stone.node.position,stone.home),'Placed stone drags outside and returns home');
   drag(stone,slot.worldPosition);drag(panel._stones[1],slot.worldPosition);
   assert(!stone.slot&&panel._stones[1].slot===slot,'Occupied slot sends previous stone home');
   drag(panel._stones[1],slot.worldPosition,true);assert(!panel._stones[1].slot,'Cancelled drag returns home');
   const second=panel._stones[1],secondSlot=panel._slots[1];
   drag(stone,slot.worldPosition);drag(second,secondSlot.worldPosition);
   drag(stone,secondSlot.worldPosition);
   assert(stone.slot===secondSlot&&second.slot===slot,'Dragging between occupied slots swaps both stones');
   assert(cc.Vec3.distance(stone.node.worldPosition,secondSlot.worldPosition)<0.01
    &&cc.Vec3.distance(second.node.worldPosition,slot.worldPosition)<0.01,'Both swapped stones snap to their new slots');
   drag(stone,secondSlot.worldPosition);assert(stone.slot===secondSlot&&second.slot===slot,'Dropping on the same slot preserves placement');
   drag(stone,new cc.Vec3(0,-2000,0));
   assert(!stone.slot&&cc.Vec3.equals(stone.node.position,stone.home)&&second.slot===slot,'Outside drop returns only dragged stone home after swap');
   assert(!panel._highlight.active,'Incomplete placement must not highlight');
   panel._stones.forEach(s=>drag(s,panel._slots.find(n=>n.name===s.node.name).worldPosition));
   assert(panel._highlight.active&&panel._completing,'Complete solution starts blink');
   assert(!prayer._completed,'Reward waits for blink');
   return {names:panel._stones.map(s=>s.node.name),canClose:panel.CanClose};
  }));
  await page.screenshot({path:'_data/upgrade/snow-prayer-puzzle.png'});
  await page.waitForFunction(()=>prayer._completed&&!panel.node.activeInHierarchy,{timeout:15000});
  console.log('reward',await page.evaluate(async()=>{
   const boxes=game.CurMap.Unit.children.filter(n=>n.name==='解密宝箱');
   assert(boxes.length===1,'One reward chest');
   const box=boxes[0].getComponent(cc.js.getClassByName('ZRSJZ_Box'));
   assert(box.LootProps.length>0,'Chest contains loot');
   const cfg=getModule('ZRSJZ_MAP_CONFIG').get(getModule('ZRSJZ_GameData').Instance.CurMap);
   const props=getModule('ZRSJZ_PROP_CONFIG'), quality=getModule('ZRSJZ_PROP_QUALITY');
   for(const name of box.LootProps){const p=props.get(name);assert(p.PropType!=='物品'||p.Quality===quality.金色||p.Quality===quality.红色,'High-value item quality matches airdrop');}
   assert(cc.Vec3.distance(boxes[0].worldPosition,prayer._rewardPoint.worldPosition)<0.01,'Chest at authored reward point');
   assert(!prayer._range.active&&!prayer.CanPray(0),'Completed prayer disappears');
   assert(await prayer.Complete()===false,'Cannot reward twice');
   assert(!game.GamePaused,'Close restores battle');
   const test=new (cc.js.getClassByName('ZRSJZ_SnowPrayerPanel'))();
   test._owner={Available:false};test._completing=true;
   let closed=false;test.Close=()=>{closed=true;};test.update();
   assert(closed&&!test._completing,'Battle exit overrides completion lock');
   return {chests:boxes.length,loot:box.LootProps,rangeActive:prayer._range.active};
  }));
  await page.screenshot({path:'_data/upgrade/snow-prayer-preview.png'});
  const expPath=await page.evaluate(()=>getModule('ZRSJZ_PANEL').涨经验弹窗);
  for(let i=0;i<2;i++){
   await page.evaluate(({path,amount})=>getModule('ZRSJZ_UIManager').Instance.ShowPanel(path,amount),{path:expPath,amount:10+i});
   await page.waitForFunction(()=>cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_GetExpPanel'))?.node.activeInHierarchy);
   await page.evaluate(()=>{
    const ui=getModule('ZRSJZ_UIManager').Instance;
    const exp=cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_GetExpPanel'));
    assert(exp.node.parent===ui._panelNode,'Experience prompt stays in persistent container');
    ui.HidePanel(getModule('ZRSJZ_PANEL').涨经验弹窗);
   });
   await page.waitForTimeout(150);
  }
  await page.evaluate(async()=>{
   const scene=await new Promise((resolve,reject)=>cc.assetManager.getBundle('73_ZRSJZ').loadScene('ZRSJZ_Start',(e,s)=>e?reject(e):resolve(s)));
   cc.director.runSceneImmediate(scene);
  });
  await page.waitForTimeout(1500);
  await page.evaluate(()=>getModule('ZRSJZ_GetExpPanel').Enqueue(30));
  await page.waitForFunction(()=>cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_GetExpPanel'))?.node.activeInHierarchy);
  await page.evaluate(()=>{
   const ui=getModule('ZRSJZ_UIManager').Instance;
   const exp=cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_GetExpPanel'));
   assert(exp.node.parent===ui._panelNode,'Return home reuses persistent experience prompt safely');
  });
  console.log('PASS: repeated experience prompts survive battle exit and display again on home');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PASS: real Cocos runtime prayer range/button, shuffled draggable stones, re-drag/outside/cancel/occupied slots, solution blink, airdrop loot, one-time chest and pause cleanup');
 }finally{fs.writeFileSync('_data/upgrade/snow-prayer-preview-errors.json',JSON.stringify(errors,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
