// 准备交由 Cocos MCP 保存的图标格与道具详情弹窗，保留铸枪道具区域的编辑器位置。
const fs = require('fs'), crypto = require('crypto');
const file = 'assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/铸枪界面.prefab';
const a = JSON.parse(fs.readFileSync(file, 'utf8'));
if (a.some(n => n.__type__ === 'cc.Node' && n._name === '道具弹窗')) throw Error('道具弹窗已配置');
const panel = a.findIndex(n => n.__type__ === 'cc.Node' && n._name === 'Panel');
const clone = v => JSON.parse(JSON.stringify(v));
const template = type => clone(a.find(v => v.__type__ === type));
const localId = () => crypto.randomBytes(16).toString('base64').replace(/=+$/, '');
const append = v => { const id = a.length; a.push(v); return id; };
const color = (r, g, b, alpha = 255) => ({ __type__: 'cc.Color', r, g, b, a: alpha });
const white = color(255, 255, 255), dark = color(49, 55, 62), gray = color(96, 109, 116);
const getComp = (id, type) => a[id]._components.map(r => a[r.__id__]).find(v => v.__type__ === type);
function component(id, type, values = {}) {
    const c = template(type); c.node = { __id__: id }; c._id = '';
    c.__prefab = { __id__: append({ __type__: 'cc.CompPrefabInfo', fileId: localId() }) };
    Object.assign(c, values); a[id]._components.push({ __id__: append(c) }); return c;
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
function size(id, width, height) { Object.assign(getComp(id, 'cc.UITransform')._contentSize, { width, height }); }
function frame(path) {
    const m = JSON.parse(fs.readFileSync(path + '.meta', 'utf8'));
    return Object.values(m.subMetas).find(v => v.importer === 'sprite-frame').uuid;
}
function sprite(id, uuid, tint = white, type = 0) {
    const values = { _spriteFrame: { __uuid__: uuid, __expectedType__: 'cc.SpriteFrame' }, _type: type, _sizeMode: 0, _color: tint, _isTrimmedMode: false };
    const c = getComp(id, 'cc.Sprite'); if (c) Object.assign(c, values); else component(id, 'cc.Sprite', values);
}
function label(name, parent, text, x, y, width, height, fontSize, tint = dark) {
    const id = node(name, parent, x, y, width, height);
    component(id, 'cc.Label', { _string: text, _fontSize: fontSize, _actualFontSize: fontSize, _lineHeight: fontSize + 6,
        _overflow: 2, _enableWrapText: false, _horizontalAlign: 1, _verticalAlign: 1, _color: tint,
        _enableOutline: false, _outlineWidth: 0, _isBold: false }); return id;
}
function button(id) { component(id, 'cc.Button', { clickEvents: [], _interactable: true, _transition: 3, _zoomScale: 1.1, _target: { __id__: id } }); }
const holder = a.findIndex(v => v._name === '铸枪道具');
size(holder, 402, 197);
sprite(holder, frame('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/盲盒/黑底九宫格.png'), color(255, 255, 255, 170), 1);
for (const [i, kind] of ['铸枪护盾', '铸枪必成券'].entries()) {
    const id = a[holder]._children.find(r => a[r.__id__]._name === kind).__id__;
    const slot = a[id]; slot._active = true; slot._lpos = { __type__: 'cc.Vec3', x: i === 0 ? -90 : 90, y: -4, z: 0 };
    slot._lscale = { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 }; size(id, 132, 132);
    sprite(id, frame('assets/Game_Bundles/73_ZRSJZ/Sprites/格子/红色格子1_1.png')); button(id);
    for (const r of slot._children) {
        const n = a[r.__id__], child = r.__id__;
        n._active = ['Icon', '数量'].includes(n._name);
        if (n._name === 'Icon') { n._lpos = { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }; size(child, 100, 100); }
        if (n._name === '数量') {
            n._lpos = { __type__: 'cc.Vec3', x: 24, y: -47, z: 0 }; size(child, 76, 42);
            Object.assign(getComp(child, 'cc.Label'), { _string: 'x0', _fontSize: 30, _actualFontSize: 30, _lineHeight: 36,
                _color: white, _enableOutline: true, _outlineWidth: 3, _outlineColor: color(0, 0, 0), _isBold: true, _horizontalAlign: 2 });
        }
        if (n._name === '状态') {
            n._name = '使用中'; n._lpos = { __type__: 'cc.Vec3', x: 0, y: 75, z: 0 }; size(child, 150, 46);
            Object.assign(getComp(child, 'cc.Label'), { _string: '使用中', _fontSize: 32, _actualFontSize: 32, _lineHeight: 40,
                _color: color(0, 255, 0), _enableOutline: true, _outlineWidth: 4, _outlineColor: color(0, 0, 0), _isBold: true });
        }
    }
}
const popup = node('道具弹窗', panel, 0, 0, 2340, 1080); a[popup]._active = false;
const mask = node('Mask', popup, 0, 0, 2340, 1080);
const originalMask = a.find(v => v.__type__ === 'cc.Sprite' && v.node.__id__ === 2);
sprite(mask, originalMask._spriteFrame.__uuid__, color(255, 255, 255, 170));
component(mask, 'cc.BlockInputEvents'); button(mask);
const body = node('Panel', popup, 0, 0, 520, 571);
sprite(body, frame('assets/Game_Bundles/73_ZRSJZ_DLC/Sprites/铸枪界面/铸枪/道具/道具弹窗底.png'));
component(body, 'cc.BlockInputEvents');
label('名称', body, '铸枪护盾', 0, 242, 350, 52, 34, white);
const close = node('关闭', body, 214, 242, 62, 62); button(close); label('文字', close, '×', 0, 2, 60, 60, 46, white);
const icon = node('Icon', body, -148, 100, 100, 100);
sprite(icon, frame('assets/Game_Bundles/73_ZRSJZ/Sprites/Prop/1_1/铸枪护盾.png'));
label('品质', body, '金色道具 · 1×1', -148, 18, 170, 36, 21, gray);
const desc = label('说明', body, '抵挡一次武器损毁。\n不抵挡降级损伤。\n效果触发后自动取消；\n未触发前，退出仍保留。', 55, 90, 270, 150, 24);
Object.assign(getComp(desc, 'cc.Label'), { _enableWrapText: true, _horizontalAlign: 0 });
label('数量', body, '拥有数量：0', 0, -65, 430, 42, 28);
label('状态', body, '可通过搜索带出或观看视频获得', 0, -112, 450, 38, 22, gray);
const action = node('操作', body, 0, -203, 320, 86);
sprite(action, frame('assets/Game_Bundles/73_ZRSJZ/Sprites/仓库/道具信息/大按钮-黄.png')); button(action);
label('文字', action, '看视频获得 1 个', 0, 0, 290, 56, 29, color(82, 56, 10));
const content = JSON.stringify(a, null, 2) + '\n';
fs.mkdirSync('artifacts/gun-cast-items', { recursive: true });
fs.writeFileSync('artifacts/gun-cast-items/item-popup-save.json', JSON.stringify({ jsonrpc: '2.0', id: 42, method: 'tools/call',
    params: { name: 'assetAdvanced_asset_operations', arguments: { action: 'save', url: 'db://' + file, content } } }));
console.log('Prepared MCP prefab save: two icon slots + detail popup using 道具弹窗底.');
