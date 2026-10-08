const fs = require('fs');
const crypto = require('crypto');
const { call } = require('./mcp.cjs');
const script = 'assets/Game_Bundles/73_ZRSJZ/Scripts/Skill/ZRSJZ_UluMissile.ts';
const prefab = 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/技能_乌鲁.prefab';
function compress(uuid) {
    const hex = uuid.replace(/-/g, ''), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let value = hex.slice(0, 5);
    for (let i = 5; i < 32; i += 3) {
        const n = parseInt(hex.slice(i, i + 3), 16);
        value += alphabet[n >> 6] + alphabet[n & 63];
    }
    return value;
}
(async () => {
    await call('assetAdvanced_asset_operations', { action: 'create', url: 'db://' + script, overwrite: true, content: fs.readFileSync(script, 'utf8') });
    const uuid = JSON.parse(fs.readFileSync(script + '.meta', 'utf8')).uuid;
    const data = JSON.parse(fs.readFileSync(prefab, 'utf8'));
    const root = data[0].data.__id__;
    const skeletonId = name => data.findIndex(x => x.__type__ === 'sp.Skeleton' && data[x.node.__id__]._name === name);
    const missile = skeletonId('导弹'), explosion = skeletonId('爆炸');
    if (missile < 0 || explosion < 0) throw Error('Missing Spine nodes');
    if (data.some(x => x.__type__ === compress(uuid))) throw Error('Already attached');
    const componentIndex = data.length;
    data.push({ __type__: compress(uuid), _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: root },
        _enabled: true, __prefab: { __id__: componentIndex + 1 }, Missile: { __id__: missile }, Explosion: { __id__: explosion },
        LaunchDistance: 120, LaunchSpeed: 700, FlightDuration: 1.2, ArcHeight: 320, WobbleAmplitude: 35,
        AngleOffset: 0, RecycleToPool: true, _id: '' });
    data.push({ __type__: 'cc.CompPrefabInfo', fileId: crypto.randomBytes(12).toString('base64') });
    data[root]._components.push({ __id__: componentIndex });
    data[explosion].loop = false;
    await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + prefab, content: JSON.stringify(data, null, 2) });
    console.log(JSON.stringify({ scriptUUID: uuid, componentIndex, missile, explosion,
        validation: await call('prefab_prefab_browse', { action: 'validate', prefabPath: 'db://' + prefab }) }));
})().catch(e => { console.error(e); process.exitCode = 1; });
