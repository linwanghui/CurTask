const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
const transpile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const c={};vm.runInNewContext(transpile(fs.readFileSync(root+'ZRSJZ_Constant.ts','utf8')),{exports:c,require});
function method(file,name,context){const src=fs.readFileSync(root+file,'utf8'),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true),cls=ast.statements.find(ts.isClassDeclaration),m=cls.members.find(n=>n.name?.getText(ast)===name);return vm.runInNewContext(transpile('(function('+m.parameters.map(p=>p.name.getText(ast)).join(',')+')'+m.body.getText(ast)+')'),context)}

const files=['assets/Game_Bundles/73_ZRSJZ/Spine/boss1/boss1.json','assets/Game_Bundles/73_ZRSJZ_DLC/Spine/boss2/yis.json','assets/Game_Bundles/73_ZRSJZ_DLC/Spine/boss3/xiaot.json'];
let hits=0;const player={node:{activeInHierarchy:true,worldPosition:{x:0,y:0}},BeHit(){hits++}};
const damage={CanDamage:()=>true,DamagePetsInRange(){}};
damage.DamageArea=method('Service/ZRSJZ_FriendlyDamageService.ts','DamageArea',{isValid:v=>!!v,Vec3:{distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)},ZRSJZ_Game:{Instance:{Players:[player]}}});
const ctx={ZRSJZ_DestructibleService:{HitArea(){}},ZRSJZ_FriendlyDamageService:damage,Coop:{SendArea(){}}};
for(const [i,[name,config]]of [...c.ZRSJZ_BOSS_CONFIG].entries()){
 const animations=JSON.parse(fs.readFileSync(files[i],'utf8')).animations;
 const boss={node:{worldPosition:{x:0,y:0}},FireBoneName:'testBone',boneX:1000,_getStartPos(name){assert.equal(name,this.FireBoneName);return {x:this.boneX,y:0};},DamageMultiplier:1,RefreshAttackDirection(){},_activeAttackHitCount:0,_activeAttackEventTimes:new Set()};
 boss.ConsumeAttackEvent=method('Controller/ZRSJZ_BossBase.ts','ConsumeAttackEvent',{});boss._attack=method('Controller/ZRSJZ_Boss.ts','_attack',ctx);const attack=method('Controller/ZRSJZ_Boss.ts','OnAttack',ctx);
 for(const skill of [config.NormalAttack,...config.Skills]){
  const events=animations[skill.Animation].events.filter(e=>e.name===skill.TriggerEvent);assert.equal(events.length,skill.HitCount??1,name+' events/config mismatch');
  boss._activeSkill=skill===config.NormalAttack?null:skill;boss._activeNormalAttack=skill===config.NormalAttack?skill:null;
  for(const moving of [false,true]){
   boss._activeAttackHitCount=0;boss._activeAttackEventTimes.clear();hits=0;
   events.forEach((event,index)=>{boss.boneX=1000+index*100;const center=['普通攻击','死亡剪刀'].includes(skill.Name)?boss.boneX:0;player.node.worldPosition.x=center+(moving&&index%2?skill.DamageRange+100:skill.DamageRange-1);attack.call(boss,event.name,event.time);attack.call(boss,event.name,event.time)});
   assert.equal(hits,moving?Math.ceil(events.length/2):events.length,'per-hit range/dedup');
   attack.call(boss,skill.TriggerEvent,999);assert.equal(boss._activeAttackHitCount,events.length,'hit cap');
  }
 }
 console.log(name,'normal=1, skill=4; duplicate callbacks ignored, leaving range avoids later hits');
}
console.log('PASS real animation events and actual damage-area method for all bosses');
