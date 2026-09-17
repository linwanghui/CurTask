const fs=require('fs'), vm=require('vm'), assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/';
const source=fs.readFileSync(root+'ZRSJZ_PlayerSkeleton.ts','utf8');
const ast=ts.createSourceFile('s.ts',source,ts.ScriptTarget.Latest,true);
const cls=ast.statements.find(ts.isClassDeclaration);
const method=cls.members.find(m=>m.name?.getText(ast)==='ClearAttackAnimation');
const clear=vm.runInNewContext(ts.transpileModule('(function()'+method.body.getText(ast)+')',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText);
for(const file of ['assets/Game_Bundles/73_ZRSJZ/Spine/玩家/威蓝/1.json','assets/Game_Bundles/73_ZRSJZ_DLC/Spine/玩家/1.json']){
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 const effects=new Set();
 for(const [name,animation]of Object.entries(data.animations)){
  if(!name.startsWith('gj_dao'))continue;
  for(const [slot,timeline]of Object.entries(animation.slots||{})){
   if((timeline.attachment||[]).some(frame=>/^(images\/|dg\d\/)/.test(frame.name||'')))effects.add(slot);
  }
 }
 assert.equal(effects.size,12);
 const slots=new Map(data.slots.map(s=>[s.name,{attachment:'preserved',setAttachment(v){this.attachment=v;}}]));
 const callbacks=new Map([[0,'idle'],[1,'attack']]);
 const cleared=[];
 const player={_trackCompleteCallbacks:callbacks,Skeleton:{clearTrack:n=>cleared.push(n),findSlot:n=>slots.get(n)}};
 clear.call(player);
 for(const name of effects)assert.equal(slots.get(name).attachment,null,name);
 for(const [name,slot]of slots)if(!effects.has(name))assert.equal(slot.attachment,'preserved',name);
 assert(!callbacks.has(1));assert(callbacks.has(0));assert.deepEqual(cleared,[1]);
 clear.call(player); // Repeated death/revive cleanup is safe.
 console.log('PASS: all knife effect slots cleared, equipment/body slots preserved:',file);
}
clear.call({_trackCompleteCallbacks:new Map(),Skeleton:null});
const playerSource=fs.readFileSync(root+'ZRSJZ_Player.ts','utf8');
const revive=playerSource.slice(playerSource.indexOf('    Resurgence('),playerSource.indexOf('    //#region 寻找敌人'));
assert(revive.indexOf('this.CancelKnifeAttackState();')<revive.indexOf('this.CurHP = this.MaxHP;'));
assert(revive.includes('this.CancelKnifeAttackState();'));
console.log('PASS: revive clears interrupted attacks before restoring health.');
