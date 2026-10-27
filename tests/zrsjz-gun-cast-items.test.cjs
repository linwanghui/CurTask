const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
const data={Gold:9999999,PropData:{}},storage={};let saves=0;
const GameData={Instance:data,SaveData(){saves++;}};
const events={EmitPersist(){}},eventNames={};
function moduleFrom(file,imports={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
 }).outputText,{exports,require:name=>{assert(name in imports,name);return imports[name];}});return exports;
}
const C=moduleFrom('ZRSJZ_Constant.ts');
const S=moduleFrom('Service/ZRSJZ_GunCastService.ts',{
 cc:{sys:{localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v}}},
 '../ZRSJZ_Constant':C,'../ZRSJZ_GameData':{ZRSJZ_GameData:GameData},
 './ZRSJZ_AccountService':{ZRSJZ_AccountService:{ChangeGold:n=>data.Gold+=n}},
}).ZRSJZ_GunCastService;
const F=moduleFrom('Service/ZRSJZ_FragmentService.ts',{'../ZRSJZ_GameData':{ZRSJZ_GameData:GameData},
 '../Manager/ZRSJZ_EventManager':{ZRSJZ_EventManager:events,ZRSJZ_MyEvent:eventNames}}).ZRSJZ_FragmentService;
function selected(file,name,names,globals){
 const ast=ts.createSourceFile(file,fs.readFileSync(root+file,'utf8'),ts.ScriptTarget.Latest,true);
 const cls=ast.statements.find(ts.isClassDeclaration),members=cls.members.filter(m=>names.includes(m.name?.getText(ast))).map(m=>m.getText(ast)).join('\n');
 return vm.runInNewContext(ts.transpileModule(`class ${name} {${members}}\n${name}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,globals);
}
const kinds=['铸枪护盾','铸枪必成券'];
function round(level=5){S.save({seen:['0'],round:{id:42,level,branch:0,hits:0,superUntil:0,broken:false,recovered:false,ads:0}});}
for(const [i,kind] of kinds.entries()){
 const p=C.ZRSJZ_PROP_CONFIG.get(kind);assert.equal(p.MaxCount,99);assert.equal(p.GridType,C.ZRSJZ_GRID_TYPE._1x1);
 assert.equal(p.Quality,i===0?C.ZRSJZ_PROP_QUALITY.金色:C.ZRSJZ_PROP_QUALITY.红色);
 for(const map of C.ZRSJZ_MAP_CONFIG.values())assert(map.MapProp[i===0?4:5].includes(kind),map.MapName+' loot includes '+kind);
 assert.equal(S.itemCount(kind),0,'old saves have zero items');assert(S.creditItem(kind,3));
 assert(!S.creditItem(kind,-1));assert(!S.creditItem(kind,1.5));
}
round();assert.equal(S.useItem(kinds[0]),'');assert.equal(S.itemCount(kinds[0]),2);
assert(S.useItem(kinds[0]));assert.equal(S.itemCount(kinds[0]),2,'cannot use twice while active');
S.hit(()=>.5);assert(S.itemEffect(kinds[0]),'normal hit preserves shield');
round();assert.equal(S.hit(()=>.52),3);assert(S.itemEffect(kinds[0]),'downgrade does not consume destruction shield');
round();let state=S.load();state.round.superUntil=Date.now()+100000;S.save(state);
assert.equal(S.hit(()=>.99),4);assert(S.itemEffect(kinds[0]),'super protection does not waste shield');
round();assert.equal(S.hit(()=>.99),2);assert(!S.load().round.broken);assert(!S.itemEffect(kinds[0]));
assert.equal(S.hit(()=>.99),4);assert(S.load().round.broken,'shield protects only once');
assert(S.useItem(kinds[1]),'broken weapon cannot use success ticket');
round();assert.equal(S.useItem(kinds[1]),'');const before=S.itemCount(kinds[1]);
data.GunCastItemEffects=JSON.parse(JSON.stringify(data.GunCastItemEffects));
assert.equal(S.hit(()=>.99),1);assert.equal(S.load().round.level,6);assert(!S.itemEffect(kinds[1]));
assert.equal(S.itemCount(kinds[1]),before);assert.equal(S.hit(()=>.99),4);
round();const reward=S.createItemVideoReward(kinds[1]);const count=S.itemCount(kinds[1]);
assert.equal(S.itemCount(kinds[1]),count,'creating an ad request grants nothing');assert(reward());assert(!reward());assert.equal(S.itemCount(kinds[1]),count+1);

const inventoryGlobals={...C,ZRSJZ_GameData:GameData};
const IS=selected('Service/ZRSJZ_InventoryService.ts','ZRSJZ_InventoryService',
 ['IsSearchStackable','CanMergeSearchStack','MergeSearchStackCounts'],inventoryGlobals);
function prop(name,count,inventory=C.ZRSJZ_INVENTORY.背包,owner=0){return {Name:name,CurCount:count,MaxCount:1,CurInventory:inventory,OwnerPlayerIndex:owner,Width:1,Height:1};}
for(const name of ['宠物碎片','英雄碎片',...kinds]){
 data.PropData={a:prop(name,10),b:prop(name,95)};
 assert.equal(IS.MergeSearchStackCounts('a','b'),4);assert.equal(data.PropData.b.CurCount,99);assert.equal(data.PropData.a.CurCount,6);
 assert.equal(data.PropData.b.MaxCount,99);assert.equal(IS.MergeSearchStackCounts('a','b'),0);
 data.PropData.b.CurCount=1;data.PropData.a.IsSearchLocked=true;assert(!IS.CanMergeSearchStack('a','b'));
 data.PropData.a.IsSearchLocked=false;data.PropData.b.OwnerPlayerIndex=1;assert(!IS.CanMergeSearchStack('a','b'));
 data.PropData.b.OwnerPlayerIndex=0;assert(!IS.CanMergeSearchStack('a','a'));
 data.PropData.b.Name='苹果';assert(!IS.CanMergeSearchStack('a','b'));
}

const invNodes=[],ui={IsBattle:true,DraggingPlayerIndex:0,Instance:{GetAllInventoryNodes:()=>invNodes}};
const Inventory=selected('UI/ZRSJZ_Inventory.ts','ZRSJZ_Inventory',['MergeSearchStack','TryReceiveProp','CheckProp'],{
 ...C,ZRSJZ_GameData:GameData,ZRSJZ_InventoryService:IS,ZRSJZ_UIManager:ui,ZRSJZ_EventManager:events,ZRSJZ_MyEvent:eventNames,
 ZRSJZ_PropGrid:Symbol(),v2:(x,y)=>({x,y}),
});
IS.RemovePropID=id=>{delete data.PropData[id];GameData.SaveData();};
function inventory(type,grid){
 const inv=Object.assign(new Inventory(),{InventoryType:type,PlayerViewIndex:0,Grids:grid,IsVisible:true,InventoryConfig:{},
  IsAdaptive:()=>true,BelongsToInventory:(p,t)=>p.CurInventory===t,
  node:{active:true,children:[]},UITransform:{getBoundingBoxToWorld:()=>({contains:()=>true}),convertToNodeSpaceAR:()=>({x:0,y:0})},
  GetGridPositionByCenter:()=>({gridX:0,gridY:0}),
  HasEnoughEmptyGridCount:()=>false,FindEmptyGridForProp:()=>null,RemoveProp:async id=>{inv.Grids=inv.Grids.map(row=>row.map(v=>v===id?'':v));},
 });
 invNodes.push({getComponent:()=>inv});return inv;
}
(async()=>{
 data.PropData={a:prop(kinds[0],10),b:prop(kinds[0],95)};
 const source=inventory(C.ZRSJZ_INVENTORY.背包,[['a']]),target=inventory(C.ZRSJZ_INVENTORY.保险箱,[['b']]);
 data.PropData.b.CurInventory=C.ZRSJZ_INVENTORY.保险箱;
 await target.CheckProp(C.ZRSJZ_INVENTORY.背包,'a',{},false);assert.equal(data.PropData.a.CurCount,10,'drag preview does not mutate');
 await target.CheckProp(C.ZRSJZ_INVENTORY.背包,'a',{},true);assert.equal(data.PropData.a.CurCount,6);assert.equal(data.PropData.b.CurCount,99);
 data.PropData.b.CurCount=50;
 assert(await target.TryReceiveProp(C.ZRSJZ_INVENTORY.背包,'a',true));assert.equal(data.PropData.b.CurCount,56);assert(!data.PropData.a);assert.equal(source.Grids[0][0],'');
 data.PropData.a=prop(kinds[0],10);data.PropData.b.CurCount=95;
 assert.equal(await target.TryReceiveProp(C.ZRSJZ_INVENTORY.背包,'a',true),false);
 assert.equal(data.PropData.a.CurCount,6,'overflow stays in source even when destination is full');

 const inventoryService={GetWeaponryIDs:()=>[],GetAmmoIDs:()=>[],SetAmmoID(){}};
 const Receiver=selected('Manager/ZRSJZ_UIManager.ts','Receiver',['DoFinishGameInventory','DoReceivePropAwards','CanReceivePropAwards'],{
  ...C,ZRSJZ_GameData:GameData,ZRSJZ_GunCastService:S,ZRSJZ_FragmentService:F,
  ZRSJZ_EventManager:events,ZRSJZ_MyEvent:eventNames,ZRSJZ_InventoryService:inventoryService,
 });
 const receiver=new Receiver();receiver.InventoryMap=new Map();receiver._receiveAwardsQueue=Promise.resolve();
 receiver.ReceiveExistingProps=()=>{throw Error('account materials must never enter warehouse');};
 data.GunCastItems={};data.PetFragments=0;data.HeroFragments=0;
 const I=C.ZRSJZ_INVENTORY;
 function loot(){data.PropData={shield:prop(kinds[0],3,I.背包),ticket:prop(kinds[1],2,I.保险箱),unclaimed:prop(kinds[1],7,I.物资),pet:prop('宠物碎片',4,I.背包),hero:prop('英雄碎片',6,I.保险箱)};}
 loot();await receiver.DoFinishGameInventory(true);
 assert.equal(S.itemCount(kinds[0]),3);assert.equal(S.itemCount(kinds[1]),2);assert.equal(data.PetFragments,4);assert.equal(data.HeroFragments,6);
 assert.equal(Object.keys(data.PropData).length,0);await receiver.DoFinishGameInventory(true);assert.equal(S.itemCount(kinds[0]),3,'no duplicate settlement');
 loot();await receiver.DoFinishGameInventory(false);
 assert.equal(S.itemCount(kinds[0]),3,'failed extraction loses backpack materials');assert.equal(S.itemCount(kinds[1]),4,'safe items survive failure');
 assert.equal(data.PetFragments,4);assert.equal(data.HeroFragments,12);
 const awards=kinds.map(PropName=>({PropName,Count:2}));assert(await receiver.CanReceivePropAwards(awards));
 const result=await receiver.DoReceivePropAwards(awards,C.ZRSJZ_MAIL_TYPE.仓库已满);
 assert.equal(result.InvalidAwards.length,0);assert.equal(result.PlacedPropIDs.length,0);assert.equal(S.itemCount(kinds[0]),5);

 const prefab=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/铸枪界面.prefab','utf8'));
 const holder=prefab.find(v=>v._name==='铸枪道具');assert(holder);
 assert.equal(holder._children.filter(r=>kinds.includes(prefab[r.__id__]._name)).length,2,'both item cards exist independently of decorative titles');
 for(const kind of kinds){const card=holder._children.map(r=>prefab[r.__id__]).find(v=>v._name===kind);assert(card);
  assert(card._active,'item slot is visible');
  assert(card._components.some(r=>prefab[r.__id__].__type__==='cc.Button'),'click the slot to inspect');
  const names=card._children.map(r=>prefab[r.__id__]._name);for(const name of ['Icon','数量','使用中'])assert(names.includes(name));
  assert(!card._children.map(r=>prefab[r.__id__]).some(n=>n._name==='操作'&&n._active),'use control is only shown in the popup');}
 const popup=prefab.find(v=>v._name==='道具弹窗');assert(popup);assert.equal(popup._active,false);
 const popupBody=popup._children.map(r=>prefab[r.__id__]).find(v=>v._name==='Panel');
 const popupMeta=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/铸枪界面/铸枪/道具/道具弹窗底.png.meta','utf8'));
 assert.equal(popupBody._components.map(r=>prefab[r.__id__]).find(v=>v.__type__==='cc.Sprite')._spriteFrame.__uuid__,popupMeta.uuid+'@f9941');
 assert(popupBody._components.some(r=>prefab[r.__id__].__type__==='cc.BlockInputEvents'),'clicking inside does not dismiss through the mask');
 const ids=prefab.filter(v=>v.fileId).map(v=>v.fileId);assert.equal(new Set(ids).size,ids.length);

 const labels=new Map(),buttons=new Map(),activeNodes=new Map(),positions=new Map(),effects=[],adCallbacks=[],timeouts=[];const Button=Symbol();
 const ItemPanel=selected('Panel/ZRSJZ_GunCastPanel.ts','ItemPanel',['refreshItemCards','refreshItemPopup','openItemPopup','closeItemPopup','useOrGetItem'],{
  S,Button,isValid:node=>!!node,UI:{Instance:{ShowTip(){}}},Banner:{Instance:{ShowVideoAd:cb=>adCallbacks.push(cb)}},
 });
 const itemPanel=Object.assign(new ItemPanel(),{busy:false,node:{},text:(path,text)=>labels.set(path,text),
  active:(path,value)=>activeNodes.set(path,value),image(){},setItemQuality(){},playItemUseEffect:kind=>effects.push(kind),
  at:path=>({setPosition:x=>positions.set(path,x),getComponent:()=>{if(!buttons.has(path))buttons.set(path,{});return buttons.get(path);}}),
  scheduleOnce:cb=>timeouts.push(cb),
 });
 Object.defineProperty(itemPanel,'CanClose',{get:()=>!itemPanel.busy});
 itemPanel.refresh=()=>itemPanel.refreshItemCards();
 data.GunCastItems={};data.GunCastItemEffects={};round();itemPanel.refreshItemCards();
 assert.equal(labels.get('铸枪道具/铸枪护盾/数量'),'x0');
 itemPanel.openItemPopup(kinds[0]);assert.equal(activeNodes.get('道具弹窗'),true);
 assert.equal(S.itemCount(kinds[0]),0);assert.equal(adCallbacks.length,0,'opening details grants nothing and starts no video');
 assert.equal(labels.get('道具弹窗/Panel/操作/文字'),'免费获取');
 assert.equal(activeNodes.get('道具弹窗/Panel/操作/视频角标黑色'),true);
 assert.equal(positions.get('道具弹窗/Panel/操作/文字'),-24);
 assert(labels.get('道具弹窗/Panel/说明').includes('抵挡一次武器损毁'));
 itemPanel.useOrGetItem(kinds[0]);assert.equal(adCallbacks.length,1);assert.equal(S.itemCount(kinds[0]),0);
 itemPanel.useOrGetItem(kinds[0]);assert.equal(adCallbacks.length,1,'busy blocks repeated ad clicks');
 adCallbacks[0]();adCallbacks[0]();assert.equal(S.itemCount(kinds[0]),1);
 assert.equal(labels.get('铸枪道具/铸枪护盾/数量'),'x1');
 assert.equal(labels.get('道具弹窗/Panel/数量'),'拥有数量：1');
 assert.equal(labels.get('道具弹窗/Panel/操作/文字'),'使用道具');
 assert.equal(activeNodes.get('道具弹窗/Panel/操作/视频角标黑色'),false);
 assert.equal(positions.get('道具弹窗/Panel/操作/文字'),0);
 assert.equal(effects.length,0,'video acquisition does not activate an item');
 itemPanel.useOrGetItem(kinds[0]);assert(S.itemEffect(kinds[0]));assert.equal(S.itemCount(kinds[0]),0);
 assert.equal(effects.length,0,'arming an item does not play the effect');
 assert.equal(activeNodes.get('道具弹窗'),false);assert.equal(itemPanel.itemPopupKind,null,'successful use closes details');
 assert.equal(activeNodes.get('铸枪道具/铸枪护盾/使用中'),true);
 itemPanel.openItemPopup(kinds[0]);assert.equal(labels.get('道具弹窗/Panel/操作/文字'),'使用中');
 assert.equal(activeNodes.get('道具弹窗/Panel/操作/视频角标黑色'),false);
 itemPanel.useOrGetItem(kinds[0]);assert.equal(effects.length,0,'an already active item does not play the effect');
 assert.equal(buttons.get('道具弹窗/Panel/操作').interactable,false);
 assert.equal(buttons.get('铸枪道具/铸枪护盾').interactable,true,'active item remains inspectable');
 itemPanel.closeItemPopup();assert.equal(activeNodes.get('道具弹窗'),false);
 itemPanel.openItemPopup(kinds[1]);assert.equal(labels.get('道具弹窗/Panel/名称'),kinds[1]);
 assert(labels.get('道具弹窗/Panel/说明').includes('必定成功'));
 itemPanel.useOrGetItem(kinds[1]);timeouts.at(-1)();assert.equal(S.itemCount(kinds[1]),0,'cancelled/failed ad never grants an item');
 itemPanel.busy=true;timeouts[0]();assert.equal(itemPanel.busy,true,'old ad timer must not unlock a later operation');itemPanel.busy=false;
 const ImpactPanel=selected('Panel/ZRSJZ_GunCastPanel.ts','ImpactPanel',['qiaoda'],{S,Sprite:Symbol(),UIOpacity:Symbol(),ZRSJZ_AudioManager:{Instance:{PlaySoundByDLC(){}}}});
 const impact=Object.assign(new ImpactPanel(),{hammerPlaying:true,settled:false,at:()=>null,
  playItemUseEffect:kind=>effects.push(kind),flashWeapon(){},refresh(){},popHitResult(){},shatterWeapon(){}});
 let roll=.5;const realHit=S.hit;S.hit=()=>realHit.call(S,()=>roll);
 function strike(){impact.settled=false;impact.qiaoda();}
 data.GunCastItemEffects={};round();S.creditItem(kinds[0],1);assert.equal(S.useItem(kinds[0]),'');
 strike();assert.equal(effects.length,0,'normal hits preserve shield and play no item effect');
 round();roll=.52;strike();assert.equal(effects.length,0,'downgrade does not trigger shield effect');
 round();state=S.load();state.round.superUntil=Date.now()+100000;S.save(state);
 roll=.99;strike();assert.equal(effects.length,0,'super protection does not trigger shield effect');
 round();strike();assert.deepEqual(effects,[kinds[0]],'shield icon floats only when destruction is blocked');
 impact.qiaoda();assert.equal(effects.length,1,'duplicate impact events do not replay the item effect');
 round();S.creditItem(kinds[1],1);assert.equal(S.useItem(kinds[1]),'');S.guaranteeNextSuccess();
 strike();assert.equal(effects.length,1,'cheat success preserves ticket and does not play its effect');
 round();strike();assert.deepEqual(effects,kinds,'ticket icon floats on the hit guaranteed by the ticket');
 strike();assert.equal(effects.length,2,'following hits do not replay consumed item effects');
 S.hit=realHit;
 assert(saves>0);console.log('PASS: item effects, 99-stack/extraction, popup/video rewards and item visuals only on actual shield/ticket consumption.');
})().catch(e=>{console.error(e);process.exitCode=1;});
