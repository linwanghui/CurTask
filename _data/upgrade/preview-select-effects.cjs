const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe'});
 try{
  const context=await browser.newContext({viewport:{width:1560,height:720}});
  await context.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300))});
  await page.goto('http://localhost:7456',{waitUntil:'domcontentloaded'});await page.waitForTimeout(18000);await page.mouse.click(1010,615);await page.waitForTimeout(10000);
  await page.evaluate(async()=>{
   const core=await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ',(e,b)=>e?reject(e):resolve(b)));
   const scene=await new Promise((resolve,reject)=>core.loadScene('ZRSJZ_Start',(e,s)=>e?reject(e):resolve(s)));cc.director.runSceneImmediate(scene);
   await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ_DLC',(e,b)=>e?reject(e):resolve(b)));
  });
  await page.waitForTimeout(6000);

  await page.evaluate(()=>{
   const get=name=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[name])?.[name];
   window.t={UI:get('ZRSJZ_UIManager')};
   t.UI.Instance.CloseAllPanelsImmediately();t.UI.Instance.ShowPanel('73_ZRSJZ/Prefabs/Panel/选关界面');
  });
  await page.waitForTimeout(2500);
  console.log('effects',await page.evaluate(()=>{
   const panel=t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_SelectPanel'))[0];
   t.panel=panel;
   if(panel._mapEffects.length!==3)throw Error('missing map effects');
   panel.enabled=false;panel._mapEffectTime=0;panel.update(.8);
   const positions=panel._mapEffects.map(e=>({name:e.node.name,y:e.node.position.y,origin:e.origin.y}));
   if(positions.some(e=>Math.abs(e.y-e.origin)<.1))throw Error('map did not float');
   const node=panel._mapEffects[1].node;panel.OnMapSelected({getCurrentTarget:()=>node});
   if(!panel._mapEffects[1].ripple.active||panel._mapEffects[0].ripple.active)throw Error('selection effect switch failed');
   panel.update(.25);
   if(panel._mapEffects[1].ripple.scale.x<=1)throw Error('no expanding ripple');
   panel.update(.5);
   if(panel._mapEffects[1].ripple.active)throw Error('ripple not released');
   panel.onDisable();
   if(panel._mapEffects.some(e=>!e.node.position.equals(e.origin)))throw Error('position not reset');
   panel.enabled=true;panel.Show();
   if(panel._mapEffects.length!==3||!panel._mapEffects[1].ripple.active)throw Error('reopen failed');
   return positions;
  }));
  await page.evaluate(()=>{t.UI.Instance.CloseAllPanelsImmediately();t.panel.Show();});
  await page.waitForTimeout(450);
  await page.screenshot({path:path.join(__dirname,'select-map-effects.png')});
  console.log('errors',errors);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
