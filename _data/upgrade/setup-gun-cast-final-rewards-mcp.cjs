const fs = require('node:fs');
const { call } = require('./mcp.cjs');

(async () => {
    const path = 'assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Constant.ts';
    const url = 'db://' + path;
    console.log(await call('assetAdvanced_asset_query', { action: 'get_info', assetPath: url }));
    let content = fs.readFileSync(path, 'utf8');
    const before = "{ name: '冰霜裁决', item: '霜月狼' }, { name: '烈焰破军', item: '焚天龙' }, { name: '蚀骨毒牙', item: '裂海鲨' }";
    const after = "{ name: '冰霜裁决', item: '冰霜裁决' }, { name: '烈焰破军', item: '烈焰破军' }, { name: '蚀骨毒牙', item: '蚀骨毒牙' }";
    if (!content.includes(after)) {
        if (content.split(before).length !== 2) throw new Error('Expected one final reward mapping');
        content = content.replace(before, after);
        console.log(await call('assetAdvanced_asset_operations', { action: 'save', url, content }));
    }
    for (const name of ['冰霜裁决', '烈焰破军', '蚀骨毒牙']) {
        const result = await call('assetAdvanced_asset_query', {
            action: 'find_by_name', folder: 'db://assets/Game_Bundles/73_ZRSJZ/Sprites/Prop/装备/枪', name, exactMatch: true,
        });
        console.log(name, JSON.stringify(result));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
