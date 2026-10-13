const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
class Base {}
class Vec3 { constructor(x=0,y=0,z=0){this.set(x,y,z);} set(x,y,z){this.x=x;this.y=y;this.z=z;} }
const pending = [], ui = { ZRSJZ_DLC: true };
const transform = { width:1560,height:720,anchorX:0.5,anchorY:0.5,
    convertToWorldSpaceAR(v,out){out.set(v.x,v.y,v.z);},
    convertToNodeSpaceAR(v,out){out.set(v.x,v.y,v.z);} };
const root = { isValid:true,layer:33554432,getComponent:()=>transform };
const cc = new Proxy({ Vec3, _decorator:{ccclass:()=>c=>c,property:(...args)=>args.length>1?undefined:()=>{}},
    instantiate:()=>({isValid:true,children:[],getComponent:()=>({width:2340,height:1080}),
        setPosition(x,y,z){this.position={x,y,z};},setScale(x,y,z){this.scale={x,y,z};},
        destroy(){this.isValid=false;}}) }, {get:(t,k)=>t[k]||Base});
const defs = { ZRSJZ_UIManager:ui,ZRSJZ_Tools:{LoadPrefabByBundle(bundle,path){
    assert.equal(bundle,'73_ZRSJZ_DLC');return new Promise(resolve=>pending.push({path,resolve}));}} };
const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Game.ts','utf8'),
    {compilerOptions:{module:1,target:7,experimentalDecorators:true}}).outputText,
    {exports:output,console,require:n=>n==='cc'?cc:new Proxy({},{get:(_,k)=>defs[k]||Base})});
const Game=output.ZRSJZ_Game, game=new Game();
game.isValid=true;game.enabledInHierarchy=true;game.node={isValid:true,activeInHierarchy:true};
game.UI={getChildByName:()=>root,getComponent:()=>transform};game.CurMap={};Game.Instance=game;
async function flush(){await Promise.resolve();await Promise.resolve();}
(async()=>{
    game.LoadPanoramaEffect('沙漠');assert.ok(pending[0].path.endsWith('/沙漠特效'));
    game.LoadPanoramaEffect('雪地');assert.ok(pending[1].path.endsWith('/雪地特效'));
    pending[0].resolve({});await flush();assert.equal(game._panoramaEffect,null);
    pending[1].resolve({});await flush();const effect=game._panoramaEffect;
    assert.equal(effect.parent,root);assert.equal(effect.layer,root.layer);
    for(const [width,height] of [[1560,720],[1920,1080],[2560,1080],[720,1560],[2340,1080]]){
        Object.assign(transform,{width,height});game.FitPanoramaEffect();
        assert.equal(effect.scale.x,effect.scale.y);
        assert.ok(2340*effect.scale.x>=width-1e-6 && 1080*effect.scale.y>=height-1e-6);
        assert.equal(effect.position.x,0);assert.equal(effect.position.y,0);
    }
    ui.ZRSJZ_DLC=false;game.FitPanoramaEffect();assert.equal(effect.active,false);
    ui.ZRSJZ_DLC=true;game.FitPanoramaEffect();assert.equal(effect.active,true);
    game.LoadPanoramaEffect('城镇');assert.equal(game._panoramaEffect,null);assert.equal(effect.isValid,false);
    game.LoadPanoramaEffect('沙漠');game.ClearPanoramaEffect();pending[2].resolve({});await flush();
    assert.equal(game._panoramaEffect,null);
    console.log('PASS: map selection, stale load cancellation, UI layer, landscape/portrait cover, resizing, DLC visibility and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
