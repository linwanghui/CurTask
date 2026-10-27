// 根据最新 Cocos 预制体渲染道具格、使用状态与详情弹窗的离线排版预览。
const fs=require('fs');
const sharp=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const a=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/铸枪界面.prefab','utf8'));
const files=[
 'assets/Game_Bundles/73_ZRSJZ/Sprites/Prop/1_1/铸枪护盾.png',
 'assets/Game_Bundles/73_ZRSJZ/Sprites/Prop/1_1/铸枪必成券.png',
 'assets/Game_Bundles/73_ZRSJZ/Sprites/格子/红色格子1_1.png',
 'assets/Game_Bundles/73_ZRSJZ/Sprites/格子/金色格子1_1.png',
 'assets/Game_Bundles/73_ZRSJZ/Sprites/UI/视频角标黑色.png',
 'assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/盲盒/黑底九宫格.png',
 'assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/铸枪界面/铸枪/道具/道具弹窗底.png',
 'assets/Game_Bundles/73_ZRSJZ/Sprites/仓库/道具信息/大按钮-黄.png',
];
const images=new Map(files.map(file=>{
 const meta=JSON.parse(fs.readFileSync(file+'.meta','utf8'));
 const frame=Object.values(meta.subMetas).find(v=>v.importer==='sprite-frame');
 return [frame.uuid,{url:'data:image/png;base64,'+fs.readFileSync(file).toString('base64'),data:frame.userData}];
}));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
function lines(text,width,size,wrap){
 const result=[];
 for(const paragraph of text.replaceAll('\\n','\n').split('\n')){
  let line='',used=0;
  for(const ch of paragraph){const advance=/[\u2e80-\uffef]/.test(ch)?size:size*.56;
   if(wrap&&line&&used+advance>width){result.push(line);line='';used=0;}line+=ch;used+=advance;
  }result.push(line);
 }return result;
}
function sprite(c,w,h){
 const source=images.get(c._spriteFrame?.__uuid__);if(!source)return '';
 const opacity=(c._color?.a??255)/255;
 if(c._type!==1)return `<image href="${source.url}" width="${w}" height="${h}" opacity="${opacity}" preserveAspectRatio="none"/>`;
 const d=source.data,l=d.borderLeft,r=d.borderRight,t=d.borderTop,b=d.borderBottom,sw=d.rawWidth,sh=d.rawHeight;
 const sx=[0,l,sw-r],sy=[0,t,sh-b],sws=[l,sw-l-r,r],shs=[t,sh-t-b,b];
 const dx=[0,l,w-r],dy=[0,t,h-b],dws=[l,w-l-r,r],dhs=[t,h-t-b,b];let svg='';
 for(let row=0;row<3;row++)for(let col=0;col<3;col++)svg+=`<svg x="${dx[col]}" y="${dy[row]}" width="${dws[col]}" height="${dhs[row]}" viewBox="${sx[col]} ${sy[row]} ${sws[col]} ${shs[row]}" opacity="${opacity}" preserveAspectRatio="none"><image href="${source.url}" width="${sw}" height="${sh}"/></svg>`;
 return svg;
}
function draw(index,parent,path='',state='idle',force=false){
 const n=a[index],current=path?path+'/'+n._name:n._name;
 const show=force||n._active||(n._name==='使用中'&&state==='active'&&path.endsWith('铸枪护盾'));
 if(!show)return '';
 const comps=n._components.map(r=>a[r.__id__]),box=comps.find(v=>v.__type__==='cc.UITransform')._contentSize,w=box.width,h=box.height;
 const x=parent.width/2+n._lpos.x-w/2,y=parent.height/2-n._lpos.y-h/2;
 let svg=`<g transform="translate(${x},${y})">`;
 for(const c of comps){
  if(c.__type__==='cc.Sprite')svg+=sprite(c,w,h);
  if(c.__type__==='cc.Label'){
   let text=c._string;
   if(n._name==='数量')text=path.includes('铸枪道具')?(state==='active'&&path.endsWith('铸枪护盾')?'x0':'x1'):'拥有数量：'+(state==='empty'?0:1);
   if(n._name==='文字'&&path.endsWith('操作'))text=state==='empty'?'免费获取':'使用道具';
   const rows=lines(text,w,c._fontSize,c._enableWrapText),lh=c._lineHeight||c._fontSize*1.2;
   const align=c._horizontalAlign===0?'start':c._horizontalAlign===2?'end':'middle',tx=align==='start'?0:align==='end'?w:w/2;
   const ty=h/2-(rows.length-1)*lh/2+c._fontSize*.35,cl=c._color;
   const stroke=c._enableOutline?`stroke="black" stroke-width="${c._outlineWidth*2}" stroke-linejoin="round" paint-order="stroke fill"`:'';
   svg+=`<text x="${tx}" y="${ty}" text-anchor="${align}" font-family="Microsoft YaHei, sans-serif" font-size="${c._fontSize}" font-weight="${c._isBold?'bold':'normal'}" fill="rgb(${cl.r},${cl.g},${cl.b})" ${stroke}>`;
   rows.forEach((row,i)=>{svg+=`<tspan x="${tx}" dy="${i?lh:0}">${escape(row)}</tspan>`;});svg+='</text>';
  }
 }
 for(const r of n._children)svg+=draw(r.__id__,box,current,state);
 return svg+'</g>';
}
const holder=a.findIndex(n=>n._name==='铸枪道具'),popup=a.find(n=>n._name==='道具弹窗');
const body=popup._children.find(r=>a[r.__id__]._name==='Panel').__id__;
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="720"><rect width="1100" height="720" fill="#514a47"/><text x="32" y="38" fill="white" font-family="Microsoft YaHei, sans-serif" font-size="22">铸枪道具 · 图标格与详情弹窗排版预览</text>';
for(const [i,state] of ['idle','active'].entries()){
 svg+=`<g transform="translate(44,${120+i*300})"><text x="201" y="-20" text-anchor="middle" fill="#eee8e0" font-family="Microsoft YaHei, sans-serif" font-size="19">${i?'使用后显示绿色状态':'点击图标查看详情'}</text>`;
 const original=a[holder]._lpos;a[holder]._lpos={x:0,y:0};svg+=draw(holder,{width:402,height:197},'',state);a[holder]._lpos=original;svg+='</g>';
}
const child=(parent,name)=>a[parent]._children.find(r=>a[r.__id__]._name===name).__id__;
const action=child(body,'操作'),badge=child(action,'视频角标黑色'),actionText=child(action,'文字');
a[badge]._active=false;a[actionText]._lpos.x=0;
svg+='<g transform="translate(540,96)">'+draw(body,{width:520,height:571},'', 'idle',true)+'</g></svg>';
fs.mkdirSync('artifacts/gun-cast-items',{recursive:true});
sharp(Buffer.from(svg)).png().toFile('artifacts/gun-cast-items/item-popup-preview.png').then(()=>console.log('artifacts/gun-cast-items/item-popup-preview.png'));
let comparison='<svg xmlns="http://www.w3.org/2000/svg" width="1140" height="690"><rect width="1140" height="690" fill="#514a47"/><text x="35" y="42" fill="white" font-family="Microsoft YaHei, sans-serif" font-size="23">品质底图 · 有库存使用 / 无库存视频获取</text>';
comparison+='<g transform="translate(30,85)">'+draw(body,{width:520,height:571},'','idle',true)+'</g>';
function component(index,type){return a[index]._components.map(r=>a[r.__id__]).find(v=>v.__type__===type);}
const frame=file=>JSON.parse(fs.readFileSync(file+'.meta','utf8')).uuid+'@f9941';
component(child(body,'品质'),'cc.Sprite')._spriteFrame.__uuid__=frame(files[2]);
component(child(body,'Icon'),'cc.Sprite')._spriteFrame.__uuid__=frame(files[1]);
component(child(body,'名称'),'cc.Label')._string='铸枪必成券';
component(child(body,'说明'),'cc.Label')._string='下次有效敲击必定成功，\n武器提升一级。\n效果触发后自动取消；\n未触发前，退出仍保留。';
a[badge]._active=true;a[actionText]._lpos.x=-24;
comparison+='<g transform="translate(590,85)">'+draw(body,{width:520,height:571},'','empty',true)+'</g></svg>';
sharp(Buffer.from(comparison)).png().toFile('artifacts/gun-cast-items/item-quality-preview.png').then(()=>console.log('artifacts/gun-cast-items/item-quality-preview.png'));
