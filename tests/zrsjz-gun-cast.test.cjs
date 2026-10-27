const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const p='assets/Game_Bundles/73_ZRSJZ/Scripts/';const constants=fs.readFileSync(p+'ZRSJZ_Constant.ts','utf8').split('export const ZRSJZ_GUN_CAST_CONFIG =')[1];
let balance=2000000,storage={};const context={sys:{localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v}},ZRSJZ_GameData:{Instance:{get Gold(){return balance}}},ZRSJZ_AccountService:{ChangeGold:n=>balance+=n}};
const src='const C ='+constants+'\n'+fs.readFileSync(p+'Service/ZRSJZ_GunCastService.ts','utf8').replace(/^import .*;$/gm,'').replace(/^export type .*;$/gm,'').replace('export class','class')+'\n({S:ZRSJZ_GunCastService,C})';
const {S,C}=vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
for (const [branch, name] of ['冰霜裁决', '烈焰破军', '蚀骨毒牙'].entries()) {
 assert.equal(C.branches[branch].name,name);
 assert.equal(S.item({level:12,branch}),name,'final award must be the named weapon itself');
}
for(const row of C.probabilities)assert.equal(row.reduce((a,b)=>a+b,0),100);
assert(S.free());assert.equal(S.enter(true),'');assert.equal(balance,2000000);assert(!S.free());assert.equal(S.hit(()=>.5),1);assert.equal(S.load().round.level,1);
S.finish();assert(S.enter(true));assert.equal(S.enter(false),'');assert.equal(balance,1000000);S.enter(false);assert.equal(balance,1000000);
let d=S.load();d.round.level=5;d.round.superUntil=Date.now()+10000;S.save(d);assert.equal(S.hit(()=>.99),4);assert.equal(S.load().round.broken,false);assert.equal(S.load().round.level,5);
d=S.load();d.round.superUntil=0;S.save(d);S.hit(()=>.99);assert(S.load().round.broken);for(let i=0;i<C.recoveryAds;i++)S.recover();assert.equal(S.load().round.broken,false);assert(S.load().round.recovered);S.hit(()=>.99);S.recover();assert(S.load().round.broken);
S.finish();S.enter(false);d=S.load();d.round.level=11;S.save(d);S.hit(()=>0);assert.equal(S.load().round.level,12);assert.equal(S.hit(),-1);console.log('gun cast state and economy checks passed');

