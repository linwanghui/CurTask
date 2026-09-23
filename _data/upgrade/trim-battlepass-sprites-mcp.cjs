const { call } = require('./mcp.cjs');

const prefab = 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';
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

async function setTrimmed(path) {
    const node = nodes.get(path);
    if (!node) throw new Error(`Missing Sprite node: ${path}`);
    await call('component_set_component_property', {
        nodeUuid: node.uuid,
        componentType: 'cc.Sprite',
        property: 'sizeMode',
        propertyType: 'number',
        value: 1,
    });
}

async function main() {
    await call('prefab_prefab_edit', { action: 'enter', prefabPath: prefab });
    const result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    walk(findRoot(result.data.tree));

    const rewardRoots = [];
    for (let level = 1; level <= 50; level++) {
        rewardRoots.push(`Panel/奖励列表/View/Content/等级${level}/normal`);
        rewardRoots.push(`Panel/奖励列表/View/Content/等级${level}/advanced`);
    }
    rewardRoots.push('Panel/特殊奖励/normal', 'Panel/特殊奖励/advanced');

    let count = 0;
    for (const root of rewardRoots) {
        for (const child of ['Mask', '图标底', '图标']) {
            await setTrimmed(`${root}/${child}`);
            count++;
        }
    }

    await call('prefab_prefab_edit', { action: 'save', prefabPath: prefab });
    await call('prefab_prefab_edit', { action: 'exit', prefabPath: prefab });
    console.log(`Set ${count} reward sprites to TRIMMED through MCP.`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
