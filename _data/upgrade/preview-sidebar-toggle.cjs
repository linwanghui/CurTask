const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',"));
eval(prefix+String.raw`
 await page.evaluate(()=>{
  const modules=Array.from(System.entries()),UI=modules.map(([,m])=>m).find(m=>m.ZRSJZ_UIManager)?.ZRSJZ_UIManager;UI.Instance.CloseAllPanelsImmediately();
  window.sidebar=cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_SidebarToggle'));
  if(!sidebar)throw Error('Missing component');
  // 独立预览直接加载开始场景，补齐主页容器布局并关闭其资源等待遮罩。
  const start=cc.director.getScene().getComponentInChildren(cc.js.getClassByName('ZRSJZ_Start'));
  start.LoadPanel.active=false;start.UIPanel.setScale(start.GetPanelScale());
  start._noticeRequested=true;
  // 禁止主页自动公告弹窗打断本次侧边栏交互测试。
  start.enabled=false;
 });
 const state=()=>page.evaluate(()=>{
  const button=sidebar.node.getChildByName('展开折叠'),b=button.getComponent(cc.js.getClassByName('cc.UITransform')).getBoundingBoxToWorld();
  const canvas=document.querySelector('canvas').getBoundingClientRect(),size=cc.view.getVisibleSize();
  let c=sidebar.node;while(c&&!c.getComponent(cc.js.getClassByName('cc.Canvas')))c=c.parent;
  const camera=c.getComponent(cc.js.getClassByName('cc.Canvas')).cameraComponent;
  const p0=button.worldPosition.clone(),s0=camera.worldToScreen(p0),s1=camera.worldToScreen(new cc.Vec3(p0.x+1,p0.y,p0.z));
  const pixelLeft=Math.max(0,-canvas.left)*cc.game.canvas.width/canvas.width;
  const left=p0.x+(pixelLeft-s0.x)/(s1.x-s0.x);
  const screen=camera.worldToScreen(new cc.Vec3(b.x+b.width/2,b.y+b.height/2,button.worldPosition.z));
  return {collapsed:sidebar._collapsed,progress:sidebar._motion.progress,scale:button.scale.x,left:b.x-left,right:b.x+b.width-left,
    fixed:['主线任务','宠物','活动','战令'].map(name=>{const n=sidebar.node.getChildByName(name);return {name,x:n.position.x,y:n.position.y,active:n.active,scale:n.scale.x};}),
    visible:sidebar.node.children.filter(n=>n!==button&&n.activeInHierarchy).map(n=>n.name),
    clickX:canvas.left+screen.x/cc.game.canvas.width*canvas.width,clickY:canvas.top+(1-screen.y/cc.game.canvas.height)*canvas.height,
    otherRight:Math.max(...sidebar.node.children.filter(n=>n!==button&&n.activeInHierarchy).map(n=>{const r=n.getComponent(cc.js.getClassByName('cc.UITransform')).getBoundingBoxToWorld();return r.x+r.width-left;}))};
 });
 await page.waitForTimeout(500);
 const initial=await state();console.log('viewport',await page.evaluate(()=>({rect:document.querySelector('canvas').getBoundingClientRect().toJSON(),canvas:[cc.game.canvas.width,cc.game.canvas.height],visible:cc.view.getVisibleSize(),origin:cc.view.getVisibleOrigin(),viewport:cc.view.getViewportRect()})));if(initial.collapsed||initial.progress!==0)throw Error('Not expanded initially');
 await page.screenshot({path:__dirname+'/sidebar-expanded.png'});
 await page.mouse.click(initial.clickX,initial.clickY);await page.waitForTimeout(400);
 const collapsed=await state();
 if(!collapsed.collapsed||collapsed.left<collapsed.otherRight||collapsed.visible.length!==4||JSON.stringify(collapsed.fixed)!==JSON.stringify(initial.fixed)||collapsed.scale!==-initial.scale)throw Error('Collapse failed '+JSON.stringify({initial,collapsed}));
 await page.screenshot({path:__dirname+'/sidebar-collapsed.png'});
 await page.mouse.click(collapsed.clickX,collapsed.clickY);await page.waitForTimeout(400);
 const expanded=await state();if(expanded.collapsed||Math.abs(expanded.left-initial.left)>2||expanded.scale!==initial.scale||JSON.stringify(expanded.visible)!==JSON.stringify(initial.visible))throw Error('Expand failed '+JSON.stringify({initial,collapsed,expanded}));
 await page.evaluate(()=>{
  if(sidebar.Duration!==0.15)throw Error('Scene duration not updated');
  const Button=cc.js.getClassByName('cc.Button');
  const buttons=sidebar.node.getComponentsInChildren(Button);
  window.previousButtons=buttons.map(b=>[b,b.interactable]);
  sidebar.Duration=0.5;
  sidebar.Toggle();sidebar.Toggle();sidebar.Toggle();
  if(!sidebar._animating||!sidebar._collapsed||buttons.some(b=>b.interactable))throw Error('Animation click lock failed');
 });
 await page.waitForTimeout(100);
 await page.evaluate(()=>{
  if(!sidebar._animating||sidebar._motion.progress<=0||sidebar._motion.progress>=1)throw Error('Missing slide animation');
  for(const item of sidebar._items){if(item.node.position.x>=item.position.x||item.node.scale.x!==item.scale.x)throw Error('Must translate left without squashing');}
 });
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  if(sidebar._animating||previousButtons.some(([b,value])=>b.interactable!==value))throw Error('Buttons not restored');
  if(sidebar._items.some(i=>i.node.active||i.node.position.x+i.node.getComponent(cc.js.getClassByName('cc.UITransform')).width/2>=0))throw Error('Items not moved off left');
  sidebar.Duration=0.15;
 });
 if(!(await state()).collapsed)throw Error('Rapid click failed');
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(600);
 const resized=await state();if(resized.left<resized.otherRight||resized.visible.length!==4||JSON.stringify(resized.fixed)!==JSON.stringify(initial.fixed))throw Error('Resize failed '+JSON.stringify(resized));
 await page.evaluate(()=>{sidebar.node.active=false;sidebar.node.active=true;});await page.waitForTimeout(350);
 if((await state()).collapsed)throw Error('Default expansion not restored');
 console.log('sidebar',{initial,collapsed,expanded,resized,rapidClicks:true,reenableExpanded:true});
 console.log('errors',errors);if(errors.some(e=>/TypeError|Cannot read|SidebarToggle/.test(e)))throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
`);

