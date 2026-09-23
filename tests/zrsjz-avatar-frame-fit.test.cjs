const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const file='assets/Game_Bundles/73_ZRSJZ/Scripts/UI/ZRSJZ_AvatarFrameFit.ts';
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject,require:()=>({UITransform:class{}})});
const fit=exportsObject.ZRSJZ_AvatarFrameFit;
for(const id of ['6','7','8','9','10']){
 const home=fit.Calculate(id,142,142),panel=fit.Calculate(id,165,165);
 assert(home.scale>0);assert(Math.abs(panel.scale/home.scale-165/142)<1e-9);
 const parent={},avatar={parent,position:{x:-215,y:235},scale:{x:1,y:1},getComponent:()=>({width:165,height:165,anchorX:0.5,anchorY:0.5})};
 const node={parent,isValid:true,position:{z:0},setScale(x,y){this.scale={x,y};},setPosition(x,y,z){this.position={x,y,z};}};
 fit.AroundAvatar({node},id,avatar);assert.equal(node.scale.x,node.scale.y);assert.equal(node.scale.x,panel.scale);
 assert.equal(node.position.x,avatar.position.x+panel.x);assert.equal(node.position.y,avatar.position.y+panel.y);
 const original=JSON.stringify([node.scale,node.position]);fit.AroundAvatar({node},id,avatar);assert.equal(JSON.stringify([node.scale,node.position]),original);
 avatar.scale={x:0.5,y:0.5};fit.AroundAvatar({node},id,avatar);assert.equal(node.scale.x,panel.scale/2);
}
assert.equal(fit.Calculate('missing',165,165),null);assert.equal(fit.Calculate('6',0,165),null);
assert.equal(fit.Calculate('6',NaN,165),null);
console.log('PASS: all five frames adapt to both avatar sizes, preserve aspect ratio, center correctly, resize and do not accumulate scale/offset');
