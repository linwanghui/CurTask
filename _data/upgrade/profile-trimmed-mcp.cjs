const {call}=require('./mcp.cjs');
async function update(requireScene=false){
 const tree=(await call('node_node_query',{action:'tree',maxDepth:20})).data.tree;
 const contains=(n,name)=>n.name===name||(n.children||[]).some(c=>typeof c==='object'&&contains(c,name));
 if(requireScene&&(!contains(tree,'Canvas')||contains(tree,'should_hide_in_hierarchy')))
  throw Error('Refusing scene save: editor is still in a prefab editing context');
 let count=0;
 async function walk(n){
  if(n.children?.some(c=>c.name==='头像框Icon')){
   for(const name of ['头像','头像框Icon']){
    const child=n.children.find(c=>c.name===name);if(!child)continue;
    const index=child.components.findIndex(c=>c.type==='cc.Sprite');if(index<0)throw Error('Sprite missing: '+name);
    await call('node_node_transform',{uuid:child.uuid,customProperties:{['__comps__.'+index+'.sizeMode']:1}});count++;
   }
  }
  for(const child of n.children||[])if(typeof child==='object')await walk(child);
 }
 await walk(tree);if(count!==2)throw Error('Expected one profile with two sprites, got '+count);
 console.log('Set two profile sprites to TRIMMED');
}
(async()=>{
 const current=await call('scene_scene_management',{action:'get_current'});
 if(current.data.name!=='ZRSJZ_Start')throw Error('Please open ZRSJZ_Start first; no scene switched');
 await update(true);await call('scene_scene_management',{action:'save'});
 const prefabPath='db://assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/等级弹窗.prefab';
 await call('prefab_prefab_edit',{action:'enter',prefabPath});await update();
 await call('prefab_prefab_edit',{action:'save',prefabPath});await call('prefab_prefab_edit',{action:'exit',prefabPath});
 await call('assetAdvanced_asset_operations',{action:'reimport',url:'db://assets/Game_Bundles/73_ZRSJZ/Scripts/UI/ZRSJZ_ProfileAppearance.ts'});
})().catch(e=>{console.error(e);process.exitCode=1;});
