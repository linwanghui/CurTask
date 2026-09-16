const fs=require('fs'),assert=require('assert'),vm=require('vm'),ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript');
const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_NumberFormat.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out});
for(const [input,expected]of [[0,'0'],9999,10000].filter(Array.isArray).concat([[9999,'9999'],[10000,'1万'],[1000000,'100万'],[10000000,'1000万'],[100000000,'1亿'],[1001000000,'10亿100万'],[12345678,'1234万5678'],[100000001,'1亿1'],[100010001,'1亿1万1'],[99999999,'9999万9999'],[25000.9,'2万5000'],[-1,'0'],[NaN,'0'],[Infinity,'0']]))assert.equal(out.FormatMoney(input, true),expected);
console.log('PASS money boundaries, billion/ten-thousand groups, exact integer remainder and invalid values.');

for(const [input,expected]of [[9999,'9999'],[12345678,'1234万'],[100000001,'1亿'],[100010001,'1亿1万'],[1001000000,'10亿100万']])assert.equal(out.FormatMoney(input),expected);
console.log('PASS display truncates remainder; payment retains exact amount.');
