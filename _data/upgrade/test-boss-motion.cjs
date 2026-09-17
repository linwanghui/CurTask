const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
const transpile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const c={};vm.runInNewContext(transpile(fs.readFileSync(root+'ZRSJZ_Constant.ts','utf8')),{exports:c,require});
function method(file,name,context){const src=fs.readFileSync(root+file,'utf8'),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true),cls=ast.statements.find(ts.isClassDeclaration),m=cls.members.find(n=>n.name?.getText(ast)===name);return vm.runInNewContext(transpile('(function('+m.parameters.map(p=>p.name.getText(ast)).join(',')+')'+m.body.getText(ast).replaceAll('super.update(dt)', 'this._super(dt)').replaceAll('super.PlayAnimation(animationName, loop, cb)', 'this._play(animationName, loop, cb)')+')'),context)}

assert.equal(c.ZRSJZ_BOSS_CHASE_SPEED,3828);
for(const [,b] of c.ZRSJZ_BOSS_CONFIG){assert.equal(b.ChaseSpeed,3828);assert(b.MoveAnimationSpeed>1);}
const ctx={Math,Vec3:{distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)},Coop:{},Online:{Battle:false},ZRSJZ_Game:{Instance:{GamePaused:false,Players:[{CurSpeed:99999}]}},Vec2:{ZERO:{x:0,y:0}}};
let moving=0,stopped=0,skills=0;const b={BossConfig:c.ZRSJZ_BOSS_CONFIG.get('Boss1'),EnemyConfig:{ChaseSpeed:3828},node:{worldPosition:{x:0,y:0}},Target:{worldPosition:{x:290,y:0}},_holdingAttackRange:true,_attackRangeHysteresis:80,_normalAttackCooldown:1,_activeSkill:null,_activeNormalAttack:null,_super(){moving++},UpdateCooldowns(){},UpdateOutOfCombatRegen(){},IsTargetAvailable:()=>true,HasDirectPath:()=>true,TryStartSkill(){skills++;return false},ClearNavigation(){},StopMoving(){stopped++},PlayAnimation(){}};
b.GetAttackStartRange=method('Controller/ZRSJZ_BossBase.ts','GetAttackStartRange',ctx);const update=method('Controller/ZRSJZ_BossBase.ts','update',ctx);
update.call(b,.016);assert.equal(moving,0);assert.equal(stopped,1);assert.equal(b.EnemyConfig.ChaseSpeed,3828);
b.Target.worldPosition.x=340;update.call(b,.016);assert.equal(moving,1);assert(!b._holdingAttackRange);
b._activeNormalAttack={};b.UpdateActiveNormalAttack=()=>{};update.call(b,.016);assert.equal(moving,1,'active attack must not re-path when player leaves range');
const visual={Skeleton:{timeScale:1}};const play=method('Controller/ZRSJZ_BossBase.ts','PlayAnimation',{});const animator={BossConfig:b.BossConfig,EnemySkeleton:visual,_play(){}};play.call(animator,b.BossConfig.MoveAnimation);assert.equal(visual.Skeleton.timeScale,1.74);play.call(animator,b.BossConfig.NormalAttack.Animation);assert.equal(visual.Skeleton.timeScale,1);
let facing=1;const sk={node:{setRotationFromEuler(){throw Error('whole boss rotated')}},SetPlayerDir(x){facing=x}};method('Controller/ZRSJZ_EnemySkeleton.ts','SetBossAttackDirection',{}).call(sk,-1,1);assert.equal(facing,-1);method('Controller/ZRSJZ_EnemySkeleton.ts','ResetBossAttackDirection',{}).call(sk);
console.log('PASS fixed 3828 speed despite player changes, cooldown 250/330 hysteresis, active attack locked, run 1.74x/attack 1x, no whole-node rotation.');
