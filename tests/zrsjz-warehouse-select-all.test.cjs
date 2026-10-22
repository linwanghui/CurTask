const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
function loadMethods(file, names, globals) {
    const ast = ts.createSourceFile(file, fs.readFileSync(root + file, 'utf8'), ts.ScriptTarget.Latest, true);
    const cls = ast.statements.find(ts.isClassDeclaration);
    const code = 'class Subject {' + cls.members.filter(n => names.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join('\n') + '} Subject;';
    return vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, globals);
}
const prop = (price, count = 1) => ({ UnitPrice: price, CurCount: count });
const data = { PropData: { current1: prop(100, 2), current2: prop(500), otherWarehouse: prop(900), equipped: prop(1000) } };
const ui = { Dragging: false, Instance: { ShowCurrencyEffect() {} } };
const events = { ZRSJZ_SELL_PROP_SHOW: 'show', ZRSJZ_SELL_PROP: 'sell' };
const grids = [], sold = [], sounds = []; let gold = 0;
const Grid = loadMethods('UI/ZRSJZ_PropGrid.ts', ['SellShow', 'SellHide', 'ShowSellButton'], {});
function grid(id, inventory) {
    const item = new Grid(); Object.assign(item, { PropID: id, _inventory: inventory, Check: {}, Checked: {} }); grids.push(item); return item;
}
const first = grid('current1', '仓库_武器'), second = grid('current2', '仓库_武器');
const other = grid('otherWarehouse', '仓库_物品'), equipped = grid('equipped', '武器_枪');
const inventory = { IsInitialized: true, InventoryType: '仓库_武器', Grids: [['current1', 'current1', ''], ['current2', 'missing', '']] };
const Panel = loadMethods('Panel/ZRSJZ_WarehousePanel.ts', ['SelectAllSellProps', 'GetWarehouseInventory', 'AddSellProp', 'RefreshSellValue', 'SellProp'], {
    ZRSJZ_Inventory: {}, ZRSJZ_GameData: { Instance: data }, ZRSJZ_UIManager: ui,
    ZRSJZ_AudioManager: { Instance: { PlaySound: name => sounds.push(name) } },
    FormatMoney: String, ZRSJZ_MyEvent: events,
    ZRSJZ_EventManager: { EmitPersist(event, ...args) {
        if (event === 'show') for (const item of grids) item.SellShow(...args);
        if (event === 'sell') sold.push(args[0]);
    } },
    ZRSJZ_InventoryService: { GetPropSellValue: p => p ? p.UnitPrice * p.CurCount : 0, RemovePropID: id => delete data.PropData[id] },
    ZRSJZ_AccountService: { ChangeGold: value => gold += value }, ZRSJZ_TaskService: { CompleteTask() {} },
});
const panel = new Panel();
Object.assign(panel, { _isSelling: true, _isOrganizing: false, _warehouseName: '武器', _sellPropID: ['current1'],
    SellValue: {}, ActualSellValue: {}, _curInventory: { isValid: true, getComponent: () => inventory } });
panel.SelectAllSellProps();
assert.deepEqual(Array.from(panel._sellPropID), ['current1', 'current2']);
assert.equal(first.Checked.active, true); assert.equal(second.Checked.active, true);
assert.equal(other.Checked.active, undefined); assert.equal(equipped.Checked.active, undefined);
assert.equal(panel.SellValue.string, '700'); assert.equal(panel.ActualSellValue.string, '700');
panel.SelectAllSellProps(); assert.equal(panel._sellPropID.length, 0, 'clicking after full selection must clear selection');
assert.equal(first.Checked.active, false); assert.equal(second.Checked.active, false);
assert.equal(panel.SellValue.string, '0'); assert.equal(panel.ActualSellValue.string, '0');
assert.equal(other.Checked.active, undefined); assert.equal(equipped.Checked.active, undefined);
panel.SelectAllSellProps(); assert.equal(panel._sellPropID.length, 2, 'clicking after clearing must select all again');
assert.deepEqual(sounds, ['点击', '点击', '点击'], 'select, clear and reselect each play one click sound');
panel.AddSellProp('current1'); assert.deepEqual(Array.from(panel._sellPropID), ['current2']); assert.equal(panel.ActualSellValue.string, '500');
panel.SelectAllSellProps();
for (const change of [() => panel._isSelling = false, () => panel._isOrganizing = true, () => ui.Dragging = true,
    () => inventory.IsInitialized = false, () => inventory.InventoryType = '仓库_物品', () => panel._curInventory.isValid = false]) {
    const original = panel._sellPropID, soundCount = sounds.length; change(); panel.SelectAllSellProps(); assert.equal(panel._sellPropID, original);
    assert.equal(sounds.length, soundCount, 'ignored clicks must not play audio');
    panel._isSelling = true; panel._isOrganizing = false; ui.Dragging = false; inventory.IsInitialized = true;
    inventory.InventoryType = '仓库_武器'; panel._curInventory.isValid = true;
}
panel.SellProp();
assert.deepEqual(sold, ['current1', 'current2']); assert.equal(gold, 700);
assert(data.PropData.otherWarehouse); assert(data.PropData.equipped); assert.equal(panel._sellPropID.length, 0);
inventory.Grids = [['', 'missing']]; panel.SelectAllSellProps(); assert.equal(panel._sellPropID.length, 0); assert.equal(panel.ActualSellValue.string, '0');
first.SellShow('仓库_武器'); assert.equal(first.Checked.active, false, 'normal sale starts unselected');
console.log('PASS: current warehouse only, deduplication, select/clear/reselect, checkmarks, totals, manual deselection, readiness guards, empty warehouse and sale isolation');

const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ/Prefabs/Panel/仓库界面.prefab'));
const sellMask = prefab.find(item => item.__type__ === 'cc.Node' && item._name === 'SellMask');
const buttonNode = sellMask._children.map(ref => prefab[ref.__id__]).find(item => item._name === '全选');
assert(buttonNode, 'select-all must be a direct child of SellMask');
const button = buttonNode._components.map(ref => prefab[ref.__id__]).find(item => item.__type__ === 'cc.Button');
assert(button?._enabled && button._interactable); assert.equal(button.clickEvents.length, 0, 'runtime binding must not duplicate a serialized handler');
const panelSource = fs.readFileSync(root + 'Panel/ZRSJZ_WarehousePanel.ts', 'utf8');
assert(panelSource.includes('getChildByName("全选")?.on(Button.EventType.CLICK, this.SelectAllSellProps, this)'));
console.log('PASS: existing select-all button and runtime click binding');
