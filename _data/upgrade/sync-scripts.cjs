const fs=require('fs'),path=require('path'),{call}=require('./mcp.cjs');
const root=path.resolve(__dirname,'../..'),base='assets/Game_Bundles/73_ZRSJZ/Scripts/';
const added=['ZRSJZ_EnhancementConfig.ts','Service/ZRSJZ_EnhancementService.ts'];
const changed=['ZRSJZ_GameData.ts','Service/ZRSJZ_GameDataDefaults.ts','Service/ZRSJZ_FacilityService.ts','Service/ZRSJZ_BoosterShotService.ts','Controller/ZRSJZ_Player.ts','Controller/ZRSJZ_Joystick_Attack.ts','Skill/ZRSJZ_Skill_Button.ts','Panel/ZRSJZ_UpgradePanel.ts'];
(async()=>{for(const file of [...added,...changed]){
 const content=fs.readFileSync(path.join(root,base,file),'utf8');
 await call('assetAdvanced_asset_operations',{action:added.includes(file)?'create':'save',url:'db://'+base+file,content,overwrite:true});
 console.log('Imported',file);
}})().catch(e=>{console.error(e);process.exitCode=1});
