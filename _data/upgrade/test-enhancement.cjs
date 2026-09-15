const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const root=path.resolve(__dirname,'../../assets/Game_Bundles/73_ZRSJZ'),cache=new Map(),storage=new Map(),events=[];
const stubs={cc:{sys:{localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}}},
 ZRSJZ_EventManager:{ZRSJZ_EventManager:{Emit:(...a)=>events.push(a),EmitPersist:(...a)=>events.push(a)},ZRSJZ_MyEvent:{}},
 ZRSJZ_MailService:{ZRSJZ_MailService:{CheckExpired(){}}},
 ZRSJZ_GradeService:{ZRSJZ_GradeService:{GetExperienceToNextLevel:()=>1234}},
 ZRSJZ_PlayerSwitchButton:{ZRSJZ_PlayerSwitchButton:{}}};
function load(file){
 file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;
 const m={exports:{}};cache.set(file,m);
 const src=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
 const req=id=>stubs[id]??stubs[path.basename(id)]??load(path.resolve(path.dirname(file),id+'.ts'));
 vm.runInThisContext('(function(require,module,exports){'+src+'\n})',{filename:file})(req,m,m.exports);return m.exports;
}
const cfg=load('Scripts/ZRSJZ_EnhancementConfig.ts'),C=load('Scripts/ZRSJZ_Constant.ts');
const Data=load('Scripts/ZRSJZ_GameData.ts').ZRSJZ_GameData;
const U=load('Scripts/Service/ZRSJZ_EnhancementService.ts').ZRSJZ_EnhancementService;
const I=load('Scripts/Service/ZRSJZ_InventoryService.ts').ZRSJZ_InventoryService;
const B=load('Scripts/Service/ZRSJZ_BoosterShotService.ts').ZRSJZ_BoosterShotService;
const F=load('Scripts/Service/ZRSJZ_FacilityService.ts').ZRSJZ_FacilityService;
const read=old=>{storage.set('ZRSJZ_GameData',JSON.stringify(old));Data._instance=null;return Data.Instance;};
assert.equal(cfg.ZRSJZ_ENHANCEMENT_NODES.length,60);
assert.equal(new Set(cfg.ZRSJZ_ENHANCEMENT_NODES.map(n=>n.ID)).size,60);
assert.equal(new Set(cfg.ZRSJZ_ENHANCEMENT_NODES.map(n=>n.Stat)).size,8);
for(const n of cfg.ZRSJZ_ENHANCEMENT_NODES){assert(n.Gold>0);for(const m of n.Materials){assert(C.ZRSJZ_PROP_CONFIG.has(m.PropName),m.PropName);assert(m.Count>0);}}
for(const version of [undefined,0,1,2,3,4,5,6,7,8]){
 const old={Versions:version,Gold:98765,FacilityLevel:{靶场:3,研究所:2,健身:4},FiringRangeLevel:5,InventoryRow:{仓库_全部:37},PropData:{},MainTaskComplete:[]};
 const json=JSON.stringify(old),d=read(old);
 assert.equal(d.Versions,9);assert.equal(d.EnhancementLevel,9);assert.deepEqual(d.EnhancementSpecials,['special_5']);
 assert.equal(d.Gold,old.Gold);assert.deepEqual(d.InventoryRow,old.InventoryRow);assert.deepEqual(d.FacilityLevel,old.FacilityLevel);
 assert.equal(storage.get('ZRSJZ_GameData_before_v9'),json);
 const save=storage.get('ZRSJZ_GameData');Data._instance=null;assert.equal(Data.Instance.EnhancementLevel,9);assert.equal(storage.get('ZRSJZ_GameData'),save);
}
assert.equal(read({Versions:1,FiringRangeLevel:4}).EnhancementLevel,4);
assert.equal(read({Versions:8,FacilityLevel:{靶场:5,研究所:5,健身:5}}).EnhancementSpecials.length,3);
assert.equal(read({Versions:8,FacilityLevel:{靶场:-1,研究所:'oops',健身:99}}).EnhancementLevel,5);
storage.clear();Data._instance=null;assert.equal(Data.Instance.EnhancementLevel,0);assert.equal(Data.Instance.Versions,9);
const fill=n=>{Data.Instance.Gold=1000000000;for(const m of n.Materials)I.AddPropByName(m.PropName,m.Count);};
const first=U.GetNode('main_1');
let before=JSON.stringify(Data.Instance);assert(U.Purchase('main_2'));assert.equal(JSON.stringify(Data.Instance),before);
assert(U.Purchase('special_5'));assert.equal(JSON.stringify(Data.Instance),before);
assert(U.Purchase('main_1'));assert.equal(JSON.stringify(Data.Instance),before);
fill(first);Data.Instance.Gold=0;before=JSON.stringify(Data.Instance);assert(U.Purchase('main_1'));assert.equal(JSON.stringify(Data.Instance),before);
Data.Instance.Gold=1000000000;
for(let level=1;level<=50;level++){
 const node=U.GetNode('main_'+level);fill(node);
 const gold=Data.Instance.Gold,counts=node.Materials.map(m=>I.GetPropCountByName(m.PropName));
 assert.equal(U.Purchase(node.ID),'');assert.equal(U.Level,level);assert.equal(Data.Instance.Gold,gold-node.Gold);
 node.Materials.forEach((m,i)=>assert.equal(I.GetPropCountByName(m.PropName),counts[i]-m.Count));
 const once=JSON.stringify(Data.Instance);assert(U.Purchase(node.ID));assert.equal(JSON.stringify(Data.Instance),once);
}
assert.equal(U.GetBonus('换弹速度'),0);assert.equal(U.GetBonus('大红掉落概率'),0);
for(const node of cfg.ZRSJZ_ENHANCEMENT_NODES.filter(n=>n.Special)){fill(node);assert.equal(U.Purchase(node.ID),'');}
assert.equal(U.Level,50);assert.equal(Data.Instance.EnhancementSpecials.length,10);
assert.equal(U.GetBonus('攻击'),100);assert.equal(U.GetBonus('生命'),200);assert.equal(U.GetBonus('防御'),50);
assert.equal(U.GetBonus('移速'),10);assert.equal(U.GetBonus('技能伤害'),30);assert.equal(U.GetBonus('技能冷却'),10);
assert.equal(U.GetSkillDamage(100),130);assert.equal(U.GetCooldownDuration(20),18);assert.equal(U.GetReloadDuration(5),4);
assert.equal(F.GetFiringRangeAttackBonusRate(),0);assert.equal(F.GetResearchMaxHPBonus(),200);assert.equal(F.GetGymMoveSpeedBonusRate(),.1);
Data.Instance.FacilityLevel={靶场:5,研究所:5,健身:5};assert.equal(F.GetFiringRangeAttackBonusRate(),0);assert.equal(F.GetResearchMaxHPBonus(),200);
assert(Math.abs(B.GetBoostedRedProbability(.1)-.11)<1e-9);
const w=B.ApplyRedProbabilityToWeights([90,10],1);assert(Math.abs(w[1]/(w[0]+w[1])-.11)<1e-9);
assert.deepEqual(B.ApplyRedProbabilityToWeights([100,0],1),[100,0]);
Data.SaveData();Data._instance=null;assert.equal(U.Level,50);assert.equal(U.GetBonus('换弹速度'),25);
console.log('PASS: 60 nodes, 8 stats, save versions 0–8 + unversioned, backup/idempotence, exact resource debit, insufficient resources, sequential + optional milestone unlocks, duplicate purchases, max level, damage/cooldown/reload/drop and retired legacy bonuses.');
