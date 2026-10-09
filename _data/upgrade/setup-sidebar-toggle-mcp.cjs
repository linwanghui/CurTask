const fs=require('fs');const {call}=require('./mcp.cjs');
(async()=>{
 const current=await call('scene_scene_management',{action:'get_current'});
 if(current.data.name!=='ZRSJZ_Start')throw Error('Expected ZRSJZ_Start');
 const path='assets/Game_Bundles/73_ZRSJZ/Scripts/UI/ZRSJZ_SidebarToggle.ts';
 await call('assetAdvanced_asset_operations',{action:'create',url:'db://'+path,overwrite:true,content:fs.readFileSync(path,'utf8')});
 const tree=(await call('node_node_query',{action:'tree',maxDepth:15})).data.tree;
 const find=(n,name)=>n.name===name?n:(n.children||[]).map(c=>typeof c==='object'?find(c,name):null).find(Boolean);
 const sidebar=find(tree,'侧边栏'),button=find(sidebar,'展开折叠');
 if(!button.components.some(x=>x.type==='cc.Button'))console.log(await call('component_component_manage',{action:'add',nodeUuid:button.uuid,componentType:'cc.Button'}));
 const dlc=button.components.find(x=>x.type==='ZRSJZ_DLCButton');
 if(dlc){
  const list=await call('component_component_query',{action:'list',nodeUuid:button.uuid});
  const cid=list.data.components.find(x=>x.properties.name?.value.includes('ZRSJZ_DLCButton')).type;
  console.log(await call('node_node_script_management',{action:'remove',nodeUuid:button.uuid,scriptCid:cid}));
 }
 if(!sidebar.components.some(x=>x.type==='ZRSJZ_SidebarToggle'))console.log(await call('node_node_script_management',{action:'attach',nodeUuid:sidebar.uuid,scriptPath:'db://'+path}));
 console.log(await call('scene_scene_management',{action:'save'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
