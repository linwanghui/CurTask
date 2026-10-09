const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',")).replace('const page=await context.newPage(),errors=[];','const page=await context.newPage(),errors=[],requests=[];page.on("request",r=>requests.push(r.url()));').replace("errors.push(e.message)","errors.push(e.stack||e.message)");
eval(prefix+String.raw`
  console.log('open-role',await page.evaluate(()=>{
    const get=name=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[name])?.[name];
    window.t={get,UI:get('ZRSJZ_UIManager')};
    t.UI.ZRSJZ_DLC=true;t.UI.Instance.CloseAllPanelsImmediately();
    t.UI.Instance.ShowPanel(get('ZRSJZ_PANEL').角色界面);
    return true;
  }));
  await page.waitForFunction(()=>t.UI.Instance.node.getComponentsInChildren(t.get('ZRSJZ_RolePanel'))[0]?.Skeleton?.Skeleton?.skeletonData,null,{timeout:30000});
  await page.waitForTimeout(2000);
  await page.evaluate(()=>{
    t.panel=t.UI.Instance.node.getComponentsInChildren(t.get('ZRSJZ_RolePanel'))[0];t.skin=t.panel.Skeleton;
    const s=t.skin.Skeleton,complete=s.setCompleteListener,animation=s.setAnimation;
    let inside=false;
    s.setCompleteListener=function(cb){return complete.call(this,cb?entry=>{inside=true;try{cb(entry);}finally{inside=false;}}:null);};
    s.setAnimation=function(...args){if(inside)throw Error('reentrant Spine setAnimation');return animation.apply(this,args);};
  });
  for(const name of ['乌鲁','蜂医','露娜']){
    console.log('role',name,await page.evaluate(name=>{
      const configs=t.get('ZRSJZ_ROLE_CONFIG');
      const key=Array.from(configs.entries()).find(([k,v])=>v.SkillPath?.endsWith('/'+name))?.[0];
      if(!key)throw Error('missing role '+name);
      t.panel.ShowRoleDesc(key);return {key,skin:t.skin.SkinName};
    },name));
    await page.waitForTimeout(6500);
    if(errors.some(e=>/RuntimeError|out of bounds|unreachable/.test(e)))throw Error(errors.join('\n'));
  }
  for(let i=0;i<24;i++){
    await page.evaluate(i=>{
      const names=Array.from(t.get('ZRSJZ_ROLE_CONFIG').keys());
      if(i%4===0)t.panel.node.active=false;
      else {t.panel.node.active=true;t.panel.ShowRoleDesc(names[i%names.length]);}
    },i);
    await page.waitForTimeout(90);
  }
  await page.evaluate(()=>{t.panel.node.active=true;t.panel.ShowRoleDesc(Array.from(t.get('ZRSJZ_ROLE_CONFIG').entries()).find(([k,v])=>v.SkillPath?.endsWith('/露娜'))[0]);});
  await page.waitForTimeout(5000);
  console.log('final',await page.evaluate(()=>({skin:t.skin.SkinName,animation:t.skin.Skeleton.getCurrent(0)?.animation?.name,effects:t.skin._previewEffects.size})));
  await page.evaluate(async()=>{
    const prefab=await new Promise((resolve,reject)=>cc.assetManager.getBundle('73_ZRSJZ').load('Prefabs/Panel/角色界面',cc.Prefab,(e,p)=>e?reject(e):resolve(p)));
    const key=Array.from(t.get('ZRSJZ_ROLE_CONFIG').entries()).find(([k,v])=>v.SkillPath?.endsWith('/露娜'))[0];
    for(let i=0;i<4;i++){
      const n=cc.instantiate(prefab);n.parent=t.panel.node.parent;n.active=true;
      n.getComponent(t.get('ZRSJZ_RolePanel')).ShowRoleDesc(key);
      n.destroy();await new Promise(r=>setTimeout(r,60));
    }
  });
  await page.waitForTimeout(2000);
  if(requests.some(url=>url.includes('mf777.top/api/mf0202')))throw Error('localhost still requested ad strategy');
  console.log('destroy-reopen and local CORS isolation passed');
  console.log('errors',errors);
  if(errors.some(e=>/RuntimeError|out of bounds|unreachable|Cannot read|Cannot set|TypeError|reentrant/.test(e)))throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
`);
