const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const base = 'assets/Game_Bundles/73_ZRSJZ_DLC/';
function loadClass(file, name, globals, members) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const cls = source.statements.find(ts.isClassDeclaration);
    const code = `class ${name} ${name.endsWith('Panel') ? 'extends ZRSJZ_Panel' : ''} {
        ${cls.members.filter(m => !members || members.includes(m.name?.getText(source)))
            .map(m => m.getText(source).replace(/@property\([^\n]*\)\s*/g, '')).join('\n')}
    } return ${name};`;
    return vm.runInNewContext(ts.transpileModule(`(() => { ${code} })()`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, globals);
}
class Vec3 { constructor(x=0,y=0,z=0) { Object.assign(this,{x,y,z}); } }
Vec3.ONE = new Vec3(1,1,1);
class UITransform {
    constructor(node) { Object.assign(this,{node,width:100,height:100,anchorX:0.5,anchorY:0.5}); }
    setAnchorPoint(x,y) { this.anchorX=x;this.anchorY=y; }
    convertToWorldSpaceAR(p) { return new Vec3(this.node.worldPosition.x+p.x*this.node.factor,this.node.worldPosition.y+p.y*this.node.factor); }
    convertToNodeSpaceAR(p) { return new Vec3((p.x-this.node.worldPosition.x)/this.node.factor,(p.y-this.node.worldPosition.y)/this.node.factor); }
}
class Label { constructor(){this.string='';} updateRenderData() {} }
class Layout { updateLayout() {} }
class Widget { constructor(){this.enabled=true;} updateAlignment() {} }
class BlockInputEvents {}
class Node {
    static EventType = { TOUCH_END:'touchend' };
    constructor(name) { Object.assign(this,{name,children:[],active:true,position:new Vec3(),worldPosition:new Vec3(),factor:1,components:new Map(),handlers:new Map()}); this.addComponent(UITransform); }
    get activeInHierarchy() { return this.active; }
    getComponent(type) { return this.components.get(type); }
    addComponent(type) { const c=new type(this);this.components.set(type,c);return c; }
    setScale() {} on(type,fn){this.handlers.set(type,fn);} off(type){this.handlers.delete(type);}
    getChildByName(name){return this.children.find(n=>n.name===name);}
}
function child(parent,name){const node=new Node(name);node.parent=parent;parent.children.push(node);return node;}
function find(path,root){return path.split('/').reduce((node,name)=>node?.getChildByName(name),root);}
let jobs=[],saved=0,closed=0,opened=[],currentPanelAllowed=true;
const durations=[];
function tween(target){ const job={target};return {to(duration,props){job.props=props;durations.push(duration);return this;},call(fn){job.callback=fn;return this;},start(){jobs.push(job);}}; }
function finish(){const current=jobs;jobs=[];for(const job of current){Object.assign(job.target,job.props);job.callback?.();}}
const data={};
const globals={Vec3,UITransform,Label,Layout,Widget,BlockInputEvents,Node,find,tween,
    Tween:{stopAllByTarget(target){jobs=jobs.filter(j=>j.target!==target);}},isValid:n=>!!n&&!n.destroyed,
    ZRSJZ_Panel:class { Show(cb){this.afterShow=cb;} },
    ZRSJZ_PANEL:{界面引导弹窗:'guide'},ZRSJZ_GameData:{Instance:data,SaveData(){saved++;}},
    ZRSJZ_UIManager:{Instance:{IsCurrentPanel:owner=>!!owner&&owner.activeInHierarchy&&currentPanelAllowed,HidePanel(){closed++;panel.Hide();panel.onDisable();},ShowPanel(...args){opened.push(args);}}}};
