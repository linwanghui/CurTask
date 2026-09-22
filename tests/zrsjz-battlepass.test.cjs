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
let saves = 0, gold = 0;
const props = [];
const data = { BattlePass: configModule.CreateBattlePassState() };
const service = load('Service/ZRSJZ_BattlePassService.ts', {
    '../ZRSJZ_BattlePassConfig': configModule,
    '../ZRSJZ_GameData': { ZRSJZ_GameData: { Instance: data, SaveData() { saves++; } } },
    './ZRSJZ_AccountService': { ZRSJZ_AccountService: { ChangeGold(n) { gold += n; } } },
    './ZRSJZ_InventoryService': { ZRSJZ_InventoryService: { AddPropsToWarehouseByName(name, count) { props.push({ name, count }); } } },
    '../ZRSJZ_Constant': { ZRSJZ_PROP_CONFIG: new Map(config.rewards.filter(r => r.type === 'prop').map(r => [r.name, {}])) },
}).ZRSJZ_BattlePassService;

assert.equal(config.rewards.length, 50);
assert.deepEqual(Array.from(config.rewards.filter(r => r.special), r => r.level), [10, 20, 30, 40, 50]);
service.EnsurePeriods();
assert.equal(data.BattlePass.daily.key, '2026-09-20');
assert.equal(data.BattlePass.weekly.key, '2026-09-14');
assert.equal(service.GetLevel(), 0);
assert.equal(service.ClaimReward(1), false);
assert.equal(service.ClaimTask('daily', 'd_login'), true);
assert.equal(service.ClaimTask('daily', 'd_login'), false);
assert.equal(data.BattlePass.exp, 20);
service.Record('kill', 15);
assert.equal(data.BattlePass.daily.progress.d_kill, 15);
assert.equal(data.BattlePass.weekly.progress.w_kill, 15);
service.Record('kill', -1);
service.Record('kill', NaN);
assert.equal(data.BattlePass.weekly.progress.w_kill, 15);
assert.equal(service.ClaimTask('daily', 'd_kill'), true);
service.Record('extract');
assert.equal(service.ClaimTask('daily', 'd_extract'), true);
assert.equal(service.GetLevel(), 1);
assert.equal(service.ClaimReward(1), true);
assert.equal(service.ClaimReward(1), false);
assert.equal(gold, 5000);

// Both periods reset at Monday midnight; lifetime XP and rewards persist.
now = Date.parse('2026-09-20T16:00:00Z');
service.EnsurePeriods();
assert.equal(data.BattlePass.daily.key, '2026-09-21');
assert.equal(data.BattlePass.weekly.key, '2026-09-21');
assert.equal(data.BattlePass.weekly.progress.w_kill, undefined);
assert.equal(data.BattlePass.exp, 100);
assert.equal(service.GetRewardState(1), 'claimed');
service.Record('kill', 10);
now = Date.parse('2026-09-21T16:00:00Z');
service.EnsurePeriods();
assert.equal(data.BattlePass.daily.progress.d_kill, undefined);
assert.equal(data.BattlePass.weekly.progress.w_kill, 10);
service.ClaimTask('daily', 'd_login');
const expBeforeRollback = data.BattlePass.exp;
now -= 86400000;
service.EnsurePeriods();
assert.equal(service.ClaimTask('daily', 'd_login'), false);
assert.equal(data.BattlePass.exp, expBeforeRollback);

