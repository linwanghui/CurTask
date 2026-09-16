const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
const transpile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const c={};vm.runInNewContext(transpile(fs.readFileSync(root+'ZRSJZ_Constant.ts','utf8')),{exports:c,require});
function method(file,name,context){const src=fs.readFileSync(root+file,'utf8'),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true),cls=ast.statements.find(ts.isClassDeclaration),m=cls.members.find(n=>n.name?.getText(ast)===name);return vm.runInNewContext(transpile('(function('+m.parameters.map(p=>p.name.getText(ast)).join(',')+')'+m.body.getText(ast)+')'),context)}
const ctx={Math,Vec3:{distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)}};
const boss={node:{worldPosition:{x:0,y:0}},Target:{worldPosition:{x:350,y:0}},_normalAttackCooldown:0,_skillCooldowns:[0],_activeSkill:null,_activeNormalAttack:null,HasDirectPath:()=>true,UpdateAimDirection(){},EnemySkeleton:{SetBossAttackDirection(x,y){this.aim=[x,y]}},ClearNavigation(){},StopMoving(){},PlayAnimation(){}};
for(const n of ['GetAttackStartRange','TryStartNormalAttack','TryStartSkill','ConsumeAttackEvent','RefreshAttackDirection'])boss[n]=method('Controller/ZRSJZ_BossBase.ts',n,ctx);
let started=0;boss.StartAttackAction=(a,skill)=>{started++;boss._activeNormalAttack=skill?null:a;boss._activeSkill=skill?a:null;boss._activeAttackTriggered=false;};boss.StartSkill=a=>boss.StartAttackAction(a,true);
for(const [name,config]of c.ZRSJZ_BOSS_CONFIG){
 boss.BossConfig=config;boss._activeNormalAttack=boss._activeSkill=null;boss._normalAttackCooldown=0;boss.Target.worldPosition={x:350,y:0};
 assert.equal(boss.TryStartNormalAttack(),false,name+' must approach instead of swinging at 350');
 boss.Target.worldPosition={x:250,y:0};assert.equal(boss.TryStartNormalAttack(),true);assert(boss.GetAttackStartRange(config.NormalAttack)<=config.NormalAttack.DamageRange);
 boss.Target.worldPosition={x:0,y:200};assert(boss.ConsumeAttackEvent(config.NormalAttack.TriggerEvent));assert.deepEqual(boss.EnemySkeleton.aim,[0,200]);assert.equal(boss.ConsumeAttackEvent(config.NormalAttack.TriggerEvent),null,'one hit per action');
 boss._activeNormalAttack=null;boss.Target.worldPosition={x:450,y:0};assert.equal(boss.TryStartSkill(),false);boss.Target.worldPosition={x:400,y:0};assert.equal(boss.TryStartSkill(),true);boss._activeSkill=null;
 boss.HasDirectPath=()=>false;assert.equal(boss.TryStartSkill(),false,'no skill through wall');boss.HasDirectPath=()=>true;
}
const visual={_baseAngle:0,node:{setRotationFromEuler(x,y,z){this.angle=z}},SetPlayerDir(x){this.facing=x},AttackX:-1};
const turn=method('Controller/ZRSJZ_EnemySkeleton.ts','SetBossAttackDirection',{Math}),reset=method('Controller/ZRSJZ_EnemySkeleton.ts','ResetBossAttackDirection',{Math});
turn.call(visual,0,1);assert.equal(visual.node.angle,90);turn.call(visual,-1,0);assert.equal(visual.node.angle,0);assert.equal(visual.facing,-1);reset.call(visual);assert.equal(visual.node.angle,0);assert.equal(visual.facing,-1);
let previous=0;for(const [name,map]of [...c.ZRSJZ_MAP_CONFIG].filter(([n])=>n!=='新手村').sort((a,b)=>a[1].Difficulty-b[1].Difficulty)){
 assert(map.RequiredLoadoutValue>previous);previous=map.RequiredLoadoutValue;
 const gift=c.ZRSJZ_ASSIST_FIGHTING_GIFT_CONFIG.get(map.Difficulty),price=[gift.WeaponName,gift.HelmetName,gift.ArmorName,gift.BackpackName].reduce((s,n)=>s+c.ZRSJZ_PROP_CONFIG.get(n).UnitPrice,0)+c.ZRSJZ_PROP_CONFIG.get(gift.AmmoName).UnitPrice*60*gift.AmmoStackCount;
 assert(price>=map.RequiredLoadoutValue,'assist gift below gate '+name);
 for(const [bossName,b]of map.MapBoss)assert(c.ZRSJZ_BOSS_CONFIG.get(bossName).ChaseSpeed*b.SpeedMultiplier>1980);
 console.log(name,'gate',map.RequiredLoadoutValue,'gift',price);
}
assert.equal(c.ZRSJZ_MAP_CONFIG.get('新手村').RequiredLoadoutValue,0);
const zeroEquipment=[...c.ZRSJZ_PROP_CONFIG.values()].filter(p=>['头盔','防弹衣','背包','枪'].includes(p.PropType)&&p.UnitPrice===0);
assert.equal(zeroEquipment.length,24);
// 准入边界：差1元不能进入、达到门槛可以进入。
const invCtx={ZRSJZ_MAP_CONFIG:c.ZRSJZ_MAP_CONFIG,Math};const entry=method('Service/ZRSJZ_InventoryService.ts','GetBattleEntryError',invCtx);
for(const [name,map]of c.ZRSJZ_MAP_CONFIG){if(name==='新手村')continue;assert(entry.call({GetLoadoutValue:()=>map.RequiredLoadoutValue-1},name));assert.equal(entry.call({GetLoadoutValue:()=>map.RequiredLoadoutValue},name),'');}
console.log('PASS: 3 bosses range/dead-zone, live aim, one event/attack, wall guard, visual rotation/reset, rising gates, gift affordability, boss speed, 24 restored zero prices, exact entry boundary.');
