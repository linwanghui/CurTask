const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const file = 'assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Game.ts';
const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const cls = ast.statements.find(ts.isClassDeclaration);
const methods = ['RequestVideoEvacuation', 'CompleteVideoEvacuation', 'CompleteEvacuation', 'OnButtonClick'];
const code = 'class Subject {' + cls.members.filter(n => methods.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join('\n') + '} Subject;';
function fixture() {
    const timers = new Map(), intervals = new Map(), events = new Map(), close = new Set(), errors = new Set();
    const shown = [], stats = [], progress = [], tips = []; let reward, requests = 0, sound = 0, next = 0;
    const sdk = { onClose: fn => close.add(fn), offClose: fn => close.delete(fn), onError: fn => errors.add(fn), offError: fn => errors.delete(fn) };
    const banner = { Instance: { rewardedVideoAd: sdk, ShowVideoAd(callback) { requests++; reward = callback; } } };
    const current = {};
    const Subject = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
        Banner: banner, ZRSJZ_Game: current, game: { on: (event, fn) => events.set(event, fn), off: event => events.delete(event) }, Game: { EVENT_SHOW: 'show' },
        setTimeout: (fn, delay) => { timers.set(++next, { fn, delay }); return next; }, clearTimeout: id => timers.delete(id),
        setInterval: fn => { intervals.set(++next, fn); return next; }, clearInterval: id => intervals.delete(id),
        ZRSJZ_OnlineService: { Events: { emit() {} } }, ZRSJZ_GradeService: { GetPropIDsValue: () => 12345 },
        ZRSJZ_GameData: { Instance: { CurMap: '五号小镇_机密行动', PropData: { item: { OwnerPlayerIndex: 0 } } } },
        ZRSJZ_TaskService: { RecordExtraction: ids => progress.push(['items', ...ids]), CompleteTask: name => progress.push(['task', name]) },
        ZRSJZ_EventManager: { Emit() {} }, ZRSJZ_MyEvent: {}, ZRSJZ_PANEL: { 胜利弹窗: 'win' },
        ZRSJZ_UIManager: { Dragging: false, Instance: { ShowPanel: (...args) => shown.push(args), ShowTip: text => tips.push(text) } },
        ZRSJZ_AudioManager: { Instance: { PlaySound() { sound++; } } }, console: { warn() {} },
    });
    const subject = new Subject(); current.Instance = subject;
    Object.assign(subject, { IsTutorial: false, _battleStarted: true, _isGameFinished: false, GamePaused: false,
        node: { isValid: true, activeInHierarchy: true }, Players: [{ IsDead: false, PlayerIndex: 0 }] });
    subject.SetEvacuationVisible = subject.SetSpecialOperationCountdownVisible = () => {};
    subject.GetAllGoodsID = () => ['item']; subject.GetGameTime = () => '01:23'; subject.GetKillCount = () => 5;
    subject.FinalizeBattleStatistics = (...args) => stats.push(args);
    return { subject, current, banner, close, errors, timers, intervals, events, shown, stats, progress, tips,
        click: () => subject.OnButtonClick({ getCurrentTarget: () => ({ name: '马上撤离' }) }), reward: () => reward(),
        requests: () => requests, sound: () => sound,
        run(delay) { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } },
    };
}
let f = fixture(); f.subject.CompleteVideoEvacuation(); assert.equal(f.shown.length, 0, 'no settlement without a video request'); f.click(); f.click();
assert.equal(f.requests(), 1); assert.equal(f.subject.GamePaused, true); assert.equal(f.shown.length, 0);
f.reward(); f.reward();
assert.equal(f.shown.length, 1); assert.equal(f.shown[0][0], 'win'); assert.equal(f.shown[0][1], '视频撤离');
assert.equal(f.stats.length, 1); assert.equal(f.stats[0][0], true); assert.equal(f.stats[0][1], 12345);
assert.equal(f.progress.length, 2); assert.equal(f.subject.GamePaused, true); assert.equal(f.subject._isGameFinished, true);
assert.equal(f.timers.size, 0); assert.equal(f.intervals.size, 0); assert.equal(f.events.size, 0); assert.equal(f.close.size, 0);
for (const outcome of ['close', 'error', 'foreground', 'timeout', 'throw']) {
    f = fixture();
    if (outcome === 'throw') f.banner.Instance.ShowVideoAd = () => { throw Error('SDK unavailable'); };
    f.click();
    if (outcome === 'close') { for (const fn of [...f.close]) fn(); f.run(100); }
    if (outcome === 'error') { for (const fn of [...f.errors]) fn(); f.run(100); }
    if (outcome === 'foreground') { f.events.get('show')(); f.run(500); }
    if (outcome === 'timeout') f.run(180000);
    assert.equal(f.subject.GamePaused, false, outcome + ' resumes battle'); assert.equal(f.shown.length, 0); assert.equal(f.stats.length, 0);
    assert.equal(f.subject._videoEvacuationCleanup, null); assert.equal(f.intervals.size, 0);
    if (outcome !== 'throw') { f.reward(); assert.equal(f.shown.length, 0, 'late callback ignored after cancellation'); }
}
for (const invalid of [f => f.subject.IsTutorial = true, f => f.subject._battleStarted = false,
    f => f.subject._isGameFinished = true, f => f.subject.GamePaused = true, f => f.subject.Players[0].IsDead = true]) {
    f = fixture(); invalid(f); f.click(); assert.equal(f.requests(), 0);
}
for (const stale of [f => f.subject.node.isValid = false, f => f.current.Instance = {}, f => f.subject._isGameFinished = true,
    f => f.subject.Players[0].IsDead = true, f => f.subject._videoEvacuationCleanup()]) {
    f = fixture(); f.click(); stale(f); f.reward(); assert.equal(f.shown.length, 0); assert.equal(f.stats.length, 0);
}
const scene = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Scenes/ZRSJZ_Game.scene'));
const node = scene.find(n => n.__type__ === 'cc.Node' && n._name === '马上撤离'); assert(node);
const components = node._components.map(r => scene[r.__id__]);
const button = components.find(c => c.__type__ === 'cc.Button'); assert.equal(scene[button.clickEvents[0].__id__].handler, 'OnButtonClick');
const widget = components.find(c => c.__type__ === 'cc.Widget'); assert.equal(widget._top, 180); assert.equal(widget._left, 375.5);
assert.equal(components.find(c => c.__type__ === 'cc.UITransform')._contentSize.width, 150);
const clickEvent = scene[button.clickEvents[0].__id__];
assert(scene[clickEvent.target.__id__]._components.some(r => scene[r.__id__].__type__ === clickEvent._componentId), 'button targets the scene game component');
const meta = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Sprites/UI/视频撤离.png.meta'));
assert.equal(components.find(c => c.__type__ === 'cc.Sprite')._spriteFrame.__uuid__, meta.uuid + '@f9941');
const png = fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Sprites/UI/视频撤离.png'); assert.equal(png.readUInt32BE(16), meta.subMetas.f9941.userData.rawWidth); assert.equal(png.readUInt32BE(20), meta.subMetas.f9941.userData.rawHeight); assert.equal(png[25], 6, 'RGBA PNG');
console.log('PASS: rewarded extraction only once, normal goods/task/stat settlement, click audio, cancel/error/return/timeout recovery, stale callback rejection, tutorial/death guards and HUD asset wiring');
