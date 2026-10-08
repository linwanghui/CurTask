const fs = require('fs');
const crypto = require('crypto');
const { call } = require('./mcp.cjs');
const script = 'assets/Game_Bundles/73_ZRSJZ/Scripts/Skill/ZRSJZ_UluSkill.ts';
const prefab = 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/技能_乌鲁.prefab';
function compress(uuid) {
  const hex = uuid.replace(/-/g, ''), chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = hex.slice(0, 5);
  for (let i = 5; i < 32; i += 3) { const n = parseInt(hex.slice(i, i + 3), 16); result += chars[n >> 6] + chars[n & 63]; }
  return result;
}
(async () => {
  await call('assetAdvanced_asset_operations', { action: 'create', url: 'db://' + script, overwrite: true, content: fs.readFileSync(script, 'utf8') });
  for (const path of ['assets/Game_Bundles/73_ZRSJZ/Scripts/Skill/ZRSJZ_UluMissile.ts', 'assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_Player.ts', 'assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_PlayerSkeleton.ts']) {
    await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + path, content: fs.readFileSync(path, 'utf8') });
  }
  const type = compress(JSON.parse(fs.readFileSync(script + '.meta', 'utf8')).uuid);
  const data = JSON.parse(fs.readFileSync(prefab, 'utf8'));
  const root = data[0].data.__id__;
  if (!data.some(x => x.__type__ === type)) {
    const index = data.length;
    data.push({ __type__: type, _name: '', _objFlags: 0, __editorExtras__: {}, node: { __id__: root }, _enabled: true,
      __prefab: { __id__: index + 1 }, ExplosionRadius: 300, ExplosionDamage: 50, ShakeStrength: 35, ShakeDuration: 0.3,
      FeedbackRadius: 3000, ExplosionSound: '轰炸', _id: '' });
    data.push({ __type__: 'cc.CompPrefabInfo', fileId: crypto.randomBytes(12).toString('base64') });
    data[root]._components.push({ __id__: index });
  }
  data.find(x => x.__type__ === type).MovementSpeedMultiplier = 2;
  const mapLayer = JSON.parse(fs.readFileSync('settings/v2/packages/project.json', 'utf8')).layer.find(x => x.name === 'Map').value;
  for (const entry of data) if (entry.__type__ === 'cc.Node') entry._layer = mapLayer;
  await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + prefab, content: JSON.stringify(data, null, 2) });
  console.log(JSON.stringify(await call('prefab_prefab_browse', { action: 'validate', prefabPath: 'db://' + prefab })));
  console.log('Combat configuration', data.find(x => x.__type__ === type));
})().catch(error => { console.error(error); process.exitCode = 1; });
