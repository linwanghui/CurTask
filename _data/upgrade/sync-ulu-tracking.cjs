const fs = require('fs');
const { call } = require('./mcp.cjs');
(async () => {
  for (const file of (process.argv.includes('--fengyi') ? ['ZRSJZ_Constant.ts', 'Controller/ZRSJZ_Player.ts', 'Skill/ZRSJZ_Skill_Button.ts'] : ['Controller/ZRSJZ_Player.ts', 'Skill/ZRSJZ_UluSkill.ts', 'Skill/ZRSJZ_UluMissile.ts'])) {
    const path = 'assets/Game_Bundles/73_ZRSJZ/Scripts/' + file;
    await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + path, content: fs.readFileSync(path, 'utf8') });
    console.log('Synced', file);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
