// Run: node tests/zrsjz-battlepass.test.cjs
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const ts = require(process.env.COCOS_TYPESCRIPT || 'D:/cocos/Creator/3.8.6/resources/resources/3d/engine/node_modules/typescript');
const scripts = path.resolve(__dirname, '../assets/Game_Bundles/73_ZRSJZ/Scripts');
let now = Date.parse('2026-09-20T15:59:59Z'); // Sunday 23:59:59 Beijing.
class Clock extends Date { static now() { return now; } }
function load(file, imports) {
    const js = ts.transpileModule(fs.readFileSync(path.join(scripts, file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const exports = {};
    vm.runInNewContext(js, { exports, Date: Clock, require: name => {
        if (!(name in imports)) throw new Error('Unexpected import ' + name);
        return imports[name];
    } });
    return exports;
}
const configModule = load('ZRSJZ_BattlePassConfig.ts', {});
const config = configModule.ZRSJZ_BATTLE_PASS_CONFIG;
const constants = load('ZRSJZ_Constant.ts', {});
const constantSource = fs.readFileSync(path.join(scripts, 'ZRSJZ_Constant.ts'), 'utf8');
let saves = 0, gold = 0;
const props = [];
const deliveryBatches = [];
const rewardReceiver = { ReceivePropAwards(awards) {
    deliveryBatches.push(awards);
    props.push(...awards.map(a => ({ name: a.PropName, count: a.Count })));
    return Promise.resolve({});
} };
const skins = [];
const data = { BattlePass: configModule.CreateBattlePassState(), HeroFragments: 0, PetFragments: 0, HaveWeaponSkin: [], HaveSkin: [], HaveRole: [], Gold: 10000000 };
const account = load('Service/ZRSJZ_AccountService.ts', {
    '../ZRSJZ_Constant': constants,
    '../ZRSJZ_GameData': { ZRSJZ_GameData: { Instance: data, SaveData() { saves++; } } },
    './ZRSJZ_FragmentService': { ZRSJZ_FragmentService: { GetCount: () => data.HeroFragments } },
    '../Manager/ZRSJZ_EventManager': { ZRSJZ_EventManager: { EmitPersist() {}, Emit() {} }, ZRSJZ_MyEvent: {} },
    '../UI/ZRSJZ_PlayerSwitchButton': { ZRSJZ_PlayerSwitchButton: { CurPlayer: '1p' } },
    './ZRSJZ_InventoryService': { ZRSJZ_InventoryService: {} },
}).ZRSJZ_AccountService;
data.HeroFragments = 1000;
assert.equal(account.UnlockSkinWithFragments('灼戈', '黯祁'), '该皮肤只能通过战令获得');
data.HaveRole.push('灼戈');
assert.equal(account.UnlockSkinWithFragments('灼戈', '黯祁'), '该皮肤只能通过战令获得');
assert.equal(data.HeroFragments, 1000);
assert.equal(data.Gold, 10000000);
assert.equal(data.HaveSkin.includes('黯祁'), false);
data.HeroFragments = 0;
const service = load('Service/ZRSJZ_BattlePassService.ts', {
    '../ZRSJZ_BattlePassConfig': configModule,
    '../ZRSJZ_GameData': { ZRSJZ_GameData: { Instance: data, SaveData() { saves++; } } },
    './ZRSJZ_AccountService': { ZRSJZ_AccountService: { AddSkin: account.AddSkin.bind(account), ChangeGold(n) { gold += n; }, AddWeaponSkin(weaponName, skinName) { skins.push({ weaponName, skinName }); data.HaveWeaponSkin.push(skinName); return true; } } },
    '../Manager/ZRSJZ_UIManager': { ZRSJZ_UIManager: { Instance: rewardReceiver } },
    './ZRSJZ_MailService': { ZRSJZ_MailService: { AddMail(type, awards) { props.push(...awards.map(a => ({ name: a.PropName, count: a.Count, mail: true }))); return 'mail'; } } },
    './ZRSJZ_FragmentService': { ZRSJZ_FragmentService: { IsFragment: name => name === '英雄碎片' || name === '宠物碎片', Credit(name, count) { data[name === '英雄碎片' ? 'HeroFragments' : 'PetFragments'] += count; return true; } } },
    '../ZRSJZ_Constant': {
        ZRSJZ_PROP_CONFIG: new Map([...config.rewards, ...config.advancedRewards].filter(r => r.type === 'prop').map(r => [r.name, {}])),
        ZRSJZ_WEAPON_SKIN: constants.ZRSJZ_WEAPON_SKIN,
        ZRSJZ_ROLE_CONFIG: constants.ZRSJZ_ROLE_CONFIG,
        ZRSJZ_SKIN_CONFIG: constants.ZRSJZ_SKIN_CONFIG,
        ZRSJZ_MAIL_TYPE: { 仓库已满: '仓库已满' },
    },
}).ZRSJZ_BattlePassService;

assert.equal(config.rewards.length, 50);
assert.equal(config.advancedRewards.length, 50);
assert.equal(config.daily.length, 10);
assert.equal(config.weekly.length, 10);
const unitPrices = new Map(
    [...constantSource.matchAll(/\["([^"]+)",\s*\{[^\r\n]*UnitPrice:\s*(\d+)/g)]
        .map(match => [match[1], Number(match[2])]),
);
const rewardValue = reward => reward.type === 'gold' ? reward.count : unitPrices.get(reward.name) * reward.count;
for (const [trackName, track] of [['normal', config.rewards], ['advanced', config.advancedRewards]]) {
    const regularRewards = track.filter(reward => !reward.special);
    for (let index = 1; index < regularRewards.length; index++) {
        const previous = regularRewards[index - 1];
        const current = regularRewards[index];
        assert(Number.isFinite(rewardValue(previous)), `missing price for ${previous.name}`);
        assert(Number.isFinite(rewardValue(current)), `missing price for ${current.name}`);
        assert(rewardValue(current) >= rewardValue(previous), `${trackName} reward value decreases at Lv.${current.level}: ${current.name}`);
    }
}
for (const track of [config.rewards, config.advancedRewards]) {
    assert.deepEqual(Array.from(track, reward => reward.level), Array.from({length:50}, (_, index) => index + 1));
    assert.equal(new Set(track.map(reward => `${reward.level}:${reward.name}`)).size, 50);
}
assert.deepEqual(Array.from(config.rewards.filter(r => r.special), r => r.level), [10, 20, 30, 40, 50]);
for (const track of [config.rewards, config.advancedRewards]) {
    assert(track.filter(r => r.type === 'fragment' || r.type === 'weaponSkin').every(r => r.level % 10 === 0), 'Fragments and skins only appear at milestone levels');
    assert(track.every(r => r.special === (r.level % 10 === 0)), 'Every ten levels is the only special-reward slot');
}
service.EnsurePeriods();
assert.equal(data.BattlePass.daily.key, '2026-09-20');
assert.equal(data.BattlePass.weekly.key, '2026-09-14');
assert.equal(data.BattlePass.daily.taskIds.length, 5);
assert.equal(data.BattlePass.weekly.taskIds.length, 5);
assert.equal(new Set(data.BattlePass.daily.taskIds).size, 5);
assert.equal(new Set(data.BattlePass.weekly.taskIds).size, 5);
assert.equal(service.GetTasks('daily').reduce((sum, task) => sum + task.exp, 0), 200);
assert.equal(service.GetTasks('weekly').reduce((sum, task) => sum + task.exp, 0), 1100);
assert.equal(14 * 200 + 2 * 1100, config.maxLevel * config.expPerLevel, 'Two complete weeks must reach max level');
const firstDaily = [...data.BattlePass.daily.taskIds];
service.EnsurePeriods();
assert.equal(Array.from(data.BattlePass.daily.taskIds).join(','), firstDaily.join(','), 'Selection is stable inside one period');
assert.equal(service.GetLevel(), 0);
assert.equal(service.ClaimReward(1), false);
for (const metric of ['login','battle','extract','kill','search','heal','special']) service.Record(metric, 1000);
for (const task of service.GetTasks('daily')) assert.equal(service.ClaimTask('daily', task.id), true);
assert.equal(data.BattlePass.exp, 200);
assert.equal(service.GetLevel(), 2);
assert.equal(service.HasClaimable(), true, 'A reachable unclaimed level reward enables the home reminder');
assert.equal(service.ClaimReward(1), true);
assert.equal(service.ClaimReward(1), false);
assert.equal(gold, 10000);

// Both periods reset at Monday midnight; lifetime XP and rewards persist.
now = Date.parse('2026-09-20T16:00:00Z');
service.EnsurePeriods();
assert.equal(data.BattlePass.daily.key, '2026-09-21');
assert.equal(data.BattlePass.weekly.key, '2026-09-21');
assert.equal(data.BattlePass.exp, 200);
assert.equal(service.GetRewardState(1), 'claimed');
const mondayDaily = [...data.BattlePass.daily.taskIds];
assert.notEqual(mondayDaily.join(','), firstDaily.join(','), 'A new day rerolls the five tasks');
service.Record('kill', 10);
now = Date.parse('2026-09-21T16:00:00Z');
service.EnsurePeriods();
assert.notEqual(Array.from(data.BattlePass.daily.taskIds).join(','), mondayDaily.join(','));
const expBeforeRollback = data.BattlePass.exp;
now -= 86400000;
service.EnsurePeriods();
assert.equal(data.BattlePass.exp, expBeforeRollback);

// Reopening a persisted save cannot grant a reward twice.
data.BattlePass = JSON.parse(JSON.stringify(data.BattlePass));
assert.equal(service.GetRewardState(1), 'claimed');
data.BattlePass.exp = 1000;
assert.equal(service.ClaimReward(10), true);
assert.equal(service.ClaimReward(10), false);
assert.equal(skins.filter(s => s.skinName === config.rewards[9].name).length, 1, 'Basic level 10 skin grants once');
data.BattlePass.exp = 4990;
const weeklyTask = service.GetTasks('weekly')[0];
service.Record(weeklyTask.metric, weeklyTask.target);
assert.equal(service.ClaimTask('weekly', weeklyTask.id), true);
assert.equal(data.BattlePass.exp, 5000);
assert.equal(service.GetLevel(), 50);
service.ClaimAll();
assert.equal(service.ClaimAll(), 0);
assert.equal(data.BattlePass.claimed.length, 50);
assert(saves > 0);
console.log('PASS: task progress, exact period boundaries, rollback, XP cap, claim idempotence, persistence and all 50 rewards.');

const defaults = load('Service/ZRSJZ_GameDataDefaults.ts', {
    '../ZRSJZ_Constant': { ZRSJZ_PROP_CONFIG: new Map(), ZRSJZ_ACHIEVEMENT_CONFIG: [] },
    '../ZRSJZ_GameData': { ZRSJZ_GameData: { Versions: 23 } },
    '../ZRSJZ_TaskLines': { ZRSJZ_SIDE_TASK_LINES: [] },
    '../ZRSJZ_EnhancementConfig': { MigrateLegacyEnhancement() {} },
    './ZRSJZ_MidAutumnService': { CreateMidAutumnState() { return {}; } },
    '../ZRSJZ_BattlePassConfig': configModule,
}).ZRSJZ_GameDataDefaults;
const legacy = { Versions: 21, Gold: 12345, OwnedTitles: ['勇者'], EquippedTitle: '勇者', OwnedAvatarFrames: ['1'], CurrentAvatarFrame: '1', PropData: {} };
assert.equal(defaults.Migrate(legacy, { ...legacy }), true);
assert.equal(legacy.Versions, 23);
assert.equal(legacy.Gold, 12345);
assert.equal(legacy.BattlePass.exp, 0);
legacy.BattlePass.exp = 250;
defaults.Migrate(legacy, { ...legacy });
assert.equal(legacy.BattlePass.exp, 250);
console.log('PASS: v21 → v23 migration preserves currency and does not reset an existing battle pass.');

// Rewarded video grants nothing until the success callback, then grants only once.
props.length = 0;
skins.length = 0;
data.BattlePass = configModule.CreateBattlePassState();
data.BattlePass.exp = 150;
const unlock = service.CreateVideoReward('advanced');
assert.equal(data.BattlePass.advancedUnlocked, false);
assert.equal(service.ClaimReward(1, 'advanced'), false);
assert.equal(unlock(), true);
assert.equal(unlock(), false);
assert.equal(service.ClaimReward(1, 'advanced'), true);
assert.equal(service.ClaimReward(1, 'advanced'), false);
assert.equal(service.GetRewardState(1), 'claimable');
assert.equal(service.CreateVideoReward('advanced'), null);
const levelVideo = service.CreateVideoReward('level');
assert.equal(data.BattlePass.exp, 150);
assert.equal(levelVideo(), true);
assert.equal(data.BattlePass.exp, 250);
assert.equal(levelVideo(), false);
data.BattlePass.exp = 4950;
assert.equal(service.CreateVideoReward('level')(), true);
assert.equal(data.BattlePass.exp, 5000);
assert.equal(service.CreateVideoReward('level'), null);
service.ClaimAll();
assert.equal(data.BattlePass.claimed.length, 50);
assert.equal(data.BattlePass.advancedClaimed.length, 50);
assert(data.HeroFragments > 0 && data.PetFragments > 0, 'Fragment rewards use account balances');
assert.equal(skins.length, 4, 'Basic weapon skins are granted through the account service');
assert.equal(props.filter(p => p.name === '焚天龙').reduce((n,p) => n + p.count, 0), 1);
assert.equal(data.HaveSkin.filter(s => s === '黯祁').length, 1, 'Advanced final reward grants the actual hero skin once');
assert.equal(service.ClaimReward(50, 'advanced'), false);
assert(config.rewards.every(r => r.type !== 'fragment' && r.type !== 'heroSkin'));
assert(config.rewards.filter(r => r.type === 'weaponSkin').every(r => constants.ZRSJZ_WEAPON_SKIN.get(r.weaponName).find(s => s.Name === r.name).UnlockType === '金币'));
assert.equal(service.ClaimAll(), 0);
data.BattlePass = JSON.parse(JSON.stringify(data.BattlePass));
assert.equal(service.GetRewardState(50, 'advanced'), 'claimed');
console.log('PASS: successful video only, one-use callbacks, two independent tracks, max level and 100 claim records.');

const progressModule = load('UI/ZRSJZ_BattlePassProgress.ts', { '../ZRSJZ_BattlePassConfig': configModule });
const Progress = progressModule.ZRSJZ_BattlePassProgress;
const progress = new Progress();
progress.SetTarget(20);
assert.equal(progress.Advance(0).exp, 20);
progress.SetTarget(250);
let first = progress.Advance(1 / 60);
assert(first.exp > 20 && first.exp < 100);
let boundaries = new Set();
for (let i = 0; i < 240; i++) {
    progress.SetTarget(250); // Polling the save must not restart the animation.
    const p = progress.Advance(1 / 60);
    if (p.fill === 1) boundaries.add(p.level);
    assert(p.fill >= 0 && p.fill <= 1);
}
assert(boundaries.has(0) && boundaries.has(1));
assert.equal(progress.Advance(0).level, 2);
assert.equal(progress.Advance(0).exp, 50);
progress.SetTarget(270);progress.Advance(.1);progress.SetTarget(310);
for (let i=0;i<200;i++)progress.Advance(1/60);
assert.equal(progress.Advance(0).level,3);
assert.equal(progress.Advance(0).exp,10);
const maxProgress = new Progress();maxProgress.SetTarget(4990);maxProgress.SetTarget(5000);
for(let i=0;i<100;i++)maxProgress.Advance(1/60);
assert.equal(maxProgress.Advance(0).level,50);assert.equal(maxProgress.Advance(0).fill,1);
console.log('PASS: gradual XP, full-bar holds at every level, rapid target changes, repeated refresh and max-level animation.');

class Label {} class Sprite {} class UITransform {}
class Button { static EventType = { CLICK: 'touch' }; static Transition = { SCALE: 3 }; }
class ScrollView { static EventType = { SCROLLING:'scroll', SCROLL_ENDED:'end' }; }
class Color { constructor(...rgba) { this.rgba=rgba; } } Color.WHITE=new Color(255,255,255);
function prefabNodes(name){
    const entries=JSON.parse(fs.readFileSync(path.resolve(scripts,'../../73_ZRSJZ_DLC/Prefabs/Panel/'+name+'.prefab'),'utf8'));
    const nodes=new Map();
    entries.forEach((entry,i)=>{
        if(entry.__type__!=='cc.Node')return;
        const parts=new Map(entry._components.map(r=>{
            const c=entries[r.__id__];return [c.__type__.replace('cc.',''),{string:c._string,spriteFrame:c._spriteFrame,width:c._contentSize?.width,offset:0,scrollToTop(){},scrollToLeft(){this.offset=0;},getScrollOffset(){return{x:this.offset};}}];
        }));
        const node={name:entry._name,active:entry._active,activeInHierarchy:true,events:{},parts,
            getComponent(type){return parts.get(type.name);},getChildByName(name){return entry._children.map(r=>nodes.get(r.__id__)).find(n=>n.name===name);},
            on(event,fn,target){this.events[event]=fn.bind(target);},
            addComponent(type){const c=new type();c.node=this;parts.set(type.name,c);return c;},
        };nodes.set(i,node);for(const c of parts.values())c.node=node;
    });return nodes.get(1);
}
function find(route,root){for(const name of route.split('/')){root=root?.getChildByName(name);assert(root,'Missing UI node: '+route);}return root;}
class Panel { Show(){} schedule(){} unschedule(){} }
const tips=[],navigation=[],videos=[],awardPopups=[];
const main='../../../73_ZRSJZ/Scripts/';
const imports={
    cc:{_decorator:{ccclass:()=>c=>c},Button,Label,Sprite,UITransform,ScrollView,Color,find,Node:{EventType:{TOUCH_END:'touch'}}},
    'db://assets/Scripts/Banner':{default:{Instance:{ShowVideoAd(callback){videos.push(callback);}}}},
    [main+'Panel/ZRSJZ_Panel']:{ZRSJZ_Panel:Panel},
    [main+'ZRSJZ_BattlePassConfig']:configModule,
    [main+'ZRSJZ_NumberFormat']:load('ZRSJZ_NumberFormat.ts', {}),
    [main+'Service/ZRSJZ_BattlePassService']:{ZRSJZ_BattlePassService:service},
    [main+'UI/ZRSJZ_BattlePassProgress']:progressModule,
    [main+'ZRSJZ_GameData']:{ZRSJZ_GameData:{Instance:data}},
    [main+'Manager/ZRSJZ_AudioManager']:{ZRSJZ_AudioManager:{Instance:{PlaySound(){}}}},
    [main+'Manager/ZRSJZ_UIManager']:{ZRSJZ_UIManager:{Instance:{ShowTip:t=>tips.push(t),HidePanel:p=>navigation.push(['hide',p]),ShowPanel:(...args)=>args[0]==='Awards'?awardPopups.push(args[1]):navigation.push(['show',...args]),GetPropUI:async name=>name,GetPropGridUI:async name=>name}}},
    [main+'ZRSJZ_Constant']:{ZRSJZ_SKIN_CONFIG:constants.ZRSJZ_SKIN_CONFIG,ZRSJZ_PANEL:{获取奖励弹窗:'Awards',战令界面:'BattlePass',签到弹窗:'SignIn',选关界面:'MapSelect'},ZRSJZ_PROP_CONFIG:new Map([...config.rewards,...config.advancedRewards].filter(r=>r.type==='prop').map(r=>[r.name,{Quality:'品质'}]))},
};
const PanelClass=load('../../73_ZRSJZ_DLC/Scripts/Panel/ZRSJZ_BattlePassPanel.ts',imports).ZRSJZ_BattlePassPanel;
data.BattlePass=configModule.CreateBattlePassState();
const panel=new PanelClass();panel.node=prefabNodes('战令界面');panel.isValid=true;panel.onLoad();panel.Show();
const get=route=>find('Panel/'+route,panel.node);
assert.equal(get('战令奖励/红点').active,service.HasClaimableRewards());
assert.equal(get('战令任务/红点').active,service.HasClaimableTasks());
assert.equal(get('任务内容/页签/daily/红点').active,service.HasClaimableTasks('daily'));
assert.equal(get('任务内容/页签/weekly/红点').active,service.HasClaimableTasks('weekly'));
for(let level=1;level<=50;level++)for(const track of ['normal','advanced'])assert(get(`奖励列表/View/Content/等级${level}/${track}`).events.touch);
assert.equal(get('奖励列表/View/Content/等级1/normal/Mask').active,true);
assert.equal(get('奖励列表/View/Content/等级1/advanced/Mask').active,true);
assert.equal(get('奖励列表/View/Content/等级1/advanced/锁').active,true);
get('奖励列表/View/Content/等级1/normal').events.touch();assert.equal(tips.at(-1),'等级不足');
get('奖励列表/View/Content/等级1/advanced').events.touch();assert.equal(tips.at(-1),'等级不足');
assert.equal(get('特殊奖励/等级底/等级').getComponent(Label).string,'Lv.10 阶段大奖');
const scroll=get('奖励列表').getComponent(ScrollView);const pitch=get('奖励列表/View/Content/等级1').getComponent(UITransform).width;
for(const [column,expected]of [[0,10],[9,10],[10,20],[19,20],[20,30],[30,40],[45,50]]){scroll.offset=-column*pitch;get('奖励列表').events.scroll();assert.equal(get('特殊奖励/等级底/等级').getComponent(Label).string,`Lv.${expected} 阶段大奖`);}
get('购买等级').events.touch();assert.equal(data.BattlePass.exp,0);assert.equal(videos.length,1);
videos[0]();videos[0]();assert.equal(data.BattlePass.exp,100);
assert.equal(get('奖励列表/View/Content/等级1/normal/Mask').active,false,'claimable normal reward hides Mask');
assert.equal(get('奖励列表/View/Content/等级1/advanced/Mask').active,true,'locked advanced pass keeps Mask');
get('奖励列表/View/Content/等级1/advanced').events.touch();assert.equal(tips.at(-1),'进阶战令未解锁');
now+=1001;get('进阶解锁').events.touch();assert.equal(videos.length,2);videos[1]();
assert.equal(get('进阶解锁').active,false);assert.equal(get('进阶模式/锁').active,false);
assert.equal(get('奖励列表/View/Content/等级1/advanced/锁').active,false);
assert.equal(get('奖励列表/View/Content/等级1/advanced/Mask').active,false);
get('奖励列表/View/Content/等级1/normal').events.touch();
assert.equal(awardPopups.length,1);
assert.equal(awardPopups[0].DisplayOnly,true);
assert.equal(awardPopups[0].Awards[0].TaskAwardName,'钞票');
assert.equal(awardPopups[0].Awards[0].TaskAwardCount,10000);
assert.equal(get('奖励列表/View/Content/等级1/normal/数量').getComponent(Label).string,'×1万');
assert.equal(get('奖励列表/View/Content/等级1/normal/Mask').active,true);
get('奖励列表/View/Content/等级1/normal').events.touch();assert.equal(tips.at(-1),'奖励已领取');
assert.equal(get('等级').getComponent(Label).string,'Lv.0');panel.update(.1);assert(get('经验底/经验条').getComponent(Sprite).fillRange>0);assert(get('经验底/经验条').getComponent(Sprite).fillRange<1);
for(let i=0;i<90;i++)panel.update(1/60);assert.equal(get('等级').getComponent(Label).string,'Lv.1');

get('战令任务').events.touch();
assert.equal(navigation.length, 0, 'Switching tabs must not open or hide a panel');
assert.equal(get('任务内容').active, true);
assert.equal(get('奖励列表').active, false);
assert.equal(get('特殊奖励').active, false);
assert.equal(get('购买等级').active, false);
const firstDisplayedTask=service.GetTasks('daily')[0];
get('任务内容/daily/View/Content/d_login/前往').events.touch();
assert.deepEqual(navigation,[['hide','BattlePass'],['show',firstDisplayedTask.metric==='login'?'SignIn':'MapSelect']]);
navigation.length=0;
const shownDaily=service.GetTasks('daily')[0];service.Record(shownDaily.metric,shownDaily.target);
get('任务内容/daily/View/Content/d_login/领取').events.touch();assert.equal(data.BattlePass.exp,140);
assert.notEqual(get('任务内容/daily/View/Content/d_login/名称').getComponent(Label).string,shownDaily.name,'claimed task leaves its old row');
assert.equal(get('任务内容/daily/View/Content/d_extract/名称').getComponent(Label).string,shownDaily.name,'claimed task moves to the bottom');
assert.equal(get('任务内容/daily/View/Content/d_extract/领取').active,false);
assert.equal(get('任务内容/daily/View/Content/d_extract/前往').active,false);
assert.equal(get('任务内容/daily/View/Content/d_extract/类型图标').getComponent(Sprite).spriteFrame,get('资源/任务_'+shownDaily.metric).getComponent(Sprite).spriteFrame,'type icon follows the reordered task');
get('任务内容/daily/View/Content/d_login/领取').events.touch();assert.equal(data.BattlePass.exp,140);
panel.update(.1);
const displayed = get('经验底/经验条').getComponent(Sprite).fillRange;
assert(displayed > 0 && displayed < .4);
get('任务内容/页签/weekly').events.touch();
assert.equal(get('任务内容/weekly').active,true);assert.equal(get('任务内容/daily').active,false);
const shownWeekly=service.GetTasks('weekly')[0];service.Record(shownWeekly.metric,shownWeekly.target);
get('一键领取').events.touch();assert.equal(data.BattlePass.exp,360);
get('一键领取').events.touch();assert.equal(data.BattlePass.exp,360);
get('战令奖励').events.touch();
assert.equal(navigation.length,0);
assert.equal(get('任务内容').active,false);assert.equal(get('奖励列表').active,true);assert.equal(get('特殊奖励').active,true);
assert.equal(scroll.offset,-45*pitch);
assert.equal(get('特殊奖励/等级底/等级').getComponent(Label).string,'Lv.50 阶段大奖');
assert.equal(get('经验底/经验条').getComponent(Sprite).fillRange, displayed, 'Tab switch preserves animation');
const batchesBeforePopup=deliveryBatches.length;
get('一键领取').events.touch();assert.equal(data.BattlePass.claimed.length,3);assert.equal(data.BattlePass.exp,360);
assert.equal(deliveryBatches.length,batchesBeforePopup+1,'One popup submits one combined delivery batch across both tracks');
assert.equal(awardPopups.length,2,'One merged popup for claim all');
assert.equal(awardPopups[1].DisplayOnly,true);
const popupCount=awardPopups.length;get('一键领取').events.touch();assert.equal(awardPopups.length,popupCount,'No popup or grants for repeated claim all');
get('战令任务').events.touch();assert.equal(get('任务内容/weekly').active,true);
get('关闭').events.touch();assert.deepEqual(navigation,[['hide','BattlePass']]);
console.log('PASS: 100 reward nodes, inline reward/task tabs without panel navigation, task categories, context-sensitive claim all, XP animation and preserved scroll.');

// Run the actual inventory overflow algorithm with two free slots, then a full warehouse.
(async () => {
    const file = path.join(scripts, 'Manager/ZRSJZ_UIManager.ts');
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const method = source.statements.find(ts.isClassDeclaration).members.find(m => m.name?.getText(source) === 'DoReceivePropAwards');
    const js = ts.transpileModule('class Receiver {' + method.getText(source) + '}', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    const mails = [];
    let nextId = 0, capacity = 2, pending, requests = 0;
    data.PropData = {};
    const globals = {
        ...constants,
        ZRSJZ_GameData: { Instance: data, SaveData() {} },
        ZRSJZ_FragmentService: { IsFragment: () => false },
        ZRSJZ_InventoryService: { AddPropByName(name, count) { const id=String(++nextId);data.PropData[id]={Name:name,CurCount:count,PropType:'物品'};return id; } },
        ZRSJZ_Tools: { GetInventoryByPropType: () => constants.ZRSJZ_INVENTORY.仓库_全部 },
        ZRSJZ_MailService: { AddMail(type, awards) { mails.push(awards);return String(mails.length); } },
        ZRSJZ_EventManager: { EmitPersist() {} }, ZRSJZ_MyEvent: {},
    };
    const Receiver = new Function(...Object.keys(globals), js + ';return Receiver;')(...Object.values(globals));
    const receiver = new Receiver();receiver.TryPlaceAwardProp = async id => Number(id) <= capacity;
    rewardReceiver.ReceivePropAwards = awards => { requests++;return pending=receiver.DoReceivePropAwards(awards, constants.ZRSJZ_MAIL_TYPE.仓库已满); };
    for (const freeSlots of [2, 0]) {
        capacity=freeSlots;nextId=0;data.PropData={};mails.length=0;requests=0;
        data.BattlePass=configModule.CreateBattlePassState();data.BattlePass.exp=300;data.BattlePass.advancedUnlocked=true;
        const rewards=service.ClaimAllRewards();await pending;
        const expected=new Map();for(const r of rewards.filter(r=>r.type==='prop'))expected.set(r.name,(expected.get(r.name)||0)+r.count);
        for(const prop of Object.values(data.PropData))expected.set(prop.Name,expected.get(prop.Name)-prop.CurCount);
        assert.equal(requests,1);assert.equal(mails.length,1,'All overflow is a single mail');
        assert.deepEqual(new Map(mails[0].map(a=>[a.PropName,a.Count])),new Map([...expected].filter(([,n])=>n>0)));
        assert.equal(service.ClaimAll(),0);assert.equal(requests,1);assert.equal(mails.length,1);
    }
    console.log('PASS: actual inventory overflow combines both tracks into one mail, exact partial/full warehouse quantities, no mail on repeated claim.');
})().catch(error => { console.error(error);process.exitCode=1; });