const Guidance=loadClass(base+'Scripts/ZRSJZ_Guidance.ts','ZRSJZ_Guidance',globals);
const sourcePrefab=JSON.parse(fs.readFileSync(base+'Prefabs/Panel/宠物界面.prefab'));
const steps=sourcePrefab.filter(n=>n.TipNode&&n.TipLabel).map(c=>{
    const guide=new Guidance(), source=sourcePrefab[c.node.__id__];guide.node=new Node(source._name);guide.node.active=false;
    Object.assign(guide.node.worldPosition,source._lpos);
    const transform=source._components.map(r=>sourcePrefab[r.__id__]).find(n=>n.__type__==='cc.UITransform');
    Object.assign(guide.node.getComponent(UITransform),transform._contentSize);
    guide.TipNode=new Node('Tip');const pos=sourcePrefab[c.TipNode.__id__]._lpos;
    guide.TipNode.worldPosition=new Vec3(source._lpos.x+pos.x,source._lpos.y+pos.y);
    guide.TipLabel=new Label();guide.TipLabel.string=sourcePrefab[c.TipLabel.__id__]._string;
    assert(guide.IsConfigured,'inactive editor guides must remain readable');return guide;
});
assert(steps.length > 0);
// Conversion must account for different scales and non-centered source anchors.
const target=new Node('parent');target.factor=2;target.worldPosition=new Vec3(20,40);
const probe=new Guidance();probe.node=new Node('probe');probe.node.factor=0.5;probe.node.worldPosition=new Vec3(120,240);
const transform=probe.node.getComponent(UITransform);transform.width=200;transform.height=80;transform.anchorX=0.25;transform.anchorY=0;
const bounds=probe.GetMaskBounds(target.getComponent(UITransform));
assert.equal(bounds.width,50);assert.equal(bounds.height,20);assert.equal(bounds.position.x,62.5);assert.equal(bounds.position.y,110);
const Panel=loadClass(base+'Scripts/Panel/ZRSJZ_GuidancePanel.ts','ZRSJZ_GuidancePanel',globals);
const panel=new Panel();panel.node=new Node('guide');
const body=child(panel.node,'Panel'), mask=child(child(body,'MaskTip'),'Mask'), tip=child(body,'Tip');
mask.addComponent(Widget);tip.addComponent(Layout);const label=child(tip,'Tip').addComponent(Label);
const owner=new Node('pet');
panel.Show({steps,owner,feature:'宠物'});
assert.equal(saved,1);assert.equal(mask.getComponent(Widget).enabled,false);assert.equal(label.string,steps[0].TipLabel.string);
const event={};panel.OnNext(event);assert.equal(panel._index,0);assert.equal(event.propagationStopped,true);
for(let i=0;i<steps.length;i++){
    finish();assert(Math.abs(mask.getComponent(UITransform).width-steps[i].node.getComponent(UITransform).width)<1e-6);
    assert(Math.abs(mask.position.x-steps[i].node.worldPosition.x)<1e-6);assert.equal(tip.position.x,steps[i].TipNode.worldPosition.x);
    assert.equal(label.string,steps[i].TipLabel.string);panel.OnNext({});
}
assert.equal(closed,1);assert.equal(panel.node.active,false);assert.equal(jobs.length,0);assert(durations.every(d=>d===0.3));
data.StartedFeatureGuides=JSON.parse(JSON.stringify(data.StartedFeatureGuides));
panel.Show({steps,owner,feature:'宠物'});assert.equal(saved,1);assert.equal(panel.node.active,false);
// Pet entry opens guides only for an explicit first-unlock entry, after expansion.
globals.ZRSJZ_Guidance=Guidance;
globals.ZRSJZ_InventoryService={GetActivePlayerIndex:()=>0};globals.ZRSJZ_PetService={GetBattlePet:()=> 'pet'};
globals.ZRSJZ_PET_CONFIG=new Map([['pet',{}]]);
const PetPanel=loadClass(base+'Scripts/Panel/ZRSJZ_PetPanel.ts','ZRSJZ_PetPanel',globals,['Show']);
const pet=new PetPanel();pet.node=new Node('pet');const region=child(child(pet.node,'Panel'),'指导区域');region.getComponentsInChildren=()=>steps;
pet.CloseSkillInfo=pet.BuildItems=pet.Refresh=()=>{};
delete data.StartedFeatureGuides.宠物;
pet.Show();pet.afterShow();assert.equal(opened.length,0);
pet.Show({firstUnlock:true});assert.equal(opened.length,0);pet.afterShow();assert.equal(opened.length,1);
data.StartedFeatureGuides.宠物=true;pet.Show({firstUnlock:true});pet.afterShow();assert.equal(opened.length,1);
console.log('PASS: configured inactive regions, scaled coordinates, all configured texts/sizes, 0.3s movement, click sequence/cleanup, persistent first-entry gating');

