const fs=require('fs'),path=require('path'),vm=require('vm');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const {call}=require('./mcp.cjs');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Constant.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject});
const items=exportsObject.ZRSJZ_ACHIEVEMENT_CONFIG;
function find(n,name){if(n.name===name)return n;for(const c of n.children||[])if(typeof c==='object'){const r=find(c,name);if(r)return r;}}
async function set(n,type,values){const i=n.components.findIndex(c=>c.type===type);if(i<0)throw Error('Missing '+type);await call('node_node_transform',{uuid:n.uuid,customProperties:Object.fromEntries(Object.entries(values).map(([k,v])=>['__comps__.'+i+'.'+k,v]))});}
async function main(){
 let prefabPath='db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/成就界面.prefab';
 const original=JSON.parse(fs.readFileSync(prefabPath.replace('db://','')));
 const originalIcon=original.find(x=>x.__type__==='cc.Node'&&x._name==='奖励图标');
 const gold=originalIcon._components.map(r=>original[r.__id__]).find(c=>c.__type__==='cc.Sprite')._spriteFrame.__uuid__;
 const files=[];function scan(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())scan(p);else if(p.endsWith('.png.meta'))files.push(p);}}scan('assets/Game_Bundles/73_ZRSJZ/Sprites');
 await call('prefab_prefab_edit',{action:'enter',prefabPath});
 let root=find((await call('node_node_query',{action:'tree',maxDepth:15})).data.tree,'成就界面');
 const rowIds=items.map(item=>find(root,'成就-'+item.id)?.uuid);
 if(new Set(rowIds).size!==items.length)throw Error('Duplicate row UUIDs; repair prefab fileIds first');
 for(let i=0;i<items.length;i++){
  const item=items[i],row=find(root,'成就-'+item.id);if(!row)throw Error('Missing row '+item.id);
  const reward=item.rewards[0];let uuid=gold,w=65,h=49;
  if(reward.type==='道具'){
   const file=files.find(f=>path.basename(f,'.png.meta')===reward.name);if(!file)throw Error('Missing art '+reward.name);
   const m=Object.values(JSON.parse(fs.readFileSync(file)).subMetas).find(m=>m.importer==='sprite-frame');uuid=m.uuid;w=m.userData.width;h=m.userData.height;
  }
  const icon=find(row,'奖励图标');
  await call('component_set_component_property',{nodeUuid:icon.uuid,componentType:'cc.Sprite',property:'spriteFrame',propertyType:'spriteFrame',value:uuid});
  await set(icon,'cc.Sprite',{sizeMode:1});const s=Math.min(65/w,65/h,1);
  await call('node_node_transform',{uuid:icon.uuid,scale:{x:s,y:s,z:1}});
  const desc=item.rewards.map(r=>r.type==='道具'?r.name+'×'+r.count:r.type==='钞票'?r.count/10000+'万钞票':'称号·'+r.name).join('\n');
  await set(find(row,'奖励数值'),'cc.Label',{string:desc});
  await set(find(find(row,'序号'),'数字'),'cc.Label',{string:String(i+1)});
  await call('node_node_transform',{uuid:row.uuid,position:{x:18,y:-83-i*184,z:0}});
 }
 await call('prefab_prefab_edit',{action:'save',prefabPath});await call('prefab_prefab_edit',{action:'exit',prefabPath});
 console.log('Saved achievement reward icons, quantities and ordering via MCP.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
