import { _decorator, Button, Color, find, Label, Node, ScrollView, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_BATTLE_PASS_CONFIG as Config, ZRSJZ_BattlePassReward, ZRSJZ_BattlePassTrack, ZRSJZ_BattlePassPeriod } from '../../../73_ZRSJZ/Scripts/ZRSJZ_BattlePassConfig';
import { FormatMoney } from '../../../73_ZRSJZ/Scripts/ZRSJZ_NumberFormat';
import { ZRSJZ_BattlePassService as Service } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_BattlePassService';
import { ZRSJZ_BattlePassProgress } from '../../../73_ZRSJZ/Scripts/UI/ZRSJZ_BattlePassProgress';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG, ZRSJZ_SKIN_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
const { ccclass } = _decorator;
@ccclass('ZRSJZ_BattlePassPanel')
export class ZRSJZ_BattlePassPanel extends ZRSJZ_Panel {
    private progress = new ZRSJZ_BattlePassProgress();
    private refreshKey = '';
    private page: 'rewards' | 'tasks' = 'rewards';
    private period: ZRSJZ_BattlePassPeriod = 'daily';
    private readonly rewardNodes = ['标题', '副标题', '经验区域', '等级', '经验底', '经验文字', '奖励底', '普通模式', '进阶模式', '进阶解锁', '奖励列表', '特殊奖励', '购买等级', '进阶宣传'];
    private milestone = 10;
    private columnWidth = 140;
    private lastVideoClick = -Infinity;
    private scroll: ScrollView;
    private readonly taskSlots = {
        daily: ['d_login', 'd_battle', 'd_kill', 'd_search', 'd_extract'],
        weekly: ['w_battle', 'w_kill', 'w_search', 'w_extract', 'w_heal'],
    };
    protected onLoad(): void {
        this.scroll = this.Get('奖励列表').getComponent(ScrollView);
        this.columnWidth = this.Get('奖励列表/View/Content/等级1').getComponent(UITransform).width;
        this.Bind('关闭', () => ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.战令界面));
        this.Bind('战令奖励', () => this.SwitchPage('rewards'));
        this.Bind('战令任务', () => this.SwitchPage('tasks'));
        for (const period of ['daily', 'weekly'] as const) {
            this.Bind('任务内容/页签/' + period, () => {
                this.period = period;
                this.Refresh(true);
            });
            this.taskSlots[period].forEach((slot, index) => this.Bind(`任务内容/${period}/View/Content/${slot}/领取`, () => {
                const task = this.GetDisplayTasks(period)[index];
                if (!task) return;
                const state = Service.GetTaskState(period, task.id);
                const ok = Service.ClaimTask(period, task.id);
                this.Tip(ok ? `战令经验 +${task.exp}` : state === 'claimed' ? '奖励已领取' : '任务尚未完成');
                this.Refresh(true);
            }));
            this.taskSlots[period].forEach((slot, index) => this.Bind(`任务内容/${period}/View/Content/${slot}/前往`, () => {
                const task = this.GetDisplayTasks(period)[index];
                if (task) this.GoToTask(task.metric);
            }));
        }
        this.Bind('购买等级', () => this.Video('level'));
        this.Bind('进阶解锁', () => this.Video('advanced'));
        this.Bind('一键领取', () => {
            let count = 0;
            if (this.page === 'rewards') {
                const awards = Service.ClaimAllRewards();
                count = awards.length;
                if (count) this.ShowRewardPopup(awards);
            }
            else for (const task of Service.GetTasks(this.period)) if (Service.ClaimTask(this.period, task.id)) count++;
            if (!count || this.page === 'tasks') this.Tip(count ? `已领取 ${count} 份战令经验` : '暂无可领取奖励');
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
        this.Get('战令奖励/Checked').active = rewards;
        this.Get('战令任务/Checked').active = !rewards;
    }
    private RefreshReminders(): void {
        const daily = Service.HasClaimableTasks('daily');
        const weekly = Service.HasClaimableTasks('weekly');
        this.Get('战令奖励/红点').active = Service.HasClaimableRewards();
        this.Get('战令任务/红点').active = daily || weekly;
        this.Get('任务内容/页签/daily/红点').active = daily;
        this.Get('任务内容/页签/weekly/红点').active = weekly;
    }
    private RefreshTasks(): void {
        const data = ZRSJZ_GameData.Instance.BattlePass;
        this.Text('任务内容/刷新说明', this.period === 'daily' ? '每日 00:00 刷新（北京时间）' : '每周一 00:00 刷新（北京时间）');
        for (const period of ['daily', 'weekly'] as const) {
            this.Get('任务内容/' + period).active = period === this.period;
            this.Get('任务内容/页签/' + period + '/选中').active = period === this.period;
            const tasks = this.GetDisplayTasks(period);
            this.taskSlots[period].forEach((slot, index) => {
                const task = tasks[index];
                const path = `任务内容/${period}/View/Content/${slot}`;
                this.Get(path).active = !!task;
                if (!task) return;
                const state = Service.GetTaskState(period, task.id);
                this.Text(path + '/名称', task.name);
                this.Text(path + '/说明', task.description);
                this.Text(path + '/经验', `×${task.exp}`);
                this.Text(path + '/进度', `${Math.min(task.target, data[period].progress[task.id] || 0)} / ${task.target}`);
                const typeIcon = this.Get(path + '/类型图标').getComponent(Sprite);
                typeIcon.sizeMode = 0; // CUSTOM: switching frames must not restore their native size.
                typeIcon.spriteFrame = this.Get('资源/任务_' + task.metric).getComponent(Sprite).spriteFrame;
                typeIcon.color = Color.WHITE;
                this.FitIcon(typeIcon, 80, 80);
                const progress = this.Get(path + '/进度条/填充')?.getComponent(Sprite);
                if (progress) progress.fillRange = Math.min(1, (data[period].progress[task.id] || 0) / task.target);
                const claim = this.Get(path + '/领取');
                const go = this.Get(path + '/前往');
                claim.active = state === 'claimable';
                go.active = state === 'locked';
                this.Text(path + '/领取/文字', '领取');
                this.Text(path + '/前往/文字', '前往');
            });
            // 旧版周任务预制体有第六行，随机任务统一只展示五行。
            const legacyExtra = period === 'weekly' ? find('Panel/任务内容/weekly/View/Content/w_special', this.node) : null;
            if (legacyExtra) legacyExtra.active = false;
        }
    }
    /** 已领取任务稳定沉底，未领取任务保持当日/当周的随机顺序。 */
    private GetDisplayTasks(period: ZRSJZ_BattlePassPeriod) {
        return Service.GetTasks(period).map((task, index) => ({ task, index }))
            .sort((a, b) => Number(Service.GetTaskState(period, a.task.id) === 'claimed')
                - Number(Service.GetTaskState(period, b.task.id) === 'claimed') || a.index - b.index)
            .map(item => item.task);
    }
    private Tick(): void { Service.EnsurePeriods(); this.Refresh(); }
    private GoToTask(metric: string): void {
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.战令界面);
        ZRSJZ_UIManager.Instance.ShowPanel(metric === 'login' ? ZRSJZ_PANEL.签到弹窗 : ZRSJZ_PANEL.选关界面);
    }
    private Get(path: string): Node { return find('Panel/' + path, this.node); }
    private Text(path: string, value: string): void {
        const label = this.Get(path)?.getComponent(Label);
        if (label && label.string !== value) label.string = value;
    }
    private Bind(path: string, callback: () => void): void {
        const node = this.Get(path);
        if (!node) return;
        const button = node.getComponent(Button) ?? node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.92;
        button.duration = 0.08;
        // CLICK respects Button's cancellation when a parent ScrollView starts dragging.
        node.on(Button.EventType.CLICK, () => {
            if (ZRSJZ_UIManager.Dragging) return;
            ZRSJZ_AudioManager.Instance?.PlaySound('点击');
            callback();
        }, this);
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
        const data = ZRSJZ_GameData.Instance.BattlePass;
        const claimed = (track === 'advanced' ? data.advancedClaimed : data.claimed).includes(level);
        if (claimed) { this.Tip('奖励已领取'); return; }
        if (Service.GetLevel() < level) { this.Tip('等级不足'); return; }
        if (track === 'advanced' && !data.advancedUnlocked) { this.Tip('进阶战令未解锁'); return; }
        if (Service.ClaimReward(level, track)) this.ShowRewardPopup([Service.Rewards(track).find(r => r.level === level)]);
        else this.Tip('奖励已领取');
        this.Refresh(true);
    }
    private ShowRewardPopup(rewards: ZRSJZ_BattlePassReward[]): void {
        // Service has already recorded ownership/currency and queued inventory delivery.
        // DisplayOnly prevents closing the popup from granting the same reward again.
        const merged = new Map<string, { TaskAwardName: string; TaskAwardCount: number; Icon?: SpriteFrame }>();
        for (const reward of rewards) {
            const key = `${reward.type}:${reward.name}`;
            const existing = merged.get(key);
            if (existing) existing.TaskAwardCount += reward.count;
            else merged.set(key, {
                TaskAwardName: reward.name,
                TaskAwardCount: reward.count,
                Icon: reward.type === 'heroSkin' ? this.Get('资源')?.getChildByName(reward.name)?.getComponent(Sprite)?.spriteFrame : undefined,
            });
        }
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, { Awards: [...merged.values()], DisplayOnly: true });
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
        const data = ZRSJZ_GameData.Instance.BattlePass;
        const claimed = (track === 'advanced' ? data.advancedClaimed : data.claimed).includes(level);
        const reached = Service.GetLevel() >= level;
        const advancedUnlocked = data.advancedUnlocked;
        const claimable = reached && !claimed && (track === 'normal' || advancedUnlocked);
        const state = claimed ? 'claimed' : claimable ? 'claimable' : 'locked';
        this.Text(path + '/名称', reward.name);
        this.Text(path + '/数量', `×${reward.type === 'gold' ? FormatMoney(reward.count, true) : reward.count.toLocaleString('en-US')}`);
        this.Text(path + '/状态', state === 'claimed' ? '已领取' : state === 'claimable' ? '领取' : '未解锁');
        void this.SetRewardIcon(node, reward.type, reward.name);
        const mask = node.getChildByName('Mask');
        const lock = node.getChildByName('锁');
        if (mask) mask.active = state !== 'claimable' || (track === 'advanced' && !advancedUnlocked);
        if (lock) lock.active = track === 'advanced' && !advancedUnlocked;
        node.getChildByName('已领取').active = state === 'claimed';
        node.getChildByName('状态').getComponent(Label).color = state === 'claimable' ? new Color(255, 219, 67) : state === 'claimed' ? new Color(91, 248, 135) : new Color(188, 195, 208);
    }
    private async SetRewardIcon(node: Node, type: string, name: string): Promise<void> {
        const target = node.getChildByName('图标')?.getComponent(Sprite);
        if (!target) return;
        // Loading failures must never leave a previous reward's icon visible.
        target.spriteFrame = null;
        let frame: SpriteFrame = null;
        const cached = this.Get('资源')?.getChildByName(name)?.getComponent(Sprite)?.spriteFrame;
        if (cached) frame = cached;
        else if (type === 'weaponSkin') {
            const texture: Texture2D = await ZRSJZ_UIManager.Instance?.GetWeaponryUI?.(name);
            if (texture) { frame = new SpriteFrame(); frame.texture = texture; }
        } else if (type === 'heroSkin') frame = await ZRSJZ_UIManager.Instance?.GetHeroSkinIconUI?.(name);
        else frame = await ZRSJZ_UIManager.Instance?.GetPropUI?.(name);
        // 异步返回时节点可能已滚动复用，只给仍显示同一奖励的格子赋值。
        if (frame && node.isValid !== false && node.getChildByName('名称')?.getComponent(Label)?.string === name) {
            target.spriteFrame = frame;
            this.FitRewardIcon(node, target);
        }
        // 有道具配置的奖励统一使用对应品质的 1x1 格子；红色品质只会解析到“红色格子1_1”。
        const quality = ZRSJZ_PROP_CONFIG.get(name)?.Quality ?? ZRSJZ_SKIN_CONFIG.get(name)?.Quality;
        const bottom = node.getChildByName('图标底')?.getComponent(Sprite);
        const bottomFrame = await ZRSJZ_UIManager.Instance?.GetPropGridUI?.(quality ? `${quality}1_1` : '空格子_灰');
        if (bottom && bottomFrame && node.isValid !== false
            && node.getChildByName('名称')?.getComponent(Label)?.string === name) {
            bottom.spriteFrame = bottomFrame;
            const mask = node.getChildByName('Mask')?.getComponent(Sprite);
            if (mask) mask.spriteFrame = bottomFrame;
            if (target.spriteFrame) this.FitRewardIcon(node, target);
        }
    }
    private FitIcon(sprite: Sprite, width: number, height: number): void {
        const rect = sprite.spriteFrame?.rect;
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        const scale = Math.min(width / rect.width, height / rect.height);
        sprite.node.getComponent(UITransform).setContentSize(rect.width * scale, rect.height * scale);
    }
    /** 保持奖励原图 TRIMMED 尺寸，仅用统一缩放限制在“图标底”范围内。 */
    private FitRewardIcon(rewardNode: Node, sprite: Sprite): void {
        const rect = sprite.spriteFrame?.rect;
        const iconTransform = sprite.node.getComponent(UITransform);
        const bottomTransform = rewardNode.getChildByName('图标底')?.getComponent(UITransform);
        if (!rect || !iconTransform || !bottomTransform || rect.width <= 0 || rect.height <= 0) return;
        sprite.sizeMode = 1; // Sprite.SizeMode.TRIMMED
        iconTransform.setContentSize(rect.width, rect.height);
        const maxWidth = Math.max(0, bottomTransform.width - 10);
        const maxHeight = Math.max(0, bottomTransform.height - 10);
        const scale = Math.min(maxWidth / rect.width, maxHeight / rect.height, 1);
        sprite.node.setScale(scale, scale, 1);
    }
    private RefreshSpecial(): void {
        this.Text('特殊奖励/等级底/等级', `Lv.${this.milestone} 阶段大奖`);
        for (const track of ['normal', 'advanced'] as const) this.SetReward('特殊奖励/' + track, this.milestone, track);
    }
    private Refresh(force = false): void {
        const data = ZRSJZ_GameData.Instance.BattlePass;
        this.progress.SetTarget(data.exp);
        const key = JSON.stringify([this.page, this.period, data]);
        if (!force && key === this.refreshKey) return;
        this.refreshKey = key;
        this.RefreshTabs();
        this.RefreshReminders();
        if (this.page === 'tasks') { this.RefreshTasks(); return; }
        for (const track of ['normal', 'advanced'] as const)
            for (const reward of Service.Rewards(track)) this.SetReward(`奖励列表/View/Content/等级${reward.level}/${track}`, reward.level, track);
        this.Get('进阶解锁').active = !data.advancedUnlocked;
        this.Get('进阶模式/锁').active = !data.advancedUnlocked;
        this.Text('进阶解锁/文字', '解锁进阶 ▶');
        this.Text('购买等级/文字', Service.GetLevel() >= Config.maxLevel ? '已满级' : '购买等级 ▶');
        this.RefreshSpecial();
    }
}
