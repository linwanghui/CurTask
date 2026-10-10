const fs = require('fs');
const boot = fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const boss = fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const prefix = boot.slice(0,boot.indexOf("  console.log('open',"));
const launch = boss.slice(boss.indexOf("  console.log('launch',"),boss.indexOf("  console.log('runtime',")).replace('await page.waitForTimeout(12000);',String.raw`
  await page.waitForFunction(()=>t.get('ZRSJZ_Game').Instance?.GetPlayer(0)&&cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_MapAutoShow'))[0]?.Enemy,null,{timeout:30000});
  await page.evaluate(()=>{
    const p=t.get('ZRSJZ_Game').Instance.GetPlayer(0);p.BeHit=()=>{};
    const a=cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_MapAutoShow'))[0];
    const e=a.Enemy.getComponent(t.get('ZRSJZ_EnemyBase'));e._health=10000;
  });
  await page.waitForTimeout(3000);
`);
eval(prefix+"  await page.waitForFunction(() => Array.from(System.entries()).some(([,m])=>m.ZRSJZ_UIManager?.Instance), null, {timeout:45000});\n"+launch+String.raw`

  console.log('begin',await page.evaluate(()=>{
    t.game=t.get('ZRSJZ_Game').Instance;t.player=t.game.GetPlayer(0);
    t.auto=cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_MapAutoShow'))[0];
    if(!t.auto)throw Error('MapAutoShow missing');
    t.auto.Stop();
    t.UI.Instance.CloseAllPanelsImmediately();t.game.GamePaused=false;t.player.BeHit=()=>{};
    const box=t.auto.Box.getComponent(t.get('ZRSJZ_Box'));
    t.box=box;
    box.ConfigureFixedLoot(['地图','切割刀','莲子']);
    t.enemy=t.auto.Enemy.getComponent(t.get('ZRSJZ_EnemyBase'));
    t.enemy._health=10000;
    const otherAmmo=JSON.stringify(t.Data.Instance.Player2AmmoID);
    if(!t.I.ApplyAmmoGift(['1级子弹','1级子弹','1级子弹'],t.get('ZRSJZ_AMMO_MAX_COUNT'),0))throw Error('duplicate ammo rejected');
    const ammo=t.I.GetAmmoIDs(0).filter(Boolean).map(id=>t.Data.Instance.PropData[id]);
    if(ammo.length!==3||ammo.some(p=>p.Name!=='1级子弹'||p.CurCount!==t.get('ZRSJZ_AMMO_MAX_COUNT'))||JSON.stringify(t.Data.Instance.Player2AmmoID)!==otherAmmo)throw Error('wrong duplicate ammo reward: '+JSON.stringify(ammo));
    t.visited=[];
    const move=t.auto.MoveTowards;
    t.auto.MoveTowards=function(...args){
      const reached=move.apply(this,args);
      if(this.Stage==='route'&&reached)t.visited.push(this._waypoints[this._waypointIndex].name);
      if(this.Stage==='route'&&t.player.AutoShowTarget)throw Error('started attacking before route complete');
      return reached;
    };
    t.before=new Set(Object.keys(t.Data.Instance.PropData));
    t.get('ZRSJZ_EventManager').Emit(t.get('ZRSJZ_MyEvent').ZRSJZ_MAP_AUTO_SHOW);
    if(t.auto.Stage!=='box')throw Error('event did not start: '+JSON.stringify({stage:t.auto.Stage,paused:t.game.GamePaused,finished:t.game.IsGameFinished,dead:t.player.IsDead,enemyDead:t.enemy.IsDead}));
    if(cc.Vec3.distance(t.player.node.worldPosition,t.auto.Point.worldPosition)>.1)throw Error('teleport failed');
    window.snap=()=>({stage:t.auto.Stage,p:[t.player.node.worldPosition.x,t.player.node.worldPosition.y],box:[box.node.worldPosition.x,box.node.worldPosition.y],paused:t.game.GamePaused,props:Object.entries(t.Data.Instance.PropData).filter(([id])=>!t.before.has(id)).map(([id,p])=>({id,name:p.Name,where:p.CurInventory,locked:p.IsSearchLocked}))});
    return {point:t.auto.Point.worldPosition,box:box.node.worldPosition,enemy:t.auto.Enemy.worldPosition,loot:box.LootProps};
  }));
  for(let i=0;i<25;i++){
    await page.waitForTimeout(2000);
    const snap=await page.evaluate(()=>window.snap());console.log('tick',JSON.stringify(snap));
    if(snap.stage==='search'&&snap.props.some(p=>p.where==='背包'))throw Error('collected before all search finished');
    if(snap.stage==='enemy'||snap.stage==='idle')break;
  }
  console.log('result',await page.evaluate(()=>{
    if(t.auto.Stage!=='enemy')throw Error('did not reach attack stage: '+JSON.stringify({...window.snap(),events:t.events,canvas:!!t.auto._inputCanvas}));
    const expected=t.auto.PlayerPoints.children.map(n=>n.name);
    if(JSON.stringify(t.visited)!==JSON.stringify(expected))throw Error('wrong route order: '+JSON.stringify(t.visited));
    console.log('route completed',JSON.stringify(t.visited));
    const props=Object.entries(t.Data.Instance.PropData).filter(([id])=>!t.before.has(id));
    if(props.some(([,p])=>p.CurInventory!==t.get('ZRSJZ_INVENTORY').背包||p.IsSearchLocked))throw Error('loot not collected');
    return window.snap();
  }));
  await page.waitForFunction(()=>t.enemy.Health<10000,null,{timeout:30000});
  console.log('attack',await page.evaluate(()=>({stage:t.auto.Stage,health:t.enemy.Health,target:t.player.AutoShowTarget?.name})));
  await page.screenshot({path:path.join(__dirname,'auto-show-debug.png')});
  await page.mouse.click(400,300);
  await page.waitForTimeout(200);
  console.log('cancel',await page.evaluate(()=>{
    if(t.auto.IsRunning||t.player.AutoShowTarget||t.player._moveX||t.player._moveY)throw Error('click did not cancel: '+JSON.stringify(window.snap()));
    return {stage:t.auto.Stage,move:[t.player._moveX,t.player._moveY]};
  }));
  await page.evaluate(()=>{
    t.box.ConfigureFixedLoot(['地图','莲子']);
    t.before=new Set(Object.keys(t.Data.Instance.PropData));
    t.auto.Begin();
  });
  await page.waitForFunction(()=>t.auto.Stage==='search'&&window.snap().props.some(p=>p.locked),null,{timeout:15000});
  await page.mouse.click(400,300);
  await page.waitForTimeout(1500);
  console.log('cancel-search',await page.evaluate(()=>{
    if(t.auto.IsRunning||window.snap().props.some(p=>p.where==='背包'))throw Error('search cancellation failed: '+JSON.stringify({...window.snap(),events:t.events,canvas:!!t.auto._inputCanvas}));
    return window.snap();
  }));
  await page.evaluate(()=>{
    t.auto.Begin();
    const panel=cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_GoodsPanel'))[0];
    const collect=panel.CollectForAutoShow;
    panel.CollectForAutoShow=async function(...args){
      const source=this._activeGoodsInventory,remove=source.RemoveProp;
      source.RemoveProp=async function(...removeArgs){
        await remove.apply(this,removeArgs);t.collectPending=true;
        await new Promise(r=>setTimeout(r,700));
      };
      try{return await collect.apply(this,args);}finally{source.RemoveProp=remove;}
    };
  });
  await page.waitForFunction(()=>t.collectPending,null,{timeout:15000});
  await page.mouse.click(400,300);
  await page.waitForTimeout(1200);
  console.log('cancel-transfer',await page.evaluate(()=>{
    if(t.auto.IsRunning||window.snap().props.some(p=>p.where==='背包'))throw Error('pending transfer not cancelled: '+JSON.stringify({...window.snap(),events:t.events,canvas:!!t.auto._inputCanvas}));
    return window.snap();
  }));
  console.log('errors',errors);
  if(errors.some(e=>/TypeError|Cannot read|Cannot set|自动展示.*失败/.test(e)))throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
`);










