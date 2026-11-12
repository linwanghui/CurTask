const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const base = (process.env.ZRSJZ_TEST_ROOT || '.') + '/assets/Game_Bundles/73_ZRSJZ/Scripts/';
function subject(file, names, globals) {
    const source = fs.readFileSync(base + file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const members = ast.statements.find(ts.isClassDeclaration).members.filter(m => names.includes(m.name?.getText(ast)));
    return vm.runInNewContext(ts.transpileModule(`class Subject {${members.map(m => m.getText(ast)).join('\n')}}; Subject`, {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText, globals);
}
const queued = [], globalMock = { isValid: o => !!o && o.valid !== false,
    Director: {EVENT_AFTER_DRAW:'after'}, director:{once(event, cb){assert.equal(event,'after');queued.push(cb);}}, sp:{Skeleton:class{}} };
const Preview = subject('Controller/ZRSJZ_SkinSkeleton.ts', ['RetirePreviewEffect','ClearPreviewEffects'], globalMock);
const preview = new Preview(); let destroyed = 0;
const spine = {paused:false,setCompleteListener(v){this.complete=v;},setStartListener(){},setEventListener(){}};
const effect = {active:true,parent:{},getComponentsInChildren(){return [spine];},removeFromParent(){this.parent=null;},destroy(){destroyed++;this.valid=false;}};
Object.assign(preview,{_previewEffects:new Set([effect]),_completedEffects:new Set([effect]),_pendingMissiles:['p1'],_pendingLuna:true,_pendingFengYi:true});
preview.ClearPreviewEffects();
assert(spine.paused);assert.equal(spine.complete,null);assert.equal(effect.active,false);assert(effect.parent,'parent children must stay stable while NodeActivator traverses');
assert.equal(destroyed,0,'middleware still owns render entity until after draw');
assert.equal(preview._pendingMissiles.length,0);assert.equal(preview._previewEffects.size,0);
preview.ClearPreviewEffects();assert.equal(queued.length,1,'closing twice does not double destroy');
queued.shift()();assert.equal(destroyed,1);assert.equal(effect.parent,null);
// Match NodeActivator's fixed child-count traversal: removing a sibling in onDisable
// would make the final indexed child undefined, reproducing the reported exception.
for (const role of ['霁锋','沧戈','浅燎']) {
    const parent={children:[]};
    const fx={active:true,parent,valid:true,getComponentsInChildren(){return [spine];},
        removeFromParent(){parent.children.splice(parent.children.indexOf(this),1);this.parent=null;},destroy(){this.valid=false;}};
    const skin={activeInHierarchy:true,disable(){preview.ClearPreviewEffects();}};
    parent.children=[skin,fx,{activeInHierarchy:true}];
    Object.assign(preview,{_previewEffects:new Set([fx]),_completedEffects:new Set(),_pendingMissiles:[]});
    const count=parent.children.length;
    for(let i=0;i<count;i++) {
        const child=parent.children[i];assert(child,role+' must preserve children during recursive deactivation');
        child.disable?.();
    }
    assert.equal(parent.children.length,3);queued.shift()();assert.equal(parent.children.length,2);
}
const Missile = subject('Skill/ZRSJZ_UluMissile.ts',['Explode','update','Finish','Reset'],{...globalMock,ZRSJZ_PoolManager:{Instance:{PutNode(){throw Error('preview must not pool');}}}});
const missile = new Missile(); let complete, resets = 0;
Object.assign(missile,{_state:'flying',_target:{clone(){return {}; }},Missile:{node:{}},Explosion:{node:{setWorldRotationFromEuler(){}},setCompleteListener(cb){complete=cb;},setAnimation(){}},node:{setWorldPosition(){}},_onExplode:null});
missile.Explode();const finish=missile.Finish.bind(missile);missile.Finish=()=>{resets++;};
complete();assert.equal(resets,0,'native callback must not release objects or clear tracks');
missile.update(.016);assert.equal(resets,1);
missile.Reset();assert.equal(missile._explosionComplete,false);assert.equal(missile._state,'idle');
console.log('PASS: interrupted preview defers destruction past render, repeated close is safe, explosion completion only queues cleanup and reset cancels pending completion.');
