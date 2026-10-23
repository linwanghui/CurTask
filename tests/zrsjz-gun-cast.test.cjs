const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const p='assets/Game_Bundles/73_ZRSJZ/Scripts/';const constants=fs.readFileSync(p+'ZRSJZ_Constant.ts','utf8').split('export const ZRSJZ_GUN_CAST_CONFIG =')[1];
let balance=2000000,storage={};const context={sys:{localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v}},ZRSJZ_GameData:{Instance:{get Gold(){return balance}}},ZRSJZ_AccountService:{ChangeGold:n=>balance+=n}};
const src='const C ='+constants+'\n'+fs.readFileSync(p+'Service/ZRSJZ_GunCastService.ts','utf8').replace(/^import .*;$/gm,'').replace('export class','class')+'\n({S:ZRSJZ_GunCastService,C})';
const {S,C}=vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
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
assert(panel.includes("setAnimation(0,'qiaoji',false)"));
assert(panel.includes("this.bind('返回',()=>this.close())"));
for(const name of ['铸枪界面','铸枪入口弹窗','枪械图鉴弹窗']){const a=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/'+name+'.prefab'));assert(a[1]._components.some(c=>a[c.__id__].__type__.startsWith('3f92c')));}
console.log('Cocos registration, prefab binding, animation resource checks passed');

assert(!fs.readFileSync(p+'Manager/ZRSJZ_UIManager.ts','utf8').includes('ZRSJZ_GunCastPanel'));
