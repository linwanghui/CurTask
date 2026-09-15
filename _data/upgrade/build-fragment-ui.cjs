const fs=require('fs'),path=require('path'),{call}=require('./mcp.cjs');
const core='assets/Game_Bundles/73_ZRSJZ/',dlc='assets/Game_Bundles/73_ZRSJZ_DLC/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),clone=x=>structuredClone(x),ref=i=>({__id__:i});
const sf=p=>({__uuid__:read(p+'.meta').subMetas.f9941.uuid,__expectedType__:'cc.SpriteFrame'});
function compress(uuid){const h=uuid.replaceAll('-',''),b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out=h.slice(0,5);for(let i=5;i<32;i+=3){const n=parseInt(h.slice(i,i+3),16);out+=b[n>>6]+b[n&63]}return out}
async function save(p,content){return call('assetAdvanced_asset_operations',{action:fs.existsSync(p+'.meta')?'save':'create',url:'db://'+p,content:typeof content==='string'?content:JSON.stringify(content,null,2),overwrite:true})}
const metas=new Map();
function scan(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+d.name;if(d.isDirectory())scan(p);else if(d.name.endsWith('.meta')){try{const m=read(p);if(m.uuid)metas.set(m.uuid,p.slice(0,-5))}catch{}}}}
const copies=new Map();
async function coreResources(a){
 const refs=[];function visit(x){if(!x||typeof x!=='object')return;if(x.__uuid__)refs.push(x);for(const v of Object.values(x))visit(v)}visit(a);
 for(const r of refs){const [uuid,sub]=r.__uuid__.split('@'),src=metas.get(uuid);if(!src?.startsWith(dlc))continue;
  let dest=copies.get(uuid);if(!dest){const target=core+'Sprites/英雄碎片界面/'+path.basename(src);if(!fs.existsSync(target+'.meta'))await call('assetAdvanced_asset_operations',{action:'copy',source:'db://'+src,target:'db://'+target,overwrite:false});dest=read(target+'.meta').uuid;copies.set(uuid,dest);console.log('Core resource:',path.basename(src))}r.__uuid__=dest+(sub?'@'+sub:'');
 }
}
function subtree(src,dst,index,parent){
 const map=new Map([[1,1],[12,parent]]);
 function copy(i){if(map.has(i))return map.get(i);const n=dst.length;map.set(i,n);dst.push(null);dst[n]=rewrite(src[i]);return n}
 function rewrite(v,key){if(v===null||typeof v!=='object')return v;if(key==='_prefab'||key==='__prefab')return null;if(v.__id__!==undefined)return ref(copy(v.__id__));if(Array.isArray(v))return v.map(x=>rewrite(x));const out={};for(const[k,val]of Object.entries(v))out[k]=rewrite(val,k);return out}
 const n=copy(index);dst[n]._parent=ref(parent);dst[parent]._children.push(ref(n));return n;
}
function component(a,n,type){return a[n]._components.map(r=>a[r.__id__]).find(c=>c.__type__===type)}
(async()=>{
 for(const p of read('_data/upgrade/fragment-changed.json'))await save(p,fs.readFileSync(p,'utf8'));
 scan('assets');
 const rolePath=core+'Prefabs/Panel/角色界面.prefab',role=read(rolePath),pet=read(dlc+'Prefabs/Panel/宠物界面.prefab');
 if(!fs.existsSync('_data/upgrade/role-before-fragments.json'))fs.writeFileSync('_data/upgrade/role-before-fragments.json',JSON.stringify(role,null,2));
 const panel=role.findIndex(n=>n.__type__==='cc.Node'&&n._name==='Panel');
 const hero=sf(core+'Sprites/Prop/1_1/4紫色/英雄碎片.png');
 for(const name of ['宠物碎片','免费获取宠物碎片']){
  if(role.some(n=>n.__type__==='cc.Node'&&n._name===name.replace('宠物','英雄')))continue;
  const id=pet.findIndex(n=>n.__type__==='cc.Node'&&n._name===name),n=subtree(pet,role,id,panel);
  role[n]._name=name.replace('宠物','英雄');
  if(name.startsWith('免费')){role[n]._lpos.x=330;role[n]._lpos.y=350;}
  const walk=i=>{const node=role[i];if(node._name==='宠物碎片'){node._name='英雄碎片';const s=component(role,i,'cc.Sprite');if(s)s._spriteFrame=clone(hero)}for(const c of node._children??[])walk(c.__id__)};walk(n);
 }
 const gold=role.findIndex(n=>n.__type__==='cc.Node'&&n._name==='金币');
 component(role,gold,'cc.Sprite')._spriteFrame=clone(hero);component(role,gold,'cc.Sprite')._sizeMode=0;
 component(role,gold,'cc.UITransform')._contentSize={__type__:'cc.Size',width:64,height:65};
 role[gold]._name='英雄碎片图标';
 await coreResources(role);await save(rolePath,role);
 const popup=read(dlc+'Prefabs/Panel/宠物碎片弹窗.prefab');
 const oldType=compress(read(dlc+'Scripts/Panel/ZRSJZ_FragmentPanel.ts.meta').uuid);
 const newType=compress(read(core+'Scripts/Panel/ZRSJZ_RoleFragmentPanel.ts.meta').uuid);
 for(const obj of popup){if(obj.__type__===oldType)obj.__type__=newType;if(obj._name)obj._name=obj._name.replaceAll('宠物碎片','英雄碎片');if(obj._string)obj._string=obj._string.replaceAll('宠物碎片','英雄碎片');if(obj.component==='ZRSJZ_FragmentPanel')obj.component='ZRSJZ_RoleFragmentPanel';if(obj.__type__==='cc.PrefabInfo')obj.asset=ref(0);}
 const icon=popup.findIndex(n=>n.__type__==='cc.Node'&&n._name==='免费碎片图标');
 component(popup,icon,'cc.Sprite')._spriteFrame=clone(hero);component(popup,icon,'cc.Sprite')._sizeMode=0;
 component(popup,icon,'cc.UITransform')._contentSize={__type__:'cc.Size',width:144,height:146};
 await coreResources(popup);await save(core+'Prefabs/Panel/英雄碎片弹窗.prefab',popup);
 for(const p of [rolePath,core+'Prefabs/Panel/英雄碎片弹窗.prefab'])console.log(await call('prefab_prefab_browse',{action:'validate',prefabPath:'db://'+p}));
 console.log('Fragment scripts/UI synced through MCP');
})().catch(e=>{console.error(e);process.exitCode=1});
