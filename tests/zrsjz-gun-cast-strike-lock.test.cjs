const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const path='assets/Game_Bundles/73_ZRSJZ/Scripts/Panel/ZRSJZ_GunCastPanel.ts',source=fs.readFileSync(path,'utf8');const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true),cls=ast.statements.find(ts.isClassDeclaration);
const selected=['strike','completeStrike','checkStrikeCompletion','restoreHammerIdle','refreshSuperTimer','qiaoda'];const methods=cls.members.filter(m=>selected.includes(m.name?.getText(ast))).map(m=>m.getText(ast)).join('\n');
const Button=Symbol('Button'),Sprite=Symbol('Sprite'),UIOpacity=Symbol('UIOpacity');let now=10000,animations=[],queued=[],hits=0,results=0,damaged=false;const button={interactable:true};const S={itemKinds:['铸枪护盾','铸枪必成券'],itemEffect:()=>false,hit:()=>{hits++;return damaged?4:1;},load:()=>({round:{level:1,broken:damaged}})};
const sounds=[];
const Subject=vm.runInNewContext(ts.transpileModule('class Subject {'+methods+'}\nSubject',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{S,ZRSJZ_AudioManager:{Instance:{PlaySoundByDLC(name){sounds.push(name);}}},UI:{Instance:{ShowTip(){}}},Button,Sprite,UIOpacity,Date:{now:()=>now},assert,isValid:()=>true});
const panel=new Subject();Object.assign(panel,{busy:false,hammerPlaying:false,breakingWeapon:false,hammerEntry:null,strikeSequence:0,completingStrike:false,endingRequested:false,node:{activeInHierarchy:true},strikeImpactTime:0.3333,at:path=>path==='中心'?{getComponent:type=>type===Button?button:null}:null,refresh(){button.interactable=!this.busy;},breathe(){},shatterWeapon(){},flashWeapon(){},popHitResult(){results++;},scheduleOnce(fn){queued.push(fn);},anim:{findAnimation:()=>true,alpha:0,current:null,clearTrack(){this.trackCleared=true;},setToSetupPose(){assert(this.trackCleared);this.alpha=1;},setAnimation(track,name){const entry={animation:{name,duration:1},trackTime:0,animationEnd:1};this.current=entry;animations.push(entry);return entry;},getCurrent(){return {...this.current};},setTrackEventListener(entry,fn){entry.onEvent=fn;},setTrackCompleteListener(entry,fn){entry.onComplete=fn;}}});
function tick(){const callbacks=queued;queued=[];callbacks.forEach(fn=>fn());}
panel.strike();const first=panel.hammerEntry;assert(!button.interactable);for(let i=0;i<20;i++)panel.strike();assert.equal(animations.length,1);
first.onEvent(first, 1); first.onEvent(first, null); assert.equal(hits,0);
panel.node.activeInHierarchy=false; first.onEvent(first,{data:{name:'qiaoji'}}); assert.equal(hits,0); panel.node.activeInHierarchy=true;
// WASM/native callbacks can wrap the same native entry in different JavaScript objects.
first.onEvent({...first},{data:{name:'qiaoji'}});first.onEvent({...first},{data:{name:'qiaoji'}});assert.equal(hits,1);assert.deepEqual(sounds,['敲打','敲打成功']);
panel.busy=false;panel.strike();assert.equal(animations.length,1);first.onComplete({...first});assert(panel.hammerPlaying,'lock remains until safe deferred reset');panel.strike();assert.equal(animations.length,1);tick();assert(!panel.hammerPlaying);assert.equal(panel.anim.alpha,1);assert(button.interactable);
panel.strike();const second=panel.hammerEntry;first.onComplete({...first});first.onEvent({...first},{data:{name:'qiaoji'}});tick();assert.equal(panel.hammerEntry,second);assert(panel.hammerPlaying);assert.equal(hits,1);
second.onEvent({...second},{data:{name:'qiaoji'}});assert.equal(hits,2);panel.checkStrikeCompletion();assert.equal(queued.length,0);second.trackTime=1;panel.checkStrikeCompletion();assert.equal(queued.length,1);tick();assert(!panel.hammerPlaying);assert(button.interactable);
panel.strike();const third=panel.hammerEntry;damaged=true;panel.breakingWeapon=true;third.onComplete({...third});tick();assert.equal(hits,3,'missing frame event is settled at completion');assert.equal(results,hits);assert(panel.busy);const count=animations.length;panel.strike();assert.equal(animations.length,count);
// No event and no completion callback: playback progress must settle once at the authored impact frame.
damaged=false;panel.breakingWeapon=false;panel.busy=false;panel.strike();const fourth=panel.hammerEntry;
fourth.trackTime=.2;panel.checkStrikeCompletion();assert.equal(hits,3);
fourth.trackTime=.34;panel.checkStrikeCompletion();assert.equal(hits,4);assert.equal(results,4);
fourth.onEvent({...fourth},{data:{name:'qiaoji'}});panel.checkStrikeCompletion();assert.equal(hits,4,'late real event must not double settle');
fourth.trackTime=1;panel.checkStrikeCompletion();tick();assert.equal(hits,4);assert(!panel.hammerPlaying);
// A skipped frame can jump from zero directly beyond the end of the animation.
panel.strike();panel.hammerEntry.trackTime=1.1;panel.checkStrikeCompletion();tick();assert.equal(hits,5);assert.equal(results,5);assert(button.interactable);
let visible,text;panel.active=(p,v)=>visible=v;panel.text=(p,v)=>text=v;panel.refreshSuperTimer({superUntil:14000});assert.equal(text,'4:00');now=10010;panel.refreshSuperTimer({superUntil:14000});assert.equal(text,'3:99');now=14000;panel.refreshSuperTimer({superUntil:14000});assert.equal(text,'0:00');assert(!visible);
const skeleton=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Spine/铸枪/skeleton.json','utf8').replace(/^\uFEFF/,''));assert.equal(skeleton.animations.daiji.slots.hammer.color[0].color,'ffffffff');
assert.deepEqual(sounds,['敲打','敲打成功','敲打','敲打成功','敲打','敲打失败','敲打','敲打成功','敲打','敲打成功'],'fallback and late callbacks play each sound once');
for(const [result,broken,expected] of [[0,false,['敲打','敲打成功']],[1,false,['敲打','敲打成功']],[2,false,['敲打']],[3,false,['敲打']],[4,true,['敲打','敲打失败']],[4,false,['敲打']],[-1,false,[]]]){
 S.hit=()=>result;S.load=()=>({round:{broken}});sounds.length=0;panel.hammerPlaying=true;panel.settled=false;
 panel.qiaoda();panel.qiaoda();assert.deepEqual(sounds,expected,`audio for result ${result}, broken=${broken}`);
}
console.log('PASS: missing/late/duplicate frame events, dropped animation frames, actual result feedback, distinct callback wrappers, two consecutive hits, stale callbacks, deferred idle restoration, true-duration fallback, destruction lock and timer.');
