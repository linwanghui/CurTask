const fs=require('fs');const {call}=require('./mcp.cjs');
(async()=>{
 for(const file of ['Controller/ZRSJZ_EnemyBase.ts','Effect/ZRSJZ_HarmEffect.ts']){
  const path='assets/Game_Bundles/73_ZRSJZ/Scripts/'+file;
  await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+path,content:fs.readFileSync(path,'utf8')});
  console.log('Synced',file);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
