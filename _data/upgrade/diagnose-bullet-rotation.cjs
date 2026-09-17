const fs=require('fs'),base=fs.readFileSync(__dirname+'/preview-enhancement-v2.cjs','utf8'),boss=fs.readFileSync(__dirname+'/preview-boss-motion.cjs','utf8');
const prefix=base.slice(0,base.indexOf("  console.log('open',")),launch=boss.slice(boss.indexOf("  console.log('launch',"),boss.indexOf("  console.log('runtime',"));
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const source=fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_Bullet.ts','utf8'),ast=ts.createSourceFile('b.ts',source,ts.ScriptTarget.Latest,true),m=ast.statements.find(ts.isClassDeclaration).members.find(n=>n.name?.getText(ast)==='Show');
const currentShow=ts.transpileModule('(function('+m.parameters.map(p=>p.getText(ast)).join(',')+')'+m.body.getText(ast)+')',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText.trim().replace(/;$/,'');
eval(prefix+launch+`
 console.log('rotation',await page.evaluate(async()=>{
  const game=t.get('ZRSJZ_Game').Instance;t.UI.Instance.CloseAllPanelsImmediately();game.GamePaused=false;
  const p=game.Players[0];p.BeHit=()=>{};
  const pool=t.get('ZRSJZ_PoolManager').Instance,n=await pool.GetNode('Prefabs/Unit/PlayerBullet');n.parent=game.CurMap.BulletParent;
  const b=n.getComponent(cc.js.getClassByName('ZRSJZ_Bullet'));const out=[];
  const loadedCurrent=b.Show.toString().includes('syncPositionToPhysics');
  if(!loadedCurrent){const Online=t.get('ZRSJZ_OnlineService'),v2=cc.v2;b.Show=${currentShow};}
  for(const [x,y]of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1]]){
   await new Promise(resolve=>cc.director.once(cc.Director.EVENT_BEFORE_DRAW,()=>{b.Show(new cc.Vec3(20000,20000,0),x,y,10000,1);resolve();}));
   const angle=()=>{const v=cc.Vec3.transformQuat(new cc.Vec3(),new cc.Vec3(1,0,0),n.worldRotation);return Math.atan2(v.y,v.x)*180/Math.PI;};const before=angle();
   const start=n.worldPosition.clone();await new Promise(r=>setTimeout(r,80));
   const end=n.worldPosition;const result={dir:[x,y],before,after:angle(),delta:[end.x-start.x,end.y-start.y],visual:n.getChildByName('子弹').eulerAngles.z};out.push(result);
   const expected=Math.atan2(y,x)*180/Math.PI,error=Math.abs(((result.after-expected+540)%360)-180);
   if(error>.01||Math.hypot(...result.delta)>2000)throw Error('Physics overwrote spawn transform '+JSON.stringify(result));
  }
  game.GamePaused=true;
  return JSON.stringify({loadedCurrent,newMuzzleCode:!!p.PlayerSkeleton.UpdateAimAndAttack,bullet:out});
 }));console.log('errors',errors);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
`);
