const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe'});
 try {
 const context=await browser.newContext({viewport:{width:1560,height:720}});
 await context.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300))});
 await page.goto('http://localhost:7456',{waitUntil:'domcontentloaded'});await page.waitForTimeout(18000);await page.mouse.click(1010,615);await page.waitForTimeout(10000);
 await page.evaluate(async()=>{const b=await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ',(e,b)=>e?reject(e):resolve(b)));const s=await new Promise((resolve,reject)=>b.loadScene('ZRSJZ_Start',(e,s)=>e?reject(e):resolve(s)));cc.director.runSceneImmediate(s)});
 await page.waitForTimeout(6000);
 console.log('core',await page.evaluate(async()=>{
  const modules=Array.from(System.entries()),get=name=>modules.map(([,m])=>m).find(m=>m[name])?.[name];
  window.t={UI:get('ZRSJZ_UIManager'),Data:get('ZRSJZ_GameData'),A:get('ZRSJZ_AccountService'),F:get('ZRSJZ_FragmentService')};
  t.UI.ZRSJZ_DLC=false;t.Data.Instance.HeroFragments=100;t.UI.Instance.CloseAllPanelsImmediately();t.UI.Instance.ShowPanel('73_ZRSJZ/Prefabs/Panel/角色界面');
  const art=await t.UI.Instance.GetPropUI('英雄碎片');if(!art)throw Error('Hero fragment icon missing without DLC');return{dlc:t.UI.ZRSJZ_DLC,art:art.name,version:t.Data.Instance.Versions};
 }));
 await page.waitForTimeout(5000);
 await page.evaluate(()=>{t.role=t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_RolePanel'))[0];if(!t.role)throw Error('role panel missing');const n=t.role.node.getChildByPath('Panel/英雄碎片/Num');if(n.getComponent(cc.Label).string!=='100')throw Error('Balance incorrect')});
 await page.screenshot({path:path.join(__dirname,'hero-panel.png')});
 await page.evaluate(()=>t.role.node.getChildByPath('Panel/免费获取英雄碎片').emit('click'));
 await page.waitForTimeout(1800);
console.log('popup',await page.evaluate(()=>{t.popup=t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_RoleFragmentPanel'))[0];if(!t.popup?.node.activeInHierarchy)throw Error('hero popup missing');const button=t.popup.node.getChildByPath('Panel/解锁').getComponent(cc.Button);if(button.clickEvents[0]?.handler!=='OnButtonClick')throw Error('reward event target invalid');return{popup:t.popup.node.name,handler:button.clickEvents[0].handler}}));
 await page.screenshot({path:path.join(__dirname,'hero-popup.png')});
 // Trigger the serialized button event with an isolated ad stub; no actual ad/network request.
console.log('reward',await page.evaluate(()=>{const banner=Array.from(System.entries()).flatMap(([,m])=>Object.values(m)).find(v=>typeof v==='function'&&v.prototype?.ShowVideoAd&&'Instance' in v);if(!banner)throw Error('Banner module missing');const original=banner.Instance.ShowVideoAd;banner.Instance.ShowVideoAd=cb=>{cb();cb()};try{const node=t.popup.node.getChildByPath('Panel/解锁');node.getComponent(cc.Button).clickEvents[0].emit([{getCurrentTarget:()=>node}]);if(t.F.GetCount('英雄碎片')!==110)throw Error('Serialized claim button failed/duplicated')}finally{banner.Instance.ShowVideoAd=original}return{balance:t.F.GetCount('英雄碎片'),remaining:t.F.GetRemaining('英雄碎片')}}));
 await page.evaluate(()=>{t.UI.Instance.HidePanel('73_ZRSJZ/Prefabs/Panel/英雄碎片弹窗');t.UI.ZRSJZ_DLC=true;});
 await page.evaluate(async()=>{await new Promise((resolve,reject)=>cc.assetManager.loadBundle('73_ZRSJZ_DLC',(e,b)=>e?reject(e):resolve(b)));t.role.ShowRoleDesc('灼戈')});
 await page.waitForTimeout(2500);
 console.log('unlock',await page.evaluate(()=>{const node=t.role.node.getChildByPath('Panel/状态/金币购买'),button=node.getComponent(cc.Button);button.clickEvents[0].emit([{getCurrentTarget:()=>node}]);if(!t.Data.Instance.HaveRole.includes('灼戈')||t.F.GetCount('英雄碎片')!==60)throw Error('Role unlock failed');t.role.SwitchSkin(1);button.clickEvents[0].emit([{getCurrentTarget:()=>node}]);if(!t.Data.Instance.HaveSkin.includes('星栗')||t.F.GetCount('英雄碎片')!==40)throw Error('Skin unlock failed');return{balance:t.F.GetCount('英雄碎片'),roles:t.Data.Instance.HaveRole,skins:t.Data.Instance.HaveSkin}}));
 await page.waitForTimeout(1500);await page.screenshot({path:path.join(__dirname,'hero-unlocked.png')});
 await page.evaluate(()=>{t.UI.Instance.CloseAllPanelsImmediately();t.UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/宠物界面')});await page.waitForTimeout(4500);
 const first=await page.evaluate(()=>{t.pet=t.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_PetPanel'))[0];if(!t.pet)throw Error('Pet panel missing');t.glow=t.pet.node.getChildByPath('Panel/免费获取宠物碎片/碎片背光');return t.glow.angle});await page.waitForTimeout(1200);
 console.log('rotation',await page.evaluate(first=>{const angle=t.glow.angle;if(Math.abs(angle-first)<15)throw Error('Pet glow not rotating');return{first,angle}},first));
 await page.screenshot({path:path.join(__dirname,'pet-glow.png')});
 fs.writeFileSync(path.join(__dirname,'fragment-preview-errors.json'),JSON.stringify(errors,null,2));
 console.log('Preview completed; errors:',errors);
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
