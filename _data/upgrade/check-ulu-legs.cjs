const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',"));
eval(prefix+String.raw`
 const result=await page.evaluate(async()=>{
 const modules=Array.from(System.entries()),get=n=>modules.map(([,m])=>m).find(m=>m[n])?.[n];
 get('ZRSJZ_UIManager').ZRSJZ_DLC=true;get('ZRSJZ_UIManager').Instance.CloseAllPanelsImmediately();
 await new Promise(r=>setTimeout(r,2500));
 const list=cc.director.getScene().getComponentsInChildren(cc.js.getClassByName('ZRSJZ_MainSkeleton'));
 const out=[];
 for(const c of list){c.SetSkin('沧戈');c.RefreshEquipmentAppearance();c.PlayAni('daiji_q');}
 await new Promise(r=>setTimeout(r,5000));
 for(const c of list){let sk=c.Skeleton._skeleton;out.push({node:c.node.name,skin:c.SkinName,tracks:[0,1].map(i=>c.Skeleton.getCurrent(i)?.animation.name),legs:sk.slots.filter(s=>s.data.name.includes('乌鲁')&&s.data.name.includes('脚')).map(s=>({slot:s.data.name,attachment:s.getAttachment()?.name,deform:s.deform?.length,vertices:s.getAttachment()?.vertices?.slice(0,20)})),bones:sk.bones.slice(10,17).map(b=>({name:b.data.name,x:b.x,y:b.y,rotation:b.rotation,scaleX:b.scaleX,scaleY:b.scaleY}))});}
 return out;
 });console.log(JSON.stringify(result,null,2));await page.mouse.click(1275,105);await page.waitForTimeout(500);await page.screenshot({path:__dirname+'/ulu-leg-before.png'});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);


