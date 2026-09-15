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
  console.log('open',await page.evaluate(()=>{
   const modules=Array.from(System.entries()),get=name=>modules.map(([,m])=>m).find(m=>m[name])?.[name];
   window.t={UI:get('ZRSJZ_UIManager'),Data:get('ZRSJZ_GameData'),U:get('ZRSJZ_EnhancementService'),C:get('ZRSJZ_ENHANCEMENT_NODES')};
   t.UI.ZRSJZ_DLC=true;t.UI.Instance.CloseAllPanelsImmediately();t.UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/强化界面');
   return{ui:!!t.UI.Instance,nodes:t.C?.length,version:t.Data.Instance.Versions};
  }));
  await page.waitForTimeout(5000);
  await page.evaluate(()=>{t.UI.Instance.CloseAllPanelsImmediately();t.UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/强化界面')});
  await page.waitForTimeout(1800);
  console.log('ui',await page.evaluate(()=>{
   t.panel=t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_UpgradePanel'))[0];if(!t.panel)throw Error('upgrade panel missing');
   const desc=t.panel.node.getChildByPath('Panel/Desc'),materials=[0,1].map(i=>{const h=desc.getChildByName('Material'+i),n=h.getChildByName('TaskAward'+i),a=n?.getComponent(cc.js.getClassByName('ZRSJZ_TaskAward'));return{holderSprite:h.getComponent(cc.Sprite).enabled,award:!!a,name:n?.getChildByName('Name')?.getComponent(cc.Label)?.string,count:n?.getChildByName('Count')?.getComponent(cc.Label)?.string}});
   const gray=t.panel.node.getChildByPath('Panel/Tree/Scroll/View/Content/Row_50/main_50/GrayIcon').getComponent(cc.Sprite);
   if(materials.some(x=>!x.award||x.holderSprite||!x.name||!x.count?.includes('/')))throw Error('Material TaskAward not ready: '+JSON.stringify(materials));
   if(gray.sizeMode!==cc.Sprite.SizeMode.TRIMMED)throw Error('GrayIcon not trimmed');
   return{materials,graySizeMode:gray.sizeMode};
  }));
  await page.screenshot({path:path.join(__dirname,'enhancement-taskaward.png')});
  console.log('totals',await page.evaluate(()=>{
   t.Data.Instance.EnhancementLevel=50;t.Data.Instance.EnhancementSpecials=t.C.filter(n=>n.Special).map(n=>n.ID);t.panel.Show();
   const values=Object.fromEntries(['攻击','生命','防御','大红掉落概率'].map(k=>[k,t.U.GetBonus(k)]));
   if(JSON.stringify(values)!==JSON.stringify({攻击:20,生命:30,防御:20,大红掉落概率:10}))throw Error('wrong totals '+JSON.stringify(values));
   const base=.1,final=base*(1+values.大红掉落概率/100);if(Math.abs(final-.11)>1e-9)throw Error('red probability must be 11%');
   const upgrade=t.panel.node.getChildByPath('Panel/Desc/Upgrade');if(upgrade.getComponent(cc.Button).interactable||upgrade.getComponent(cc.Sprite).enabled)throw Error('disabled button image must be hidden');
   return{values,redFrom10Percent:final,disabledButtonImage:upgrade.getComponent(cc.Sprite).enabled};
  }));
  await page.waitForTimeout(800);await page.screenshot({path:path.join(__dirname,'enhancement-final-totals.png')});
  fs.writeFileSync(path.join(__dirname,'enhancement-v2-errors.json'),JSON.stringify(errors,null,2));console.log('errors',errors);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
