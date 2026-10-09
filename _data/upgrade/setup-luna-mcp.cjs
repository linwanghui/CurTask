const fs=require('fs'),crypto=require('crypto');
const {call}=require('./mcp.cjs');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
const script=root+'Skill/ZRSJZ_LunaSkill.ts';
function compress(uuid){const h=uuid.replace(/-/g,''),c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let r=h.slice(0,5);for(let i=5;i<32;i+=3){const n=parseInt(h.slice(i,i+3),16);r+=c[n>>6]+c[n&63];}return r;}
(async()=>{
 await call('assetAdvanced_asset_operations',{action:'create',url:'db://'+script,overwrite:true,content:fs.readFileSync(script,'utf8')});
 for(const file of ['Controller/ZRSJZ_Player.ts','Controller/ZRSJZ_EnemyBase.ts','Skill/ZRSJZ_Skill_Button.ts'])await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+root+file,content:fs.readFileSync(root+file,'utf8')});
 const path='assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/技能_露娜.prefab',data=JSON.parse(fs.readFileSync(path,'utf8'));
 const type=compress(JSON.parse(fs.readFileSync(script+'.meta','utf8')).uuid),id=data[0].data.__id__;
 if(!data.some(x=>x.__type__===type)){
  const index=data.length;
  data.push({__type__:type,_name:'',_objFlags:0,__editorExtras__:{},node:{__id__:id},_enabled:true,__prefab:{__id__:index+1},ForwardDistance:350,Radius:400,PullSpeed:600,Duration:3,DamageInterval:.3,TickDamage:5,_id:''});
  data.push({__type__:'cc.CompPrefabInfo',fileId:crypto.randomBytes(12).toString('base64')});data[id]._components.push({__id__:index});
 }
 const spine=data.find(x=>x.__type__==='sp.Skeleton');
 spine._skeletonData.__uuid__=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Spine/玩家/露娜_龙卷风/lrsc145.json.meta','utf8')).uuid;
 spine.defaultAnimation='action';spine.loop=false;
 delete data.find(x=>x.__type__===type).Duration;
 const layer=JSON.parse(fs.readFileSync('settings/v2/packages/project.json','utf8')).layer.find(x=>x.name==='Map').value;
 for(const n of data)if(n.__type__==='cc.Node')n._layer=layer;
 await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+path,content:JSON.stringify(data,null,2)});
 const buttonPath='assets/Game_Bundles/73_ZRSJZ/Prefabs/Controller/露娜.prefab',button=JSON.parse(fs.readFileSync(buttonPath,'utf8'));
 button.find(x=>x.SkillName==='露娜').IsNeedLock=false;
 await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+buttonPath,content:JSON.stringify(button,null,2)});
 console.log(await call('prefab_prefab_browse',{action:'validate',prefabPath:'db://'+path}));
})().catch(e=>{console.error(e);process.exitCode=1;});
