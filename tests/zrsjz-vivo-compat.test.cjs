// Run real source methods through the same loose spread transform as the vivo build.
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const engineModules = process.env.COCOS_ENGINE_MODULES || 'D:/cocos/Creator/3.8.6/resources/resources/3d/engine/node_modules';
const babel = require(engineModules + '/@babel/core');
const spread = require(engineModules + '/@babel/plugin-transform-spread');
const main = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
function loose(source) {
    const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    return babel.transformSync(js, { configFile: false, babelrc: false, plugins: [[spread, { loose: true }]] }).code;
}
function methods(file, className, names, globals) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === className);
    const selected = names.map(name => {
        const member = cls.members.find(n => n.name?.getText(source) === name);
        assert.ok(member, name);
        return member.getText(source);
    });
    return vm.runInNewContext(loose(`class ${className} { ${selected.join('\n')} }\n${className};`), globals);
}
// Guard against accidentally testing native spread (which conceals this defect).
assert.equal(vm.runInNewContext(loose('const m = new Map([["a", {name:"a"}]]); [...m.values()][0].name;')), undefined);

const data = { PropData: {} };
let inventories = [], popup;
const ui = { Instance: { GetAllInventoryNodes: () => inventories.map(i => ({ getComponent: () => i })), ShowPanel: (_, p) => popup = p }, IsBattle: false };
const Inventory = methods(main + 'UI/ZRSJZ_Inventory.ts', 'ZRSJZ_Inventory',
    ['IsEquipmentSlot', 'CanPlaceForSwap', 'GetSwapPlan', 'FillVacatedSwapCells'],
    { ZRSJZ_GameData: { Instance: data }, ZRSJZ_UIManager: ui, ZRSJZ_INVENTORY: { 仓库_全部: '仓库_全部', 武器_刀: '武器_刀', 武器_背包: '武器_背包' } });
function inventory(grids) {
    return Object.assign(new Inventory(), { Grids: grids, IsInitialized: true, InventoryType: '仓库_全部',
        IsAdaptive: () => true, BelongsToInventory: () => true, SupportsAutoRotation: () => true,
        CanPlace(x, y, w, h) {
            for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) if (this.Grids[r]?.[c] !== '') return false;
            return true;
        } });
}
function prop(w = 1) { return { Width: w, Height: 1, GridData: [{ IsRotate: false }, { IsRotate: false }] }; }
data.PropData = { a: prop(), b: prop() };
inventories = [inventory([['a']]), inventory([['b']])];
let plan = inventories[1].GetSwapPlan('a', 0, 0, 1, 1, false);
assert.ok(plan); assert.equal(plan.length, 2); assert.equal(plan[1].id, 'b');
assert.equal(plan[1].inventory, inventories[0]);
assert.equal(JSON.stringify(inventories.map(i => i.Grids)), '[[["a"]],[["b"]]]', 'planning must not mutate inventory');
data.PropData.a = prop(2);
inventories = [inventory([['a', 'a', 'b']])];
plan = inventories[0].GetSwapPlan('a', 1, 0, 2, 1, false);
assert.ok(plan); assert.equal(plan.length, 2); assert.equal(plan[1].id, 'b'); assert.equal(plan[1].gridX, 0);
data.PropData.b.IsRewardVideoLocked = true;
assert.equal(inventories[0].GetSwapPlan('a', 1, 0, 2, 1, false), null);
data.PropData.b.IsRewardVideoLocked = false;
inventories = [inventory([['a', 'a', 'b', 'b']])]; data.PropData.b = prop(2);
assert.equal(inventories[0].GetSwapPlan('a', 1, 0, 2, 1, false), null, 'partially covered target must not swap');
console.log('PASS: loose-build cross-inventory swap, overlapping swap, locks and partial-coverage rejection');

const Panel = methods('assets/Game_Bundles/73_ZRSJZ_DLC/Scripts/Panel/ZRSJZ_BattlePassPanel.ts', 'ZRSJZ_BattlePassPanel', ['ShowRewardPopup'],
    { ZRSJZ_UIManager: ui, ZRSJZ_PANEL: { 获取奖励弹窗: 'awards' } });
new Panel().ShowRewardPopup([{ type: 'prop', name: '宠物碎片', count: 2 }, { type: 'prop', name: '宠物碎片', count: 3 }, { type: 'prop', name: '焚天龙', count: 1 }]);
assert.equal(popup.Awards.length, 2); assert.equal(popup.Awards[0].TaskAwardName, '宠物碎片'); assert.equal(popup.Awards[0].TaskAwardCount, 5);
assert.equal(popup.Awards[1].TaskAwardName, '焚天龙'); assert.equal(popup.DisplayOnly, true);
console.log('PASS: loose-build reward popup receives merged reward objects, not MapIterator');

const Achievement = methods('assets/Game_Bundles/73_ZRSJZ_DLC/Scripts/Panel/ZRSJZ_AchievementPanel.ts', 'ZRSJZ_AchievementPanel', ['ShowRewards'],
    { ZRSJZ_UIManager: ui, ZRSJZ_GameData: { Instance: data }, ZRSJZ_PANEL: { 获取奖励弹窗: 'awards' } });
new Achievement().ShowRewards([{ type: '道具', name: '宠物碎片', count: 2 }, { type: '道具', name: '宠物碎片', count: 3 }]);
assert.equal(popup.Awards.length, 1); assert.equal(popup.Awards[0].TaskAwardName, '宠物碎片'); assert.equal(popup.Awards[0].TaskAwardCount, 5);
console.log('PASS: loose-build achievement popup merges actual reward objects');

const Manager = methods(main + 'Manager/ZRSJZ_UIManager.ts', 'ZRSJZ_UIManager', ['GetWeaponryIconUI'], {});
const manager = new Manager();
const originalFrame = { rect: { x: 80, y: 160, width: 30, height: 100 }, rotated: true, texture: { width: 2048, height: 2048 } };
manager.WeaponrySpriteFrameMap = new Map([['skin', originalFrame]]);
manager.GetWeaponryUI = async () => originalFrame.texture;
manager.IsAvailable = () => true;
(async () => {
    assert.equal(await manager.GetWeaponryIconUI('skin'), originalFrame);
    assert.equal(await manager.GetWeaponryIconUI('missing'), null);
    manager.IsAvailable = () => false;
    assert.equal(await manager.GetWeaponryIconUI('skin'), null);
    console.log('PASS: weapon icon preserves original atlas frame, UV/rect/rotation and handles missing/disposed assets');
})().catch(e => { console.error(e); process.exitCode = 1; });