const panel=fs.readFileSync(p+'Panel/ZRSJZ_GunCastPanel.ts','utf8');
assert.equal((panel.match(/@ccclass\(/g)||[]).length,1,'one Cocos component registration per script');
assert(!fs.readFileSync(p+'Manager/ZRSJZ_UIManager.ts','utf8').includes("from '../Panel/ZRSJZ_GunCastPanel'"),'UI manager must not import gameplay panel');
const hammer=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Spine/铸枪/skeleton.json','utf8').replace(/^\uFEFF/,''));
assert(hammer.animations.qiaoji);assert(hammer.animations.qiaoji.events.some(e=>e.name==='qiaoji'));
assert.match(panel,/setAnimation\(0,\s*'qiaoji',\s*false\)/);
assert.match(panel,/this\.bind\('返回\/返回',\s*\(\)\s*=>\s*this\.close\(\)\)/);
for(const name of ['铸枪界面','铸枪入口弹窗','枪械图鉴弹窗']){const a=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/'+name+'.prefab'));assert(a[1]._components.some(c=>a[c.__id__].__type__.startsWith('3f92c')));}
console.log('Cocos registration, prefab binding, animation resource checks passed');

assert(!fs.readFileSync(p+'Manager/ZRSJZ_UIManager.ts','utf8').includes('ZRSJZ_GunCastPanel'));

// 每把枪使用独立次数，未看满不能恢复；进度持久化，恢复仍仅限每炉一次。
for (let level=0;level<C.weapons.length;level++) {
 const item=C.weapons[level],required=C.recoveryAdsByWeapon[item];
 assert(Number.isInteger(required)&&required>0,item+' recovery count');
 S.save({date:S.today(),seen:[],round:{id:level,level,branch:0,broken:true,recovered:false,ads:0}});
 assert.equal(S.recoveryAds(S.load().round),required);
 for(let seen=1;seen<=required;seen++) {
  S.recover();const round=S.load().round;
  assert.equal(round.ads,seen);assert.equal(round.broken,seen<required);assert.equal(round.recovered,seen===required);
 }
 d=S.load();d.round.broken=true;S.save(d);S.recover();
 assert(S.load().round.broken);assert.equal(S.load().round.ads,required);
}
assert(new Set(C.weapons.map((item,level)=>S.recoveryAds({level,branch:0}))).size>1,'weapons have different recovery requirements');
assert.equal(S.recoveryAds({level:12,branch:0}),C.recoveryAds,'unconfigured weapon uses default');
assert(panel.includes('const recoveryAds = S.recoveryAds(r);'));
assert(!panel.includes('C.recoveryAds'),'display and service share weapon-specific requirement');
console.log('weapon-specific recovery requirements, saved progress and one-time recovery checks passed');

// 作弊只影响下一次有效敲击，未入场、已损毁或满级时不消耗。
S.finish();S.guaranteeNextSuccess();S.guaranteeNextSuccess();
assert.equal(S.hit(()=>.99),-1);assert(S.load().nextHitSuccess);
S.save({...S.load(),round:{level:5,branch:0,hits:0,superUntil:0,broken:true,recovered:false,ads:0}});
assert.equal(S.hit(()=>.99),-1);assert(S.load().nextHitSuccess);
d=S.load();d.round.level=12;d.round.broken=false;S.save(d);
assert.equal(S.hit(()=>.99),-1);assert(S.load().nextHitSuccess);
d=S.load();d.round.level=5;S.save(d);
assert.equal(S.hit(()=>.99),1);assert.equal(S.load().round.level,6);
assert(!S.load().round.broken);assert(!S.load().nextHitSuccess);
assert.equal(S.hit(()=>.99),4);assert(S.load().round.broken);
S.guaranteeNextSuccess();S.finish();
balance=C.entryCost;
assert.equal(S.enter(false),'');assert.equal(S.hit(()=>.99),1);
assert(!S.load().nextHitSuccess);
const cheatSource=fs.readFileSync(p+'Panel/ZRSJZ_CheatingPanel.ts','utf8');
const cheatCase=cheatSource.match(/case '下次铸枪100%成功':([\s\S]*?)break;/)[1];
vm.runInNewContext(cheatCase,{ZRSJZ_GunCastService:S,ZRSJZ_UIManager:{Instance:{ShowTip(){}}}});
assert(S.load().nextHitSuccess,'cheat button arms the service');
const cheatPrefab=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/作弊界面.prefab','utf8'));
const cheatButton=cheatPrefab.find(n=>n.__type__==='cc.Node'&&n._name==='下次铸枪100%成功');
assert(cheatButton);assert(cheatPrefab[cheatButton._parent.__id__]._children.some(c=>cheatPrefab[c.__id__]===cheatButton));
const buttonComponent=cheatButton._components.map(c=>cheatPrefab[c.__id__]).find(c=>c.__type__==='cc.Button');
assert(buttonComponent.clickEvents.some(e=>cheatPrefab[e.__id__].handler==='OnButtonClick'));
const fileIds=cheatPrefab.filter(v=>v.fileId).map(v=>v.fileId);
assert.equal(new Set(fileIds).size,fileIds.length);
console.log('one-shot guaranteed casting success and serialized cheat button checks passed');

for(const raw of ['{','null','42','true','"legacy"','[]']){
 storage[S.key]=raw;assert.equal(S.load().date,'');assert.equal(S.load().seen.length,0);
}
storage[S.key]=JSON.stringify({date:S.today(),round:{level:5,broken:true}});
assert.equal(S.load().round.id,S.load().round.id,'legacy round ID must be stable for ad callbacks');
assert.equal(S.load().round.ads,0);S.recover();assert.equal(S.load().round.ads,1,'first video must count for incomplete saves');
storage[S.key]=JSON.stringify({date:S.today(),round:{level:5}});
assert.doesNotThrow(()=>S.hit(()=>.5),'missing seen/hits must not crash a valid saved round');
assert(S.load().seen.length>0,'recovered save records the outcome using current probability settings');
for(const level of [-1,13,null,'5']){
 storage[S.key]=JSON.stringify({date:S.today(),round:{level}});
 assert(!S.load().round);assert(!S.free(),'invalid progress must preserve the used daily entry');
}
console.log('invalid and incomplete gun cast save recovery checks passed');
