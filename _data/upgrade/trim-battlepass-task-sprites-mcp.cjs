const { call } = require('./mcp.cjs');
const prefab = 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';

function find(node, name) {
    if (node.name === name) return node;
    for (const child of node.children || []) if (typeof child === 'object') {
        const found = find(child, name);
        if (found) return found;
    }
}

async function main() {
    await call('prefab_prefab_edit', { action: 'enter', prefabPath: prefab });
    const result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    const tasks = find(result.data.tree, '任务内容');
    if (!tasks) throw new Error('Missing 任务内容');
    const sprites = [];
    function collect(node) {
        if ((node.components || []).some(component => component.type === 'cc.Sprite')) sprites.push(node);
        for (const child of node.children || []) if (typeof child === 'object') collect(child);
    }
    collect(tasks);
    for (const node of sprites) await call('component_set_component_property', {
        nodeUuid: node.uuid,
        componentType: 'cc.Sprite',
        property: 'sizeMode',
        propertyType: 'number',
        value: 1,
    });
    await call('prefab_prefab_edit', { action: 'save', prefabPath: prefab });
    await call('prefab_prefab_edit', { action: 'exit', prefabPath: prefab });
    console.log(`Set ${sprites.length} task-area Sprites to TRIMMED through MCP.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
