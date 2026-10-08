const fs = require('fs');
const crypto = require('crypto');
const { call } = require('./mcp.cjs');
const role = 'assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/角色界面.prefab';
const skill = 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Effect/出场特效_露娜.prefab';
const script = 'assets/Game_Bundles/73_ZRSJZ/Scripts/Controller/ZRSJZ_SkinSkeleton.ts';
(async () => {
  console.log(JSON.stringify(await call('scene_scene_management', { action: 'get_current' })));
  const data = JSON.parse(fs.readFileSync(role, 'utf8'));
  const skinId = data.findIndex(x => x.__type__ === 'cc.Node' && x._name === 'Skin');
  if (skinId < 0) throw Error('Skin node missing');
  const skin = data[skinId];
  const component = skin._components.map(x => data[x.__id__]).find(x => x.__type__ === '1bd1eS60eVLiLudKg/yNm+t');
  if (!component) throw Error('SkinSkeleton missing');
  let pointId = data.findIndex(x => x.__type__ === 'cc.Node' && x._name === '露娜出场特效释放点');
  if (pointId < 0) {
    pointId = data.length;
    const point = JSON.parse(JSON.stringify(skin));
    point._name = '露娜出场特效释放点';
    point._children = [];
    point._components = [];
    point._lscale = { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 };
    point._prefab = { __id__: pointId + 1 };
    const info = JSON.parse(JSON.stringify(data[skin._prefab.__id__]));
    info.fileId = crypto.randomBytes(12).toString('base64');
    data.push(point, info);
    data[skin._parent.__id__]._children.push({ __id__: pointId });
  }
  component.LunaEffectPoint = { __id__: pointId };
  component.LunaEffectPath = 'Prefabs/Effect/出场特效_露娜';
  component.LunaEffectScale = 0.8;
  const effect = JSON.parse(fs.readFileSync(skill, 'utf8'));
  effect[effect[0].data.__id__]._lpos = { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 };
  const skeleton = effect.find(x => x.__type__ === 'sp.Skeleton');
  skeleton._skeletonData.__uuid__ = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Spine/玩家/露娜_出场特效/action.json.meta', 'utf8')).uuid; skeleton.defaultAnimation = 'action';
  skeleton.loop = false;
  skeleton._cacheMode = skeleton._preCacheMode = 0;
  for (const [path, content] of [[script, fs.readFileSync(script, 'utf8')], [skill, JSON.stringify(effect, null, 2)], [role, JSON.stringify(data, null, 2)]]) {
    await call('assetAdvanced_asset_operations', { action: 'save', url: 'db://' + path, content });
    console.log('Saved through MCP: ' + path);
  }
  for (const path of [role, skill]) console.log(JSON.stringify(await call('prefab_prefab_browse', { action: 'validate', prefabPath: 'db://' + path })));
})().catch(error => { console.error(error); process.exitCode = 1; });
