const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const events=[],guide={IsTipShowing:true},data={IsTutorial:false,CurMap:'新手村'};let completed=0,exp=0,saves=0,finishCalls=0,fail=false;
class Base{}
const game={IsTutorial:true,IsGameFinished:false,StopTutorialForExit(){this.IsGameFinished=true;this.GamePaused=true;}};
const ui={Dragging:true,DraggingPlayerIndex:0,Instance:{HidePlayerPanel(...a){events.push(['hide',...a]);},HidePanel(...a){events.push(['hideGuide',...a]);},ShowPanel(...a){events.push(['show',...a]);},ShowTip(){},CloseAllPanelsImmediately(){ui.Dragging=false;ui.DraggingPlayerIndex=-1;events.push(['closeAll']);},async FinishGameInventory(success){assert.equal(success,true);finishCalls++;if(fail)throw Error('simulated inventory error');}}};
const defs={ZRSJZ_Panel:Base,ZRSJZ_UIManager:ui,ZRSJZ_Game:{Instance:game},ZRSJZ_TutorialPanel:guide,ZRSJZ_AudioManager:{Instance:{PlaySound(){}}},ZRSJZ_GameData:{Instance:data,SaveData(){saves++;}},ZRSJZ_TaskService:{CompleteTask(n){assert.equal(n,'完成新手教程');completed++;}},ZRSJZ_GradeService:{AddExperience(n){exp+=n;}},ZRSJZ_EventManager:{Emit(){},EmitPersist(){}},ZRSJZ_MyEvent:{},ZRSJZ_PANEL:{物资弹窗:'goods',新手引导弹窗:'guide',加载界面:'loading'}};
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/'+file,'utf8'),{compilerOptions:{module:1,experimentalDecorators:true,target:7}}).outputText,{exports,console:{error(){}},require:n=>n==='cc'?new Proxy({_decorator:{ccclass:()=>c=>c,property:()=>()=>{}}},{get:(t,k)=>t[k]||Base}):new Proxy({},{get:(t,k)=>defs[k]||Base})});return exports;}
(async()=>{const Goods=load('Panel/ZRSJZ_GoodsPanel.ts').ZRSJZ_GoodsPanel,g=Object.create(Goods.prototype);g._playerIndex=0;
await g.OnButtonClick({getCurrentTarget:()=>({name:'Mask'})});assert.ok(events.some(e=>e[0]==='hide'&&e[1]==='goods'));assert.equal(ui.Dragging,false);assert.equal(guide.IsTipShowing,false);
const Tutorial=load('ZRSJZ_Tutorial.ts').ZRSJZ_Tutorial,t=new Tutorial();t.isValid=true;
const MapTutorial=load('Controller/ZRSJZ_MapTutorial.ts').ZRSJZ_MapTutorial;
const map=Object.create(MapTutorial.prototype);map.ColliderNode={active:true};let colliderSignals=0;
defs.ZRSJZ_MyEvent.ZRSJZ_TUTORIAL='tutorial';defs.ZRSJZ_MyEvent.ZRSJZ_TUTORIAL_CLOSE_COLLIDER='closeCollider';
defs.ZRSJZ_EventManager.Emit=(event,...args)=>{if(event==='tutorial')t.Tutorial(...args);if(event==='closeCollider'){colliderSignals++;map.CloseCollider();}};
t.TutorialNodes=Array.from({length:5},()=>({active:false}));
await g.OnButtonClick({getCurrentTarget:()=>({name:'Mask'})});assert.equal(map.ColliderNode.active,false);assert.equal(colliderSignals,1);
await g.OnButtonClick({getCurrentTarget:()=>({name:'Mask'})});assert.equal(colliderSignals,1);
data.CurMap='五号小镇_机密行动';await g.OnButtonClick({getCurrentTarget:()=>({name:'Mask'})});assert.equal(colliderSignals,1);
console.log('PASS: first tutorial goods close hides ColliderNode immediately; repeated/normal-map closes do not retrigger');
fail=true;await t.SkipTutorial();assert.equal(data.IsTutorial,false);assert.equal(t._skipping,false);
fail=false;await Promise.all([t.SkipTutorial(),t.SkipTutorial()]);assert.equal(data.IsTutorial,true);assert.equal(data.CurMap,'五号小镇_机密行动');assert.equal(completed,1);assert.equal(exp,100);assert.equal(finishCalls,2);assert.ok(saves);assert.ok(events.some(e=>e[0]==='show'&&e[2]==='ZRSJZ_Start'));
await t.SkipTutorial();t.Tutorial(5);assert.equal(completed,1);assert.equal(exp,100);
const other=new Tutorial();other.isValid=true;game.IsTutorial=false;await other.SkipTutorial();assert.equal(finishCalls,2);
console.log('PASS: goods closes despite guide/drag, skip completes task once, preserves inventory, retries cleanup failure, returns home, ignores non-tutorial scenes');
})().catch(e=>{console.error(e);process.exitCode=1;});
