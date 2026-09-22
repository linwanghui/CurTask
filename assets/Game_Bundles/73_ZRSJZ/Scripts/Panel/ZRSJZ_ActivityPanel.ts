import { _decorator, Button, Color, Enum, EventTouch, instantiate, isValid, Label, Node, ScrollView, Sprite, Tween, tween, UITransform } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_ActivityService as Activity } from '../Service/ZRSJZ_ActivityService';
import { ZRSJZ_MidAutumnPage } from '../UI/ZRSJZ_MidAutumnPage';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ActivityPanel')
export class ZRSJZ_ActivityPanel extends ZRSJZ_Panel {
    @property({ type: Enum(ZRSJZ_PANEL) })
    PanelName: ZRSJZ_PANEL = ZRSJZ_PANEL.活动界面;
    private rows: Node[] = [];
    private rewards: Node[] = [];
    private page: Node;
    private busy = false;
    private moon: ZRSJZ_MidAutumnPage;
    public get CanClose(): boolean { return !this.busy && !this.moon?.busy; }
    protected onEnable(): void { this.schedule(this.RefreshMoon, 1); }
    protected onDisable(): void { this.unschedule(this.RefreshMoon); }
    private RefreshMoon(): void { this.moon?.Render(); }

    Show(): void {
        this.Panel = this.node.getChildByName('Panel');
        this.page = this.Panel.getChildByPath('右栏/战备冲刺');
        if (!this.page?.getChildByPath('任务列表/内容/任务条目模板')) {
            this.node.active = false;
            ZRSJZ_UIManager.Instance.ShowTip('活动界面资源尚未更新，请稍后再试');
            return;
        }
        this.Initialize();
        if (!this.moon) this.moon = new ZRSJZ_MidAutumnPage(this.Panel.getChildByPath('右栏/月满金秋'));
        super.Show();
        this.SelectActivity('战备冲刺', false);
        this.Render();
        this.moon.Render();
        void this.moon.Exchange();
        this.scheduleOnce(() => this.page.getChildByName('任务列表').getComponent(ScrollView).scrollToTop(0), 0);
    }

    private Bind(node: Node, action: () => void): void {
        node.getComponent(Button).clickEvents = [];
        node.on(Button.EventType.CLICK, action, this);
    }

