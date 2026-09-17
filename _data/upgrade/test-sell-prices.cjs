const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const root='assets/Game_Bundles/73_ZRSJZ/Scripts/';
const transpile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const c={};vm.runInNewContext(transpile(fs.readFileSync(root+'ZRSJZ_Constant.ts','utf8')),{exports:c,require});
function method(file,name,context){const src=fs.readFileSync(root+file,'utf8'),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true),cls=ast.statements.find(ts.isClassDeclaration),m=cls.members.find(n=>n.name?.getText(ast)===name);const async=m.modifiers?.some(x=>x.kind===ts.SyntaxKind.AsyncKeyword)?'async ':'';return vm.runInNewContext(transpile('('+async+'function('+m.parameters.map(p=>p.name.getText(ast)).join(',')+')'+m.body.getText(ast)+')'),context)}
const I={GetPropSellValue:method('Service/ZRSJZ_InventoryService.ts','GetPropSellValue',{ZRSJZ_PROP_SELL_RATES:c.ZRSJZ_PROP_SELL_RATES})};
for(const type of ['枪','刀','头盔','防弹衣','背包','弹药','房卡','门禁卡'])assert.equal(I.GetPropSellValue({PropType:type,UnitPrice:10000,CurCount:1}),5000);
assert.equal(I.GetPropSellValue({PropType:'物品',UnitPrice:10000,CurCount:1}),10000);
assert.equal(I.GetPropSellValue({PropType:'弹药',UnitPrice:2500/3,CurCount:60}),25000);
assert.equal(I.GetPropSellValue({PropType:'枪',UnitPrice:10001,CurCount:1}),5000);
assert.equal(I.GetPropSellValue(undefined),0);
assert.equal(I.GetPropSellValue({PropType:'枪',UnitPrice:0,CurCount:1}),0);
let gold=0;const data={PropData:{}};I.RemovePropID=id=>delete data.PropData[id];
const fmt={};vm.runInNewContext(transpile(fs.readFileSync(root+'ZRSJZ_NumberFormat.ts','utf8')),{exports:fmt});
const ctx={FormatMoney:fmt.FormatMoney,ZRSJZ_InventoryService:I,ZRSJZ_GameData:{Instance:data},ZRSJZ_AccountService:{ChangeGold:v=>gold+=v},ZRSJZ_EventManager:{EmitPersist(){}},ZRSJZ_MyEvent:{},ZRSJZ_TaskService:{CompleteTask(){}},ZRSJZ_UIManager:{Instance:{ShowCurrencyEffect(){},GetAllInventoryNodes:()=>[]}}};
const fixture=()=>({gun:{PropType:'枪',UnitPrice:10000,CurCount:1},ammo:{PropType:'弹药',UnitPrice:100,CurCount:60},card:{PropType:'房卡',UnitPrice:10000,CurCount:1},loot:{PropType:'物品',UnitPrice:10000,CurCount:1}});
(async()=>{
 data.PropData=fixture();const panel={_sellPropID:Object.keys(data.PropData),SellValue:{},ActualSellValue:{}};
 panel.RefreshSellValue=method('Panel/ZRSJZ_WarehousePanel.ts','RefreshSellValue',ctx);panel.RefreshSellValue();
 assert.equal(panel.SellValue.string,'3万');assert.equal(panel.ActualSellValue.string,'2万');
 method('Panel/ZRSJZ_WarehousePanel.ts','SellProp',ctx).call(panel);assert.equal(gold,23000);assert.equal(Object.keys(data.PropData).length,0);assert.equal(panel.ActualSellValue.string,'0');
 data.PropData=fixture();gold=0;const sell=method('Panel/ZRSJZ_PropPanel.ts','SellProp',ctx);
 for(const id of Object.keys(data.PropData))await sell.call({_propID:id,_isOperating:false,ClosePanel(){}});
 assert.equal(gold,23000);assert.equal(Object.keys(data.PropData).length,0);
 console.log('PASS: eight discounted categories, full-price loot, fractional ammo, zero price, rounding, mixed bulk display/payout, identical individual payout.');
})().catch(e=>{console.error(e);process.exitCode=1});
