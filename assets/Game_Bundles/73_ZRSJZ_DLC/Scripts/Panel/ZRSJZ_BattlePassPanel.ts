import { _decorator, Color, find, Label, Node, ScrollView, Sprite, SpriteFrame, UITransform } from 'cc';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_BATTLE_PASS_CONFIG as Config, ZRSJZ_BattlePassTrack, ZRSJZ_BattlePassPeriod } from '../../../73_ZRSJZ/Scripts/ZRSJZ_BattlePassConfig';
import { ZRSJZ_BattlePassService as Service } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_BattlePassService';
import { ZRSJZ_BattlePassProgress } from '../../../73_ZRSJZ/Scripts/UI/ZRSJZ_BattlePassProgress';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
const { ccclass } = _decorator;
@ccclass('ZRSJZ_BattlePassPanel')
export class ZRSJZ_BattlePassPanel extends ZRSJZ_Panel {
    private progress = new ZRSJZ_BattlePassProgress();
    private refreshKey = '';
    private page: 'rewards' | 'tasks' = 'rewards';
    private period: ZRSJZ_BattlePassPeriod = 'daily';
    private selectedTab: SpriteFrame;
    private unselectedTab: SpriteFrame;
    private readonly rewardNodes = ['奖励底', '普通模式', '普通标记', '普通名称', '进阶模式', '进阶标记', '进阶名称', '进阶解锁', '奖励列表', '特殊奖励', '说明', '购买等级'];
    private milestone = 10;
    private columnWidth = 140;
    private lastVideoClick = -Infinity;
    private scroll: ScrollView;
    protected onLoad(): void {
        this.scroll = this.Get('奖励列表').getComponent(ScrollView);
        this.columnWidth = this.Get('奖励列表/View/Content/等级1').getComponent(UITransform).width;
        this.Bind('关闭', () => ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.战令界面));
        this.selectedTab = this.Get('奖励页').getComponent(Sprite).spriteFrame;
        this.unselectedTab = this.Get('任务').getComponent(Sprite).spriteFrame;
        this.Bind('奖励页', () => this.SwitchPage('rewards'));
        this.Bind('任务', () => this.SwitchPage('tasks'));
        for (const period of ['daily', 'weekly'] as const) {
            this.Bind('任务内容/页签/' + period, () => {
                this.period = period;
                this.Refresh(true);
            });
            for (const task of Config[period]) this.Bind(`任务内容/${period}/View/Content/${task.id}/领取`, () => {
                const state = Service.GetTaskState(period, task.id);
                const ok = Service.ClaimTask(period, task.id);
                this.Tip(ok ? `战令经验 +${task.exp}` : state === 'claimed' ? '奖励已领取' : '任务尚未完成');
                this.Refresh(true);
            });
        }
        this.Bind('购买等级', () => this.Video('level'));
        this.Bind('进阶解锁', () => this.Video('advanced'));
        this.Bind('一键领取', () => {
            let count = 0;
            if (this.page === 'rewards') count = Service.ClaimAll();
            else for (const task of Config[this.period]) if (Service.ClaimTask(this.period, task.id)) count++;
            this.Tip(count ? `已领取 ${count} 份${this.page === 'tasks' ? '战令经验' : '奖励'}` : '暂无可领取奖励');
            this.Refresh(true);
        });
        for (const track of ['normal', 'advanced'] as const) {
            for (const reward of Service.Rewards(track)) this.Bind(`奖励列表/View/Content/等级${reward.level}/${track}`, () => this.Claim(reward.level, track));
            this.Bind(`特殊奖励/${track}`, () => this.Claim(this.milestone, track));
        }
        this.scroll.node.on(ScrollView.EventType.SCROLLING, this.OnScroll, this);
        this.scroll.node.on(ScrollView.EventType.SCROLL_ENDED, this.OnScroll, this);
    }
    protected onEnable(): void { this.schedule(this.Tick, 1); }
    protected onDisable(): void { this.unschedule(this.Tick); this.refreshKey = ''; }
    public Show(restore = false): void {
        Service.EnsurePeriods();
        super.Show();
        this.page = 'rewards';
        if (!restore) {
            this.scroll.scrollToLeft(0);
            this.milestone = 10;
        }
        this.Refresh(true);
        this.DrawProgress(0);
    }
    protected update(dt: number): void { this.DrawProgress(dt); }
    private DrawProgress(dt: number): void {
        const value = this.progress.Advance(dt);
        this.Text('等级', `Lv.${value.level}`);
        this.Text('经验文字', value.level >= Config.maxLevel ? '已满级' : `${value.exp} / ${Config.expPerLevel}`);
        this.Get('经验底/经验条').getComponent(Sprite).fillRange = value.fill;
    }
    private SwitchPage(page: 'rewards' | 'tasks'): void {
        if (this.page === page) return;
        this.page = page;
        Service.EnsurePeriods();
        this.Refresh(true);
    }
    private RefreshTabs(): void {
        const rewards = this.page === 'rewards';
        for (const name of this.rewardNodes) this.Get(name).active = rewards;
        this.Get('任务内容').active = !rewards;
        for (const name of ['奖励页', '任务']) {
            const selected = (name === '奖励页') === rewards;
            this.Get(name).getComponent(Sprite).spriteFrame = selected ? this.selectedTab : this.unselectedTab;
            this.Get(name + '/文字').getComponent(Label).color = selected ? new Color(24, 22, 12) : Color.WHITE;
        }
    }
    private RefreshTasks(): void {
        const data = ZRSJZ_GameData.Instance.BattlePass;
        this.Text('任务内容/刷新说明', this.period === 'daily' ? '每日 00:00 刷新（北京时间）' : '每周一 00:00 刷新（北京时间）');
        for (const period of ['daily', 'weekly'] as const) {
            this.Get('任务内容/' + period).active = period === this.period;
            this.Get('任务内容/页签/' + period + '/选中').active = period === this.period;
            for (const task of Config[period]) {
                const path = `任务内容/${period}/View/Content/${task.id}`;
                const state = Service.GetTaskState(period, task.id);
                this.Text(path + '/进度', `${Math.min(task.target, data[period].progress[task.id] || 0)} / ${task.target}`);
                this.Text(path + '/领取/文字', state === 'claimed' ? '已领取' : state === 'claimable' ? '领取经验' : '进行中');
                this.Get(path + '/领取').getComponent(Sprite).color = state === 'claimable' ? Color.WHITE : new Color(130, 140, 160);
            }
        }
    }
    private Tick(): void { Service.EnsurePeriods(); this.Refresh(); }
    private Get(path: string): Node { return find('Panel/' + path, this.node); }
    private Text(path: string, value: string): void {
        const label = this.Get(path)?.getComponent(Label);
        if (label && label.string !== value) label.string = value;
    }
    private Bind(path: string, callback: () => void): void {
        this.Get(path)?.on(Node.EventType.TOUCH_END, () => { ZRSJZ_AudioManager.Instance?.PlaySound('点击'); callback(); }, this);
    }
    private Tip(text: string): void { ZRSJZ_UIManager.Instance?.ShowTip(text); }
    private Video(kind: 'advanced' | 'level'): void {
        if (Date.now() - this.lastVideoClick < 1000) return;
        const reward = Service.CreateVideoReward(kind);
        if (!reward) { this.Tip(kind === 'advanced' ? '进阶战令已解锁' : '战令已满级'); return; }
        this.lastVideoClick = Date.now();
        Banner.Instance.ShowVideoAd(() => {
            if (reward()) this.Tip(kind === 'advanced' ? '进阶战令已解锁' : '战令等级 +1');
            if (this.isValid && this.node.activeInHierarchy) this.Refresh(true);
        });
    }
    private Claim(level: number, track: ZRSJZ_BattlePassTrack): void {
        if (track === 'advanced' && !ZRSJZ_GameData.Instance.BattlePass.advancedUnlocked) { this.Tip('观看视频解锁进阶战令'); return; }
        const state = Service.GetRewardState(level, track);
        this.Tip(Service.ClaimReward(level, track) ? '奖励已发放' : state === 'claimed' ? '奖励已领取' : '战令等级不足');
        this.Refresh(true);
    }
    private OnScroll(): void {
        // 以视口左端所在等级确定对应的十级大奖；列宽跟随预制体。
        const first = Math.max(0, Math.floor(-this.scroll.getScrollOffset().x / this.columnWidth + 0.001));
        const next = Math.min(Config.maxLevel, (Math.floor(first / Config.groupSize) + 1) * Config.groupSize);
        if (next !== this.milestone) { this.milestone = next; this.RefreshSpecial(); }
    }
    private SetReward(path: string, level: number, track: ZRSJZ_BattlePassTrack): void {
        const node = this.Get(path), reward = Service.Rewards(track)[level - 1];
        if (!node || !reward) return;
        const state = Service.GetRewardState(level, track);
        this.Text(path + '/名称', reward.name);
        this.Text(path + '/数量', `×${reward.count.toLocaleString('en-US')}`);
        this.Text(path + '/状态', state === 'claimed' ? '已领取' : state === 'claimable' ? '领取' : '未解锁');
        node.getChildByName('图标').getComponent(Sprite).spriteFrame = this.Get('资源/' + reward.name).getComponent(Sprite).spriteFrame;
        node.getChildByName('锁').active = state === 'locked';
        node.getChildByName('可领取').active = state === 'claimable';
        node.getChildByName('已领取').active = state === 'claimed';
        node.getChildByName('状态').getComponent(Label).color = state === 'claimable' ? new Color(255, 219, 67) : state === 'claimed' ? new Color(91, 248, 135) : new Color(188, 195, 208);
    }
    private RefreshSpecial(): void {
        this.Text('特殊奖励/等级', `Lv.${this.milestone} 阶段大奖`);
        for (const track of ['normal', 'advanced'] as const) this.SetReward('特殊奖励/' + track, this.milestone, track);
    }
    private Refresh(force = false): void {
        const data = ZRSJZ_GameData.Instance.BattlePass;
        this.progress.SetTarget(data.exp);
        const key = JSON.stringify([this.page, this.period, data]);
        if (!force && key === this.refreshKey) return;
        this.refreshKey = key;
        this.RefreshTabs();
        if (this.page === 'tasks') { this.RefreshTasks(); return; }
        for (const track of ['normal', 'advanced'] as const)
            for (const reward of Service.Rewards(track)) this.SetReward(`奖励列表/View/Content/等级${reward.level}/${track}`, reward.level, track);
        this.Text('进阶解锁/文字', data.advancedUnlocked ? '已解锁' : '视频解锁');
        this.Text('购买等级/文字', Service.GetLevel() >= Config.maxLevel ? '已满级' : '视频升 1 级');
        this.RefreshSpecial();
    }
}
