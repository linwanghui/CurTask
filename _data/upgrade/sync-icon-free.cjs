const fs=require('fs'),path=require('path');
const {call}=require('./mcp.cjs');
(async()=>{
 for(const name of ['Panel/ZRSJZ_UpgradePanel','Panel/ZRSJZ_CheatingPanel','Service/ZRSJZ_EnhancementService']){
  const file='assets/Game_Bundles/73_ZRSJZ/Scripts/'+name+'.ts';
  await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+file,content:fs.readFileSync(file,'utf8')});
  console.log('MCP saved',name);
 }
 const folder='assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/强化弹窗1',frames=new Map();
 for(const name of fs.readdirSync(folder).filter(n=>n.endsWith('.meta'))){
  const meta=JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
  for(const sub of Object.values(meta.subMetas||{}))if(sub.importer==='sprite-frame')frames.set(sub.uuid,sub.userData);
 }
 const file='assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/强化界面.prefab';
 const a=JSON.parse(fs.readFileSync(file,'utf8'));let count=0;
 for(const node of a){
  if(node.__type__!=='cc.Node'||!['Icon','GrayIcon'].includes(node._name))continue;
  const parent=a[node._parent?.__id__];
  if(!parent||!(parent._name==='Desc'||/^(main|special)_\d+$/.test(parent._name)))continue;
  const components=node._components.map(r=>a[r.__id__]),sprite=components.find(c=>c.__type__==='cc.Sprite'),ui=components.find(c=>c.__type__==='cc.UITransform');
  const frame=frames.get(sprite?._spriteFrame?.__uuid__);if(!frame)throw Error('Missing frame '+sprite?._spriteFrame?.__uuid__);
  sprite._sizeMode=1;sprite._type=0;sprite._isTrimmedMode=true;
  ui._contentSize.width=frame.width;ui._contentSize.height=frame.height;
  const scale=Math.min(90/frame.width,(parent._name==='Desc'?96:90)/frame.height);
  node._lscale.x=scale;node._lscale.y=scale;node._lscale.z=1;count++;
 }
 if(count!==121)throw Error('Unexpected icon count '+count);
 await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+file,content:JSON.stringify(a,null,2)});
 console.log('MCP saved proportional icons',count);
 console.log(await call('prefab_prefab_browse',{action:'validate',prefabPath:'db://'+file}));
})().catch(e=>{console.error(e);process.exitCode=1});
