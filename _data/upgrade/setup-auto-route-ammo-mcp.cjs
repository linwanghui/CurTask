const fs=require('fs');const {call}=require('./mcp.cjs');
(async()=>{
 for(const file of ['Controller/ZRSJZ_MapAutoShow.ts','Service/ZRSJZ_InventoryService.ts','Panel/ZRSJZ_AmmoGiftBagPanel.ts']){
  const path='assets/Game_Bundles/73_ZRSJZ/Scripts/'+file;
  await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+path,content:fs.readFileSync(path,'utf8')});
  console.log('Synced',file);
 }
 console.log(await call('prefab_prefab_browse',{action:'validate',prefabPath:'db://assets/Game_Bundles/73_ZRSJZ/Prefabs/Map/城镇.prefab'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
