const fs=require('fs'),crypto=require('crypto');
const {call}=require('./mcp.cjs');
function compress(uuid){const h=uuid.replace(/-/g,''),c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let r=h.slice(0,5);for(let i=5;i<32;i+=3){const n=parseInt(h.slice(i,i+3),16);r+=c[n>>6]+c[n&63];}return r;}
const panelPath='assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/雪地玩法弹窗.prefab';
(async()=>{
 console.log(await call('prefab_prefab_edit',{action:'save',prefabPath:'db://'+panelPath}));
 console.log(await call('prefab_prefab_edit',{action:'exit',prefabPath:'db://'+panelPath}));
 const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
 for(const file of ['Controller/ZRSJZ_SnowPrayer.ts','Panel/ZRSJZ_SnowPrayerPanel.ts','Controller/ZRSJZ_Map.ts']){
  await call('assetAdvanced_asset_operations',{action:fs.existsSync(root+file+'.meta')?'save':'create',url:'db://'+root+file,content:fs.readFileSync(root+file,'utf8'),overwrite:true});
  console.log('Synced',file);
 }
 const script=root+'Panel/ZRSJZ_SnowPrayerPanel.ts';
 const type=compress(JSON.parse(fs.readFileSync(script+'.meta','utf8')).uuid);
 const panel=JSON.parse(fs.readFileSync(panelPath,'utf8')),id=panel[0].data.__id__;
 if(!panel.some(n=>n.__type__===type)){
  const index=panel.length;
  panel.push({__type__:type,_name:'',_objFlags:0,__editorExtras__:{},node:{__id__:id},_enabled:true,__prefab:{__id__:index+1},PlayerIndex:-1,_id:''});
  panel.push({__type__:'cc.CompPrefabInfo',fileId:crypto.randomBytes(12).toString('base64')});
  panel[id]._components.push({__id__:index});
 }
 // 新脚本直接监听关闭按钮，移除复制模板时残留的旧回调。
 for(const n of panel)if(n.__type__==='cc.Button')n.clickEvents=[];
 await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+panelPath,content:JSON.stringify(panel,null,2)});
 const chest=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Unit/箱子/沙漠_祈祷箱.prefab','utf8'));
 chest[0]._name=chest[chest[0].data.__id__]._name='解密宝箱';
 const frame=name=>({__uuid__:Object.values(JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/雪地玩法/'+name+'.png.meta','utf8')).subMetas).find(n=>n.importer==='sprite-frame').uuid,__expectedType__:'cc.SpriteFrame'});
 const box=chest.find(n=>n.BoxName);
 box.BoxName='解密宝箱';box.ThemeIconSF=[frame('解密宝箱'),frame('解密宝箱打开')];
 box.ThemeCheckedSF=[frame('解密宝箱描边'),frame('解密宝箱打开描边')];
 for(const node of chest.filter(n=>n.__type__==='cc.Node'&&['Icon','Checked'].includes(n._name))){
  const sprite=chest[node._components.find(ref=>chest[ref.__id__].__type__==='cc.Sprite').__id__];
  sprite._spriteFrame=node._name==='Icon'?box.ThemeIconSF[0]:box.ThemeCheckedSF[0];
 }
 const chestPath='assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Unit/箱子/解密宝箱.prefab';
 await call('assetAdvanced_asset_operations',{action:fs.existsSync(chestPath)?'save':'create',url:'db://'+chestPath,content:JSON.stringify(chest,null,2),overwrite:true});
 for(const path of [panelPath,chestPath])console.log(await call('prefab_prefab_browse',{action:'validate',prefabPath:'db://'+path}));
 console.log(await call('prefab_prefab_edit',{action:'enter',prefabPath:'db://'+panelPath}));
})().catch(e=>{console.error(e);process.exitCode=1;});