const main = 'assets/Game_Bundles/73_ZRSJZ/';
const GuideService = loadClass(main+'Scripts/Service/ZRSJZ_GuidanceService.ts','ZRSJZ_GuidanceService',globals);
globals.ZRSJZ_GuidanceService = GuideService;
// 请求顺序和实际显示层级都要匹配，不能只判断旧面板仍为 active。
const Manager = loadClass(main+'Scripts/Manager/ZRSJZ_UIManager.ts','Manager',globals,['IsCurrentPanel']);
const manager=new Manager(), forgeOwner=new Node('forge'), boxOwner=new Node('box');
forgeOwner.parent=boxOwner.parent={};forgeOwner.getSiblingIndex=()=>1;boxOwner.getSiblingIndex=()=>2;
manager._panelMap=new Map([['forge',forgeOwner]]);manager._curPanel=['forge'];
assert.equal(manager.IsCurrentPanel(forgeOwner),true);
manager._curPanel.push('box'); // 盲盒仍在加载，锻造的延迟回调已经失效。
assert.equal(manager.IsCurrentPanel(forgeOwner),false);
manager._panelMap.set('box',boxOwner);assert.equal(manager.IsCurrentPanel(boxOwner),true);
manager._curPanel.push('guide');assert.equal(manager.IsCurrentPanel(boxOwner),true,'guide overlay itself must be ignored');
forgeOwner.getSiblingIndex=()=>3;assert.equal(manager.IsCurrentPanel(forgeOwner),false,'late forge load cannot override the latest request');
assert.equal(manager.IsCurrentPanel(boxOwner),false,'latest request must also be visibly on top');
forgeOwner.getSiblingIndex=()=>1;
manager._curPanel=['forge','guide'];boxOwner.active=false;assert.equal(manager.IsCurrentPanel(forgeOwner),true);
forgeOwner.active=false;assert.equal(manager.IsCurrentPanel(forgeOwner),false);

