const fs = require('node:fs');
const assert = require('node:assert/strict');
const { call } = require('./mcp.cjs');

(async () => {
    const path = 'assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Constant.ts';
    let content = fs.readFileSync(path, 'utf8');
    const descriptions = {
        '冰霜裁决': '命中叠加寒意，减速并冻结敌人，为换弹与集火创造机会。',
        '烈焰破军': '持续命中叠加灼甲，削弱敌人护甲，越战越强。',
        '蚀骨毒牙': '命中叠加毒素，造成持续毒伤，擅长对付高生命目标。',
    };
    for (const [name, description] of Object.entries(descriptions)) {
        const pattern = new RegExp('    \\["' + name + '", "(?:[^"\\\\]|\\\\.)*"\\],');
        assert(pattern.test(content), 'Missing description: ' + name);
        content = content.replace(pattern, '    [' + JSON.stringify(name) + ', ' + JSON.stringify(description) + '],');
    }
    console.log(await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + path, content }));
    const saved = fs.readFileSync(path, 'utf8');
    for (const [name, description] of Object.entries(descriptions)) assert(saved.includes('[' + JSON.stringify(name) + ', ' + JSON.stringify(description) + ']'));
    console.log('PASS: three concise descriptions saved.');
})().catch(error => { console.error(error); process.exitCode = 1; });