    private Initialize(): void {
        if (this.rows.length) return;
        const tabs = this.Panel.getChildByName('活动选项');
        for (const tab of tabs.children) {
            if (tab.getComponent(Button)) this.Bind(tab, () => this.SelectActivity(tab.name));
        }
        const content = this.page.getChildByPath('任务列表/内容');
        const template = content.getChildByName('任务条目模板');
        Activity.Tasks.forEach((_, index) => {
            const row = index === 0 ? template : instantiate(template);
            if (index) { row.name = '任务条目' + (index + 1); row.parent = content; }
            row.setPosition(0, -80 - index * 174);
            this.Bind(row.getChildByName('领取'), () => {
                if (this.busy) return;
                if (Activity.ClaimTask(index)) { this.Render(); return; }
                if (!Activity.TaskClaimed(index)) {
                    ZRSJZ_UIManager.Instance.HidePanel(this.PanelName);
                    ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.选关界面);
                }
            });
            this.rows.push(row);
        });
        content.getComponent(UITransform).setContentSize(850, Activity.Tasks.length * 174 - 14);
        const rewardTemplate = this.page.getChildByName('奖励格模板');
        Activity.Rewards.forEach((reward, index) => {
            const slot = index === 0 ? rewardTemplate : instantiate(rewardTemplate);
            if (index) { slot.name = '阶段奖励' + (index + 1); slot.parent = this.page; }
            slot.setPosition(-610 + index * 280, -325);
            this.Bind(slot, () => {
                if (Activity.CanClaimReward(index)) void this.Claim(index);
                else ZRSJZ_UIManager.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗, 0, reward.PropName, 0);
            });
            this.Text(slot, '名称', reward.PropName + ' ×' + reward.Count);
            this.Text(slot, '积分', reward.points + '分');
            this.LoadIcon(slot.getChildByName('图标').getComponent(Sprite), reward.PropName);
            const frame = slot.getChildByName('品质框').getComponent(Sprite);
            const quality = ZRSJZ_PROP_CONFIG.get(reward.PropName)?.Quality;
            if (quality) ZRSJZ_UIManager.Instance.GetPropGridUI(quality + '1_1')?.then(asset => {
                if (isValid(frame)) frame.spriteFrame = asset;
            }).catch(error => console.warn('[活动] 品质框加载失败', error));
            this.rewards.push(slot);
        });
        this.Bind(this.page.getChildByName('一键领取'), () => { void this.Claim(); });
    }

    private LoadIcon(icon: Sprite, name: string): void {
        ZRSJZ_UIManager.Instance.GetPropUI(name)?.then(asset => {
            if (!asset || !isValid(icon)) return;
            icon.spriteFrame = asset;
            icon.sizeMode = Sprite.SizeMode.CUSTOM;
            const size = asset.originalSize;
            const scale = Math.min(105 / Math.max(1, size.width), 105 / Math.max(1, size.height));
            icon.getComponent(UITransform).setContentSize(size.width * scale, size.height * scale);
        }).catch(error => console.warn('[活动] 道具图片加载失败', name, error));
    }

    private SelectActivity(name: string, animate = true): void {
        const tabs = this.Panel.getChildByName('活动选项');
        const tab = tabs.getChildByName(name);
        const selected = tabs.getChildByName('选中图像');
        if (!tab || !this.Panel.getChildByName('右栏').getChildByName(name)) return;
        Tween.stopAllByTarget(selected);
        if (animate) {
            ZRSJZ_AudioManager.Instance.PlaySound('点击');
            tween(selected).to(0.2, { position: tab.position.clone() }, { easing: 'quadOut' }).start();
        } else selected.setPosition(tab.position);
        for (const page of this.Panel.getChildByName('右栏').children) page.active = page.name === name;
        this.Panel.getChildByName('中秋背景').active = name === '月满金秋';
        this.moon?.Render();
    }

    private Text(root: Node, name: string, value: string): void {
        root.getChildByName(name).getComponent(Label).string = value;
    }

    private Render(): void {
        this.Panel.getChildByPath('活动选项/战备冲刺/红点').active = Activity.HasClaimable();
        this.Text(this.page, '累计价值', '累计成功撤离：' + Math.floor(Activity.Value / 10000) + '万  ·  当前积分 ' + Activity.Points + '/200');
        this.rows.forEach((row, i) => {
            const task = Activity.Tasks[i];
            const claimed = Activity.TaskClaimed(i);
            const ready = Activity.CanClaimTask(i);
            this.Text(row, '目标', '累计撤离价值达到【' + task.value / 10000 + '万】');
            this.Text(row, '进度', '(' + Math.min(task.value / 10000, Math.floor(Activity.Value / 10000)) + '/' + task.value / 10000 + '万)');
            this.Text(row, '积分', '活动积分 +' + task.points);
            const button = row.getChildByName('领取');
            button.getComponent(Button).interactable = !claimed && !this.busy;
            button.getChildByName('可领取图').active = ready;
            button.getChildByName('前往图').active = !ready && !claimed;
            button.getChildByName('已领取').active = claimed;
        });
        this.rewards.forEach((slot, i) => {
            const claimed = Activity.RewardClaimed(i);
            const ready = Activity.CanClaimReward(i);
            this.Text(slot, '状态', claimed ? '已领取' : ready ? '点击领取' : '未达成');
            slot.getChildByName('状态').getComponent(Label).color = ready ? new Color(255, 230, 40) : Color.WHITE;
            slot.getChildByName('红点').active = ready;
            slot.getChildByName('背光').active = ready;
            slot.getComponent(Button).interactable = !this.busy;
        });
        // 奖励等距排列，按相邻积分门槛插值，让进度准确经过每个奖励刻度。
        const thresholds = [0, ...Activity.Rewards.map(reward => reward.points)];
        let distance = 0;
        for (let i = 1; i < thresholds.length; i++) {
            const fraction = Math.max(0, Math.min(1, (Activity.Points - thresholds[i - 1]) / (thresholds[i] - thresholds[i - 1])));
            distance += fraction * (i === 1 ? 100 : 280);
        }
        this.page.getChildByName('积分进度').getComponent(Sprite).fillRange = distance / 1500;
        this.page.getChildByName('一键领取').getComponent(Button).interactable = !this.busy;
    }

    private async Claim(index?: number): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        let changed = false;
        try {
            if (index === undefined) Activity.Tasks.forEach((_, i) => { if (Activity.ClaimTask(i)) changed = true; });
            this.Render();
            for (const i of index === undefined ? Activity.Rewards.map((_, i) => i) : [index]) {
                if (await Activity.ClaimReward(i, async award => {
                    const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards([award]);
                    if (result.InvalidAwards.length) throw new Error('奖励配置无效');
                })) changed = true;
            }
            ZRSJZ_UIManager.Instance.ShowTip(changed ? '领取成功！仓库放不下的奖励已发至邮箱' : '暂无可领取奖励');
        } catch (error) {
            console.error('[战备冲刺] 领取失败', error);
            ZRSJZ_UIManager.Instance.ShowTip('领取失败，请重试');
        } finally {
            this.busy = false;
            if (isValid(this.node)) this.Render();
        }
    }

    OnButtonClick(event: EventTouch): void {
        if (event.getCurrentTarget().name !== '返回') return;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        ZRSJZ_UIManager.Instance.HidePanel(this.PanelName);
    }
}


