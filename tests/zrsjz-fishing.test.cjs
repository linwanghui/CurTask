const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const ts = require('../extensions/cocos-mcp-server-main/node_modules/typescript');
const root = 'assets/Game_Bundles/73_ZRSJZ/Scripts/';
const constants = ts.createSourceFile('constant.ts', fs.readFileSync(root + 'ZRSJZ_Constant.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const configCode = constants.statements.filter(s => ts.isVariableStatement(s)
    && s.declarationList.declarations.some(d => ['ZRSJZ_FISHING_CONFIG', 'ZRSJZ_FISHING_REWARDS', 'ZRSJZ_PROP_CONFIG', 'ZRSJZ_AMMO_MAX_COUNT'].includes(d.name.getText(constants)))
    || ts.isEnumDeclaration(s) && ['ZRSJZ_PROP_QUALITY', 'ZRSJZ_GRID_TYPE'].includes(s.name.text)
    || ts.isFunctionDeclaration(s) && s.name?.text === 'ZRSJZ_RollFishingRewards')
    .map(s => s.getText(constants).replace(/^export /, '')).join('\n');
const roundCode = fs.readFileSync(root + 'Service/ZRSJZ_FishingRound.ts', 'utf8').replace(/^import .*;\s*/m, '').replace('export class ', 'class ');
const { Round, config, rewards, roll, props, qualities } = vm.runInNewContext(ts.transpileModule(configCode + '\n' + roundCode
    + '\n({Round: ZRSJZ_FishingRound, config: ZRSJZ_FISHING_CONFIG, rewards: ZRSJZ_FISHING_REWARDS, roll: ZRSJZ_RollFishingRewards, props: ZRSJZ_PROP_CONFIG, qualities: ZRSJZ_PROP_QUALITY});',
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);
assert.equal(config.MinWidth, 0.05); assert.equal(config.MaxWidth, 0.2);
assert.equal(config.PointerOffsetY, -7);
const warmup = new Round(() => 0);
for (let i = 0; i < 12; i++) warmup.Update(0.25);
assert(Math.abs(warmup.Progress - (config.InitialProgress - 3 * config.LossPerSecond * 0.25)) < 0.001);
assert.equal(warmup.Result, 'playing', 'new player must not lose the fish during the first three seconds');
const afterWarmup = warmup.Progress;
warmup.Update(0.25);
assert(Math.abs(afterWarmup - warmup.Progress - config.LossPerSecond * 0.25) < 0.001);
for (const random of [0, 0.25, 0.5, 0.75, 0.999999]) {
    const round = new Round(() => random);
    assert(round.WindowWidth >= 0.05 && round.WindowWidth <= 0.2);
    const width = round.WindowWidth;
    const start = round.WindowStart;
    assert(start >= 0 && start + width <= 0.5, 'effective zone must fit inside the left half');
    const before = round.Pointer;
    round.Pull();
    assert.equal(round.Pointer, before - config.ClickPull, 'one click must be one leftward impulse');
    round.Update(0.1);
    assert(round.Pointer > before - config.ClickPull, 'without further clicks fish pulls right');
    assert.equal(round.WindowWidth, width, 'reward difficulty cannot change mid-round');
    assert.equal(round.WindowStart, start, 'effective zone must not move after it appears');
    for (let i = 0; i < 4000 && round.Result === 'playing'; i++) {
        round.Update(1 / 120);
        assert.equal(round.WindowStart, start, 'effective zone must stay fixed throughout the round');
    }
    assert.equal(round.Result, 'escaped');
    assert.equal(round.Progress, 0);
    const escapedPointer = round.Pointer;
    round.Pull(); round.Update(1);
    assert.equal(round.Pointer, escapedPointer, 'terminal round cannot restart from extra clicks');
}
for (const random of [0, 0.5, 0.999999]) {
    const round = new Round(() => random);
    let clicks = 0;
    for (let i = 0; i < 5000 && round.Result === 'playing'; i++) {
        if (round.Pointer >= round.WindowStart + round.WindowWidth - 0.001) { round.Pull(); clicks++; }
        round.Update(1 / 120);
    }
    assert.equal(round.Result, 'success', 'all configured widths must be winnable by discrete clicks');
    assert.equal(round.Progress, 1);
    assert(clicks > 1);
}
const qualityNames = [qualities.白色, qualities.绿色, qualities.蓝色, qualities.紫色, qualities.金色];
const widths = [0.05, 0.08, 0.12, 0.16, 0.2];
const fixed = ['红珊瑚鲤鱼', '彩金色鲤鱼', '钻石级鱼子酱'];
for (let tier = 0; tier < widths.length; tier++) {
    const width = widths[tier];
    const candidates = rewards.filter(r => width >= r.MaxWidth[0] && (width < r.MaxWidth[1] || width === 0.2 && r.MaxWidth[1] === 0.2));
    assert.equal(candidates.reduce((sum, r) => sum + r.Probability, 0), 100);
    const redProbability = candidates.find(r => r.Awards)?.Probability ?? 0;
    let redCount = 0;
    for (let sample = 0; sample < 1000; sample++) {
        const draws = [(sample + 0.5) / 1000, 0.5, 0.5];
        const award = roll(width, () => draws.shift());
        assert.equal(award.length, 1);
        assert.equal(award[0].TaskAwardCount, 1);
        const prop = props.get(award[0].TaskAwardName);
        assert(prop);
        if (prop.Quality === qualities.红色) {
            redCount++;
            assert.equal(prop.Name, fixed[tier]);
        } else {
            assert(qualityNames.includes(prop.Quality));
            assert.equal(prop.PropType, '物品');
        }
    }
    assert.equal(redCount, redProbability * 10, 'configured red percentage must match draws');
    const normal = candidates.find(r => r.QualityWeights);
    let weightBefore = 0;
    for (let quality = 0; quality < 5; quality++) {
        const draws = [0.99999, (weightBefore + normal.QualityWeights[quality] / 2) / 100, 0];
        const award = roll(width, () => draws.shift());
        assert.equal(props.get(award[0].TaskAwardName).Quality, qualityNames[quality]);
        weightBefore += normal.QualityWeights[quality];
    }
}
const normalTiers = rewards.filter(r => r.QualityWeights);
const expectedQuality = normalTiers.map(r => r.QualityWeights.reduce((sum, weight, index) => sum + weight * index, 0) / 100);
for (let i = 1; i < expectedQuality.length; i++) assert(expectedQuality[i] < expectedQuality[i - 1]);
assert.equal(roll(NaN).length, 0);
assert.equal(roll(0.3, () => 0).length, 1);
assert.equal(roll(0.05, () => 1).length, 1);
const immutable = roll(0.05, () => 0); immutable[0].TaskAwardCount = 99;
assert.equal(roll(0.05, () => 0)[0].TaskAwardCount, 1);
console.log('PASS: fishing mechanics, width boundaries, exact red probabilities, white-to-gold loot, narrower-width quality bias, reward copies');
