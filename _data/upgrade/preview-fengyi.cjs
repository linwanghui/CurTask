const fs = require('fs');
const boot = fs.readFileSync(__dirname + '/preview-enhancement-v2.cjs', 'utf8');
const boss = fs.readFileSync(__dirname + '/preview-boss-motion.cjs', 'utf8');
const prefix = boot.slice(0, boot.indexOf("  console.log('open',")).replace(
 'await page.waitForTimeout(18000);await page.mouse.click(1010,615);await page.waitForTimeout(10000);',
 "await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director.getScene(), null, { timeout: 45000 });");
const launch = boss.slice(boss.indexOf("  console.log('launch',"), boss.indexOf("  console.log('runtime',"));
eval(prefix + launch + String.raw`
 console.log('fengyi', await page.evaluate(async () => {
   const game=t.get('ZRSJZ_Game').Instance, p=game.Players[0];
   const check=(ok,msg)=>{if(!ok)throw Error(msg);};
   p.enabled=false; p.BeHit=()=>{}; game.GamePaused=false;
   t.UI.Instance.CloseAllPanelsImmediately();
   const tips=[]; t.UI.Instance.ShowTip=s=>tips.push(s);
   const node=new cc.Node('test skill'); game.node.addChild(node);
   node.addComponent(cc.Sprite);
   const button=node.addComponent(cc.js.getClassByName('ZRSJZ_Skill_Button'));
   button.enabled=false; button.PlayerIndex=p.PlayerIndex; button.SkillName='蜂医'; button.CD=20;
   p.MaxHP=500; p.CurHP=500;
   check(!button.TryCast(),'Full HP accepted');
   check(tips.pop()==='当前生命值已满' && button.IsReady,'Tip or cooldown');
   p.CurHP=200;
   await p.CastFengYi();
   check(!!p._fengYiHeal,'Effect missing');
   const duration=p._fengYiHeal.duration;
   const numbers=[], pending=[]; const showNumber=p.ShowPetHealNumber;
   p.ShowPetHealNumber=function(amount){numbers.push(amount);const task=showNumber.call(this,amount);pending.push(task);return task;};
   check(p.CurHP===200,'Instant healing');
   check(!p.CanCastFengYi(false),'Duplicate accepted');
   p.UpdateFengYi(duration/2); const halfway=p.CurHP; check(halfway>200 && halfway<300,'Half healing');
   game.GamePaused=true; p.UpdateFengYi(duration); check(p.CurHP===halfway,'Paused healing');
   check(p._fengYiHeal.spine.timeScale===0,'Animation not paused');
   game.GamePaused=false;
   p.node.setWorldPosition(100,200,0); p.UpdateFengYi(0);
   check(cc.Vec3.distance(p._fengYiHeal.node.worldPosition,p.node.worldPosition)<.001,'Follow failed');
   p.UpdateFengYi(duration/2); check(p.CurHP===300&&!p._fengYiHeal,'Total or cleanup');
   await Promise.all(pending);
   check(numbers.reduce((a,b)=>a+b,0)===100,'Float text total');
   check(p._healNumbers.length>=2,'Healing prefab not created');
   check(p._healNumbers.every(e=>e.node.getComponentInChildren(cc.Label).string.startsWith('+')),'Float text missing');
   p.CurHP=490; await p.CastFengYi(); p.UpdateFengYi(duration); check(p.CurHP===500,'Overflow');
   p.CurHP=200; await p.CastFengYi(); p.CurHP=0; p.UpdateFengYi(duration); check(p.CurHP===0&&!p._fengYiHeal,'Dead healing');
   p.CurHP=200; await p.CastFengYi(); p.ClearFengYi(); check(!p._fengYiHeal,'Cancel failed');
   game.GamePaused=true; node.destroy();
   return {duration,fullHealthTip:true,noCooldownAtFullHealth:true,gradual20Percent:true,healthCap:true,pause:true,follow:true,deathCleanup:true,healingFloatText:true};
 }));
 console.log('errors',errors);
 if(errors.some(e=>/TypeError|Cannot read|蜂医技能释放失败/.test(e)))throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
`);
