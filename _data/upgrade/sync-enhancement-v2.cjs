const fs = require('fs');
const { call } = require('./mcp.cjs');
const scripts = [
    'assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_EnhancementConfig.ts',
    'assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_Player.ts',
    'assets/Game_Bundles/73_ZRSJZ/Scripts/Service/ZRSJZ_FacilityService.ts',
    'assets/Game_Bundles/73_ZRSJZ/Scripts/Panel/ZRSJZ_UpgradePanel.ts',
];
const prefabPath = 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/强化界面.prefab';
(async () => {
    for (const file of scripts) {
        const result = await call('assetAdvanced_asset_operations', {
            action: 'save',
            url: 'db://' + file,
            content: fs.readFileSync(file, 'utf8'),
        });
        console.log('saved', result.data?.url ?? file);
    }
    // 基于刚由 Creator 保存的最新预制体，只改 GrayIcon 的 Sprite SizeMode。
    const prefab = JSON.parse(fs.readFileSync(prefabPath, 'utf8'));
    let changed = 0;
    for (const node of prefab) {
        if (node?.__type__ !== 'cc.Node' || node._name !== 'GrayIcon') continue;
        const sprite = (node._components ?? []).map(ref => prefab[ref.__id__])
            .find(component => component?.__type__ === 'cc.Sprite');
        if (!sprite) throw new Error('GrayIcon 缺少 Sprite 组件');
        sprite._sizeMode = 1;
        sprite._isTrimmedMode = true;
        changed++;
    }
    if (changed !== 60) throw new Error(`GrayIcon 数量异常: ${changed}`);
    const saved = await call('assetAdvanced_asset_operations', {
        action: 'save',
        url: 'db://' + prefabPath,
        content: JSON.stringify(prefab, null, 2),
    });
    console.log('saved prefab', changed, saved.data?.url);
    console.log(await call('prefab_prefab_browse', {
        action: 'validate',
        prefabPath: 'db://' + prefabPath,
    }));
})().catch(error => { console.error(error); process.exitCode = 1; });
