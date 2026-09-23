// Scan the whole assets tree with the TS checker: array/object spreads are safe;
// spreading Map/Set/iterators is not safe with the current vivo loose transform.
const ts=require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const path=require('path');
const config=ts.getParsedCommandLineOfConfigFile(path.resolve('tsconfig.json'),{}, {...ts.sys,onUnRecoverableConfigFileDiagnostic:console.error});
const program=ts.createProgram(config.fileNames,{...config.options,skipLibCheck:true,noEmit:true});
const checker=program.getTypeChecker();let examined=0;const failures=[];
for(const file of program.getSourceFiles()){
 if(file.isDeclarationFile||!file.fileName.replace(/\\/g,'/').includes('/assets/'))continue;
 function visit(node){
  if(ts.isSpreadElement(node)){
   examined++;const type=checker.typeToString(checker.getTypeAtLocation(node.expression));
   if(/\b(?:Readonly)?(?:Map|Set)\s*<|\b(?:Iterable|IterableIterator|Iterator|MapIterator|SetIterator|Generator)\s*</.test(type))failures.push(`${file.fileName}:${file.getLineAndCharacterOfPosition(node.pos).line+1} ${node.expression.getText(file)} : ${type}`);
  }
  ts.forEachChild(node,visit);
 }
 visit(file);
}
console.log(`Checked ${examined} spreads across assets; unsafe collection spreads: ${failures.length}`);
failures.forEach(f=>console.error(f));process.exitCode=failures.length?1:0;
