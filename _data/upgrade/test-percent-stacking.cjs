const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const base='assets/Game_Bundles/73_ZRSJZ/Scripts/';
const source=fs.readFileSync(base+'Controller/ZRSJZ_Player.ts','utf8');
const ast=ts.createSourceFile('player.ts',source,ts.ScriptTarget.Latest,true);
const cls=ast.statements.find(n=>ts.isClassDeclaration(n));
const method=name=>cls.members.find(n=>n.name?.getText(ast)===name);
const transpile=code=>ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const props=new Map([['head',{'减伤':10}],['body',{'减伤':20}],['ammo',{'增伤':20}],['knife',{'伤害':100}]]);
const rates={defense:0,attack:0,speed:0},boost={防御针:0,攻击针:0,移速针:0},collection={'生命':0,'枪械伤害':0,'近战伤害':0};
const pet={DamageReduction:0,Attack:0,MaxHP:0};
const context={Math,ZRSJZ_PROP_PROPERTY:props,
 ZRSJZ_InventoryService:{GetWeaponryIDs:()=>['','h','b']},
 ZRSJZ_GameData:{Instance:{PropData:{h:{Name:'head'},b:{Name:'body'}}}},
 ZRSJZ_BoosterShotService:{GetBooster:k=>boost[k]||0,GetBoosterValue:()=>50},
 ZRSJZ_EnhancementService:{GetBonus:k=>k==='防御'?rates.defense*100:rates.attack*100},
 ZRSJZ_UIManager:{ZRSJZ_DLC:true},
 ZRSJZ_PetService:{GetBattlePet:()=>null,GetPlayerPassiveBonus:()=>pet},
 ZRSJZ_FacilityService:{GetFiringRangeAttackBonusRate:()=>0,GetResearchMaxHPBonus:()=>30,GetGymMoveSpeedBonusRate:()=>rates.speed},
 ZRSJZ_BoxroomService:{GetBoxroomAttributeBonusRate:k=>collection[k]||0}};
