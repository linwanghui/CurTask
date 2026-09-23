const { call } = require('./mcp.cjs');

const prefab = 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';
const slots = {
    daily: ['d_login', 'd_battle', 'd_kill', 'd_search', 'd_extract'],
    weekly: ['w_battle', 'w_kill', 'w_search', 'w_extract', 'w_heal'],
};
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

async function duplicateTemplate(templateUuid, oldNode, name) {
    const info = await call('node_node_query', { action: 'info', uuid: oldNode.uuid });
    await call('node_node_lifecycle', { action: 'delete', uuid: oldNode.uuid });
    const templateInfo = await call('node_node_query', { action: 'info', uuid: templateUuid });
    const before = await call('node_node_query', { action: 'tree', uuid: templateInfo.data.parent, maxDepth: 1 });
    const known = new Set(before.data.tree.children.map(child => child.uuid));
    await call('node_node_hierarchy', { action: 'duplicate', uuid: templateUuid, includeChildren: true });
    const after = await call('node_node_query', { action: 'tree', uuid: templateInfo.data.parent, maxDepth: 1 });
    const uuid = after.data.tree.children.find(child => !known.has(child.uuid))?.uuid;
    if (!uuid) throw new Error(`Cannot resolve duplicated task slot ${name}`);
    if (templateInfo.data.parent !== info.data.parent) await call('node_node_hierarchy', {
        action: 'move', nodeUuid: uuid, newParentUuid: info.data.parent, siblingIndex: -1,
    });
    await call('node_node_transform', { uuid, name, position: info.data.position });
}

async function main() {
    await call('prefab_prefab_edit', { action: 'enter', prefabPath: prefab });
    let result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    walk(findRoot(result.data.tree));
    const template = nodes.get('Panel/任务内容/daily/View/Content/d_login');
    if (!template) throw new Error('Missing d_login template');

    for (const period of ['daily', 'weekly']) for (const slot of slots[period]) {
        if (period === 'daily' && slot === 'd_login') continue;
        const old = nodes.get(`Panel/任务内容/${period}/View/Content/${slot}`);
        if (!old) throw new Error(`Missing task slot ${period}/${slot}`);
        await duplicateTemplate(template.uuid, old, slot);
    }

    result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    const taskRows = [];
    function collect(node, inTasks = false) {
        const inside = inTasks || node.name === '任务内容';
        if (inside && [...slots.daily, ...slots.weekly].includes(node.name)) taskRows.push(node);
        for (const child of node.children || []) if (typeof child === 'object') collect(child, inside);
    }
    collect(findRoot(result.data.tree));
    let sprites = 0;
    let skippedSprites = 0;
    function spriteNodes(node, output) {
        if ((node.components || []).some(component => component.type === 'cc.Sprite')) output.push(node);
        for (const child of node.children || []) if (typeof child === 'object') spriteNodes(child, output);
    }
    for (const row of taskRows) {
        const targets = [];
        spriteNodes(row, targets);
        for (const node of targets) {
            try {
                await call('component_set_component_property', {
                    nodeUuid: node.uuid,
                    componentType: 'cc.Sprite',
                    property: 'sizeMode',
                    propertyType: 'number',
                    value: 1,
                });
                sprites++;
            } catch { skippedSprites++; }
        }
    }

    await call('prefab_prefab_edit', { action: 'save', prefabPath: prefab });
    await call('prefab_prefab_edit', { action: 'exit', prefabPath: prefab });
    console.log(`Templated ${taskRows.length} task rows; set ${sprites} Sprites to TRIMMED (${skippedSprites} deferred).`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
