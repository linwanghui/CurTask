const fs=require('fs'),assert=require('assert'),vm=require('vm'),ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const file='assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_EnemyBase.ts';
const source=fs.readFileSync(file,'utf8');
function members(text){const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);return {ast,cls:ast.statements.find(ts.isClassDeclaration)};}
const {ast,cls}=members(source);
class Vec3{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}set(x,y,z){if(typeof x==='object')Object.assign(this,x);else Object.assign(this,{x,y,z});return this;}static distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}}
class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}get xMax(){return this.x+this.width;}get yMax(){return this.y+this.height;}contains(p){return p.x>=this.x&&p.x<=this.xMax&&p.y>=this.y&&p.y<=this.yMax;}}
class BoxCollider2D{} class PolygonCollider2D{} class CircleCollider2D{}
const intersectionSource=fs.readFileSync('D:/cocos/Creator/3.8.6/resources/resources/3d/engine/cocos/physics-2d/builtin/intersection-2d.ts','utf8');
const exports2d={};vm.runInNewContext(ts.transpileModule(intersectionSource,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,{exports:exports2d,require:()=>({Vec2:Vec3,Rect})});
let obstacles=[],rayCalls=[];
const config={AgentRadius:82,AgentOffsetY:100,StuckCheckInterval:.25,StuckDistance:3,StuckTime:.5};
const ctx={Vec3,Rect,Math,BoxCollider2D,PolygonCollider2D,CircleCollider2D,Intersection2D:exports2d.default,ZRSJZ_PATH_CONFIG:config,ZRSJZ_TIER:{地形:1},PhysicsSystem2D:{instance:{testAABB:()=>obstacles}},ZRSJZ_PathFinder:{HasDirectPath:(...a)=>{rayCalls.push(a);return true;}}};
function method(name){const m=cls.members.find(m=>m.name?.getText(ast)===name);return vm.runInNewContext(ts.transpileModule('(function('+m.parameters.map(p=>p.getText(ast)).join(',')+')'+m.body.getText(ast)+')',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx);}
function enemy(){return {EnemyConfig:{PatrolRadius:500,PatrolSpeed:300,PatrolWaitTime:0,PatrolArriveDistance:50,IdleAnimation:'idle',MoveAnimation:'walk'},node:{worldPosition:new Vec3()},_patrolCenter:new Vec3(),_patrolTarget:new Vec3(400,0),_patrolLastPosition:new Vec3(),_patrolWaitRemaining:0,_patrolProgressTime:0,_patrolBlockedTime:0,selected:0,navigated:0,StopMoving(){this.stopped=true;},PlayAnimation(){},SelectNextPatrolPoint(){this.selected++;this._patrolBlockedTime=0;},NavigateTo(){this.navigated++;this._stuckTime=0;}};}
const patrol=method('Patrol');let e=enemy();
for(let i=0;i<4;i++)patrol.call(e,.25);
assert.equal(e.selected,1,'blocked patrol must abandon target despite A* resetting stuck timer');
assert(e.stopped);
e=enemy();for(let i=0;i<8;i++){e.node.worldPosition.x+=5;patrol.call(e,.25);}assert.equal(e.selected,0,'moving patrol should keep target');assert.equal(e.navigated,8);
e=enemy();e._patrolWaitRemaining=1;patrol.call(e,.25);assert.equal(e._patrolProgressTime,0);assert.equal(e.navigated,0);
e=enemy();e._patrolTarget.set(e.node.worldPosition);patrol.call(e,.25);assert.equal(e.selected,1);assert.equal(e.navigated,0);
const can=method('CanPatrolTo');e=enemy();obstacles=[{enabledInHierarchy:true,sensor:false,group:1}];assert.equal(can.call(e,new Vec3(400,0)),false,'wall overlap rejected');
obstacles=[{enabledInHierarchy:true,sensor:true,group:1}];assert.equal(can.call(e,new Vec3(400,0)),true);assert.equal(rayCalls.at(-1)[5],1,'full radius corridor used');
const polygon=Object.assign(new PolygonCollider2D(),{enabledInHierarchy:true,sensor:false,group:1,worldPoints:[[0,0],[1000,0],[1000,100],[100,100],[100,1000],[0,1000]].map(([x,y])=>new Vec3(x,y))});
obstacles=[polygon];assert.equal(can.call(e,new Vec3(500,400)),true,'L-shaped wall bounding box must not reject empty interior');assert.equal(can.call(e,new Vec3(50,400)),false,'actual L wall remains blocked');
const select=method('SelectNextPatrolPoint');e=enemy();e.path=['old'];e.ClearNavigation=function(){this.path=[];};e.CanPatrolTo=()=>false;select.call(e);assert.equal(e.path.length,0);assert.equal(e._patrolWaitRemaining,.25);assert.equal(Vec3.distance(e._patrolTarget,e.node.worldPosition),0);
e=enemy();e.ClearNavigation=function(){this.cleared=true;};e.CanPatrolTo=()=>true;select.call(e);assert(e.cleared);assert(Vec3.distance(e._patrolTarget,e.node.worldPosition)>50);
const before=members(fs.readFileSync(__dirname+'/patrol-wall-before.ts.txt','utf8'));
const allowed=new Set(['Patrol','SelectNextPatrolPoint','CanPatrolTo']);
for(const m of before.cls.members){if(!ts.isMethodDeclaration(m))continue;const name=m.name.getText(before.ast);if(allowed.has(name))continue;const now=cls.members.find(n=>n.name?.getText(ast)===name);assert.equal(now.getText(ast).replace(/\r/g,''),m.getText(before.ast).replace(/\r/g,''),'unrelated method changed: '+name);}
console.log('PASS: blocked target recovery, normal patrol, arrival/wait, footprint clearance, stale path reset, bounded retry; all non-patrol methods unchanged.');
