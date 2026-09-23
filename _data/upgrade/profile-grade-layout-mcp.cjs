const fs = require('fs');
const { call } = require('./mcp.cjs');
const prefabPath = 'db://assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/等级弹窗.prefab';
function find(node, name) { if (node.name === name) return node; for (const c of node.children || []) { if (typeof c === 'object') { const found = find(c, name); if (found) return found; } } }
async function set(node, type, values) {
    if (values.contentSize) { values = { ...values, width: values.contentSize.width, height: values.contentSize.height }; delete values.contentSize; }
    const index = node.components.findIndex(c => c.type === type);
    if (index < 0) throw Error('Missing ' + type + ' on ' + node.name);
    await call('node_node_transform', { uuid: node.uuid, customProperties: Object.fromEntries(Object.entries(values).map(([k, v]) => ['__comps__.' + index + '.' + k, v])) });
}
async function move(node, x, y) { await call('node_node_transform', { uuid: node.uuid, position: { x, y, z: 0 } }); }
async function main() {
    await call('prefab_prefab_edit', { action: 'enter', prefabPath });
    const root = find((await call('node_node_query', { action: 'tree', maxDepth: 16 })).data.tree, '等级弹窗');
    const panel = find(root, 'Panel');
    await set(panel, 'cc.Widget', { enabled: false });
    await set(panel, 'cc.Sprite', { sizeMode: 0 });
    const meta = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Sprites/等级系统/角色信息-弹版.png.meta'));
    const uuid = Object.values(meta.subMetas).find(m => m.importer === 'sprite-frame').uuid;
    await call('component_set_component_property', { nodeUuid: panel.uuid, componentType: 'cc.Sprite', property: 'spriteFrame', propertyType: 'spriteFrame', value: uuid });
    await set(panel, 'cc.UITransform', { contentSize: { width: 697, height: 889 } });
    await move(panel, 0, 0);
    const title = panel.children.find(n => n.name === 'Tip');
    await set(title, 'cc.Widget', { enabled: false });
    await set(title, 'cc.Label', { string: '玩家信息' }); await move(title, 0, 395);
    await move(find(panel, '关闭'), 301, 395);
    for (const name of ['头像', '头像框Icon', '头像框Spine']) await move(find(panel, name), -215, 235);
    await set(find(panel, '头像'), 'cc.UITransform', { contentSize: { width: 165, height: 165 } });
    await set(find(panel, '头像框Icon'), 'cc.UITransform', { contentSize: { width: 185, height: 202 } });
    await move(find(panel, '称号tip'), -57, 290);
    await set(find(panel, '称号tip'), 'cc.Label', { string: '称号：' });
    await move(find(panel, '称号'), 147, 290);
    await set(find(panel, '称号'), 'cc.UITransform', { contentSize: { width: 252, height: 77 } });
    await move(find(panel, '等级'), 108, 219);
    await move(find(panel, '总资产'), 108, 166);
    const stats = find(panel, 'Layout');
    await set(stats, 'cc.Layout', { enabled: false }); await move(stats, 0, -220);
    for (let i = 0; i < stats.children.length; i++) {
        const row = stats.children[i]; await move(row, 0, 135 - i * 90);
        const label = row.children.find(n => n.name === 'Tip'), value = row.children.find(n => n.name === 'Content');
        await move(label, -289, 0); await move(value, 282, 0);
        await set(label, 'cc.Label', { fontSize: 34, lineHeight: 38 });
        await set(value, 'cc.Label', { fontSize: 34, lineHeight: 38 });
    }
    await call('node_node_transform', { uuid: find(panel, 'Tip-001').uuid, active: false });
    await call('prefab_prefab_edit', { action: 'save', prefabPath });
    await call('prefab_prefab_edit', { action: 'exit', prefabPath });
    console.log('Saved player-info layout via MCP; all assigned art belongs to main bundle.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
