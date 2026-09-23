const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const base = 'assets/Game_Bundles/73_ZRSJZ/';
function evaluate(source, globals) {
    return vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, globals);
}
const constants = { exports: {} }; evaluate(fs.readFileSync(base + 'Scripts/ZRSJZ_Constant.ts', 'utf8'), constants);
const data = { HaveRole: ['威蓝'], HaveSkin: ['夜喵'], CurrentAvatar: '威蓝', CurrentAvatarFrame: '1', EquippedTitle: '勇者' };
let saves = 0, events = 0, available = true, loaded = true, ad, awarded = 0;
const globals = { ...constants.exports,
    ZRSJZ_GameData: { Instance: data, SaveData() { saves++; } },
    ZRSJZ_UIManager: { ZRSJZ_DLC: true }, assetManager: { getBundle: () => loaded ? {} : null },
    ZRSJZ_EventManager: { EmitPersist() { events++; } }, ZRSJZ_MyEvent: {},
    ZRSJZ_AvatarFrameService: { IsOwned: id => id === '1', CreateVideoReward: id => { let used = false; return () => { if (used) return false; used = true; awarded++; return true; }; } },
    ZRSJZ_TitleService: { IsOwned: name => name === '勇者', GetUnlockHint: () => '完成\n成就获得', Equip: name => data.EquippedTitle = name },
    Banner: { Instance: { ShowVideoAd(cb) { ad = cb; } } }
};
const source = ts.createSourceFile('selector.ts', fs.readFileSync(base + 'Scripts/UI/ZRSJZ_ProfileSelector.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const cls = source.statements.find(n => ts.isClassDeclaration(n));
const names = ['AvatarNames','OwnsAvatar','Ready','Owned','Pick','UpdateHint','UnlockVideo'];
const Selector = evaluate(`class ZRSJZ_ProfileSelector { ${cls.members.filter(n => names.includes(n.name?.getText(source))).map(n => n.getText(source)).join('\n')} } ZRSJZ_ProfileSelector;`, globals);
const selector = new Selector(); selector.Refresh = () => {}; selector.hint = { node: {} }; selector.video = {}; selector.lastVideo = 0;
assert.equal(Selector.AvatarNames().length, 9);
assert(!Selector.AvatarNames().includes('沧戈')); assert(!Selector.AvatarNames().includes('凌魇'));
assert(Selector.OwnsAvatar('夜喵')); assert(!Selector.OwnsAvatar('黯祁')); assert(!Selector.OwnsAvatar('泠汐'));
selector.tab = 'avatar'; selector.Pick('夜喵'); assert.equal(data.CurrentAvatar, '夜喵'); assert.equal(saves, 1); assert.equal(events, 1);
selector.UpdateHint(); assert.equal(selector.hint.string, ''); assert.equal(selector.hint.node.active, false);
selector.Pick('黯祁'); assert.equal(data.CurrentAvatar, '夜喵'); assert.equal(saves, 1);
selector.UpdateHint(); assert.equal(selector.hint.string, '解锁皮肤黯祁获得');
selector.tab = 'frame'; selector.selected = '2'; selector.UpdateHint(); assert.equal(selector.hint.string, '击败简单模式Boss获得');
selector.Pick('1'); assert.equal(data.CurrentAvatarFrame, '1');
selector.tab = 'title'; selector.selected = '王者之姿'; selector.UpdateHint(); assert.equal(selector.hint.string, '完成成就获得');
globals.ZRSJZ_UIManager.ZRSJZ_DLC = false; selector.tab = 'avatar'; selector.Pick('威蓝'); assert.equal(data.CurrentAvatar, '夜喵');
globals.ZRSJZ_UIManager.ZRSJZ_DLC = true; loaded = false; assert.equal(selector.Ready(), false); loaded = true;
selector.tab = 'frame'; selector.selected = '9'; selector.root = { isValid: true, activeInHierarchy: true };
selector.Pick('2'); assert.equal(ad, undefined, 'normal locked frame must not start video');
selector.Pick('9'); assert.equal(typeof ad, 'function', 'clicking video frame must start video directly');
assert.equal(awarded, 0); assert.equal(data.CurrentAvatarFrame, '1', 'cancel/no success must not grant or equip');
selector.selected = '10'; ad(); ad(); assert.equal(awarded, 1); assert.equal(data.CurrentAvatarFrame, '9');
console.log('PASS: config filtering, skin ownership, instant selection, locked selection, DLC gating, single-line hints and one-shot video reward');

const dlcUUIDs = new Set();
function scan(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) scan(p); else if (p.endsWith('.meta')) { const m = JSON.parse(fs.readFileSync(p)); dlcUUIDs.add(m.uuid); for (const s of Object.values(m.subMetas || {})) dlcUUIDs.add(s.uuid); } } }
scan('assets/Game_Bundles/73_ZRSJZ_DLC');
const prefab = JSON.parse(fs.readFileSync(base + 'Prefabs/Panel/等级弹窗.prefab'));
function visit(x) { if (!x || typeof x !== 'object') return; if (x.__uuid__) assert(!dlcUUIDs.has(x.__uuid__), 'Serialized DLC dependency: ' + x.__uuid__); Object.values(x).forEach(visit); }
visit(prefab);
assert(!/from\s+['"][^'"]*73_ZRSJZ_DLC/.test(source.text));
console.log('PASS: player-info prefab has no direct DLC UUID references; selector has no DLC script imports');
