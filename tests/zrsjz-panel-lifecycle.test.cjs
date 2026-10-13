const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const base='assets/Game_Bundles/73_ZRSJZ/Scripts/';
function methods(file,names){const s=ts.createSourceFile(file,fs.readFileSync(base+file,'utf8'),99,true);const c=s.statements.find(ts.isClassDeclaration);return c.members.filter(n=>names.includes(n.name?.getText(s))).map(n=>n.getText(s)).join('\n');}
function evaluate(code,globals){return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:7,module:1}}).outputText,globals);}
let pending=[],shown=0,hidden=0;
const parent={isValid:true,children:[]};
const panelComponent={CanClose:true,Show(){shown++;},Hide(){hidden++;}};
const live=()=>({isValid:true,parent:null,active:false,setSiblingIndex(){},getComponent(){return panelComponent;}});
parent.addChild=n=>{n.parent=parent;parent.children.push(n);};
const dead={isValid:false,getComponent(){throw Error('Destroyed node must never be queried');}};
const globals={console,isValid:n=>!!n?.isValid&&!n.pendingDestroy,instantiate:live,ZRSJZ_Panel:class{},
 ZRSJZ_PANEL:{胜利弹窗:'core/Win',失败弹窗:'core/Fail'},Banner:{IS_BYTEDANCE_MINI_GAME:true},
 ProjectEventManager:{emit(){}},ProjectEvent:{},BundleManager:{GetBundle:()=>({load:(path,type,cb)=>pending.push(cb)})},Prefab:class{}};
const UI=evaluate('class UI {'+methods('Manager/ZRSJZ_UIManager.ts',['IsAvailable','ShowPanel','HidePanel'])+'} UI;',globals);
const ui=new UI();ui.isValid=true;ui.node={isValid:true};ui._panelNode=parent;ui._panelMap=new Map();ui._curPanel=[];ui._panelRequestVersion=0;
UI.Dragging=false;UI.ZRSJZ_DLC=true;globals.ZRSJZ_UIManager=UI;
ui._panelMap.set('Exp',dead);ui._curPanel=['Exp'];ui.ShowPanel('core/Exp',10);
assert.equal(pending.length,1);assert.equal(ui._panelMap.has('Exp'),false);pending.shift()(null,{});
assert.equal(shown,1);const cached=ui._panelMap.get('Exp');assert.equal(cached.parent,parent);
ui.HidePanel('core/Exp');assert.equal(hidden,1);cached.parent={isValid:true};ui.ShowPanel('core/Exp',20);
assert.equal(shown,2);assert.equal(cached.parent,parent,'valid misplaced cached panel returns to persistent container');
ui._panelMap.set('Exp',dead);ui.HidePanel('core/Exp');assert.equal(ui._panelMap.has('Exp'),false);assert.equal(ui._curPanel.length,0);
ui._panelMap.set('Exp',{...dead,isValid:true,pendingDestroy:true});ui.ShowPanel('core/Exp');
assert.equal(pending.length,1);pending.shift()(Error('Simulated asset load failure'),null);
assert.equal(ui._curPanel.length,0,'failed load must release request marker for retry');
ui.ShowPanel('core/Exp');assert.equal(pending.length,1);pending.shift()(null,{});
assert.equal(shown,3,'pending-destroy cache reloads successfully on retry');
ui._panelNode={isValid:false};ui.ShowPanel('core/Exp');assert.equal(pending.length,0);
class Panel{Show(){}}
const Exp=evaluate('class Exp extends Panel {'+methods('Panel/ZRSJZ_GetExpPanel.ts',['Show'])+'} Exp;',{Panel});
const exp=new Exp();exp.CacheNodes=()=>{};exp.node={parent,setSiblingIndex(){}};
exp.Show(10);exp.Show(20);exp.Show(30);assert.equal(exp.node.parent,parent,'repeated experience prompts must retain their persistent parent');
console.log('PASS: destroyed/pending panel cache rebuild, safe hide, persistent parenting and repeated experience prompts');
