const fs = require('fs');
const boot = fs.readFileSync(__dirname + '/preview-enhancement-v2.cjs', 'utf8');
const prefix = boot.slice(0, boot.indexOf("  console.log('open',"));
eval(prefix + String.raw`
 await page.evaluate(()=>{
  const get=n=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[n])?.[n];
  window.t={get,Data:get('ZRSJZ_GameData'),UI:get('ZRSJZ_UIManager'),A:get('ZRSJZ_ActionService')};
  window.check=(v,m)=>{if(!v)throw Error(m)};
  t.UI.ZRSJZ_DLC=true;t.UI.Instance.CloseAllPanelsImmediately();
  t.Data.Instance.CurModel='2p';cc.director.getScene().getComponentInChildren(t.get('ZRSJZ_Start')).ModelSwitch();
  t.Data.Instance.EquippedActions=['浪子踢球','狗熊哆嗦毛','闪身步'];t.A.RefreshUnlocks();
  t.get('ZRSJZ_EventManager').Emit(t.get('ZRSJZ_MyEvent').ZRSJZ_LOADED_DLC);
 });
 await page.waitForFunction(()=>cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_PlayerMain')).filter(p=>p.enabledInHierarchy).length===2 && cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_PlayerMain')).filter(p=>p.enabledInHierarchy).every(p=>p.PlayerSkeleton.Skeleton?.findAnimation('闪身步')),{timeout:30000});
 await page.waitForTimeout(2500);
 for(const [index,animation] of [[0,'浪子踢球'],[1,'哆嗦毛'],[2,'闪身步']]){
  await page.evaluate(({index,animation})=>{
   t.home=cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_PlayerMain')).filter(p=>p.enabledInHierarchy);
   const button=cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_ActionButton')).find(b=>b.enabledInHierarchy);
   check(button,'Home action button missing');button.opened=true;button.animating=false;button.Select(index);
   t.home.forEach(p=>check(p.PlayerSkeleton.Skeleton.getCurrent(0)?.animation?.name===animation,'Home wrong animation'));
  },{index,animation});
  await page.waitForTimeout(300);
  await page.evaluate(()=>t.home.forEach(p=>check(p.PlayerSkeleton.IsPerformingAction,'Home update interrupted action')));
  await page.waitForFunction(()=>t.home.every(p=>!p.PlayerSkeleton.IsPerformingAction),null,{timeout:30000});
  console.log('PASS home action',animation);
 }
 await page.evaluate(async()=>{
  t.A.Play(0); t.get('ZRSJZ_EventManager').Emit(t.get('ZRSJZ_MyEvent').ZRSJZ_PLAYER_MOVE,1,0,1);
  check(t.home.every(p=>!p.PlayerSkeleton.IsPerformingAction),'Home movement must stop both actions');
  t.get('ZRSJZ_EventManager').Emit(t.get('ZRSJZ_MyEvent').ZRSJZ_PLAYER_MOVE,0,0,0);
  t.Data.Instance.CurMap='五号小镇_机密行动';
  const inv=t.get('ZRSJZ_InventoryService');inv.GetBattleEntryError=()=>'';
  for(let i=0;i<2;i++)inv.ApplyAssistFightingGift(t.get('ZRSJZ_ASSIST_FIGHTING_GIFT_CONFIG').get(1),i);
  const b=cc.assetManager.getBundle('73_ZRSJZ');const s=await new Promise((r,j)=>b.loadScene('ZRSJZ_Game',(e,s)=>e?j(e):r(s)));cc.director.runSceneImmediate(s);
 });
 await page.waitForFunction(()=>t.get('ZRSJZ_Game').Instance?.Players.length===2 && t.get('ZRSJZ_Game').Instance.Players.every(p=>p.PlayerSkeleton?.Skeleton?.findAnimation('闪身步')),null,{timeout:60000});
 await page.waitForTimeout(2000);
 await page.evaluate(()=>{
  t.game=t.get('ZRSJZ_Game').Instance;t.UI.Instance.CloseAllPanelsImmediately();t.game.GamePaused=false;
  t.players=t.game.Players;t.players.forEach(p=>{p._isStop=false;p.BeHit=()=>{};p.FindTarget=()=>{p.TargetEnemy=null;};});
  cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_EnemyBase')).forEach(e=>{e.enabled=false;e.StopMoving();});
  window.weaponVisible=p=>['dao',...Array.from(t.get('ZRSJZ_WEAPONRY_TYPE').keys())].some(n=>!!p.PlayerSkeleton.Skeleton.findSlot(n)?.getAttachment());
  console.log('initial weapon visibility',t.players.map(p=>({index:p.PlayerIndex,type:p.WeaponType,visible:weaponVisible(p)})));
 });
 await page.waitForFunction(()=>cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_ActionButton')).filter(b=>b.enabledInHierarchy).length===2,null,{timeout:15000});
 for(const index of [0,1,2]){
  await page.evaluate(index=>{
   const buttons=cc.director.getScene().getComponentsInChildren(t.get('ZRSJZ_ActionButton')).filter(b=>b.enabledInHierarchy);
   check(new Set(buttons.map(b=>b.PlayerIndex)).size===2,'Both joystick buttons target same player');
   const b=buttons.find(b=>b.PlayerIndex===1); b.opened=true;b.animating=false;b.Select(index);
   check(!t.players[0].IsPerformingAction&&t.players[1].IsPerformingAction,'P2 button must only control P2');
  },index);
  await page.waitForTimeout(250);
  await page.evaluate(()=>{
   check(t.players[1].IsPerformingAction,'Battle update interrupted action');
   check(!weaponVisible(t.players[1]),'Weapon visible during action');
   t.players[0].Move(1,0,1,0);check(t.players[1].IsPerformingAction,'P1 movement interrupted P2');t.players[0].Move(0,0,0,0);
   t.players[1].Move(1,0,1,1);check(!t.players[1].IsPerformingAction,'Own movement did not stop action');t.players[1].Move(0,0,0,1);
   check(weaponVisible(t.players[1]),'Weapon not restored');
  });
 }
 await page.evaluate(()=>{t.A.Play(2,0);check(t.players[0].IsPerformingAction,'P1 action rejected');});
 await page.waitForFunction(()=>!t.players[0].IsPerformingAction,null,{timeout:30000});
 await page.evaluate(()=>{
  check(weaponVisible(t.players[0]),'Natural completion did not restore weapon');
  t.A.Play(0,0);t.players[0].Attack(true,0);check(!t.players[0].IsPerformingAction,'Attack did not interrupt');t.players[0].Attack(false,0);
  t.A.Play(1,0);t.A.Play(2,0);check(t.players[0].PlayerSkeleton.Skeleton.getCurrent(0).animation.name==='闪身步','Repeated action selected wrong track');t.players[0].StopAction();
  t.A.Play(0,0);t.players[0].SwitchWeapon('枪',0);check(!t.players[0].IsPerformingAction,'Switch did not interrupt');
  t.A.Play(1,0);t.players[0].Reload(0,false,0);check(!t.players[0].IsPerformingAction,'Reload did not interrupt');t.players[0].Reload(0,true,0);
  t.A.Play(0,0);t.A.Play(1,1);
  t.get('ZRSJZ_EventManager').Emit(t.get('ZRSJZ_MyEvent').ZRSJZ_PLAYER_MOVE,1,0,1,0);
  check(!t.players[0].IsPerformingAction && t.players[1].IsPerformingAction,'Broadcast input crossed player ownership');
  t.players[0].Move(0,0,0,0);t.players[1].StopAction();
  t.A.Play(2,0);t.players[0].Slide(0);check(!t.players[0].IsPerformingAction,'Slide did not interrupt');
 });
 console.log('PASS: both home players, three animations, natural completion, joystick ownership, weapon hide/restore, movement/attack interruption, repeated selection');
 const relevant=errors.filter(e=>!e.includes('net::ERR_FAILED')&&!e.includes('联系方式QQ'));
 console.log('runtime errors',relevant);if(relevant.length)throw Error(relevant.join('\n'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
