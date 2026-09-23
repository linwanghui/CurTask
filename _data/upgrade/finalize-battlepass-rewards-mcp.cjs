const fs = require('fs');
const path = require('path');
const { call } = require('./mcp.cjs');
const prefabPath = 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';
const nodes = new Map();
function root(n) { if (n.name === '战令界面') return n; for (const c of n.children || []) { if (typeof c === 'object') { const r = root(c); if(r) return r; } } }
function walk(n, p = '') { const key = p ? p + '/' + n.name : n.name; nodes.set(key.replace(/^战令界面\/?/, ''), n); for (const c of n.children || []) if(typeof c === 'object') walk(c,key); }
async function set(p, type, properties) {
 const n=nodes.get(p); if(!n) throw Error('Missing node '+p);
 const index=n.components.findIndex(c=>c.type===type); if(index<0)throw Error('Missing '+type+' '+p);
 await call('node_node_transform',{uuid:n.uuid,customProperties:Object.fromEntries(Object.entries(properties).map(([k,v])=>['__comps__.'+index+'.'+k,v]))});
}
async function sprite(p, uuid) { await call('component_set_component_property',{nodeUuid:nodes.get(p).uuid,componentType:'cc.Sprite',property:'spriteFrame',propertyType:'spriteFrame',value:uuid}); await set(p,'cc.Sprite',{sizeMode:1}); }
async function main() {
 // Preserve any currently open edits before importing the changed scripts.
 const initial = await call('node_node_query',{action:'tree',maxDepth:2});
 if(root(initial.data.tree)) await call('prefab_prefab_edit',{action:'save',prefabPath});
 const assets=[
 '73_ZRSJZ/Scripts/ZRSJZ_BattlePassConfig.ts','73_ZRSJZ/Scripts/ZRSJZ_Constant.ts',
 '73_ZRSJZ/Scripts/Service/ZRSJZ_AccountService.ts','73_ZRSJZ/Scripts/Service/ZRSJZ_BattlePassService.ts',
 '73_ZRSJZ/Scripts/Panel/ZRSJZ_RolePanel.ts','73_ZRSJZ_DLC/Scripts/Panel/ZRSJZ_BattlePassPanel.ts',
 '73_ZRSJZ_DLC/Sprites/战令界面/黯祁.png'];
 for(const a of assets) await call('assetAdvanced_asset_operations',{action:'reimport',url:'db://assets/Game_Bundles/'+a});
 await call('prefab_prefab_edit',{action:'enter',prefabPath});
 walk(root((await call('node_node_query',{action:'tree',maxDepth:20})).data.tree));
 const buttons=['关闭','战令奖励','战令任务','购买等级','进阶解锁','一键领取','任务内容/页签/daily','任务内容/页签/weekly'];
 for(const period of ['daily','weekly']) {
  const content=nodes.get('Panel/任务内容/'+period+'/View/Content');
  for(const row of content.children) for(const name of ['领取','前往']) {
   const p='任务内容/'+period+'/View/Content/'+row.name+'/'+name;
   if(nodes.has('Panel/'+p)) buttons.push(p);
  }
 }
 for(let level=1;level<=50;level++)for(const track of ['normal','advanced'])buttons.push('奖励列表/View/Content/等级'+level+'/'+track);
 for(const track of ['normal','advanced']) buttons.push('特殊奖励/'+track);
 for(const p of buttons.map(p=>'Panel/'+p)) {
  const n=nodes.get(p);if(!n)throw Error('Missing button '+p);
  if(!n.components.some(c=>c.type==='cc.Button'))await call('component_component_manage',{action:'add',nodeUuid:n.uuid,componentType:'cc.Button'});
 }
 nodes.clear();walk(root((await call('node_node_query',{action:'tree',maxDepth:20})).data.tree));
 for(const p of buttons.map(p=>'Panel/'+p)) await set(p,'cc.Button',{transition:3,zoomScale:0.92,duration:0.08});
 const files=[];
 function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=dir+'/'+e.name;if(e.isDirectory())scan(f);else if(/\.(png|jpg)\.meta$/.test(f))files.push(f);}}
 scan('assets/Game_Bundles/73_ZRSJZ/Sprites');scan('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites');
 const source=fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_BattlePassConfig.ts','utf8');
 const rewards=[...source.matchAll(/r\((\d+),'([^']+)','([^']+)',(\d+)/g)].map(m=>({level:+m[1],type:m[2],name:m[3],count:+m[4]}));
 for(let i=0;i<rewards.length;i++) {
  const r=rewards[i];if(r.level%10)continue;
  const file=files.find(f=>path.basename(f).replace(/\.(png|jpg)\.meta$/,'')===r.name&&(r.type!=='heroSkin'||f.includes('/Sprites/战令界面/')));if(!file)throw Error('Missing image '+r.name);
  const frame=Object.values(JSON.parse(fs.readFileSync(file)).subMetas).find(m=>m.importer==='sprite-frame');
  const track=i<50?'normal':'advanced';
  const targets=['Panel/奖励列表/View/Content/等级'+r.level+'/'+track];if(r.level===10)targets.push('Panel/特殊奖励/'+track);
  for(const p of targets){
   await set(p+'/名称','cc.Label',{string:r.name});await set(p+'/数量','cc.Label',{string:'×'+r.count});
   await sprite(p+'/图标',frame.uuid);
   const entries=JSON.parse(fs.readFileSync(prefabPath.replace('db://','')));
   const bottomNode=nodes.get(p+'/图标底');
   const bottom=entries.find(e=>e.__type__==='cc.Node'&&e._id===bottomNode.uuid);
   const ui=bottom?._components.map(c=>entries[c.__id__]).find(c=>c.__type__==='cc.UITransform');
   const w=ui?._contentSize.width||100,h=ui?._contentSize.height||100;
   const s=Math.min((w-10)/frame.userData.width,(h-10)/frame.userData.height,1);
   await call('node_node_transform',{uuid:nodes.get(p+'/图标').uuid,scale:{x:s,y:s,z:1}});
  }
 }
 await call('prefab_prefab_edit',{action:'save',prefabPath});
 await call('prefab_prefab_edit',{action:'exit',prefabPath});
 console.log('Saved '+buttons.length+' scale buttons and 12 milestone reward slots via MCP.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
