const fs=require('fs'),{call}=require('./mcp.cjs');
const prefab='assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/强化界面.prefab';
const script='assets/Game_Bundles/73_ZRSJZ/Scripts/Panel/ZRSJZ_UpgradePanel.ts';
const art='assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/强化弹窗1/';
const a=JSON.parse(fs.readFileSync(prefab,'utf8'));
const meta=name=>JSON.parse(fs.readFileSync(art+name+'.png.meta','utf8')).subMetas.f9941;
const plain=meta('虚线'),owned=meta('虚线1');
const ref=m=>({__uuid__:m.uuid,__expectedType__:'cc.SpriteFrame'});
let count=0;
for(const n of a.filter(n=>n.__type__==='cc.Node'&&n._name==='Dotted')){
 const sprite=n._components.map(r=>a[r.__id__]).find(c=>c.__type__==='cc.Sprite');
 const transform=n._components.map(r=>a[r.__id__]).find(c=>c.__type__==='cc.UITransform');
 sprite._sizeMode=1;
 const frame=sprite._spriteFrame?.__uuid__===owned.uuid?owned:plain;
 transform._contentSize.width=frame.userData.width;
 transform._contentSize.height=frame.userData.height;
 count++;
}
const panel=a.find(c=>c.NormalFrame&&c.OwnedLineFrame);
if(!panel||count!==50)throw Error('Unexpected prefab structure: '+count);
panel.DottedFrame=ref(plain);panel.OwnedDottedFrame=ref(owned);
(async()=>{
 await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+script,content:fs.readFileSync(script,'utf8')});
 await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+prefab,content:JSON.stringify(a,null,2)});
 console.log('Updated '+count+' Dotted sprites to TRIMMED; assigned both dotted frames.');
})().catch(e=>{console.error(e);process.exitCode=1});
