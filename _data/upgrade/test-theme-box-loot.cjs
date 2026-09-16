const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const c={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(process.argv.includes('--live')?'assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Constant.ts':__dirname+'/theme-box-constant-staged.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,{exports:c,require});
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

let tested=0;for(const [mapName,m]of c.ZRSJZ_MAP_CONFIG){
 const entries=[...m.MapBox].filter(([n])=>/^(沙漠|雪地)_/.test(n));
 assert.equal(entries.length,mapName.startsWith('沙漠')?9:mapName.startsWith('极北')?8:0);
 for(const [name,config]of entries){
  box._mapProp=m.MapProp;box._boxConfig=config;
  for(let i=0;i<300;i++){
   const loot=box.GenerateLootProps();assert(loot.length>=config.MinPropCount+config.GuaranteedPropTypes.length);assert(loot.length<=config.MaxPropCount+config.GuaranteedPropTypes.length);
   for(const n of loot){const p=c.ZRSJZ_PROP_CONFIG.get(n);assert(p,'invalid item '+n);assert.notEqual(p.PropType,'背包');if(['枪','刀','头盔','防弹衣'].includes(p.PropType))assert(context.ZRSJZ_LOOT_QUALITY_ORDER.indexOf(p.Quality)<=3);if(p.PropType==='物品'&&p.Quality===c.ZRSJZ_PROP_QUALITY.红色)assert(m.MapProp[5].includes(n),'exclusive red leak');}
   for(const type of config.GuaranteedPropTypes)assert(loot.some(n=>c.ZRSJZ_PROP_CONFIG.get(n).PropType===type));
  }
  if(process.argv.includes('--live')){const prefab=JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Unit/箱子/'+name+'.prefab','utf8'));assert.equal(prefab.find(x=>x.ThemeIconSF).BoxName,name);}
  tested++;
 }
}
assert.equal(tested,34);console.log('PASS 34 map/box configs, 10200 loot rolls: quantity, guaranteed types, equipment limits, exclusive reds, regional isolation.');
