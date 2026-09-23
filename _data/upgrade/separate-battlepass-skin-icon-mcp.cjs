const {call}=require('./mcp.cjs');
const prefabPath='db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';
const art='db://assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/战令界面/黯祁.png';
function find(n,name){if(n.name===name)return n;for(const c of n.children||[]){if(typeof c==='object'){const r=find(c,name);if(r)return r;}}}
function at(n,p){for(const name of p.split('/'))n=n.children.find(c=>c.name===name);return n;}
(async()=>{
 for(const url of ['db://assets/Game_Bundles/73_ZRSJZ/Sprites/角色界面/皮肤/黯祁.png',art])await call('assetAdvanced_asset_operations',{action:'reimport',url});
 const asset=await call('assetAdvanced_asset_query',{action:'get_details',assetPath:art,includeSubAssets:true});
 const frame=asset.data.subAssets.find(s=>s.type==='spriteFrame');if(!frame)throw Error('Missing reward SpriteFrame');
 await call('prefab_prefab_edit',{action:'enter',prefabPath});
 const tree=await call('node_node_query',{action:'tree',maxDepth:20});const root=find(tree.data.tree,'战令界面');
 const resources=at(root,'Panel/资源');let icon=resources.children.find(c=>c.name==='黯祁');
 if(!icon){const n=await call('node_node_lifecycle',{action:'create',name:'黯祁',parentUuid:resources.uuid,nodeType:'2DNode',components:['cc.Sprite']});icon={uuid:n.data.uuid};}
 for(const node of [icon,at(root,'Panel/奖励列表/View/Content/等级50/advanced/图标')]){
  await call('component_set_component_property',{nodeUuid:node.uuid,componentType:'cc.Sprite',property:'spriteFrame',propertyType:'spriteFrame',value:frame.uuid});
 }
 await call('node_node_transform',{uuid:icon.uuid,active:false});
 await call('prefab_prefab_edit',{action:'save',prefabPath});
 await call('prefab_prefab_edit',{action:'exit',prefabPath});
 console.log('Battle pass now caches its own DLC icon:',frame.uuid);
})().catch(e=>{console.error(e);process.exitCode=1;});
