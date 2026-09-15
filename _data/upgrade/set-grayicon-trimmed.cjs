const fs = require('fs');
const { call } = require('./mcp.cjs');
const file = 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/强化界面.prefab';
const prefab = JSON.parse(fs.readFileSync(file, 'utf8'));
let changed = 0;
for (const node of prefab) {
    if (node?.__type__ !== 'cc.Node' || node._name !== 'GrayIcon') continue;
    const sprite = (node._components ?? []).map(ref => prefab[ref.__id__]).find(component => component?.__type__ === 'cc.Sprite');
    if (!sprite) throw new Error('GrayIcon 缺少 Sprite 组件');
    sprite._sizeMode = 1;
    sprite._isTrimmedMode = true;
    changed++;
}
if (changed !== 60) throw new Error(`GrayIcon 数量异常: ${changed}`);
const content = JSON.stringify(prefab, null, 2);
fs.writeFileSync(file, content);
call('assetAdvanced_asset_operations', {
    action: 'save',
    url: 'db://' + file,
    content,
}).then(result => console.log(JSON.stringify({ changed, result }))).catch(error => {
    console.warn(`MCP unavailable after local save: ${error.message}`);
});
