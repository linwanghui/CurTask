const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
const source = fs.readFileSync(root + 'Panel/ZRSJZ_GunCastPanel.ts', 'utf8');
const ast = ts.createSourceFile('panel.ts', source, ts.ScriptTarget.Latest, true);
const cls = ast.statements.find(ts.isClassDeclaration);
const method = cls.members.find(m => m.name?.getText(ast) === 'refreshProbabilityBar');
const allocation = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'ZRSJZ_GetGunCastWidths');
const constants = ts.createSourceFile('constants.ts', fs.readFileSync(root + 'ZRSJZ_Constant.ts','utf8'), ts.ScriptTarget.Latest, true);
const config = constants.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(constants) === 'ZRSJZ_GUN_CAST_CONFIG'));
const UITransform = Symbol('UITransform'), Label = {Overflow:{SHRINK:2}}, Sprite = {Type:{SIMPLE:0},SizeMode:{CUSTOM:0}};
function node(name,width) {
 const transform={width,height:28,anchorX:0.5,setContentSize(w,h){this.width=w;this.height=h;}};
 const label={string:'0%',overflow:0};
 return {name,position:{x:0,y:0,z:0},transform,label,children:new Map(),setPosition(x,y,z){this.position={x,y,z};},getChildByName(n){return this.children.get(n);},getComponent(type){return type===UITransform?transform:type===Label?label:type===Sprite?{}:null;}};
}
const bar=node('铸枪概率',1508), names=['破坏','损伤','维持','成功','大成功'];
const nodes=names.map(name=>{const n=node(name,300);n.children.set('概率',node('概率',75));n.children.set('Name',node('Name',84));bar.children.set(name,n);return n;});
let frameChecks=0;
function check(){let edge=-750;for(const n of nodes){assert(n.transform.width>=80-1e-8);const left=n.position.x-n.transform.width/2;assert(Math.abs(left-edge)<1e-7,'segments must touch during every tween frame');edge=left+n.transform.width;}assert(Math.abs(edge-750)<1e-7,'fixed total width');frameChecks++;}
const tween=state=>({to(seconds,target,options){this.target=target;this.options=options;return this;},call(fn){this.finish=fn;return this;},start(){for(let i=0;i<=20;i++){state.progress=i/20;this.options.onUpdate();check();}this.finish();}});
const code=config.getText(constants).replace('export const ZRSJZ_GUN_CAST_CONFIG','const C')+'\n'+allocation.getText(ast).replace('export ','')+'\nclass Subject {'+method.getText(ast)+'}\n({Subject,widths:ZRSJZ_GetGunCastWidths,C})';
const runtime=vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{UITransform,Label,Sprite,Tween:{stopAllByTarget(){}},tween,isValid:()=>true});
const subject=new runtime.Subject();subject.at=(path,root)=>root?root.getChildByName(path):bar;
for(let level=0;level<=12;level++)subject.refreshProbabilityBar(level);
subject.refreshProbabilityBar(3);subject.refreshProbabilityBar(0);
const first=runtime.widths([0,0,0,90,10],1500);assert.deepEqual(Array.from(first.slice(0,3)),[80,80,80]);assert(Math.abs(first[3]/first[4]-9)<1e-10);
console.log('PASS: minimum 80, fixed total, first-level ratio, every tween frame remains contiguous ('+frameChecks+' frames).');
