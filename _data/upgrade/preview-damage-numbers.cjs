const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8'),boss=fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',")).replace('await page.waitForTimeout(18000);await page.mouse.click(1010,615);await page.waitForTimeout(10000);',"await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director.getScene(), null, {timeout:45000});");
const launch=boss.slice(boss.indexOf("  console.log('launch',"),boss.indexOf("  console.log('runtime',"));
eval(prefix+launch+String.raw`
 console.log('damage audit',await page.evaluate(async()=>{
  const game=t.get('ZRSJZ_Game').Instance,p=game.Players[0];
  p.enabled=false;game.GamePaused=false;t.UI.Instance.CloseAllPanelsImmediately();p.BeHit=()=>{};
  const E=t.get('ZRSJZ_EnhancementService'),B=t.get('ZRSJZ_BoosterShotService');
  const actualBonuses={skill:E.GetBonus('技能伤害'),attackNeedle:B.GetBooster('攻击针')};
  E.GetBonus=()=>30;B.GetBooster=()=>.15;
  const originalMap=t.Data.Instance.CurMap, mapChecks=[];
  for(const [key,multiplier] of [['新手村',.5],['五号小镇_机密行动',.5],['沙漠古迹_机密行动',2],['极北之地_机密行动',4],['五号小镇_绝密行动',6],['沙漠古迹_绝密行动',8],['极北之地_绝密行动',10],['unknown',1]]){
   t.Data.Instance.CurMap=key;
   const damages=[5,15,30,50].map(base=>E.GetSkillDamage(base*1.15));
   if(damages.some((d,i)=>Math.abs(d-[5,15,30,50][i]*1.15*1.3*multiplier)>1e-8))throw Error('Map multiplier mismatch: '+key);
   mapChecks.push({key,multiplier,damages});
  }
  t.Data.Instance.CurMap=originalMap;
  await p.CastLuna();
  const luna=game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_LunaSkill'))[0];
  const lunaDamage=luna._damage;luna.enabled=false;
  const U=cc.js.getClassByName('ZRSJZ_UluSkill'),prefab=await U.LoadPrefab();
  const node=cc.instantiate(prefab);game.CurMap.BulletParent.addChild(node);
  const ulu=node.getComponent(U);ulu.Launch(new cc.Vec3(),new cc.Vec3(1,0,0),new cc.Vec3(10000,0,0));
  const uluDamage=ulu._damage;node.destroy();
  const enemy=game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_EnemyBase')).find(e=>!e.IsDead&&e.node.activeInHierarchy);
  enemy.enabled=false;enemy.StopMoving();
  enemy.Die=function(){this._state=t.get('ZRSJZ_ENEMY_STATE').DEAD;};
  const H=cc.js.getClassByName('ZRSJZ_HarmEffect'),show=H.prototype.Show,shown=[];
  H.prototype.Show=function(pos,harm){show.call(this,pos,harm);shown.push({input:harm,label:this.Harm.string});};
  const samples=[];
  for(const [health,damage] of [[100,lunaDamage],[100,uluDamage],[3,lunaDamage]]){
   enemy._health=health;const before=shown.length;
   enemy.BeHit(damage);
   const lost=health-enemy.Health;
   for(let i=0;i<100&&shown.length===before;i++)await new Promise(r=>setTimeout(r,10));
   samples.push({health,damage,lost,display:shown[before]});
  }
  const fixed=samples.every(s=>s.display&&Number(s.display.label)===Math.floor(s.display.input)&&Math.abs(s.display.input-s.lost)<1e-8);
  if(${JSON.stringify(process.argv.includes('--verify'))}&&!fixed)throw Error(JSON.stringify(samples));
  game.GamePaused=true;
  return JSON.stringify({mapChecks,actualBonuses,controlledBonuses:{skillPercent:30,attackNeedlePercent:15},lunaBase:luna.TickDamage,lunaDamage,uluBase:ulu.ExplosionDamage,uluDamage,samples,fixed});
 }));
 console.log('errors',errors);
 if(errors.some(e=>/TypeError|Cannot read|Cannot set|技能释放失败/.test(e)))throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
`);
