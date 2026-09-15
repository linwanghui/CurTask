const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe'});
 const context=await browser.newContext({viewport:{width:1560,height:720}});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'||new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300));});
 await page.goto('http://localhost:7456',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(18000);
 await page.mouse.click(1010,615);
 await page.waitForTimeout(10000);
 await page.evaluate(async()=>{
  const bundle=await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ',(e,b)=>e?reject(e):resolve(b)));
  const scene=await new Promise((resolve,reject)=>bundle.loadScene('ZRSJZ_Start',(e,s)=>e?reject(e):resolve(s)));
  cc.director.runSceneImmediate(scene);
 });
 await page.waitForTimeout(6000);
 console.log(await page.evaluate(()=>{
  const modules=Array.from(System.entries());
  const get=name=>modules.map(([,m])=>m).find(m=>m[name])?.[name];
  const UI=get('ZRSJZ_UIManager'),Data=get('ZRSJZ_GameData');
  window.testUpgrade={UI,Data,U:get('ZRSJZ_EnhancementService'),I:get('ZRSJZ_InventoryService')};
  if(UI?.Instance){UI.Instance.CloseAllPanelsImmediately();UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/强化界面');}
  return {ui:!!UI,instance:!!UI?.Instance,data:!!Data,modules:modules.length,scene:cc.director.getScene()?.name,
   banner:modules.filter(([url])=>url.includes('Banner')).map(([url,m])=>({url,keys:Object.keys(m)}))};
 }));
 await page.waitForTimeout(6000);
 await page.screenshot({path:path.join(__dirname,'preview-initial.png')});
 console.log('interaction',await page.evaluate(()=>{
  const t=window.testUpgrade;
  t.panel=t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_UpgradePanel'))[0];
  for(const m of t.U.GetNode('main_1').Materials)t.I.AddPropByName(m.PropName,m.Count);
  t.Data.Instance.Gold=100000;
  return {panel:!!t.panel,level:t.U.Level};
 }));
 await page.waitForTimeout(700);
 await page.mouse.click(1280,570);
 await page.waitForTimeout(700);
 console.log('purchase',await page.evaluate(()=>{
  const {U,Data}=testUpgrade;if(U.Level!==1||Data.Instance.Gold!==87500)throw Error('First level purchase failed: '+U.Level+' gold '+Data.Instance.Gold);
  return {level:U.Level,gold:Data.Instance.Gold,skillDamage:U.GetSkillDamage(100)};
 }));
 await page.evaluate(()=>{
  const {U,Data,I,panel}=testUpgrade;
  Data.Instance.EnhancementLevel=4;Data.Instance.Gold=1000000;
  for(const id of ['main_5','special_5'])for(const m of U.GetNode(id).Materials)I.AddPropByName(m.PropName,m.Count);
  panel.Show();
 });
 await page.waitForTimeout(800);
 await page.mouse.click(1280,570);
 await page.waitForTimeout(500);
 await page.evaluate(()=>{
  const {U,panel}=testUpgrade;if(U.Level!==5)throw Error('Level 5 purchase failed');
  panel.node.getChildByPath('Panel/Tree/Scroll/View/Content/Row_5/special_5').emit('click');
 });
 await page.waitForTimeout(300);
 await page.mouse.click(1280,570);
 await page.waitForTimeout(500);
 console.log('milestone',await page.evaluate(()=>{
  const {U,Data}=testUpgrade;if(U.GetBonus('大红掉落概率')!==2)throw Error('Special upgrade failed');
  const content=testUpgrade.panel.node.getChildByPath('Panel/Tree/Scroll/View/Content');
  const dotted4=content.getChildByPath('Row_4/Dotted').getComponent(cc.Sprite).spriteFrame?.name;
  const dotted5=content.getChildByPath('Row_5/Dotted').getComponent(cc.Sprite).spriteFrame?.name;
  if(dotted4!=='虚线1'||dotted5!=='虚线')throw Error(`Dotted highlight is off by one: row4=${dotted4}, row5=${dotted5}`);
  return {level:U.Level,specials:Data.Instance.EnhancementSpecials,redDrop:U.GetBonus('大红掉落概率'),dotted4,dotted5};
 }));
 await page.waitForTimeout(2500);
 await page.screenshot({path:path.join(__dirname,'preview-milestone.png')});
 await page.mouse.move(820,370);await page.mouse.wheel(0,-800);await page.waitForTimeout(700);
 console.log('scroll',await page.evaluate(()=>testUpgrade.panel.node.getChildByPath('Panel/Tree/Scroll').getComponent(cc.ScrollView).getScrollOffset().y));
 await page.screenshot({path:path.join(__dirname,'preview-scroll.png')});
 fs.writeFileSync(path.join(__dirname,'preview-errors.json'),JSON.stringify(errors,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
