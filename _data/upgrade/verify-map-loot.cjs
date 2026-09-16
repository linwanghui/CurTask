const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const {c,boxEV,modes}=require('./analyze-map-balance.cjs');
const src=fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/Unit/ZRSJZ_Box.ts','utf8');
const ast=ts.createSourceFile('box.ts',src,ts.ScriptTarget.Latest,true),cls=ast.statements.find(n=>ts.isClassDeclaration(n));
let seed=732026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const math=Object.create(Math);math.random=random;
const context={Math:math,console,ZRSJZ_PROP_CONFIG:c.ZRSJZ_PROP_CONFIG,ZRSJZ_UIManager:{ZRSJZ_DLC:true},ZRSJZ_BoosterShotService:{ApplyRedProbabilityToWeights:w=>w},ZRSJZ_BOX_EQUIPMENT_TYPES:['枪','刀','头盔','防弹衣','背包'],ZRSJZ_BOX_EQUIPMENT_QUALITY_MULTIPLIERS:[1,.1,.005,.0005,0,0],ZRSJZ_LOOT_QUALITY_ORDER:['白色','绿色','蓝色','紫色','金色','红色'].map(n=>c.ZRSJZ_PROP_QUALITY[n])};
const box={};
for(const name of ['GenerateLootProps','SelectRandomLootProp','GenerateGuaranteedProp']){
 const node=cls.members.find(n=>n.name?.getText(ast)===name);
 const args=node.parameters.map(n=>n.name.getText(ast)).join(',');
 box[name]=vm.runInNewContext(ts.transpileModule('(function('+args+')'+node.body.getText(ast)+')',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
}
for(const [name,m]of modes){
 box._mapProp=m.MapProp;box._boxConfig=m.MapBox.get('木箱');let sum=0;
 for(let i=0;i<30000;i++)for(const n of box.GenerateLootProps()){const p=c.ZRSJZ_PROP_CONFIG.get(n);sum+=p.UnitPrice*(p.PropType==='弹药'?p.MaxCount:1)}
 const measured=sum/30000,expected=boxEV(m,box._boxConfig),error=Math.abs(measured/expected-1);
 assert(error<.06,name+' deviation '+error);console.log(name,'actual loot simulation',Math.round(measured),'analytic',Math.round(expected),'deviation',(error*100).toFixed(2)+'%');
}
console.log('PASS 180000 actual loot rolls against analytical expected values (DLC loaded, no drop buffs).');
