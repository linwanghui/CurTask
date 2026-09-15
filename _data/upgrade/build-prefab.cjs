const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {call}=require('./mcp.cjs');
const project=path.resolve(__dirname,'../..');
const target='assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/强化界面.prefab';
const original=JSON.parse(fs.readFileSync(path.join(project,target),'utf8'));
const backup=path.join(__dirname,'original.prefab.json');
if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(original,null,2));
const source=JSON.parse(fs.readFileSync(backup));
const other=JSON.parse(fs.readFileSync(path.join(project,'assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/主线任务界面.prefab')));
const clone=x=>JSON.parse(JSON.stringify(x)),ref=i=>({__id__:i});
const a=[clone(source[0])];a[0].data=ref(1);
const templates=[...source,...other];
function component(node,type,props={}){
 const template=templates.find(x=>x.__type__===type);
 const c=template?clone(template):{__type__:type,_name:'',_objFlags:0,__editorExtras__:{},_enabled:true,_id:''};
 Object.assign(c,{node:ref(node),__prefab:null},props); const i=a.push(c)-1;a[node]._components.push(ref(i));return i;
}
function node(name,parent,x,y,w,h,anchorY=.5){
 const n=clone(source[1]);Object.assign(n,{_name:name,_parent:parent===null?null:ref(parent),_children:[],_components:[],_prefab:null,
 _lpos:{__type__:'cc.Vec3',x,y,z:0},_layer:1,_id:''});
 const i=a.push(n)-1;if(parent!==null)a[parent]._children.push(ref(i));
 component(i,'cc.UITransform',{_contentSize:{__type__:'cc.Size',width:w,height:h},_anchorPoint:{__type__:'cc.Vec2',x:.5,y:anchorY}});
 return i;
}
const art='assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/强化弹窗1/';
function spriteRef(file){const m=JSON.parse(fs.readFileSync(path.join(project,file+'.meta'),'utf8'));return {__uuid__:m.subMetas.f9941.uuid,__expectedType__:'cc.SpriteFrame'};}
function sprite(name,parent,x,y,w,h,file){const i=node(name,parent,x,y,w,h);component(i,'cc.Sprite',{_spriteFrame:typeof file==='string'?spriteRef(file):file,_sizeMode:0,_type:0,_color:color(255,255,255)});return i;}
function color(r,g,b,a=255){return{__type__:'cc.Color',r,g,b,a};}
function label(name,parent,x,y,w,h,text,size=32,dark=false){const i=node(name,parent,x,y,w,h);component(i,'cc.Label',{_string:text,_fontSize:size,_actualFontSize:size,_lineHeight:size+5,_overflow:2,_enableWrapText:true,_horizontalAlign:1,_verticalAlign:1,_color:dark?color(39,51,58):color(255,255,255),_enableOutline:!dark,_outlineWidth:2});return i;}
function button(i){component(i,'cc.Button',{clickEvents:[],_target:ref(i),_transition:3,_zoomScale:1.04});}
const root=node('强化界面',null,0,0,2340,1080);component(root,'cc.Widget');
const panel=node('Panel',root,0,0,2340,1080);
const bg=sprite('Background',panel,0,0,2460,1135,art+'背景.jpg');component(bg,'cc.BlockInputEvents');
const close=sprite('Close',panel,-967,472,330,106,'assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/强化弹窗/返回-强化.png');button(close);
label('Progress',panel,-110,471,600,52,'强化等级  0 / 50',36);
label('Hint',panel,-110,-512,970,40,'上下滑动查看路线 · 每5级开放特殊强化',27);
const bonuses=node('Bonuses',panel,-950,200,370,350);
label('Title',bonuses,0,174,360,40,'永久属性加成',30);
['攻击','生命','移速','防御','技能伤害','技能冷却','换弹速度','大红掉落概率'].forEach((s,i)=>label('Stat'+i,bonuses,0,133-i*33,380,34,s+'  +0',25));
const tree=sprite('Tree',panel,-110,-25,1040,888,art+'强化底.png');
const scroll=node('Scroll',tree,0,0,994,830);
const view=node('View',scroll,0,0,994,830);component(view,'cc.Mask',{_type:0,_inverted:false});
const content=node('Content',view,0,415,994,50*210+120,1);
component(scroll,'cc.ScrollView',{content:ref(content),_content:ref(content),horizontal:false,vertical:true,inertia:true,brake:.7,elastic:true,bounceDuration:.2,horizontalScrollBar:null,verticalScrollBar:null,scrollEvents:[],cancelInnerEvents:true});
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const configPath=path.join(project,'assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_EnhancementConfig.ts');
const mod={exports:{}};new Function('exports','require','module',ts.transpileModule(fs.readFileSync(configPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod.exports,require,mod);
const configs=mod.exports.ZRSJZ_ENHANCEMENT_NODES;
for(let level=1;level<=50;level++){
 const row=node('Row_'+level,content,0,-(50-level)*210-120,994,210);
 if(level<50)sprite('Line',row,-300,105,15,210,art+'灰线.png');
 sprite('Dotted',row,20,105,6,120,art+'虚线.png');
 if(level%5===0)sprite('Branch',row,25,0,650,12,art+'灰线.png');
 const marker=sprite('Level',row,20,0,100,100,art+'等级底.png');label('Text',marker,0,0,85,75,''+level,48);
 for(const cfg of configs.filter(n=>n.Level===level)){
  const x=cfg.Special?350:-300,icon=mod.exports.ZRSJZ_ENHANCEMENT_STATS[cfg.Stat].Icon;
  const item=sprite(cfg.ID,row,x,0,146,146,art+'属性底.png');button(item);
  const select=sprite('Selected',item,0,0,170,170,art+'选中框.png');a[select]._active=cfg.ID==='main_1';
  const colored=sprite('Icon',item,0,5,90,90,art+icon+'_小图标.png');a[colored]._active=cfg.ID==='main_1';
  const gray=sprite('GrayIcon',item,0,5,90,90,art+icon+'_灰.png');a[gray]._active=cfg.ID!=='main_1';
  label('Value',item,40,-54,120,38,'+'+cfg.Value,30);
  label('Name',item,0,-102,290,38,cfg.Stat,28);
  label('Status',item,0,100,180,34,cfg.Special?'特殊强化':'',24);
  if(cfg.Special){
   a[item]._euler.z=45;a[item]._lrot={__type__:'cc.Quat',x:0,y:0,z:Math.sin(Math.PI/8),w:Math.cos(Math.PI/8)};
   for(const r of a[item]._children){const child=a[r.__id__];if(child._name==='Selected')continue;
    const {x,y}=child._lpos;child._lpos.x=(x+y)/Math.sqrt(2);child._lpos.y=(y-x)/Math.sqrt(2);
    child._euler.z=-45;child._lrot={__type__:'cc.Quat',x:0,y:0,z:-Math.sin(Math.PI/8),w:Math.cos(Math.PI/8)};
   }
  }
 }
}
const desc=sprite('Desc',panel,790,0,590,813,art+'强化底信息底.png');component(desc,'cc.BlockInputEvents');
label('Title',desc,0,362,550,65,'技能伤害强化 Lv.1',40);
label('Category',desc,0,291,500,40,'基础强化 · 路线 Lv.1',26,true);
sprite('IconBase',desc,0,211,146,146,art+'属性底.png');
sprite('Icon',desc,0,211,90,96,art+'技能伤害_小图标.png');
label('Gain',desc,0,109,510,40,'本次提升 +3%',32,true);
label('Total',desc,0,68,510,36,'累计 +0% → +3%',28,true);
label('Description',desc,0,19,508,62,'提高玩家激光、轰炸等伤害技能的伤害。',23,true);
const grid=source.find(n=>n.__type__==='cc.Sprite'&&source[n.node?.__id__]?._name==='道具1格子')._spriteFrame;
for(let i=0;i<2;i++){
 const mat=sprite('Material'+i,desc,-114+i*228,-89,126,126,grid);
 sprite('Icon',mat,0,0,85,85,null);
 label('Name',mat,0,48,208,34,i?'工业图纸':'切割刀',23);
 label('Count',mat,30,-46,112,34,'0/1',26);
}
label('Requirement',desc,0,-167,530,34,'消耗以下材料与金币',23,true);
label('Gold',desc,23,-199,400,42,'10万 / 1.2万',32,true);
const coin=source.find(n=>n.__type__==='cc.Sprite'&&source[n.node?.__id__]?._name==='金币')._spriteFrame;
sprite('Coin',desc,-205,-199,58,58,coin);
const upgrade=sprite('Upgrade',desc,0,-304,400,104,'assets/Game_Bundles/73_ZRSJZ/Sprites/仓库/道具信息/大按钮-黄.png');button(upgrade);
label('Text',upgrade,0,0,330,70,'解锁',44,true);
const scriptType=source[1]._components.map(c=>source[c.__id__].__type__).find(t=>!t.startsWith('cc.'));
component(root,scriptType,{NormalFrame:spriteRef(art+'属性底.png'),OwnedFrame:spriteRef(art+'属性底已强化.png'),LevelFrame:spriteRef(art+'等级底.png'),OwnedLevelFrame:spriteRef(art+'等级底已升级.png'),LineFrame:spriteRef(art+'灰线.png'),OwnedLineFrame:spriteRef(art+'黄线.png')});
// Assign prefab-local identities so the tree remains editable in Creator.
for(let i=1;i<a.length;i++){
 const obj=a[i];if(obj.__type__==='cc.Node'){
  obj._prefab=ref(a.length);a.push({__type__:'cc.PrefabInfo',root:ref(root),asset:ref(0),fileId:crypto.randomUUID(),instance:null,targetOverrides:null,nestedPrefabInstanceRoots:null});
 } else if(obj.node && obj.__type__!=='cc.PrefabInfo'){
  obj.__prefab=ref(a.length);a.push({__type__:'cc.CompPrefabInfo',fileId:crypto.randomUUID()});
 }
}
fs.writeFileSync(path.join(__dirname,'new.prefab.json'),JSON.stringify(a,null,2));
async function main(){
 await call('assetAdvanced_asset_query',{action:'get_info',assetPath:'db://'+target});
 const result=await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+target,content:JSON.stringify(a,null,2)});
 console.log(JSON.stringify({nodes:a.filter(n=>n.__type__==='cc.Node').length,result}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
