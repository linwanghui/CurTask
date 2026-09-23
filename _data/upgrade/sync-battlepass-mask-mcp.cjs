const fs = require('fs');
const { call } = require('./mcp.cjs');

const prefab = 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';
const prefabFile = prefab.replace('db://', '');
const nodes = new Map();

function findRoot(node) {
    if (node.name === '战令界面') return node;
    for (const child of node.children || []) if (typeof child === 'object') {
        const found = findRoot(child);
        if (found) return found;
    }
}

function walk(node, path = '') {
    const current = path ? `${path}/${node.name}` : node.name;
    nodes.set(current.replace(/^战令界面\/?/, ''), node);
    for (const child of node.children || []) if (typeof child === 'object') walk(child, current);
}

function readBottomFrames() {
    const entries = JSON.parse(fs.readFileSync(prefabFile, 'utf8'));
    const frames = new Map();
    function visit(index, path = '') {
        const node = entries[index];
        if (node?.__type__ !== 'cc.Node') return;
        const current = path ? `${path}/${node._name}` : node._name;
        if (node._name === '图标底') {
            const sprite = node._components.map(ref => entries[ref.__id__]).find(component => component.__type__ === 'cc.Sprite');
            if (sprite?._spriteFrame?.__uuid__) frames.set(current.replace(/^战令界面\/?/, ''), sprite._spriteFrame.__uuid__);
        }
        for (const child of node._children || []) visit(child.__id__, current);
    }
    visit(1);
    return frames;
}

async function main() {
    const bottomFrames = readBottomFrames();
    await call('prefab_prefab_edit', { action: 'enter', prefabPath: prefab });
    const result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    walk(findRoot(result.data.tree));

    const roots = [];
    for (let level = 1; level <= 50; level++) {
        roots.push(`Panel/奖励列表/View/Content/等级${level}/normal`);
        roots.push(`Panel/奖励列表/View/Content/等级${level}/advanced`);
    }
    roots.push('Panel/特殊奖励/normal', 'Panel/特殊奖励/advanced');

    for (const root of roots) {
        const mask = nodes.get(`${root}/Mask`);
        const frame = bottomFrames.get(`${root}/图标底`);
        if (!mask || !frame) throw new Error(`Incomplete reward group: ${root}`);
        await call('component_set_component_property', {
            nodeUuid: mask.uuid,
            componentType: 'cc.Sprite',
            property: 'spriteFrame',
            propertyType: 'spriteFrame',
            value: frame,
        });
    }

    await call('prefab_prefab_edit', { action: 'save', prefabPath: prefab });
    await call('prefab_prefab_edit', { action: 'exit', prefabPath: prefab });
    console.log(`Synchronized ${roots.length} Mask images with their icon backgrounds through MCP.`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
