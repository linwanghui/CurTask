const fs = require('node:fs');
const { call } = require('./mcp.cjs');

(async () => {
    const path = 'assets/Game_Bundles/73_ZRSJZ/Scripts/Panel/ZRSJZ_GunCastPanel.ts';
    const url = 'db://' + path;
    console.log(await call('assetAdvanced_asset_query', { action: 'get_info', assetPath: url }));
    console.log(await call('assetAdvanced_asset_query', { action: 'find_by_name', folder: 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Audios', name: '敲打', assetType: 'audio' }));
    let content = fs.readFileSync(path, 'utf8');
    const before = '        this.settled = true;';
    if (!content.includes("PlaySoundByDLC('敲打')")) {
        if (content.split(before).length !== 2) throw new Error('Expected one strike settlement');
        content = content.replace(before, before + "\n        ZRSJZ_AudioManager.Instance?.PlaySoundByDLC('敲打');");
    }
    const broken = '        const broken = !!S.load().round?.broken;';
    if (!content.includes("PlaySoundByDLC('敲打成功')")) {
        if (content.split(broken).length !== 2) throw new Error('Expected one destruction check');
        content = content.replace(broken, broken + "\n        if (broken) {\n            ZRSJZ_AudioManager.Instance?.PlaySoundByDLC('敲打失败');\n        } else if (result === 0 || result === 1) {\n            ZRSJZ_AudioManager.Instance?.PlaySoundByDLC('敲打成功');\n        }");
    }
    content = content.replace("        // 按需求，成功、大成功与实际损毁均播放成功音效。\n        if (result === 0 || result === 1 || broken) {", "        if (broken) {\n            ZRSJZ_AudioManager.Instance?.PlaySoundByDLC('敲打失败');\n        } else if (result === 0 || result === 1) {");
    console.log(await call('assetAdvanced_asset_operations', { action: 'save', url, content }));
    console.log(await call('scene_scene_query_system', { action: 'check_script', className: 'ZRSJZ_GunCastPanel' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
