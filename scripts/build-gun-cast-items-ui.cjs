// 构建可在 Cocos 编辑器中继续修改的铸枪道具节点，不改动已有玩法节点。
const fs = require('fs'), crypto = require('crypto');
const file = 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/铸枪界面.prefab';
const a = JSON.parse(fs.readFileSync(file, 'utf8'));
if (a.some(n => n.__type__ === 'cc.Node' && n._name === '铸枪道具')) throw Error('铸枪道具节点已存在');
const panel = a.findIndex(n => n.__type__ === 'cc.Node' && n._name === 'Panel');
const clone = v => JSON.parse(JSON.stringify(v));
const template = type => clone(a.find(v => v.__type__ === type));
const localId = () => crypto.randomBytes(16).toString('base64').replace(/=+$/, '');
const append = v => { const id = a.length; a.push(v); return id; };
function component(node, type, values = {}) {
    const c = template(type);
    c.node = { __id__: node }; c._id = '';
    c.__prefab = { __id__: append({ __type__: 'cc.CompPrefabInfo', fileId: localId() }) };
    Object.assign(c, values);
    const id = append(c); a[node]._components.push({ __id__: id }); return id;
}
function node(name, parent, x, y, width, height) {
    const n = template('cc.Node');
    Object.assign(n, { _name: name, _parent: { __id__: parent }, _children: [], _components: [], _active: true,
        _lpos: { __type__: 'cc.Vec3', x, y, z: 0 }, _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 }, _id: '' });
    const id = append(n);
    n._prefab = { __id__: append({ __type__: 'cc.PrefabInfo', root: { __id__: 1 }, asset: { __id__: 0 }, fileId: localId(), instance: null, targetOverrides: null, nestedPrefabInstanceRoots: null }) };
    a[parent]._children.push({ __id__: id });
    component(id, 'cc.UITransform', { _contentSize: { __type__: 'cc.Size', width, height }, _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 } });
    return id;
}
function color(r, g, b) { return { __type__: 'cc.Color', r, g, b, a: 255 }; }
const white = color(245, 247, 252), muted = color(178, 193, 205);
function label(name, parent, text, x, y, width, height, fontSize, tint = white) {
    const id = node(name, parent, x, y, width, height);
    component(id, 'cc.Label', { _string: text, _fontSize: fontSize, _actualFontSize: fontSize, _lineHeight: fontSize + 3,
        _overflow: 2, _enableWrapText: false, _horizontalAlign: 1, _verticalAlign: 1, _color: tint,
        _enableOutline: true, _outlineWidth: 1, _isBold: false });
    return id;
}
function frame(path) {
    const meta = JSON.parse(fs.readFileSync(path + '.meta', 'utf8'));
    return Object.values(meta.subMetas).find(v => v.importer === 'sprite-frame').uuid;
}
function sprite(id, uuid, tint = white) {
    component(id, 'cc.Sprite', { _spriteFrame: { __uuid__: uuid, __expectedType__: 'cc.SpriteFrame' },
        _type: 0, _sizeMode: 0, _color: tint, _isTrimmedMode: false });
}
const bg = frame('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/铸枪界面/铸枪/道具/道具卡片底.png');
const holder = node('铸枪道具', panel, 0, 0, 2340, 1080);
label('标题', holder, '铸枪道具', 805, 386, 390, 44, 30);
for (const [kind, y, tint, description] of [
    ['铸枪护盾', 240, color(255, 211, 100), '抵挡一次武器损毁'],
    ['铸枪必成券', -52, color(255, 125, 117), '下次铸造必定成功'],
]) {
    const card = node(kind, holder, 805, y, 390, 260); sprite(card, bg);
    const icon = node('Icon', card, -122, 23, 94, 94);
    sprite(icon, frame('assets/Game_Bundles/73_ZRSJZ/Sprites/Prop/1_1/' + kind + '.png'));
    label('名称', card, kind, 48, 72, 244, 39, 30, tint);
    label('说明', card, description, 48, 26, 242, 36, 23);
    label('数量', card, '拥有 ×0', -122, -32, 132, 34, 24, tint);
    const button = node('操作', card, 60, -32, 204, 58); sprite(button, bg, tint);
    component(button, 'cc.Button', { clickEvents: [], _interactable: true, _transition: 3, _zoomScale: 1.08, _target: { __id__: button } });
    label('文字', button, '看视频 +1', 0, 1, 182, 40, 26, tint);
    label('状态', card, '搜索带出可获得', 0, -72, 332, 28, 20, muted);
}
// 道具卡片处于损毁/结束弹板下层，避免遮挡模态界面。
const children = a[panel]._children;
children.splice(children.findIndex(r => r.__id__ === holder), 1);
const modal = children.findIndex(r => a[r.__id__]._name === '损毁弹板');
children.splice(modal, 0, { __id__: holder });
fs.writeFileSync(file, JSON.stringify(a, null, 2) + '\n');
console.log('Created 2 item cards, editable labels/buttons and sprite references.');
