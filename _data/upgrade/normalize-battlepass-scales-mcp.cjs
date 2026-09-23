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

async function main() {
    await call('prefab_prefab_edit', { action: 'enter', prefabPath: prefab });
    const result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    walk(findRoot(result.data.tree));

    for (let level = 1; level <= 50; level++) {
        const base = `Panel/奖励列表/View/Content/等级${level}`;
        const label = nodes.get(`${base}/等级底/等级`);
        if (!label) throw new Error(`Missing level label: ${base}`);
        await call('component_set_component_property', {
            nodeUuid: label.uuid,
            componentType: 'cc.Label',
            property: 'string',
            propertyType: 'string',
            value: `lv.${level}`,
        });

        for (const track of ['normal', 'advanced']) {
            for (const child of ['图标底', '图标']) {
                const node = nodes.get(`${base}/${track}/${child}`);
                if (!node) throw new Error(`Missing reward node: ${base}/${track}/${child}`);
                await call('node_node_transform', {
                    uuid: node.uuid,
                    scale: { x: 1, y: 1, z: 1 },
                });
            }
        }
    }

    await call('prefab_prefab_edit', { action: 'save', prefabPath: prefab });
    await call('prefab_prefab_edit', { action: 'exit', prefabPath: prefab });
    console.log('Normalized 200 icon scales and 50 level labels through MCP.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
