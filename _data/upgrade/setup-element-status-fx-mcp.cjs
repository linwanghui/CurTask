const fs = require('node:fs'), crypto = require('node:crypto');
const { call } = require('./mcp.cjs');
function compressed(uuid) {
    const hex = uuid.replace(/-/g, ''), chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = hex.slice(0, 5);
    for (let i = 5; i < 32; i += 3) { const n = parseInt(hex.slice(i, i + 3), 16); result += chars[n >> 6] + chars[n & 63]; }
    return result;
}
function prefab(name, mode, script, asset) {
    const info = () => ({ __type__: 'cc.CompPrefabInfo', fileId: compressed(crypto.randomUUID()) });
    return [
        { __type__: 'cc.Prefab', _name: name, _objFlags: 0, __editorExtras__: {}, _native: '', data: { __id__: 1 }, optimizationPolicy: 0, persistent: false },
        { __type__: 'cc.Node', _name: name, _objFlags: 0, __editorExtras__: {}, _parent: null, _children: [], _active: true,
            _components: [{ __id__: 2 }, { __id__: 4 }], _prefab: { __id__: 6 }, _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
            _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 }, _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
            _mobility: 0, _layer: 4, _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '' },
        { __type__: 'cc.UITransform', _name: '', _objFlags: 0, node: { __id__: 1 }, _enabled: true, __prefab: { __id__: 3 },
            _contentSize: { __type__: 'cc.Size', width: 400, height: 800 }, _anchorPoint: { __type__: 'cc.Vec2', x: .5, y: .5 }, _id: '' },
        info(),
        { __type__: compressed(script), _name: '', _objFlags: 0, node: { __id__: 1 }, _enabled: true, __prefab: { __id__: 5 }, Mode: mode, _id: '' },
        info(),
        { __type__: 'cc.PrefabInfo', root: { __id__: 1 }, asset: asset ? { __uuid__: asset } : null,
            fileId: compressed(crypto.randomUUID()), instance: null, targetOverrides: null, nestedPrefabInstanceRoots: null },
    ];
}
(async () => {
    await call('assetAdvanced_asset_system', { action: 'refresh', folder: 'db://assets/Game_Bundles/73_ZRSJZ_DLC/Scripts' });
    await call('assetAdvanced_asset_system', { action: 'refresh', folder: 'db://assets/Game_Bundles/73_ZRSJZ/Scripts/Effect' });
    const scriptPath = 'assets/Game_Bundles/73_ZRSJZ_DLC/Scripts/Effect/ZRSJZ_ElementStatusFX.ts';
    const script = await call('assetAdvanced_asset_query', { action: 'get_info', assetPath: 'db://' + scriptPath });
    if (!script.data?.uuid) throw Error('DLC effect script was not imported');
    for (const path of [scriptPath, 'assets/Game_Bundles/73_ZRSJZ/Scripts/Effect/ZRSJZ_ElementStatusVisual.ts', 'assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_EnemyBase.ts']) {
        await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + path, content: fs.readFileSync(path, 'utf8') });
        console.log('SAVED', path);
    }
    const folder = 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/元素减益';
    if (!fs.existsSync(folder)) await call('assetAdvanced_asset_operations', { action: 'create', url: 'db://' + folder });
    for (const [name, mode] of [['灼甲烈焰', 'fire'], ['毒素气泡', 'poison'], ['冰霜残留', 'trail']]) {
        const path = folder + '/' + name + '.prefab', url = 'db://' + path;
        let uuid;
        if (fs.existsSync(path)) uuid = (await call('assetAdvanced_asset_query', { action: 'get_info', assetPath: url })).data.uuid;
        else uuid = (await call('assetAdvanced_asset_operations', { action: 'create', url, content: JSON.stringify(prefab(name, mode, script.data.uuid, null), null, 2) })).data.uuid;
        await call('assetAdvanced_asset_operations', { action: 'save', url, content: JSON.stringify(prefab(name, mode, script.data.uuid, uuid), null, 2) });
        const result = await call('prefab_prefab_browse', { action: 'validate', prefabPath: url });
        if (!result.data?.isValid) throw Error(JSON.stringify(result));
        console.log('VALID', url);
    }
    console.log(await call('scene_scene_query_system', { action: 'check_script', className: 'ZRSJZ_ElementStatusFX' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
