const fs = require('node:fs');
const { call } = require('./mcp.cjs');
const files = [
    'Service/ZRSJZ_ElementCombat.ts', 'Manager/ZRSJZ_PoolManager.ts',
    'Controller/ZRSJZ_EnemyBase.ts', 'Controller/ZRSJZ_Enemy.ts', 'Controller/ZRSJZ_Enemy_Firebat.ts',
    'Controller/ZRSJZ_BossBase.ts', 'Controller/ZRSJZ_Bullet.ts', 'Controller/ZRSJZ_Player.ts',
    'Controller/ZRSJZ_OnlineBattle.ts',
];
(async () => {
    console.log(await call('assetAdvanced_asset_system', { action: 'refresh', folder: 'db://assets/Game_Bundles/73_ZRSJZ/Scripts/Service' }));
    for (const file of files) {
        const path = 'assets/Game_Bundles/73_ZRSJZ/Scripts/' + file;
        const result = await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + path, content: fs.readFileSync(path, 'utf8') });
        console.log(file, result.success);
    }
    for (const name of ['元素子弹', '打击_冰', '打击_毒', '打击_火']) {
        console.log(await call('prefab_prefab_browse', { action: 'validate', prefabPath: 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Unit/' + name + '.prefab' }));
    }
    for (const className of ['ZRSJZ_Player', 'ZRSJZ_Bullet', 'ZRSJZ_Enemy', 'ZRSJZ_Enemy_Firebat']) {
        console.log(await call('scene_scene_query_system', { action: 'check_script', className }));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
