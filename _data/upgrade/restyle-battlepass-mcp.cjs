// All prefab mutations go through the running Cocos Creator MCP server.
const {call}=require('./mcp.cjs');
const fs=require('fs'),path=require('path');
const prefab='db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';
const art='assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/战令界面/';
let nodes={},assets={};
const white={r:255,g:255,b:255,a:255};
const prop=(type,value)=>({type,value});
async function set(p,t,properties){
 const n=nodes[p];let index=n.components.findIndex(c=>c.type===t);
 if(index<0)throw Error('Missing component '+p+' '+t);
 const customProperties={};
 for(let [key,v]of Object.entries(properties)){
  if(v.type==='spriteFrame')await call('component_set_component_property',{nodeUuid:n.uuid,componentType:t,property:key,propertyType:v.type,value:v.value});
  else customProperties[`__comps__.${index}.${key}`]=['color','size','vec2','vec3'].includes(v.type)?Object.fromEntries(Object.entries(v.value).map(([k,value])=>[k,{value}])):v.value;
 }
 if(Object.keys(customProperties).length)await call('node_node_transform',{uuid:n.uuid,customProperties});
}
async function fit(p,w,h){const n=nodes[p];n.box={width:w,height:h};if(n.artSize){let s=Math.min(w/n.artSize.width,h/n.artSize.height);w=n.artSize.width*s;h=n.artSize.height*s;}await set(p,'cc.UITransform',{contentSize:prop('size',{width:w,height:h})});}
async function move(p,x,y,w,h,active){await call('node_node_transform',{uuid:nodes[p].uuid,position:{x,y,z:0},scale:{x:1,y:1,z:1},...(active===undefined?{}:{active})});if(w!==undefined)await fit(p,w,h);}
async function active(p,value){if(nodes[p])await call('node_node_transform',{uuid:nodes[p].uuid,active:value});}
async function sf(file){if(assets[file])return assets[file];const q=await call('assetAdvanced_asset_query',{action:'get_details',assetPath:'db://'+file,includeSubAssets:true});const asset=q.data.subAssets.find(a=>a.type==='spriteFrame');if(!asset)throw Error('No SpriteFrame: '+file);return assets[file]=asset.uuid;}
async function sprite(p,file){const n=nodes[p];if(!n.components.some(c=>c.type==='cc.Sprite')){if(n.components.some(c=>c.type==='cc.Label'))await call('component_component_manage',{action:'remove',nodeUuid:n.uuid,componentType:'cc.Label'});await call('component_component_manage',{action:'add',nodeUuid:n.uuid,componentType:'cc.Sprite'});n.components=n.components.filter(c=>c.type!=='cc.Label');n.components.push({type:'cc.Sprite'});}await set(p,'cc.Sprite',{spriteFrame:prop('spriteFrame',await sf(file)),color:prop('color',white),type:prop('number',0),sizeMode:prop('number',0)});const meta=JSON.parse(fs.readFileSync(file+'.meta'));n.artSize=Object.values(meta.subMetas).find(s=>s.importer==='sprite-frame')?.userData||meta.subMetas.f9941.userData;if(n.box)await fit(p,n.box.width,n.box.height);}
async function label(p,text,size=30,color=white){await set(p,'cc.Label',{string:prop('string',text),fontSize:prop('number',size),lineHeight:prop('number',size+4),color:prop('color',color),overflow:prop('number',2)});}
async function create(p,type='cc.Sprite'){if(nodes[p])return;let parent=p.slice(0,p.lastIndexOf('/')),name=p.slice(p.lastIndexOf('/')+1);let q=await call('node_node_lifecycle',{action:'create',name,parentUuid:nodes[parent].uuid,nodeType:'2DNode',components:[type]});nodes[p]={uuid:q.data.uuid,components:[{type:'cc.UITransform'},{type}],children:[]};await call('node_node_transform',{uuid:q.data.uuid,layer:33554432});}
function walk(n,p=''){let key=p?p+'/'+n.name:n.name;nodes[key]=n;for(let c of n.children||[])if(typeof c==='object')walk(c,key);}
async function main(){let q=await call('node_node_query',{action:'tree',maxDepth:20});let root=q.data.tree;function find(n){if(n.name==='战令界面')return n;for(let c of n.children||[]){if(typeof c==='object'){let r=find(c);if(r)return r;}}}walk(find(root));let full=nodes;nodes={};for(let [k,v]of Object.entries(full))nodes[k.replace(/^战令界面\/?/,'')]=v;
// Inspect the component types before using the typed setters.
for(let p of ['Panel/关闭','Panel/等级','Panel/奖励列表'])await call('component_component_query',{action:'list',nodeUuid:nodes[p].uuid});
const phase=process.argv[2]||'base';
if(phase==='base'){
 await sprite('背景',art+'背景.jpg');await move('背景',0,0,2340,1080);
 const styles=[['关闭','返回-战令.png',-995,465,330,112],['标题','战令标题.png',-450,305,650,190],['副标题','组 10.png',-460,230,440,62],['经验区域','经验底.png',-45,150,1380,100],['经验底','经验条底.png',-190,150,850,46],['经验底/经验条','经验条.png',0,0,834,34],['奖励页','页签选中.png',-1010,290,335,145],['任务','页签.png',-1010,145,335,140],['购买等级','购买等级.png',500,150,250,96],['奖励底','战令底.png',-45,-160,1390,530],['普通模式','基础战令.png',-620,-40,196,222],['进阶模式','进阶战令.png',-620,-275,196,222],['进阶解锁','解锁进阶.png',-620,-345,178,64],['一键领取','一键领取按钮.png',940,-390,340,122]];
 for(let [n,f,x,y,w,h]of styles){await sprite('Panel/'+n,art+f);await move('Panel/'+n,x,y,w,h);}
 await set('Panel/经验底/经验条','cc.Sprite',{type:prop('number',3),fillType:prop('number',0),fillStart:prop('number',0),fillRange:prop('number',0)});
 await move('Panel/等级',-680,150,110,60);await label('Panel/等级','Lv.0',36);
 await move('Panel/经验文字',-180,150,250,38);await label('Panel/经验文字','0 / 100',26);
 for(let p of ['关闭/文字','购买等级/文字','进阶解锁/文字','一键领取/文字','普通标记','普通名称','进阶标记','进阶名称','特殊奖励','说明'])await active('Panel/'+p,false);
 await label('Panel/奖励页/文字','▣ 战令奖励',42,{r:20,g:20,b:20,a:255});await move('Panel/奖励页/文字',-8,0,300,70);
 await label('Panel/任务/文字','▤ 每日任务',42);await move('Panel/任务/文字',-8,0,300,70);
 await create('Panel/进阶宣传');await sprite('Panel/进阶宣传',art+'解锁提示.png');await move('Panel/进阶宣传',950,-245,460,155);
 await move('Panel/奖励列表',55,-155,1150,490);await move('Panel/奖励列表/View',0,0,1150,490);await move('Panel/奖励列表/View/Content',-575,245,8750,490);
 console.log('Base layout complete');
}
if(phase==='rewards'){
 const cfg=fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_BattlePassConfig.ts','utf8');let rewards=[...cfg.matchAll(/r\((\d+),'([^']+)','([^']+)',(\d+)/g)].map(m=>({level:+m[1],type:m[2],name:m[3],count:+m[4]}));
 const files=[];function scan(dir){for(let e of fs.readdirSync(dir,{withFileTypes:true})){let p=dir+'/'+e.name;if(e.isDirectory())scan(p);else if(p.endsWith('.png.meta'))files.push(p.slice(0,-5));}}scan('assets/Game_Bundles/73_ZRSJZ/Sprites/Prop');
 for(let i=0;i<rewards.length;i++){let r=rewards[i],track=i<50?'normal':'advanced',p=`Panel/奖励列表/View/Content/等级${r.level}/${track}`;
  let file=files.find(p=>path.basename(p,'.png')===r.name);if(!file&&r.type==='gold'){await create('Panel/资源/'+r.name);}else if(!file)throw Error('Missing reward art '+r.name);
  if(file){await create('Panel/资源/'+r.name);await sprite('Panel/资源/'+r.name,file);await sprite(p+'/图标',file);}
  await sprite(p,art+(track==='normal'?'基础战令框.png':'进阶战令框.png'));await sprite(p+'/可领取',art+(track==='normal'?'普通战令框1.png':'进阶战令框1.png'));await sprite(p+'/图标底',art+'任务/经验底.png');await sprite(p+'/锁',art+'锁.png');await sprite(p+'/已领取',art+'已领取.png');
  await move(p,0,track==='normal'?112:-122,167.5,225);await move(p+'/可领取',0,0,167.5,225);await move(p+'/图标底',0,10,134,134);await move(p+'/图标',0,10,102,102);await move(p+'/已领取',0,10,85,85);await move(p+'/锁',60,80,34,42);await move(p+'/数量',20,-42,118,30);await label(p+'/数量','×'+r.count,26);await move(p+'/名称',0,-85,160,34);await label(p+'/名称',r.name,23);await active(p+'/状态',false);
  if(i%10===0)console.log('Reward columns '+i+'/100');
 }
 // Hidden legacy milestone cards still load their assets; replace them as well.
 for(let p of Object.keys(nodes).filter(p=>p.startsWith('Panel/特殊奖励')&&nodes[p].components.some(c=>c.type==='cc.Sprite'))){let file=p.endsWith('/锁')?'锁.png':p.endsWith('/可领取')?'普通战令框1.png':p.endsWith('/advanced')?'进阶战令框.png':p.endsWith('/图标')?null:'基础战令框.png';if(file)await sprite(p,art+file);}
 console.log('All 100 rewards use exact artwork');
}
if(phase==='tasks'){
 await move('Panel/任务内容/页签',-510,438,530,85);
 for(let [period,x]of [['daily',-135],['weekly',135]]){let p='Panel/任务内容/页签/'+period;await move(p,x,0,260,85);await sprite(p,art+'任务/任务页签.png');await move(p+'/选中',0,0,260,85);await sprite(p+'/选中',art+'任务/任务页签选中.png');await move(p+'/文字',0,0,245,60);await label(p+'/文字',period==='daily'?'每日任务':'每周任务',37);}
 await sprite('Panel/任务内容/任务底',art+'任务/任务底.png');await move('Panel/任务内容/任务底',-70,-5,1420,790);
 for(let period of ['daily','weekly']){let base='Panel/任务内容/'+period;await move(base,-70,-5,1390,760);await move(base+'/View',0,0,1390,760);await move(base+'/View/Content',0,380,1390,790);
  const rows=nodes[base+'/View/Content'].children;for(let i=0;i<rows.length;i++){let p=base+'/View/Content/'+rows[i].name;if(i===5){await active(p,false);await sprite(p,art+'任务/任务条底.png');continue;}
   await move(p,0,-77-i*158,1370,144);await sprite(p,art+'任务/任务条底.png');
   await move(p+'/名称',-385,32,390,48);await label(p+'/名称','任务',36);await move(p+'/说明',-385,-28,390,44);await label(p+'/说明','任务说明',26,{r:181,g:202,b:220,a:255});
   await move(p+'/类型图标',-625,0,75,75);await active(p+'/类型图标/文字',false);
   await move(p+'/进度条',0,0,340,32);await sprite(p+'/进度条',art+'任务/经验条_底.png');await move(p+'/进度条/填充',-166,0,332,24);await sprite(p+'/进度条/填充',art+'任务/经验条.png');await set(p+'/进度条/填充','cc.Sprite',{type:prop('number',3),fillType:prop('number',0),fillRange:prop('number',0)});
   await move(p+'/进度',220,0,100,45);await label(p+'/进度','0/1',29);await move(p+'/经验',408,0,110,45);await label(p+'/经验','×40',30);
   await create(p+'/经验图标');await sprite(p+'/经验图标',art+'任务/经验图标.png');await move(p+'/经验图标',320,0,78,78);
   await move(p+'/领取',562,0,190,90);await sprite(p+'/领取',art+'任务/领取按钮.png');await move(p+'/领取/文字',0,0,176,65);await label(p+'/领取/文字','领取',34,{r:0,g:0,b:0,a:255});
  }
 }
 const icons={login:'73_ZRSJZ/Sprites/七日签到/打勾.png',battle:'73_ZRSJZ/Sprites/仓库/图标/武器.png',kill:'73_ZRSJZ/Sprites/局内/射击.png',search:'73_ZRSJZ/Sprites/开箱/搜索图标.png',extract:'73_ZRSJZ/Sprites/小地图/固定撤离点.png',heal:'73_ZRSJZ/Sprites/治疗药/医疗箱.png',special:'73_ZRSJZ/Sprites/小地图/任务.png'};
 for(let [metric,file]of Object.entries(icons)){await create('Panel/资源/任务_'+metric);await sprite('Panel/资源/任务_'+metric,'assets/Game_Bundles/'+file);}
 await move('Panel/任务内容/刷新说明',-70,-425,1380,35);await label('Panel/任务内容/刷新说明','每日 00:00 刷新（北京时间）',25);
 console.log('Task layout and seven distinct type icons complete');
}
if(phase==='cleanup'){
 const entries=JSON.parse(fs.readFileSync(prefab.replace('db://',''))),saved={};
 function visit(n,p=''){const key=p?p+'/'+n._name:n._name;saved[key.replace(/^战令界面\/?/,'')]=n;for(let c of n._children||[])visit(entries[c.__id__],key);}visit(entries[1]);
 const metaMap={};function scan(dir){for(let e of fs.readdirSync(dir,{withFileTypes:true})){let file=dir+'/'+e.name;if(e.isDirectory())scan(file);else if(file.endsWith('.meta')){let m=JSON.parse(fs.readFileSync(file));for(let s of Object.values(m.subMetas||{}))if(s.userData?.width&&s.userData?.height)metaMap[s.uuid]=s.userData;}}}scan('assets/Game_Bundles/73_ZRSJZ/Sprites');scan('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites');
 const old={'d037f712-4e18-45ae-9407-bd13c95f607c':'任务/领取按钮.png','a4bf3bf5-9914-4cdb-874f-1de72298d823':'战令底.png','5108497c-aab3-4562-8ee2-63906ce800c1':'基础战令框.png','6a3bb05a-bf92-4459-955e-a6d656de3ec1':'进阶战令框.png'};
 let count=0;
 for(let [p,n]of Object.entries(saved)){let comps=n._components.map(r=>entries[r.__id__]),s=comps.find(c=>c.__type__==='cc.Sprite'),u=comps.find(c=>c.__type__==='cc.UITransform');if(!s||!u||!nodes[p])continue;let id=s._spriteFrame?.__uuid__,replacement=old[id?.split('@')[0]];if(replacement){await sprite(p,art+replacement);id=await sf(art+replacement);}let dim=metaMap[id]||nodes[p].artSize;if(!dim)throw Error('Unresolved sprite '+p+' '+id);nodes[p].artSize=dim;await fit(p,u._contentSize.width,u._contentSize.height);count++;}
 console.log('Verified and aspect-fitted '+count+' sprite nodes');
}
if(phase==='finish'){
 for(let [p,text,w,h,size]of [['一键领取','一键领取',295,70,43],['购买等级','购买等级 ▶',220,60,34],['进阶解锁','解锁进阶 ▶',164,48,27]]){await active('Panel/'+p+'/文字',true);await move('Panel/'+p+'/文字',0,0,w,h);await label('Panel/'+p+'/文字',text,size,{r:0,g:0,b:0,a:255});}
 for(let p of ['奖励页','任务'])await label('Panel/'+p+'/文字',p==='任务'?'每日任务':'战令奖励',42,p==='任务'?{r:156,g:158,b:177,a:255}:{r:0,g:0,b:0,a:255});
 console.log('Button captions restored');
}
if(phase==='generated-icons'){
 const names={login:'登录',battle:'对战',kill:'击败',search:'搜索',extract:'撤离',heal:'治疗',special:'特殊'};
 for(let [metric,name]of Object.entries(names)){await sprite('Panel/资源/任务_'+metric,art+'任务/任务类型-'+name+'.png');await fit('Panel/资源/任务_'+metric,75,75);}
 for(let p of Object.keys(nodes).filter(p=>p.endsWith('/类型图标'))){let slot=p.split('/').at(-2),metric=slot.slice(2);await sprite(p,art+'任务/任务类型-'+names[metric]+'.png');await move(p,-625,0,75,75);}
 await set('背景','cc.Widget',{enabled:prop('boolean',false)});await sprite('背景',art+'背景.jpg');await move('背景',0,0,2340,1080);
 console.log('Seven generated task icons bound; background stretch constraint removed');
}
if(phase==='polish'){
 await sprite('背景',art+'背景.jpg');await move('背景',0,0,2480,1145);
 const m=JSON.parse(fs.readFileSync(art+'任务/经验条.png.meta')).subMetas.f9941.userData;
 for(let p of Object.keys(nodes).filter(p=>p.endsWith('/进度条/填充'))){await move(p,-166,0,332,332*m.height/m.width);}
}
await call('prefab_prefab_edit',{action:'save',prefabPath:prefab});console.log('Saved '+phase);
}
main().catch(e=>{console.error(e);process.exitCode=1});