const evaluate=body=>vm.runInNewContext(transpile('(function(harm){'+body+'})'),context);
const equipment=evaluate(method('GetEquippedDamageMultiplier').body.getText(ast).slice(1,-1));
const hit=evaluate(source.slice(source.indexOf('        const incomingHarm ='),source.indexOf('        if (incomingHarm > 0)'))+'return madeHarm;');
const actor={PlayerIndex:0,_shielding:false,GetEquippedDamageMultiplier(){return equipment.call(this)}};
assert.equal(hit.call(actor,100),72);
props.get('head')['减伤']=50;props.get('body')['减伤']=50;assert.equal(hit.call(actor,100),25);
props.get('head')['减伤']=65;props.get('body')['减伤']=65;boost.防御针=.2;rates.defense=.2;pet.DamageReduction=.05;
assert.equal(hit.call(actor,100),7);actor._shielding=true;assert.equal(hit.call(actor,100),1);
actor._shielding=false;assert.equal(hit.call(actor,.01),1);assert.equal(hit.call(actor,0),0);
props.get('head')['减伤']=150;props.get('body')['减伤']=200;assert.equal(hit.call(actor,100),1);
// 执行源代码中的实际伤害表达式，确保子弹、收藏、增强针、强化分别乘算。
const statements=[];function walk(n){if(ts.isVariableStatement(n))statements.push(n);ts.forEachChild(n,walk)}walk(ast);
const declaration=name=>statements.filter(n=>n.declarationList.declarations.some(d=>d.name.getText(ast)===name));
const gunStart=source.indexOf('        const gunDamage =');
const gunEnd=source.indexOf('        const showBullet =',gunStart);
boost.攻击针=.15;rates.attack=.2;collection.枪械伤害=.1;collection.近战伤害=.3;pet.Attack=10;
const gun=vm.runInNewContext(transpile('(function(){const ammoName="ammo";'+source.slice(gunStart,gunEnd)+'return finalDamage;})'),context);
assert.equal(gun.call({PlayerIndex:0,GetGunProperty:()=>100,GetBulletLevel:()=>6}),192);
const melee=evaluate('const damage=100;'+declaration('finalDamage')[1].getText(ast)+'return finalDamage;');
assert.equal(melee.call({PlayerIndex:0}),189);
context.ZRSJZ_UIManager.ZRSJZ_DLC=false;assert.equal(melee.call({PlayerIndex:0}),138);context.ZRSJZ_UIManager.ZRSJZ_DLC=true;
const hpCode=source.match(/this.MaxHP = this.InitHP[\s\S]*?;/)[0];collection.生命=.2;pet.MaxHP=50;
const life={InitHP:100,PlayerIndex:0};evaluate(hpCode).call(life);assert.equal(life.MaxHP,256);
rates.speed=.1;boost.移速针=.2;const speed={Speed:100};evaluate(source.match(/this.MaxSpeed = this.Speed[\s\S]*?;/)[0]).call(speed);assert(Math.abs(speed.MaxSpeed-132)<1e-9);
console.log('PASS actual player formulas: 10%/20% =>72, 50%/50% =>25, full defense =>7, shield/minimum =>1, damage never negative; gun/melee/HP/speed multiply independently; DLC gate preserved.');
// 完整执行 BeHit，验证教程保命发生在死亡判断之前，且仍发送受击教程事件。
let deaths=0,deathPanels=0,tutorialHits=0,shownHP=0;
const game={IsTutorial:true,GamePaused:false,IsGameFinished:false,InterruptEvacuationByHit(){},OnPlayerDied(){deaths++}};
context.ZRSJZ_Game={Instance:game};
context.ZRSJZ_EventManager={Emit(event){if(event==='tutorial')tutorialHits++}};
context.ZRSJZ_MyEvent={ZRSJZ_TUTORIAL:'tutorial'};
context.ZRSJZ_PANEL={死亡弹窗:'death'};context.ZRSJZ_ANI={SW:'death'};
context.ZRSJZ_AudioManager={Instance:{PlaySound(){}}};
context.ZRSJZ_UIManager.Instance={PrepareForDeath(){},ShowPanel(){deathPanels++}};
context.ZRSJZ_PoolManager={Instance:{GetNode:()=>Promise.resolve(null)}};
const fullHit=evaluate(method('BeHit').body.getText(ast).slice(1,-1));
const trainee={...actor,CurHP:100,_petShields:new Map(),GetEquippedDamageMultiplier:()=>1,
 HP:{Show(value){shownHP=value}},node:{worldPosition:{clone:()=>({})}},beHitEffect(){},RefreshBulletProgress(){},
 CancelGunAttackState(){},CancelKnifeAttackState(){},ResetMovement(){},PlayAni(){}};
boost.防御针=0;rates.defense=0;pet.DamageReduction=0;
for(let i=0;i<100;i++)fullHit.call(trainee,1000000);
assert.equal(trainee.CurHP,1);assert.equal(shownHP,1);assert.equal(deaths,0);assert.equal(deathPanels,0);assert.equal(tutorialHits,100);
trainee.CurHP=100;trainee._shielding=true;rates.defense=.2;boost.防御针=.2;pet.DamageReduction=.05;
trainee.GetEquippedDamageMultiplier=()=>.35*.35;fullHit.call(trainee,1000000);assert.equal(trainee.CurHP,1);assert.equal(deaths,0);
game.GamePaused=true;const prior=tutorialHits;fullHit.call(trainee,100);assert.equal(tutorialHits,prior);game.GamePaused=false;
// 对照组：正常关卡仍能死亡，保命规则不会泄漏到普通对局。
game.IsTutorial=false;trainee._shielding=false;trainee.CurHP=10;fullHit.call(trainee,1000000);
assert.equal(trainee.CurHP,0);assert.equal(deaths,1);assert.equal(deathPanels,1);
console.log('PASS full BeHit: tutorial survives 100 lethal hits at 1 HP, emits tutorial feedback, survives with all reductions/shield, pause guard works; normal battle dies and opens death panel.');
