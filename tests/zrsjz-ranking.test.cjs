const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const base = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
const source = ts.createSourceFile('start.ts', fs.readFileSync(base + 'ZRSJZ_Start.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const cls = source.statements.find(ts.isClassDeclaration);
const methods = ['RefreshRankingButton', 'onEnable', 'onDisable'];
const listeners = new Map();
const manager = { ZRSJZ_DLC: false }, banner = { IS_BYTEDANCE_MINI_GAME: true };
const events = new Proxy({}, { get: (_, key) => key });
const eventManager = {
    OnPersist(event, callback, owner) { const list = listeners.get(event) || []; list.push([callback, owner]); listeners.set(event, list); },
    OffPersist(event, callback, owner) { listeners.set(event, (listeners.get(event) || []).filter(x => x[0] !== callback || x[1] !== owner)); },
    On() {}, Off() {},
};
const code = 'class Start {' + cls.members.filter(n => methods.includes(n.name?.getText(source))).map(n => n.getText(source)).join('\n') + '} Start;';
const Start = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ZRSJZ_UIManager: manager, Banner: banner, ZRSJZ_EventManager: eventManager, ZRSJZ_MyEvent: events,
    isValid: node => !!node && !node.destroyed,
});
const start = new Start();
for (const method of ['EnsureActionButton', 'RefreshSidebarUnlocks', 'RefreshMailTip', 'schedule', 'unschedule']) start[method] = () => {};
start._mainReminderNodes = new Map(); start._petPreviews = []; start._petPreviewVersion = 0;
start.RankingListBtn = { active: true }; start.onEnable();
assert.equal(start.RankingListBtn.active, false, 'must wait for DLC');
manager.ZRSJZ_DLC = true;
for (const [callback, owner] of listeners.get(events.ZRSJZ_LOADED_DLC)) callback.call(owner);
assert.equal(start.RankingListBtn.active, true, 'late DLC must reveal ranking without reopening the lobby');
start.onDisable(); assert.equal(listeners.get(events.ZRSJZ_LOADED_DLC).length, 0);
start.onEnable(); assert.equal(start.RankingListBtn.active, true, 'DLC already loaded when returning to lobby');
banner.IS_BYTEDANCE_MINI_GAME = false; start.RefreshRankingButton(); assert.equal(start.RankingListBtn.active, false);
start.RankingListBtn = null; start.RefreshRankingButton();
console.log('PASS: ranking entry handles late DLC, lobby reentry, platform gating and listener cleanup');

const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/排行榜界面.prefab'));
const root = prefab[prefab[0].data.__id__];
function get(route) { return route.split('/').reduce((node, name) => node?._children.map(ref => prefab[ref.__id__]).find(child => child._name === name), root); }
for (const route of ['关闭', '刷新', '我的排名', '状态', '空榜', '表头/数值标题', '说明', '开放数据榜单', '滚动触摸区', '前三名/颁奖台', '前三名/灯光', ...['wealth', 'raid', 'recharge'].flatMap(type => ['页签/' + type + '/文字', '页签/' + type + '/选中']), ...Array.from({ length: 10 }, (_, i) => '榜单列表/View/Content/名次' + (i + 1))]) {
    assert(get('Panel/' + route), 'missing ranking node: ' + route);
}
assert(prefab.some(item => item.__type__ === 'cc.SubContextView'));
const uuids = new Set();
function scan(folder) { for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (file.endsWith('.meta')) { const meta = JSON.parse(fs.readFileSync(file)); uuids.add(meta.uuid); for (const sub of Object.values(meta.subMetas || {})) uuids.add(sub.uuid); }
} }
scan('assets');
for (const item of prefab) JSON.stringify(item, (key, value) => { if (key === '__uuid__') assert(uuids.has(value) || uuids.has(value.split('@')[0]), 'missing asset: ' + value); return value; });
console.log('PASS: ranking prefab paths, open-data view and all serialized asset references');

const folder = path.resolve('build-templates/bytedance-mini-game/zrsjz-open-data');
assert.equal(JSON.parse(fs.readFileSync(path.join(folder, '../game.json'))).openDataContext, 'zrsjz-open-data');
const painted = [], requests = [], intervals = new Set(); let message;
const context = new Proxy({ measureText: value => ({ width: String(value).length * 15 }), fillText: value => painted.push(String(value)) }, { get: (obj, key) => obj[key] || (() => {}) });
const sandbox = {
    require: name => name === './catalog.js' ? require(path.join(folder, name)) : () => ({ role() {}, frame() {}, clear() {}, install() {} }),
    tt: { getSharedCanvas: () => ({ width: 2340, height: 1080, getContext: () => context }), onMessage: callback => message = callback,
        createImage: () => ({}), getImRankData: options => requests.push(options) },
    setInterval: callback => { intervals.add(callback); return callback; }, clearInterval: id => intervals.delete(id), setTimeout: () => 1, clearTimeout() {}, console,
};
vm.runInNewContext(fs.readFileSync(path.join(folder, 'index.js'), 'utf8'), sandbox);
const send = args => message({ ranking: true, ...args });
send({ command: 'show', type: 'wealth', local: JSON.stringify({ values: { wealth: 10000 }, extra: {} }) });
assert.equal(requests.length, 3);
for (const request of requests) {
    const recharge = request.zoneId.includes('recharge');
    request.success({ data: { items: [{ openid: 'one', nick_name: recharge ? '充值玩家' : '财富玩家', value: '123', extra: JSON.stringify({ v: 1, q: recharge ? '123' : '1234567' }) }], self_item: { rank: 1, item: { openid: 'me', nick_name: '本人', value: '123' } } } });
}
assert(painted.includes('财富玩家')); assert(painted.includes('123万'));
send({ command: 'select', type: 'recharge' }); assert(painted.includes('充值玩家')); assert(painted.includes('¥1.23'));
send({ command: 'select', type: 'raid' }); send({ command: 'scroll', delta: 200 });
send({ command: 'refresh' }); requests.filter(request => request.zoneId.includes('raid')).at(-1).fail(); assert(painted.includes('刷新失败，保留上次结果'));
send({ command: 'hide' }); assert.equal(intervals.size, 0);
console.log('PASS: three open-data boards render names/values, switch, refresh failure, scrolling and close cleanup (mock platform/canvas)');