// 引导预制体自身加载期间切换页面：不能显示，也不能记为已播放。
currentPanelAllowed=false;
const savedBefore=saved, closedBefore=closed;
panel.Show({steps,owner,feature:'延迟锻造'});
assert.equal(saved,savedBefore);assert.equal(data.StartedFeatureGuides['延迟锻造'],undefined);
assert.equal(closed,closedBefore+1);assert.equal(panel.node.active,false);
currentPanelAllowed=true;panel.Show({steps,owner,feature:'播放中切换'});
currentPanelAllowed=false;panel.update();assert.equal(panel.node.active,false);assert.equal(jobs.length,0);
currentPanelAllowed=true;
for (const [feature, prefab, count] of [['锻造台','锻造界面',5],['曼德尔箱','曼德尔箱界面',5],['战令','战令界面',6]]) {
    const entries = JSON.parse(fs.readFileSync(base+`Prefabs/Panel/${prefab}.prefab`));
    const configured = entries.filter(n=>n.TipNode&&n.TipLabel);
    assert.equal(configured.length,count);
    for(const step of configured) {
        assert(entries[step.TipNode.__id__]);
        assert(entries[step.TipLabel.__id__]._string.trim());
        assert(entries[step.node.__id__]._components.some(r=>entries[r.__id__].__type__==='cc.UITransform'));
    }
    const owner=new Node(prefab), region=child(child(owner,'Panel'),'指导区域');
    const guides=configured.map(()=>({IsConfigured:true}));
    region.getComponentsInChildren=name=>{assert.equal(name,'ZRSJZ_Guidance');return guides;};
    const before=opened.length;
    GuideService.ShowFirstEntry(owner,feature,false);assert.equal(opened.length,before);
    currentPanelAllowed=false;GuideService.ShowFirstEntry(owner,feature,true);assert.equal(opened.length,before);
    currentPanelAllowed=true;
    GuideService.ShowFirstEntry(owner,feature,true);assert.equal(opened.length,before+1);
    assert.equal(opened.at(-1)[1].feature,feature);assert.equal(opened.at(-1)[1].steps.length,count);
    data.StartedFeatureGuides[feature]=true;
    GuideService.ShowFirstEntry(owner,feature,true);assert.equal(opened.length,before+1);
    delete data.StartedFeatureGuides[feature];owner.active=false;
    GuideService.ShowFirstEntry(owner,feature,true);assert.equal(opened.length,before+1);
}
const entryCalls=[];globals.ZRSJZ_GuidanceService={ShowFirstEntry(...args){entryCalls.push(args);}};
const Forge=loadClass(main+'Scripts/Panel/ZRSJZ_ForgePanel.ts','ZRSJZ_ForgePanel',globals,['Show']);
const forge=new Forge();forge.node=new Node('forge');forge.InitializeRuntime=()=>Promise.resolve();forge.RefreshAll=()=>{};
forge.Show({firstUnlock:true});assert.equal(entryCalls.length,0);forge.afterShow();assert.equal(entryCalls.at(-1)[1],'锻造台');assert.equal(entryCalls.at(-1)[2],true);
forge.Show(1);assert.equal(forge.PlayerIndex,1);forge.afterShow();assert.equal(entryCalls.at(-1)[2],false);
globals.Service={EnsurePeriods(){}};
const BattlePass=loadClass(base+'Scripts/Panel/ZRSJZ_BattlePassPanel.ts','ZRSJZ_BattlePassPanel',globals,['Show']);
const pass=new BattlePass();pass.node=new Node('pass');let scrollResets=0;
pass.scroll={scrollToLeft(){scrollResets++;}};pass.Refresh=pass.DrawProgress=()=>{};
pass.Show({firstUnlock:true});assert.equal(scrollResets,1);pass.afterShow();assert.equal(entryCalls.at(-1)[1],'战令');assert.equal(entryCalls.at(-1)[2],true);
pass.milestone=30;pass.Show(true);assert.equal(scrollResets,1);assert.equal(pass.milestone,30);pass.afterShow();assert.equal(entryCalls.at(-1)[2],false);
globals.Box={Pending:true};
const Mandell=loadClass(main+'Scripts/Panel/ZRSJZ_MandellBoxPanel.ts','ZRSJZ_MandellBoxPanel',globals,['Show']);
const box=new Mandell();box.node=new Node('box');child(box.node,'Panel');
box.Initialize=box.ClosePopups=box.Refresh=box.SetOpening=()=>{};
let complete;box.Open=()=>new Promise(resolve=>{complete=resolve;});
(async()=>{
    box.Show({firstUnlock:true});const before=entryCalls.length, waiting=box.afterShow();
    assert.equal(entryCalls.length,before);complete();await waiting;
    assert.equal(entryCalls.at(-1)[1],'曼德尔箱');assert.equal(entryCalls.at(-1)[2],true);
    console.log('PASS: first-entry routing, no repeats, panel request ordering/visible stacking, delayed guide cancellation, active guide cleanup, recovery and restore');
})().catch(error=>{console.error(error);process.exitCode=1;});
