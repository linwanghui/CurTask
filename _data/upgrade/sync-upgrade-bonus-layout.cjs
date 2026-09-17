const fs = require('fs');
const { call } = require('./mcp.cjs');
const file = 'assets/Game_Bundles/73_ZRSJZ/Scripts/Panel/ZRSJZ_UpgradePanel.ts';
const source = fs.readFileSync(file, 'utf8');
const old = /        \(Object\.keys\(ZRSJZ_ENHANCEMENT_STATS\) as EnhancementStat\[\]\)\.forEach\(\(stat, index\) =>\r?\n            this\.Text\(`Bonuses\/Stat\$\{index\}`, `\$\{stat\}  \$\{Upgrade\.Format\(stat, Upgrade\.GetBonus\(stat\)\)\}`\)\);/;
if (!old.test(source)) throw Error('Cannot find old bonus binding');
const replacement = [
 '        (Object.keys(ZRSJZ_ENHANCEMENT_STATS) as EnhancementStat[]).forEach(stat => {',
 '            // 新版属性卡片将名称与加成数值分开，名称和样式由预制体维护。',
 "            const nodeName = stat === '大红掉落概率' ? '大红掉率' : stat;",
 '            this.Text(`Bonuses/${nodeName}/Num`, Upgrade.Format(stat, Upgrade.GetBonus(stat)));',
 '        });',
].join(source.includes('\r\n') ? '\r\n' : '\n');
const prefab = JSON.parse(fs.readFileSync('assets/Game_Bundles/73_ZRSJZ_DLC/Prefabs/Panel/强化界面.prefab', 'utf8'));
function path(node) { return node ? (node._parent ? path(prefab[node._parent.__id__]) + '/' : '') + node._name : ''; }
const paths = new Set(prefab.filter(c => c.__type__ === 'cc.Label').map(c => path(prefab[c.node.__id__])));
for (const name of ['攻击','生命','防御','移速','技能伤害','技能冷却','换弹速度','大红掉率']) {
 if (!paths.has('强化界面/Panel/Bonuses/' + name + '/Num')) throw Error('Missing number label: ' + name);
}
call('assetAdvanced_asset_operations', {action:'save', url:'db://' + file, content:source.replace(old,replacement)})
 .then(() => console.log('MCP saved; all 8 bonus number bindings match current prefab.'))
 .catch(e => {console.error(e);process.exitCode=1;});
