const fs=require('fs'),{call}=require('./mcp.cjs');
const profiles=require('./theme-box-loot-profiles.json');
const file='assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Constant.ts';let s=fs.readFileSync(file,'utf8');
const block=`/** 主题箱掉落：数量基数、品质档位偏移及额外保底；不引用 DLC 图片资源。 */
export const ZRSJZ_THEME_BOX_LOOT_CONFIG: ReadonlyArray<{
    Name: string; MinCount: number; MaxCount: number; QualityBonus: number; GuaranteedTypes: readonly string[];
}> = [
${profiles.map(([Name,MinCount,MaxCount,QualityBonus,GuaranteedTypes])=>'    '+JSON.stringify({Name,MinCount,MaxCount,QualityBonus,GuaranteedTypes})+',').join('\n')}
];

function CreateThemeMapBoxEntries(mapName: string, modeIndex: number): [string, ZRSJZ_BoxConfig][] {
    return ZRSJZ_THEME_BOX_LOOT_CONFIG
        .filter(box => box.Name.startsWith(mapName + "_"))
        .map(box => [box.Name, CreateMapBoxConfig(
            box.Name, modeIndex,
            box.MinCount + Math.floor(modeIndex / 3), box.MaxCount + Math.floor(modeIndex / 2),
            box.QualityBonus, box.GuaranteedTypes,
        )]);
}

`;
if(!s.includes('ZRSJZ_THEME_BOX_LOOT_CONFIG'))s=s.replace('function CreateMapModeConfig(',block+'function CreateMapModeConfig(').replace('        MapBox: new Map([','        MapBox: new Map([\n            ...CreateThemeMapBoxEntries(mapName, modeIndex),');
fs.writeFileSync(__dirname+'/theme-box-constant-staged.ts',s);
if(process.argv.includes('--stage'))process.exit(0);
(async()=>{await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+file,content:s});for(const [name]of profiles){const f='assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Unit/箱子/'+name+'.prefab';const a=JSON.parse(fs.readFileSync(f,'utf8'));a.find(x=>x.ThemeIconSF).BoxName=name;await call('assetAdvanced_asset_operations',{action:'save',url:'db://'+f,content:JSON.stringify(a,null,2)});}console.log('Saved 17 themed loot configs and prefabs via MCP');})().catch(e=>{console.error(e);process.exitCode=1});
