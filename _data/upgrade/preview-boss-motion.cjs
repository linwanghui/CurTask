const fs=require('fs');
const boot=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8');
const prefix=boot.slice(0,boot.indexOf("  console.log('open',"));
eval(prefix+`
  console.log('launch',await page.evaluate(async()=>{
   const get=name=>Array.from(System.entries()).map(([,m])=>m).find(m=>m[name])?.[name];
   window.t={get,Data:get('ZRSJZ_GameData'),UI:get('ZRSJZ_UIManager'),I:get('ZRSJZ_InventoryService')};
   t.UI.ZRSJZ_DLC=true;t.UI.Instance.CloseAllPanelsImmediately();
   t.Data.Instance.CurModel='1p';t.Data.Instance.CurMap='五号小镇_机密行动';
   t.I.ApplyAssistFightingGift(get('ZRSJZ_ASSIST_FIGHTING_GIFT_CONFIG').get(1),0);
   const value=t.I.GetLoadoutValue([0]);
   const bundle=cc.assetManager.getBundle('73_ZRSJZ');
   const scene=await new Promise((resolve,reject)=>bundle.loadScene('ZRSJZ_Game',(e,s)=>e?reject(e):resolve(s)));
   cc.director.runSceneImmediate(scene);return{value};
  }));
  await page.waitForTimeout(12000);
  console.log('runtime',await page.evaluate(()=>{
   t.game=t.get('ZRSJZ_Game').Instance;
   t.boss=t.game.node.scene.getComponentsInChildren(cc.js.getClassByName('ZRSJZ_Boss'))[0];
   t.player=t.game.Players[0];
   if(!t.boss||!t.player)throw Error('missing live boss/player');
   t.UI.Instance.CloseAllPanelsImmediately();t.game.GamePaused=false;
   const b=t.boss,p=t.player;b.Target=p.node;
   const root=b.node.worldPosition.clone();p.node.setWorldPosition(root.x,root.y+200,root.z);
   b.RefreshAttackDirection();
   const angle=b.EnemySkeleton.node.eulerAngles.z;
   if(Math.abs(angle)>0.01)throw Error('boss whole-node rotation '+angle);
   b._activeSkill=null;b._activeNormalAttack=null;b._normalAttackCooldown=0;
   p.node.setWorldPosition(root.x+350,root.y,root.z);
   if(b.TryStartNormalAttack())throw Error('dead-zone attack triggered');
   p.node.setWorldPosition(root.x+240,root.y,root.z);p.CurHP=100;
   if(!b.TryStartNormalAttack())throw Error('in-range attack not started');
   b.OnAttack(b.BossConfig.NormalAttack.TriggerEvent);
   const hp=p.CurHP;if(hp>=100)throw Error('stationary in-range player not hit');
   b.OnAttack(b.BossConfig.NormalAttack.TriggerEvent);if(p.CurHP!==hp)throw Error('duplicate event hit twice');
   b.CancelActiveAttack();p.CurSpeed=3480;b.update(0.016);
   if(b.EnemyConfig.ChaseSpeed!==3828)throw Error('boss speed not fixed');
   b.PlayAnimation(b.BossConfig.MoveAnimation);if(Math.abs(b.EnemySkeleton.Skeleton.timeScale-1.74)>.01)throw Error('run animation not accelerated');
   b.PlayAnimation(b.BossConfig.NormalAttack.Animation);if(b.EnemySkeleton.Skeleton.timeScale!==1)throw Error('attack animation accelerated');
   t.game.GamePaused=true;
   return{bossHP:b.EnemyConfig.MaxHealth,angle,playerHPAfterOneAttack:hp,bossSpeed:b.EnemyConfig.ChaseSpeed,playerSpeed:p.CurSpeed};
  }));
  await page.screenshot({path:path.join(__dirname,'boss-balance-preview.png')});
  console.log('errors',errors);fs.writeFileSync(path.join(__dirname,'boss-balance-preview-errors.json'),JSON.stringify(errors,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
