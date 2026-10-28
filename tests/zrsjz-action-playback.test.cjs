const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const source = fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_Skeleton.ts', 'utf8');
const tree = ts.createSourceFile('skeleton.ts', source, ts.ScriptTarget.Latest, true);
const cls = tree.statements.find(n => ts.isClassDeclaration(n));
const names = ['IsPerformingAction','PlayAction','StopAction','UpdateActionPose','HideActionWeapons','OnActionStarting'];
const members = cls.members.filter(n => names.includes(n.name?.getText(tree)) || n.name?.getText(tree).startsWith('_action'));
const event = tree.statements.find(n => ts.isVariableStatement(n) && n.getText(tree).startsWith('const ACTION_POSE_EVENT'));
const js = ts.transpileModule(`${event.getText(tree)}\nclass Actor { ${members.map(n=>n.getText(tree)).join('\n')} }; Actor;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;
const asset = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Spine/玩家/1.json','utf8'));
for(const name of ['闪身步','哆嗦毛','浪子踢球']) assert.ok(asset.animations[name], 'Missing authored animation '+name);
for(const native of [true,false]) {
    const listeners = new Map(), callbacks = [], slots = new Map();
    for(const name of ['dao','步枪','帽子']) slots.set(name,{attachment:name,setAttachment(v){this.attachment=v;}});
    const director = {
        getScene:()=>({name:'ZRSJZ_Game'}),
        on(e,fn,target){assert.equal(e,native?'after-update':'before-draw');listeners.set(target,fn);},
        off(e,fn,target){listeners.delete(target);},
    };
    let audioStarts=0,audioStops=0;
    const Actor = vm.runInNewContext(js,{director,NATIVE:native,
        ZRSJZ_AudioManager:{Instance:{PlayActionSound(){audioStarts++;return()=>audioStops++;}}},
        Director:{EVENT_AFTER_UPDATE:'after-update',EVENT_BEFORE_DRAW:'before-draw'},
        isValid:v=>!!v?.isValid,ZRSJZ_WEAPONRY_TYPE:new Map([['步枪',[]]]),
    });
    const a=new Actor();let track='',restored=0,stopped=0;
    a.enabledInHierarchy=true;
    a.Skeleton={isValid:true,findAnimation:n=>asset.animations[n],clearTracks(){track='';},clearTrack(){track='';},
        setToSetupPose(){},setAnimation(i,n){track=n;return{};},setTrackCompleteListener(e,fn){callbacks.push(fn);},
        findSlot:n=>slots.get(n)};
    a.RefreshEquipmentAppearance=()=>{restored++;slots.get('步枪').attachment='步枪';};
    a.PlayAni=n=>{track=n;};
    assert.equal(a.PlayAction('missing','idle'),false);assert.equal(listeners.size,0);
    assert.equal(a.PlayAction('浪子踢球','idle',()=>stopped++),true);
    assert.equal(slots.get('步枪').attachment,null);assert.equal(slots.get('帽子').attachment,'帽子');
    const obsolete=callbacks[0];
    a.PlayAction('闪身步','idle',()=>stopped++);
    assert.equal(listeners.size,1);obsolete();a.UpdateActionPose();assert.equal(track,'闪身步');
    slots.get('步枪').attachment='animation restored weapon';a.UpdateActionPose();assert.equal(slots.get('步枪').attachment,null);
    callbacks[1]();assert.equal(track,'闪身步','Completion callback must not change native tracks reentrantly');
    a.UpdateActionPose();assert.equal(track,'idle');assert.equal(listeners.size,0);
    assert.equal(stopped,2);assert.equal(restored,2);assert.equal(a.IsPerformingAction,false);
    a.StopAction();assert.equal(stopped,2,'Repeated stop must be idempotent');
    a.PlayAction('哆嗦毛','idle');a.enabledInHierarchy=false;a.UpdateActionPose();
    assert.equal(listeners.size,0);assert.equal(a.IsPerformingAction,false);
    assert.equal(audioStarts,3);assert.equal(audioStops,3,'Replacement, completion and disable must stop the matching audio');
}
console.log('PASS: authored animations, native/web timing, weapon hiding, natural completion, stale callbacks, replacement and disable cleanup');
