const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Administrator/AppData/Local/Google/Chrome/Bin/chrome.exe'});try{
const context=await browser.newContext({viewport:{width:1560,height:720}});
await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
const page=await context.newPage();await page.goto('http://localhost:7456');
await page.waitForFunction(()=>typeof cc!=='undefined'&&cc.director?.getScene());
await page.evaluate(async()=>{const b=await new Promise((res,rej)=>cc.assetManager.loadBundle('73_ZRSJZ',(e,b)=>e?rej(e):res(b)));const s=await new Promise((res,rej)=>b.loadScene('ZRSJZ_Start',(e,s)=>e?rej(e):res(s)));cc.director.runSceneImmediate(s);});
await page.waitForTimeout(15000);
await page.evaluate(async()=>{const get=n=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[n])?.[n];window.test={UI:get('ZRSJZ_UIManager'),Data:get('ZRSJZ_GameData'),Service:get('ZRSJZ_AchievementService')};await new Promise((res,rej)=>cc.assetManager.loadBundle('73_ZRSJZ_DLC',(e,b)=>e?rej(e):res(b)));test.UI.ZRSJZ_DLC=true;test.UI.Instance.CloseAllPanelsImmediately();test.UI.Instance.ShowPanel('73_ZRSJZ/Prefabs/Panel/作弊界面');});
await page.waitForFunction(()=>test.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_CheatingPanel')).some(p=>p.node.activeInHierarchy));
console.log('cheat',await page.evaluate(()=>{const p=test.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_CheatingPanel')).find(p=>p.node.activeInHierarchy),n=p.node.getChildByPath('Panel/完成全部成就');if(!n)throw Error('Missing button');const gold=test.Data.Instance.Gold;p.OnButtonClick({getCurrentTarget:()=>n});if(test.Service.GetCompletionPercent()!==100||test.Data.Instance.Gold!==gold)throw Error('Cheat failed');return{completed:test.Service.GetCompletedCount(),noAutoGrant:true};}));
await page.screenshot({path:__dirname+'/achievement-cheat.png'});
await page.evaluate(()=>{test.UI.Instance.CloseAllPanelsImmediately();test.UI.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/成就界面');});
await page.waitForFunction(()=>test.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_AchievementPanel')).some(p=>p.node.activeInHierarchy));
await page.waitForTimeout(2000);
console.log('icons',await page.evaluate(()=>{const p=test.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_AchievementPanel')).find(p=>p.node.activeInHierarchy);test.panel=p;for(const item of test.Service.Items){const icon=p.content.getChildByName('成就-'+item.id).getChildByName('奖励图标').getComponent(cc.Sprite);if(!icon.spriteFrame)throw Error('Missing '+item.id);if(item.rewards[0].type==='道具'&&icon.spriteFrame.name!==item.rewards[0].name)throw Error('Wrong '+item.id);}p.scroll.scrollToBottom(0);return test.Service.Items.length;}));
await page.screenshot({path:__dirname+'/achievement-last-reward.png'});
await page.evaluate(()=>{test.beforeFragments=test.Data.Instance.HeroFragments||0;test.panel.content.getChildByName('成就-枪火洗礼').getChildByName('领取奖励').emit(cc.Node.EventType.TOUCH_END);});
await page.waitForFunction(()=>test.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_GetAwardPanel')).some(p=>p.node.activeInHierarchy&&p.Award.children.length===p._awards.length));
console.log('popup',await page.evaluate(()=>{const p=test.UI.Instance.node.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_GetAwardPanel')).find(p=>p.node.activeInHierarchy);if(!p._displayOnly||p._awards.length!==1||p._awards[0].TaskAwardName!=='英雄碎片')throw Error('Popup mismatch');if(test.Data.Instance.HeroFragments!==test.beforeFragments+5)throw Error('Fragment credit incorrect');const gold=test.Data.Instance.Gold;p.OnButtonClick({getCurrentTarget:()=>({name:'Mask'})});if(gold!==test.Data.Instance.Gold||test.Data.Instance.HeroFragments!==test.beforeFragments+5)throw Error('Duplicate grant');return{displayOnly:true,fragments:5,noDuplicate:true};}));
console.log('cosmeticFit',await page.evaluate(async()=>{
 const pool=Array.from(System.entries()).map(([,m])=>m).find(m=>m.ZRSJZ_PoolManager).ZRSJZ_PoolManager;
 const node=await pool.Instance.GetNode('Prefabs/UI/TaskAward');node.parent=test.panel.node;
 const award=node.getComponent(cc.js.getClassByName('ZRSJZ_TaskAward'));
 const results=[];
 // Exercise wide title and square avatar art on the same pooled reward node.
 for(const [name,bundle,path] of [['称号·超凡勇士','73_ZRSJZ_DLC','Sprites/称号弹窗/称号/超凡勇士/spriteFrame'],['头像框·勇者','73_ZRSJZ','Sprites/主页/主页头像框/勇者/spriteFrame']]){
  const sf=await new Promise((res,rej)=>cc.assetManager.getBundle(bundle).load(path,cc.SpriteFrame,(e,s)=>e?rej(e):res(s)));
  award.Init(name,1,name,sf);
  const icon=award.Icon.node,size=icon._uiProps.uiTransformComp;
  if(award.Icon.sizeMode!==cc.Sprite.SizeMode.TRIMMED||Math.abs(icon.scale.x-icon.scale.y)>1e-6||size.width*icon.scale.x>110.01||size.height*icon.scale.y>110.01)throw Error('Cosmetic overflow '+name);
  results.push({name,width:size.width*icon.scale.x,height:size.height*icon.scale.y});
 }
 pool.Instance.PutNode(node);return results;
}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
