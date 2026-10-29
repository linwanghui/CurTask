const fs = require('node:fs'), crypto = require('node:crypto');
const { call } = require('./mcp.cjs');
const base = 'assets/Game_Bundles/73_ZRSJZ_DLC/';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
function frame(path) {
    const meta = read(base + 'Sprites/铸枪界面/三元素枪/' + path + '.png.meta');
    const sprite = Object.values(meta.subMetas).find(part => part.importer === 'sprite-frame');
    return { __uuid__: sprite.uuid, __expectedType__: 'cc.SpriteFrame' };
}
(async () => {
    const original = read(base + 'Spine/沼泽/FX_CC_poisoning.json');
    const slotNames = ['39_00006', '39_6'], bones = new Set(['root', 'bone7', 'bone13', 'bone14']);
    const sourceAnimation = original.animations.Stand;
    const json = {
        skeleton: { spine: original.skeleton.spine, x: -150, y: -150, width: 300, height: 300 },
        bones: original.bones.filter(bone => bones.has(bone.name)),
        slots: original.slots.filter(slot => slotNames.includes(slot.name)),
        skins: [{ name: 'default', attachments: Object.fromEntries(slotNames.map(name => [name, original.skins[0].attachments[name]])) }],
        animations: { '气泡': {
            slots: Object.fromEntries(slotNames.map(name => [name, sourceAnimation.slots[name]])),
            bones: Object.fromEntries(Object.entries(sourceAnimation.bones).filter(([name]) => bones.has(name))),
        } },
    };
    // 沼泽原动画按大面积场景淡入；附身气泡提前显现，保留原气泡生长/破裂帧序列。
    for (const slot of Object.values(json.animations['气泡'].slots)) slot.color = [
        { color: 'ffffff00' }, { time: .1, color: 'ffffffff' }, { time: .72, color: 'ffffffd0' }, { time: .9634, color: 'ffffff00' },
    ];
    const path = base + 'Spine/元素减益/毒素气泡.json';
    fs.mkdirSync(base + 'Spine/元素减益', { recursive: true });
    if (!fs.existsSync(path + '.meta')) {
        const meta = read(base + 'Spine/沼泽/FX_CC_poisoning.json.meta');
        meta.uuid = crypto.randomUUID(); meta.imported = false; meta.files = [];
        fs.writeFileSync(path + '.meta', JSON.stringify(meta, null, 2));
    }
    fs.writeFileSync(path, JSON.stringify(json, null, 2));
    await call('assetAdvanced_asset_system', { action: 'refresh', folder: 'db://' + base + 'Spine' });
    await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + path, content: fs.readFileSync(path, 'utf8') });
    const bubble = await call('assetAdvanced_asset_query', { action: 'get_info', assetPath: 'db://' + path });
    console.log('SPINE', JSON.stringify(bubble));
    for (const [target, source] of [
        [base + 'Scripts/Effect/ZRSJZ_ElementStatusFX.ts', '_data/upgrade/ElementStatusFX.v2.ts'],
        ['assets/Game_Bundles/73_ZRSJZ/Scripts/Effect/ZRSJZ_ElementStatusVisual.ts', 'assets/Game_Bundles/73_ZRSJZ/Scripts/Effect/ZRSJZ_ElementStatusVisual.ts'],
    ]) {
        await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + target, content: fs.readFileSync(source, 'utf8') });
        console.log('SAVED', target);
    }
    for (const name of ['冰霜残留', '灼甲烈焰', '毒素气泡']) {
        const path = base + 'Prefabs/Effect/元素减益/' + name + '.prefab', prefab = read(path);
        const script = prefab.find(component => component.Mode);
        if (!script) throw Error('Missing effect component: ' + name);
        script.FireData = script.Mode === 'fire' ? { __uuid__: read(base + 'Spine/火把/lrsc568.json.meta').uuid, __expectedType__: 'sp.SkeletonData' } : null;
        script.ElementFrame = script.Mode === 'poison' || script.Mode === 'fire' ? null : frame('冰/冰弹');
        script.HitFrames = script.Mode === 'trail' || script.Mode === 'poison' || script.Mode === 'fire' ? []
            : Array.from({ length: script.Mode === 'fire' ? 5 : 6 }, (_, i) => frame((script.Mode === 'fire' ? '火' : '冰') + '/击中 (' + (i + 1) + ')'));
        script.BubbleData = script.Mode === 'poison' ? { __uuid__: bubble.data.uuid, __expectedType__: 'sp.SkeletonData' } : null;
        await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + path, content: JSON.stringify(prefab, null, 2) });
        const result = await call('prefab_prefab_browse', { action: 'validate', prefabPath: 'db://' + path });
        if (!result.data?.isValid) throw Error(JSON.stringify(result));
        console.log('VALID', name);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
