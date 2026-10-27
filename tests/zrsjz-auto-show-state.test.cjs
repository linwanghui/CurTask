const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
function load(file, className, names, globals) {
    const ast = ts.createSourceFile(file, fs.readFileSync(root + file, 'utf8'), ts.ScriptTarget.Latest, true);
    const cls = ast.statements.find(ts.isClassDeclaration);
    const members = cls.members.filter(m => names.includes(m.name?.getText(ast))).map(m => m.getText(ast)).join('\n');
    return vm.runInNewContext(ts.transpileModule(`class ${className} { ${members} }\n${className}`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText, globals);
}
const ui = { ISTTShow: false, Instance: { HidePlayerPanel() {} } };
function emitter() {
    const handlers = new Map();
    return { handlers, on(type, fn, target) { handlers.set(type, () => fn.call(target)); }, off(type) { handlers.delete(type); } };
}
const input = emitter(), canvasRoot = emitter(), dom = new Map();
const canvas = {
    getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100 }),
    ownerDocument: { addEventListener(type, fn) { dom.set(type, fn); }, removeEventListener(type) { dom.delete(type); } },
};
const player = { StopAutoShowInput() {}, node: { setWorldPosition() {} } };
const game = { GetPlayer: () => player };
const globals = {
    ZRSJZ_UIManager: ui, ZRSJZ_Game: { Instance: game },
    ZRSJZ_Box: Symbol(), ZRSJZ_EnemyBase: Symbol(), Canvas: Symbol(),
    Node: { EventType: { TOUCH_START: 'touch', MOUSE_DOWN: 'mouse' } },
    Input: { EventType: { TOUCH_START: 'touch', MOUSE_DOWN: 'mouse', KEY_DOWN: 'key' } }, input,
    director: { getScene: () => ({ getComponentsInChildren: () => [{ node: canvasRoot }] }) },
    ccGame: { canvas }, isValid: v => !!v && !v.destroyed,
    ZRSJZ_EventManager: { Off() {} }, ZRSJZ_MyEvent: {}, ZRSJZ_PANEL: {}, console: { warn() {} },
};
const AutoShow = load('Controller/ZRSJZ_MapAutoShow.ts', 'ZRSJZ_MapAutoShow', [
    '_active', '_stage', '_serial', '_path', '_waypoints', '_waypointIndex', '_closingGoods', '_openedGoods',
    '_inputRoots', '_inputCanvas', '_ownsTTShow', '_onCanvasPointer', 'IsRunning', 'Begin', 'OnUserInput',
    'Stop', 'UnbindUserInput', 'SetStage', 'onDisable',
], globals);
function create() {
    const box = { RequiresRewardVideo: () => false, RequiresPassword: () => false, EndSearch() {} };
    return Object.assign(new AutoShow(), {
        PlayerIndex: 0, Point: { worldPosition: {} },
        Box: { getComponent: () => box }, Enemy: { getComponent: () => ({}) },
    });
}
const show = create();
show.Begin();assert(ui.ISTTShow);assert(show.IsRunning);
assert(input.handlers.has('touch'));assert(canvasRoot.handlers.has('touch'));assert(dom.has('pointerdown'));
show.Stop();assert(!show.IsRunning);assert(ui.ISTTShow, 'finishing automatic actions is not player takeover');
assert(input.handlers.has('touch'), 'still detect takeover after automatic sequence ends');
canvasRoot.handlers.get('touch')();
assert(!ui.ISTTShow);assert.equal(input.handlers.size, 0);assert.equal(dom.size, 0);
show.Begin();assert(ui.ISTTShow);input.handlers.get('key')();assert(!ui.ISTTShow);
show.Begin();dom.get('pointerdown')({ clientX: 101, clientY: 10 });assert(ui.ISTTShow);
dom.get('pointerdown')({ clientX: 20, clientY: 10 });assert(!ui.ISTTShow);
show.Begin();show.onDisable();assert(!ui.ISTTShow);assert.equal(dom.size, 0);
show.Begin();const other = create();other.Begin();assert(ui.ISTTShow);
show.onDisable();assert(ui.ISTTShow, 'old component cleanup cannot clear the new presentation');
other.onDisable();assert(!ui.ISTTShow);
ui.ISTTShow = true;const invalid = create();invalid.Point = null;invalid.Begin();assert(!ui.ISTTShow);

const Manager = load('Manager/ZRSJZ_UIManager.ts', 'ZRSJZ_UIManager', ['ResetStaticState'], {});
Manager.ISTTShow = true;Manager.ResetStaticState();assert(!Manager.ISTTShow);
const gameGlobals = { ZRSJZ_Game: { Instance: null }, ZRSJZ_UIManager: ui,
    ZRSJZ_BoosterShotService: { ClearCurrentBoosterShot() {} }, ZRSJZ_InventoryService: { ResetBackpackExpansion() {} } };
const Game = load('ZRSJZ_Game.ts', 'Game', ['onDestroy'], gameGlobals);
const battle = new Game();gameGlobals.ZRSJZ_Game.Instance = battle;ui.ISTTShow = true;
battle.onDestroy();assert(!ui.ISTTShow);
const home = fs.readFileSync(root + 'ZRSJZ_Start.ts', 'utf8');
assert.match(home, /const startGame = \(\) => \{[\s\S]*?ZRSJZ_UIManager\.ISTTShow = false;/);
console.log('PASS: auto presentation state, takeover via UI/touch/keyboard/web canvas, completion before takeover, scene cleanup and normal home reset.');
