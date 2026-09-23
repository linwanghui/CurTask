const {call}=require('./mcp.cjs');
const prefabPath='db://assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/作弊界面.prefab';
function find(n,name){if(n.name===name)return n;for(const c of n.children||[])if(typeof c==='object'){const r=find(c,name);if(r)return r;}}
(async()=>{
 await call('assetAdvanced_asset_operations',{action:'reimport',url:'db://assets/Game_Bundles/73_ZRSJZ/Scripts/Panel/ZRSJZ_CheatingPanel.ts'});
 await call('prefab_prefab_edit',{action:'enter',prefabPath});
 let tree=(await call('node_node_query',{action:'tree',maxDepth:10})).data.tree;
 let panel=find(find(tree,'作弊界面'),'Panel');let node=find(panel,'战令等级加10');
 if(!node){
  const template=find(panel,'英雄碎片加100');const known=new Set(panel.children.map(c=>c.uuid));
  await call('node_node_hierarchy',{action:'duplicate',uuid:template.uuid,includeChildren:true});
  panel=(await call('node_node_query',{action:'tree',uuid:panel.uuid,maxDepth:5})).data.tree;
  node=panel.children.find(c=>!known.has(c.uuid));if(!node)throw Error('Duplicate failed');
 }
 await call('node_node_transform',{uuid:node.uuid,name:'战令等级加10',position:{x:207.156,y:-18.693,z:0}});
 const label=node.children.find(c=>c.components?.some(c=>c.type==='cc.Label'));
 const index=label.components.findIndex(c=>c.type==='cc.Label');
 await call('node_node_transform',{uuid:label.uuid,customProperties:{['__comps__.'+index+'.string']:'战令等级 +10'}});
 await call('prefab_prefab_edit',{action:'save',prefabPath});
 await call('prefab_prefab_edit',{action:'exit',prefabPath});
 console.log('Saved 战令等级 +10 button; cloned existing click binding and style.');
})().catch(e=>{console.error(e);process.exitCode=1});
