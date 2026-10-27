const fs = require('node:fs');
const assert = require('node:assert/strict');
const { call } = require('./mcp.cjs');

const descriptions = {
    '冰霜裁决': '铸枪专属武器，以寒霜控制敌人，为拉开距离、换弹和团队集火创造机会。每次有效命中先结算伤害，再为存活目标叠加1层寒意，每层减速6%，最多5层、减速30%。命中刷新全部寒意的2秒持续时间，到期整体清除。第6次有效命中清空寒意并冻结目标：普通敌人0.8秒，精英0.4秒，期间无法移动、攻击或启动新技能。冻结中命中仅造成正常枪弹伤害，不叠寒意、不延长冻结。解冻后3秒内免疫再次冻结，仍可减速并积累最多5层寒意；免疫结束后需再次有效命中才能触发冻结。首领免疫硬冻结，减速上限15%，不打断阶段技能，寒意仅影响允许减速的移动阶段。',
    '烈焰破军': '铸枪专属武器，持续攻击同一目标，以叠层削甲逐步提高伤害。每次命中叠加1层灼甲，最多20层；每层降低目标2个百分点护甲减伤，最多降低40个百分点，最低降至0。本次伤害按命中前层数结算，新叠层从下一发开始生效。最后一次命中后3秒，全部灼甲整体消失。无护甲目标无法获得削甲收益，但本枪仍可通过叠层获得最高50%的增伤。队友及其他武器不享受本枪成长增伤；公共削甲取所有来源的最高值，不叠加。',
    '蚀骨毒牙': '铸枪专属武器，通过高频命中叠加持续毒伤，擅长对付高生命目标。每次有效命中叠加1层毒素，同一攻击者对同一目标最多50层；最后一次命中后持续4秒，命中刷新整组持续时间，但不重置跳伤计时。首次施毒0.25秒后开始跳伤，此后每0.25秒结算一次。每层每跳造成施毒者武器攻击力的2%独立毒伤，不能暴击，不计入枪伤，也不触发元素效果或攻击击退。基础攻击力72、满50层时，每跳72点，每秒288点毒伤。到期清除全部层数与剩余计时；若到期时恰逢跳伤，先结算该跳再清除。',
};

(async () => {
    const path = 'assets/Game_Bundles/73_ZRSJZ/Scripts/ZRSJZ_Constant.ts';
    const url = 'db://' + path;
    console.log(await call('assetAdvanced_asset_query', { action: 'get_info', assetPath: url }));
    const source = fs.readFileSync(path, 'utf8');
    const start = source.indexOf('export const ZRSJZ_PROP_DESCRIPTION:');
    const end = source.indexOf('\n]);', start);
    assert(start >= 0 && end > start);
    const map = source.slice(start, end);
    for (const name of Object.keys(descriptions)) assert(!map.includes(JSON.stringify(name)), 'Description already exists: ' + name);
    const additions = Object.entries(descriptions).map(([name, description]) => '    [' + JSON.stringify(name) + ', ' + JSON.stringify(description) + '],').join('\n');
    const content = source.slice(0, end) + '\n' + additions + source.slice(end);
    console.log(await call('assetAdvanced_asset_operations', { action: 'save', url, content }));
    const saved = fs.readFileSync(path, 'utf8');
    for (const [name, description] of Object.entries(descriptions)) {
        assert(saved.includes('[' + JSON.stringify(name) + ', ' + JSON.stringify(description) + ']'));
        console.log('Verified description:', name);
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
