// Unify all battle-pass reward columns through the running Cocos Creator MCP server.
const { call } = require('./mcp.cjs');

const prefab = 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/战令界面.prefab';
const grayGrid = 'db://assets/Game_Bundles/73_ZRSJZ/Sprites/格子/空格子_灰.png';
const nodes = new Map();

function walk(node, path = '') {
    const current = path ? `${path}/${node.name}` : node.name;
    nodes.set(current.replace(/^战令界面\/?/, ''), node);
    for (const child of node.children || []) if (typeof child === 'object') walk(child, current);
}

function findRoot(node) {
    if (node.name === '战令界面') return node;
    for (const child of node.children || []) if (typeof child === 'object') {
        const found = findRoot(child);
        if (found) return found;
    }
}

async function setSize(uuid, width, height) {
    await call('node_node_transform', {
        uuid,
        customProperties: {
            '__comps__.0.contentSize': { width: { value: width }, height: { value: height } },
        },
    });
}

async function main() {
    await call('prefab_prefab_edit', { action: 'enter', prefabPath: prefab });
    let result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    walk(findRoot(result.data.tree));

    const template = nodes.get('Panel/奖励列表/View/Content/等级1');
    if (!template) throw new Error('Missing 等级1 template');

    // Replace levels 2-50 with exact deep copies of level 1, preserving each column position.
    for (let level = 2; level <= 50; level++) {
        const old = nodes.get(`Panel/奖励列表/View/Content/等级${level}`);
        if (!old) throw new Error(`Missing 等级${level}`);
        const info = await call('node_node_query', { action: 'info', uuid: old.uuid });
        const position = info.data.position || old.position;
        await call('node_node_lifecycle', { action: 'delete', uuid: old.uuid });
        const parentBefore = await call('node_node_query', { action: 'tree', uuid: info.data.parent, maxDepth: 1 });
        const known = new Set(parentBefore.data.tree.children.map(child => child.uuid));
        await call('node_node_hierarchy', { action: 'duplicate', uuid: template.uuid, includeChildren: true });
        const parentAfter = await call('node_node_query', { action: 'tree', uuid: info.data.parent, maxDepth: 1 });
        const uuid = parentAfter.data.tree.children.find(child => !known.has(child.uuid))?.uuid;
        if (!uuid) throw new Error(`Cannot resolve duplicated 等级${level}`);
        await call('node_node_transform', { uuid, name: `等级${level}`, position });

        // Refresh the tree so duplicated child UUIDs are available, then update the displayed level.
        result = await call('node_node_query', { action: 'tree', uuid, maxDepth: 5 });
        const levelLabel = result.data.tree.children.find(child => child.name === '等级底')
            ?.children.find(child => child.name === '等级');
        if (levelLabel) await call('component_set_component_property', {
            nodeUuid: levelLabel.uuid,
            componentType: 'cc.Label',
            property: 'string',
            propertyType: 'string',
            value: String(level),
        });
    }

    // Query the finished hierarchy and constrain every icon inside the same 1x1-sized frame.
    // Background quality is assigned at runtime; red rewards specifically resolve to 红色格子1_1.
    result = await call('node_node_query', { action: 'tree', maxDepth: 20 });
    nodes.clear();
    walk(findRoot(result.data.tree));
    const asset = await call('assetAdvanced_asset_query', { action: 'get_details', assetPath: grayGrid, includeSubAssets: true });
    const grayFrame = asset.data.subAssets.find(item => item.type === 'spriteFrame');
    if (!grayFrame) throw new Error('Missing 空格子_灰 SpriteFrame');
    const rewardRoots = [];
    for (let level = 1; level <= 50; level++) {
        rewardRoots.push(`Panel/奖励列表/View/Content/等级${level}/normal`);
        rewardRoots.push(`Panel/奖励列表/View/Content/等级${level}/advanced`);
    }
    rewardRoots.push('Panel/特殊奖励/normal', 'Panel/特殊奖励/advanced');
    for (const root of rewardRoots) {
        const bottom = nodes.get(`${root}/图标底`);
        const icon = nodes.get(`${root}/图标`);
        if (!bottom || !icon) throw new Error(`Incomplete reward structure: ${root}`);
        await call('component_set_component_property', {
            nodeUuid: bottom.uuid,
            componentType: 'cc.Sprite',
            property: 'spriteFrame',
            propertyType: 'spriteFrame',
            value: grayFrame.uuid,
        });
        await setSize(bottom.uuid, 134, 134);
        await setSize(icon.uuid, 102, 102);
    }

    await call('prefab_prefab_edit', { action: 'save', prefabPath: prefab });
    console.log('Unified 50 reward levels, gray special bottoms, and constrained 102 reward icons through MCP.');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
