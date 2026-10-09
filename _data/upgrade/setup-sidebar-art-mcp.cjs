const fs=require('fs');const {call}=require('./mcp.cjs');
(async()=>{
 const current=await call('scene_scene_management',{action:'get_current'});
 if(current.data.name!=='ZRSJZ_Start')throw Error('Expected ZRSJZ_Start');
 const tree=(await call('node_node_query',{action:'tree',maxDepth:15})).data.tree;
 const find=(n,name)=>n.name===name?n:(n.children||[]).map(c=>typeof c==='object'?find(c,name):null).find(Boolean);
 const button=find(find(tree,'侧边栏'),'展开折叠');
 const meta=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Sprites/主页/展开折叠_科幻.png.meta','utf8'));
 const frame=Object.values(meta.subMetas).find(x=>x.importer==='sprite-frame');
 if(!frame)throw Error('No sprite frame');
 const info=await call('component_component_query',{action:'list',nodeUuid:button.uuid});
 const size=info.data.components.find(x=>x.type==='cc.UITransform').properties.contentSize.value;
 await call('component_set_component_property',{nodeUuid:button.uuid,componentType:'cc.Sprite',property:'sizeMode',propertyType:'number',value:0});
 await call('component_set_component_property',{nodeUuid:button.uuid,componentType:'cc.Sprite',property:'spriteFrame',propertyType:'spriteFrame',value:frame.uuid});
 await call('component_set_component_property',{nodeUuid:button.uuid,componentType:'cc.UITransform',property:'contentSize',propertyType:'size',value:size});
 console.log(await call('scene_scene_management',{action:'save'}));
 console.log({spriteFrame:frame.uuid,size});
})().catch(e=>{console.error(e);process.exitCode=1;});
