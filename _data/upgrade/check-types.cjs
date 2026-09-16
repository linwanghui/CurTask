const ts=require('../../extensions/cocos-mcp-server-main/node_modules/typescript'),path=require('path');
const root=path.resolve(__dirname,'../..');
const config=ts.getParsedCommandLineOfConfigFile(path.join(root,'tsconfig.json'),{}, {...ts.sys,onUnRecoverableConfigFileDiagnostic:console.error});
const files=['Panel/ZRSJZ_UpgradePanel.ts','Controller/ZRSJZ_Player.ts','Controller/ZRSJZ_Joystick_Attack.ts','Skill/ZRSJZ_Skill_Button.ts','Service/ZRSJZ_BoosterShotService.ts'].map(p=>path.join(root,'assets/Game_Bundles/73_ZRSJZ/Scripts',p));
files.push(path.join(root,'assets/Game_Bundles/73_ZRSJZ/Scripts/Panel/ZRSJZ_CheatingPanel.ts'));
files.push(...['Controller/ZRSJZ_BossBase.ts','Controller/ZRSJZ_Boss.ts','Controller/ZRSJZ_EnemySkeleton.ts']
    .map(p=>path.join(root,'assets/Game_Bundles/73_ZRSJZ/Scripts',p)));
const program=ts.createProgram(files,{...config.options,skipLibCheck:true,noEmit:true});
const all=ts.getPreEmitDiagnostics(program),relevant=all.filter(d=>!d.file||/73_ZRSJZ(?:_DLC)?[\\/]/.test(d.file.fileName));
for(const d of relevant)console.log(d.file?.fileName,d.file&&d.file.getLineAndCharacterOfPosition(d.start).line+1,ts.flattenDiagnosticMessageText(d.messageText,'\n'));
console.log('Bundle errors:',relevant.length,'; other project errors:',all.length-relevant.length);process.exitCode=relevant.length?1:0;
