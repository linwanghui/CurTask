const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const boss=fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',"));
const launch=boss.slice(boss.indexOf("  console.log('launch',"),boss.indexOf("  console.log('runtime',"));
eval(prefix+launch+String.raw`
 console.log('action checks',await page.evaluate(async()=>{
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const cls=cc.js.getClassByName('ZRSJZ_Joystick_Attack');
 const joysticks=cc.director.getScene().getComponentsInChildren(cls);
 if(!joysticks.length)throw Error('No combat joystick');
 const c=joysticks.find(c=>c.node.activeInHierarchy)||joysticks[0];
 const holder=c.node.getChildByName('动作按钮');
 if(!holder)throw Error('No holder');
 for(let i=0;i<100&&!c._actionButton;i++)await wait(100);
 if(holder.children.length!==1)throw Error('Expected one action button: '+holder.children.length);
 const button=holder.children[0];
 if(!button.getComponent(cc.js.getClassByName('ZRSJZ_ActionButton')))throw Error('Missing behavior');
 if(button.position.length()>0.001)throw Error('Incorrect local position');
 const visit=n=>{if(n.layer!==holder.layer)throw Error('Wrong layer');n.children.forEach(visit)};visit(button);
 const events=t.get('ZRSJZ_EventManager'),event=t.get('ZRSJZ_MyEvent').ZRSJZ_LOADED_DLC;
 await Promise.all([c.EnsureActionButton(),c.EnsureActionButton()]);await wait(300);
 if(holder.children.length!==1)throw Error('Duplicate button');
 c.enabled=false;c.enabled=true;await wait(300);
 if(holder.children.length!==1)throw Error('Duplicate on enable');
 // 独立的非激活实例验证尚未加载 DLC，以及异步加载过程中销毁。
 const prefab=await new Promise((resolve,reject)=>cc.assetManager.getBundle('73_ZRSJZ').load('Prefabs/Controller/AttackJoystick',cc.Prefab,(e,p)=>e?reject(e):resolve(p)));
 const empty=cc.instantiate(prefab);empty.active=false;cc.director.getScene().addChild(empty);
 const ec=empty.getComponent(cls);t.UI.ZRSJZ_DLC=false;await ec.EnsureActionButton();
 if(empty.getChildByName('动作按钮').children.length)throw Error('Loaded without DLC');
 t.UI.ZRSJZ_DLC=true;
 const pending=ec.EnsureActionButton();empty.destroy();await wait(100);await pending;
 if(ec._actionButton)throw Error('Created after destruction');
 t.UI.Instance.CloseAllPanelsImmediately();t.game=t.get('ZRSJZ_Game').Instance;t.game.GamePaused=true;
 return {joysticks:joysticks.length,loaded:true,localPosition:[button.position.x,button.position.y],matchingLayers:true,noDuplicates:true,noDLC:true,destroyWhileLoading:true};
 }));
 await page.screenshot({path:__dirname+'/attack-joystick-action-button.png'});
 console.log('relevant errors',errors.filter(e=>/Joystick_Attack|局内按钮|动作.*加载失败/.test(e)));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);