// Reopening a persisted save cannot grant a reward twice.
data.BattlePass = JSON.parse(JSON.stringify(data.BattlePass));
assert.equal(service.GetRewardState(1), 'claimed');
data.BattlePass.exp = 1000;
assert.equal(service.ClaimReward(10), true);
assert.equal(service.ClaimReward(10), false);
assert.equal(props.filter(p => p.name === '显卡').length, 1);
data.BattlePass.exp = 4990;
service.Record('special', 3);
assert.equal(service.ClaimTask('weekly', 'w_special'), true);
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
        };nodes.set(i,node);for(const c of parts.values())c.node=node;
    });return nodes.get(1);
}
function find(route,root){for(const name of route.split('/')){root=root?.getChildByName(name);assert(root,'Missing UI node: '+route);}return root;}
class Panel { Show(){} schedule(){} unschedule(){} }
const tips=[],navigation=[],videos=[];
const main='../../../73_ZRSJZ/Scripts/';
const imports={
    cc:{_decorator:{ccclass:()=>c=>c},Label,Sprite,UITransform,ScrollView,Color,find,Node:{EventType:{TOUCH_END:'touch'}}},
    'db://assets/Scripts/Banner':{default:{Instance:{ShowVideoAd(callback){videos.push(callback);}}}},
    [main+'Panel/ZRSJZ_Panel']:{ZRSJZ_Panel:Panel},
    [main+'ZRSJZ_BattlePassConfig']:configModule,
    [main+'Service/ZRSJZ_BattlePassService']:{ZRSJZ_BattlePassService:service},
    [main+'UI/ZRSJZ_BattlePassProgress']:progressModule,
    [main+'ZRSJZ_GameData']:{ZRSJZ_GameData:{Instance:data}},
    [main+'Manager/ZRSJZ_AudioManager']:{ZRSJZ_AudioManager:{Instance:{PlaySound(){}}}},
    [main+'Manager/ZRSJZ_UIManager']:{ZRSJZ_UIManager:{Instance:{ShowTip:t=>tips.push(t),HidePanel:p=>navigation.push(['hide',p]),ShowPanel:(...args)=>navigation.push(['show',...args])}}},
    [main+'ZRSJZ_Constant']:{ZRSJZ_PANEL:{战令界面:'BattlePass'}},
};
const PanelClass=load('../../73_ZRSJZ_DLC/Scripts/Panel/ZRSJZ_BattlePassPanel.ts',imports).ZRSJZ_BattlePassPanel;
data.BattlePass=configModule.CreateBattlePassState();
const panel=new PanelClass();panel.node=prefabNodes('战令界面');panel.isValid=true;panel.onLoad();panel.Show();
const get=route=>find('Panel/'+route,panel.node);
for(let level=1;level<=50;level++)for(const track of ['normal','advanced'])assert(get(`奖励列表/View/Content/等级${level}/${track}`).events.touch);
assert.equal(get('特殊奖励/等级').getComponent(Label).string,'Lv.10 阶段大奖');
const scroll=get('奖励列表').getComponent(ScrollView);const pitch=get('奖励列表/View/Content/等级1').getComponent(UITransform).width;
for(const [column,expected]of [[0,10],[9,10],[10,20],[19,20],[20,30],[30,40],[45,50]]){scroll.offset=-column*pitch;get('奖励列表').events.scroll();assert.equal(get('特殊奖励/等级').getComponent(Label).string,`Lv.${expected} 阶段大奖`);}
get('购买等级').events.touch();assert.equal(data.BattlePass.exp,0);assert.equal(videos.length,1);
videos[0]();videos[0]();assert.equal(data.BattlePass.exp,100);
assert.equal(get('等级').getComponent(Label).string,'Lv.0');panel.update(.1);assert(get('经验底/经验条').getComponent(Sprite).fillRange>0);assert(get('经验底/经验条').getComponent(Sprite).fillRange<1);
for(let i=0;i<90;i++)panel.update(1/60);assert.equal(get('等级').getComponent(Label).string,'Lv.1');

get('任务').events.touch();
assert.equal(navigation.length, 0, 'Switching tabs must not open or hide a panel');
assert.equal(get('任务内容').active, true);
assert.equal(get('奖励列表').active, false);
assert.equal(get('特殊奖励').active, false);
assert.equal(get('购买等级').active, false);
get('任务内容/daily/View/Content/d_login/领取').events.touch();assert.equal(data.BattlePass.exp,120);
get('任务内容/daily/View/Content/d_login/领取').events.touch();assert.equal(data.BattlePass.exp,120);
panel.update(.1);
const displayed = get('经验底/经验条').getComponent(Sprite).fillRange;
assert(displayed > 0 && displayed < .2);
get('任务内容/页签/weekly').events.touch();
assert.equal(get('任务内容/weekly').active,true);assert.equal(get('任务内容/daily').active,false);
service.Record('special',3);
get('一键领取').events.touch();assert.equal(data.BattlePass.exp,270);
get('一键领取').events.touch();assert.equal(data.BattlePass.exp,270);
get('奖励页').events.touch();
assert.equal(navigation.length,0);
assert.equal(get('任务内容').active,false);assert.equal(get('奖励列表').active,true);assert.equal(get('特殊奖励').active,true);
assert.equal(scroll.offset,-45*pitch);
assert.equal(get('特殊奖励/等级').getComponent(Label).string,'Lv.50 阶段大奖');
assert.equal(get('经验底/经验条').getComponent(Sprite).fillRange, displayed, 'Tab switch preserves animation');
get('一键领取').events.touch();assert.equal(data.BattlePass.claimed.length,2);assert.equal(data.BattlePass.exp,270);
get('任务').events.touch();assert.equal(get('任务内容/weekly').active,true);
get('关闭').events.touch();assert.deepEqual(navigation,[['hide','BattlePass']]);
console.log('PASS: 100 reward nodes, inline reward/task tabs without panel navigation, task categories, context-sensitive claim all, XP animation and preserved scroll.');
