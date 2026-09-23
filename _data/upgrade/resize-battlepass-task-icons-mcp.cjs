const { call } = require('./mcp.cjs');

const prefab = 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';

function findRoot(node) {
    if (node.name === '战令界面') return node;
    for (const child of node.children || []) if (typeof child === 'object') {
        const found = findRoot(child);
        if (found) return found;
    }
}

async function main() {
    await call('prefab_prefab_edit', { action: 'enter', prefabPath: prefab });
    const result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    const targets = [];
    function walk(node, insideTasks = false) {
        const inTasks = insideTasks || node.name === '任务内容';
        if (inTasks && node.name === '类型图标') targets.push(node);
        for (const child of node.children || []) if (typeof child === 'object') walk(child, inTasks);
    }
    walk(findRoot(result.data.tree));
    if (targets.length === 0) throw new Error('No task type icons found');

    for (const node of targets) {
        await call('node_node_transform', {
            uuid: node.uuid,
            scale: { x: 1, y: 1, z: 1 },
            customProperties: {
                '__comps__.0.contentSize': { width: { value: 80 }, height: { value: 80 } },
            },
        });
    }
    await call('prefab_prefab_edit', { action: 'save', prefabPath: prefab });
    await call('prefab_prefab_edit', { action: 'exit', prefabPath: prefab });
    console.log(`Set ${targets.length} task type icons to an 80x80 display box through MCP.`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
