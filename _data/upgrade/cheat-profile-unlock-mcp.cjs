const {call}=require('./mcp.cjs');
const prefabPath='db://assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/作弊界面.prefab';
function find(n,name){if(n.name===name)return n;for(const c of n.children||[])if(typeof c==='object'){const r=find(c,name);if(r)return r;}}
async function tree(){return (await call('node_node_query',{action:'tree',maxDepth:15})).data.tree;}
(async()=>{
 await call('prefab_prefab_edit',{action:'enter',prefabPath});
 let root=await tree(),button=find(root,'获得所有头像框和称号');
 if(!button){
  const template=find(root,'完成全部成就');
  await call('node_node_hierarchy',{action:'duplicate',uuid:template.uuid,includeChildren:true});
  root=await tree();
  const panel=find(find(root,'作弊界面'),'Panel');
  button=panel.children.find(n=>n.name.startsWith('完成全部成就')&&n.uuid!==template.uuid);
  if(!button)throw Error('Duplicated button not found');
 }
 await call('node_node_transform',{uuid:button.uuid,name:'获得所有头像框和称号',position:{x:207.156,y:-157.499,z:0}});
 const label=find(button,'Text');const i=label.components.findIndex(c=>c.type==='cc.Label');
 await call('node_node_transform',{uuid:label.uuid,customProperties:{['__comps__.'+i+'.string']:'获得所有头像框和称号',['__comps__.'+i+'.fontSize']:21,['__comps__.'+i+'.overflow']:2,['__comps__.'+i+'.enableWrapText']:false}});
 await call('prefab_prefab_edit',{action:'save',prefabPath});
 await call('prefab_prefab_edit',{action:'exit',prefabPath});
 console.log('Saved combined avatar-frame/title unlock button via MCP');
})().catch(e=>{console.error(e);process.exitCode=1;});
