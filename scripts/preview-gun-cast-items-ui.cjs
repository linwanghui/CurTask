// 按真实预制体中的节点尺寸、位置、文字和素材生成道具卡片排版校验页。
const fs=require('fs');
const a=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/铸枪界面.prefab','utf8'));
const imagePaths=['assets/Game_Bundles/73_ZRSJZ/Sprites/Prop/1_1/铸枪护盾.png','assets/Game_Bundles/73_ZRSJZ/Sprites/Prop/1_1/铸枪必成券.png','assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/铸枪界面/铸枪/道具/道具卡片底.png'];
const images=new Map(imagePaths.map(file=>{
 const meta=JSON.parse(fs.readFileSync(file+'.meta','utf8'));
 return [Object.values(meta.subMetas).find(s=>s.importer==='sprite-frame').uuid,'data:image/png;base64,'+fs.readFileSync(file).toString('base64')];
}));
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const holder=a.find(v=>v._name==='铸枪道具');
function render(index,parentSize,state){
 const n=a[index],comps=n._components.map(r=>a[r.__id__]),transform=comps.find(v=>v.__type__==='cc.UITransform');
 const {width:w,height:h}=transform._contentSize,{x,y}=n._lpos;
 let html=`<div class="node" style="left:${parentSize.width/2+x-w/2}px;top:${parentSize.height/2-y-h/2}px;width:${w}px;height:${h}px">`;
 for(const c of comps){
  if(c.__type__==='cc.Sprite'){
   const tint=c._color,id='tint'+index;
   html+=`<svg width="0" height="0"><filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${tint.r/255} 0 0 0 0 0 ${tint.g/255} 0 0 0 0 0 ${tint.b/255} 0 0 0 0 0 1 0"/></filter></svg><img src="${images.get(c._spriteFrame.__uuid__)}" style="filter:url(#${id})">`;
  }
  if(c.__type__==='cc.Label'){
   const kind=a[n._parent.__id__]._name;
   let text=c._string;
   if(n._name==='数量')text=state==='empty'?'拥有 ×0':state==='stock'?'拥有 ×8':'拥有 ×7';
   if(n._name==='文字')text=state==='empty'?'看视频 +1':state==='stock'?'使用道具':'已生效';
   if(n._name==='状态'&&state==='active')text=kind==='铸枪护盾'?'已生效 · 抵挡一次损毁':'已生效 · 下次必定成功';
   const color=c._color;
   html+=`<span style="font-size:${c._fontSize}px;color:rgb(${color.r},${color.g},${color.b});line-height:${c._lineHeight}px">${escape(text)}</span>`;
  }
 }
 for(const c of n._children)html+=render(c.__id__,{width:w,height:h},state);
 return html+'</div>';
}
let html='<!doctype html><meta charset="utf-8"><title>铸枪道具 · 预制体排版校验</title><style>*{box-sizing:border-box}body{margin:0;padding:24px 20px;background:#101722;color:#e8edf4;font-family:"Microsoft YaHei",Arial,sans-serif}h1{font-size:22px;margin:0 0 8px}p{font-size:13px;color:#8ea4b6;margin:0 0 24px}.columns{display:flex;gap:14px}.column{width:390px}.heading{font-size:16px;letter-spacing:2px;color:#aabed0;text-align:center;margin-bottom:10px}.cards{position:relative;width:390px;height:570px}.node{position:absolute}img{position:absolute;width:100%;height:100%;object-fit:fill}span{position:absolute;inset:0;display:flex;justify-content:center;align-items:center;white-space:nowrap;text-shadow:0 1px 2px #000}</style><h1>铸枪道具</h1><p>按 Cocos 预制体原始尺寸生成的排版校验 · 无库存 / 有库存 / 效果生效中</p><div class="columns">';
for(const [state,title] of [['empty','无库存 · 视频获取'],['stock','有库存 · 点击使用'],['active','效果已开启']]){
 html+=`<section class="column"><div class="heading">${title}</div><div class="cards">`;
 for(const [i,r] of holder._children.filter(r=>a[r.__id__]._name!=='标题').entries()){
  const n=a[r.__id__],old=n._lpos;n._lpos={x:0,y:155-i*292};html+=render(r.__id__,{width:390,height:570},state);n._lpos=old;
 }
 html+='</div></section>';
}
html+='</div>';
fs.mkdirSync('artifacts/gun-cast-items',{recursive:true});
// HTML 引用项目中的原始素材，避免重复嵌入大图。
for(const [i,uri] of [...images.values()].entries()) html=html.replaceAll(uri,'../../'+imagePaths[i]);
fs.writeFileSync('artifacts/gun-cast-items/ui-preview.html',html);
console.log('artifacts/gun-cast-items/ui-preview.html');

// 离线渲染同一组 UI 节点，不需要启动浏览器或访问本地文件 URL。
function svgNode(index,parentSize,state){
 const n=a[index],comps=n._components.map(r=>a[r.__id__]),t=comps.find(v=>v.__type__==='cc.UITransform')._contentSize;
 const x=parentSize.width/2+n._lpos.x-t.width/2,y=parentSize.height/2-n._lpos.y-t.height/2;
 let svg=`<g transform="translate(${x},${y})">`;
 for(const c of comps){
  if(c.__type__==='cc.Sprite')svg+=`<image href="${images.get(c._spriteFrame.__uuid__)}" width="${t.width}" height="${t.height}" preserveAspectRatio="none"/>`;
  if(c.__type__==='cc.Label'){
   let text=c._string;
   if(n._name==='数量')text=state==='empty'?'拥有 ×0':state==='stock'?'拥有 ×8':'拥有 ×7';
   if(n._name==='文字')text=state==='empty'?'看视频 +1':state==='stock'?'使用道具':'已生效';
   if(n._name==='状态'&&state==='active')text=a[n._parent.__id__]._name==='铸枪护盾'?'已生效 · 抵挡一次损毁':'已生效 · 下次必定成功';
   const color=c._color;svg+=`<text x="${t.width/2}" y="${t.height/2+c._fontSize*.35}" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="${c._fontSize}" fill="rgb(${color.r},${color.g},${color.b})">${escape(text)}</text>`;
  }
 }
 for(const r of n._children)svg+=svgNode(r.__id__,t,state);
 return svg+'</g>';
}
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="710"><rect width="1240" height="710" fill="#101722"/><text x="20" y="34" fill="#edf4ff" font-family="Microsoft YaHei, sans-serif" font-size="22">铸枪道具 · UI 排版预览</text>';
for(const [col,[state,title]] of [['empty','无库存 · 视频获取'],['stock','有库存 · 点击使用'],['active','效果已开启']].entries()){
 svg+=`<g transform="translate(${20+col*405},100)"><text x="195" y="-20" text-anchor="middle" fill="#aabed0" font-family="Microsoft YaHei, sans-serif" font-size="18">${title}</text>`;
 for(const [i,r] of holder._children.filter(r=>a[r.__id__]._name!=='标题').entries()){
  const n=a[r.__id__],old=n._lpos;n._lpos={x:0,y:155-i*292};svg+=svgNode(r.__id__,{width:390,height:570},state);n._lpos=old;
 }
 svg+='</g>';
}
svg+='</svg>';
const sharp=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
sharp(Buffer.from(svg)).png().toFile('artifacts/gun-cast-items/ui-preview.png').then(()=>console.log('artifacts/gun-cast-items/ui-preview.png'));
