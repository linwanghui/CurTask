const fs=require('fs');const {call}=require('./mcp.cjs');
(async()=>{
 for(const path of ['Controller/ZRSJZ_SkinSkeleton.ts','Controller/ZRSJZ_Skeleton.ts','Panel/ZRSJZ_RolePanel.ts'].map(f=>'assets/Game_Bundles/73_ZRSJZ/Scripts/'+f).concat('assets/Scripts/HttpTakeNumWLY.js')){
  await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+path,content:fs.readFileSync(path,'utf8')});console.log('Synced',path);
 }
 console.log(await call('prefab_prefab_browse',{action:'validate',prefabPath:'db://assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/角色界面.prefab'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
