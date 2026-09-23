const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe'});
 try{
 const context=await browser.newContext({viewport:{width:1560,height:720}});
 await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,400));});
 await page.goto('http://localhost:7456',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof cc!=='undefined'&&cc.director?.getScene(),{timeout:45000});
 await page.evaluate(async()=>{const b=await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ',(e,b)=>e?reject(e):resolve(b)));const s=await new Promise((resolve,reject)=>b.loadScene('ZRSJZ_Start',(e,s)=>e?reject(e):resolve(s)));cc.director.runSceneImmediate(s);});
 await page.waitForTimeout(15000);
 await page.evaluate(async()=>{
  const get=name=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[name])?.[name];
  window.bp={UI:get('ZRSJZ_UIManager'),Data:get('ZRSJZ_GameData'),Service:get('ZRSJZ_BattlePassService')};
  bp.UI.ZRSJZ_DLC=true;
  await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ_DLC',(e,b)=>e?reject(e):resolve(b)));
  bp.UI.ZRSJZ_DLC=true;
  bp.UI.Instance.CloseAllPanelsImmediately();bp.UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/战令界面');
 });
 try{await page.waitForFunction(()=>{const k=cc.js.getClassByName('ZRSJZ_BattlePassPanel');return k&&bp.UI.Instance.node.getComponentsInChildren(k).some(p=>p.node.activeInHierarchy);},null,{timeout:30000});}catch(e){console.log('errors',errors);console.log(await page.evaluate(()=>({scene:cc.director.getScene().name,children:cc.director.getScene().children.map(n=>n.name),ui:bp.UI.Instance.node.name,panels:bp.UI.Instance.node.children.map(n=>n.name)})));await page.screenshot({path:path.join(__dirname,'battlepass-load-failure.png')});throw e;}
 await page.waitForTimeout(2500);
 // Hide the framework's first-run overlay only in this isolated test context.
 await page.evaluate(()=>{const privacy=cc.js.getClassByName('PrivacyPanel');if(privacy)for(const p of cc.director.getScene().getComponentsInChildren(privacy))p.node.active=false;});
 console.log('icons',await page.evaluate(()=>{
  bp.panel=bp.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_BattlePassPanel'))[0];
  const p=bp.panel;let icons=[];
  for(let track of ['normal','advanced'])for(let r of bp.Service.Rewards(track)){
   let frame=p.node.getChildByPath(`Panel/奖励列表/View/Content/等级${r.level}/${track}/图标`).getComponent(cc.Sprite).spriteFrame;
   if(!frame)throw Error('Missing reward icon '+r.name);
   if(frame.name!==r.name&&r.type!=='gold'&&r.type!=='weaponSkin')throw Error(`Wrong icon ${r.name}: ${frame.name}`);
   icons.push(frame.name);
  }
  const bg=p.node.getChildByName('背景'),sp=bg.getComponent(cc.Sprite);return {count:icons.length,unique:new Set(icons).size,background:{size:bg._uiProps.uiTransformComp?.contentSize,rect:sp.spriteFrame.rect,scale:bg.scale},root:p.node._uiProps.uiTransformComp?.contentSize};
 }));
 await page.screenshot({path:path.join(__dirname,'battlepass-rewards.png')});
 console.log('finalRewards',await page.evaluate(async()=>{
  const p=bp.panel;
  p.scroll.scrollToRight(0);p.milestone=50;p.RefreshSpecial();
  await new Promise(r=>setTimeout(r,1000));
  const result={};
  for(const track of ['normal','advanced']){
   const n=p.node.getChildByPath('Panel/特殊奖励/'+track),icon=n.getChildByName('图标'),frame=icon.getComponent(cc.Sprite).spriteFrame;
   if(!frame)throw Error('Final reward missing '+track);
   const bottom=n.getChildByName('图标底')._uiProps.uiTransformComp;
   if(frame.rect.width*icon.scale.x>bottom.width-10+0.01||frame.rect.height*icon.scale.y>bottom.height-10+0.01)throw Error('Icon overflows '+track);
   result[track]={name:n.getChildByName('名称').getComponent(cc.Label).string,icon:frame.name,scale:icon.scale.x};
  }
  return result;
 }));
 await page.screenshot({path:path.join(__dirname,'battlepass-final-rewards.png')});
 console.log('buttonFeedback',await page.evaluate(()=>{
  const get=name=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[name])?.[name];
  const audio=get('ZRSJZ_AudioManager').Instance,original=audio.PlaySound;let calls=0;
  audio.PlaySound=function(name,...args){if(name==='点击')calls++;return original.call(this,name,...args);};
  const n=bp.panel.node.getChildByPath('Panel/战令任务'),b=n.getComponent(cc.Button);
  n.emit(cc.Button.EventType.CLICK);
  audio.PlaySound=original;
  if(calls!==1)throw Error('Expected one click sound, got '+calls);
  if(b.transition!==cc.Button.Transition.SCALE||b.zoomScale!==0.92)throw Error('Missing scale feedback');
  return{soundCalls:calls,zoomScale:b.zoomScale,duration:b.duration};
 }));
 await page.evaluate(()=>bp.panel.SwitchPage('tasks'));await page.waitForTimeout(300);
 await page.screenshot({path:path.join(__dirname,'battlepass-tasks.png')});
 console.log('claim',await page.evaluate(()=>{
  const s=bp.Service,p=bp.panel,t=p.GetDisplayTasks('daily')[0];s.Record(t.metric,t.target);p.Refresh(true);
  p.node.getChildByPath('Panel/任务内容/daily/View/Content/d_login/领取').emit(cc.Button.EventType.CLICK);
  const sorted=p.GetDisplayTasks('daily');if(sorted[sorted.length-1].id!==t.id)throw Error('Claimed task did not move to bottom');
  const bar=p.node.getChildByPath('Panel/任务内容/daily/View/Content/d_extract/进度条/填充').getComponent(cc.Sprite);
  if(bar.fillRange!==1)throw Error('Claimed progress bar incorrect');
  return{claimed:t.id,bottom:sorted[sorted.length-1].id};
 }));
 await page.screenshot({path:path.join(__dirname,'battlepass-claimed.png')});
 console.log('rewardPopup',await page.evaluate(async()=>{
  const get=name=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[name])?.[name];
  const p=bp.panel,d=bp.Data.Instance,s=bp.Service;
  p.SwitchPage('rewards');d.BattlePass.exp=5000;d.BattlePass.advancedUnlocked=true;p.Refresh(true);
  const popup=()=>bp.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_GetAwardPanel')).find(p=>p.node.activeInHierarchy);
  const wait=async()=>{for(let i=0;i<100;i++){const a=popup();if(a&&a.Award.children.length===a._awards.length)return a;await new Promise(r=>setTimeout(r,100));}throw Error('Reward popup did not finish loading');};
  const before=d.Gold;
  p.Claim(1,'normal');let a=await wait();
  if(!a._displayOnly||a._awards[0].TaskAwardName!=='钞票')throw Error('Wrong money popup');
  const item=a.Award.children[0].getComponent(cc.js.getClassByName('ZRSJZ_TaskAward'));
  if(item.Count.string!=='1万')throw Error('Money unit incorrect '+item.Count.string);
  if(d.Gold!==before+10000)throw Error('Money not granted exactly once');
  a.OnButtonClick({getCurrentTarget:()=>({name:'Mask'})});
  if(d.Gold!==before+10000)throw Error('Popup granted money twice');
  p.Claim(10,'normal');a=await wait();await new Promise(r=>setTimeout(r,500));
  if(!a.Award.children[0].getComponent(cc.js.getClassByName('ZRSJZ_TaskAward')).Icon.spriteFrame)throw Error('Missing weapon skin popup icon');
  a.OnButtonClick({getCurrentTarget:()=>({name:'Mask'})});
  p.Claim(50,'advanced');a=await wait();
  const icon=a.Award.children[0].getComponent(cc.js.getClassByName('ZRSJZ_TaskAward')).Icon.spriteFrame;
  const rewardIcon=p.node.getChildByPath('Panel/资源/黯祁').getComponent(cc.Sprite).spriteFrame;
  if(icon!==rewardIcon||!d.HaveSkin.includes('黯祁'))throw Error('Hero reward icon/ownership mismatch');
  return{goldText:'1万',goldGrantedOnce:true,weaponSkinIcon:true,heroSkin:'黯祁',displayOnly:a._displayOnly};
 }));
 await page.screenshot({path:path.join(__dirname,'battlepass-award-popup.png')});
 console.log('pageErrors',JSON.stringify(errors));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
