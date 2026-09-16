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

  console.log('boxes',await page.evaluate(async(paths)=>{
   const bundle=cc.assetManager.getBundle('73_ZRSJZ_DLC');const C=cc.js.getClassByName('ZRSJZ_Box');
   const get=name=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[name])?.[name];
   const map=get('ZRSJZ_MAP_CONFIG').get('沙漠古迹_机密行动');const results=[];
   for(const path of paths){
    const prefab=await new Promise((resolve,reject)=>bundle.load(path,cc.Prefab,(e,p)=>e?reject(e):resolve(p)));
    const node=cc.instantiate(prefab),box=node.getComponent(C);
    if(!box||box.ThemeIconSF.length!==2||box.ThemeCheckedSF.length!==2)throw Error('missing frame refs '+path);
    box.Configure(map.MapBox.get('小纸箱'),map.MapProp);
    if(box.Icon.spriteFrame!==box.ThemeIconSF[0])throw Error('wrong closed skin '+path);
    box.Check();if(!box.Checked.node.active)throw Error('check failed');
    if(!box.Open()||box.Icon.spriteFrame!==box.ThemeIconSF[1]||box.Checked.spriteFrame!==box.ThemeCheckedSF[1])throw Error('open failed '+path);
    box.CheckCancel();if(box.Checked.node.active)throw Error('cancel failed');
    if(box.Open())throw Error('opened twice');
    box.Configure(map.MapBox.get('小纸箱'),map.MapProp);
    if(box.Icon.spriteFrame!==box.ThemeIconSF[0]||box.Checked.node.active)throw Error('pool reset failed');
    results.push({name:node.name,loot:box.LootProps.length,frames:box.ThemeIconSF.concat(box.ThemeCheckedSF).map(f=>f.name),trim:box.Icon.trim});
    node.destroy();
   }return results;
  },["Prefabs/Unit/箱子/沙漠_土罐","Prefabs/Unit/箱子/沙漠_宝箱1","Prefabs/Unit/箱子/沙漠_宝箱2","Prefabs/Unit/箱子/沙漠_床头柜","Prefabs/Unit/箱子/沙漠_石棺1","Prefabs/Unit/箱子/沙漠_石棺2","Prefabs/Unit/箱子/沙漠_石棺3","Prefabs/Unit/箱子/沙漠_衣柜","Prefabs/Unit/箱子/沙漠_货架","Prefabs/Unit/箱子/雪地_军备箱","Prefabs/Unit/箱子/雪地_抽屉","Prefabs/Unit/箱子/雪地_木桶","Prefabs/Unit/箱子/雪地_水晶箱","Prefabs/Unit/箱子/雪地_科技箱","Prefabs/Unit/箱子/雪地_篮子","Prefabs/Unit/箱子/雪地_衣柜","Prefabs/Unit/箱子/雪地_货箱"]));
  console.log('errors',errors);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
