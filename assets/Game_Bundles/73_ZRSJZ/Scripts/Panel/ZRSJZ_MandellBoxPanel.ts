import { _decorator, Button, Enum, EventTouch, isValid, Label, Node, sp } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_MandellService as Box } from '../Service/ZRSJZ_MandellService';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MandellBoxPanel')
export class ZRSJZ_MandellBoxPanel extends ZRSJZ_Panel {
    @property({ type: Enum(ZRSJZ_PANEL) })
    PanelName: ZRSJZ_PANEL = ZRSJZ_PANEL.曼德尔箱界面;
    private opening = false;
    private initialized = false;
    private generation = 0;
    private lastAdClick = 0;
    private animationCancel: (() => void) | null = null;
    public get CanClose(): boolean { return !this.opening; }

    Show(): void {
        if (this.opening) return;
        this.Panel = this.node.getChildByName('Panel');
        this.Initialize();
        this.ClosePopups();
        this.Refresh();
        this.SetOpening(false);
        super.Show();
        if (Box.Pending) void this.Open(0);
    }

    Hide(...args: any[]): void {
        if (this.opening) return;
        super.Hide(...args);
    }

    protected onEnable(): void { this.schedule(this.Refresh, 1); }
    protected onDisable(): void {
        this.unschedule(this.Refresh);
        this.animationCancel?.();
    }
    protected onDestroy(): void { this.animationCancel?.(); }

    private Initialize(): void {
        if (this.initialized) return;
        this.initialized = true;
        for (const name of ['返回', '单抽', '十连抽', '免费获得']) {
            this.Bind(this.Panel.getChildByName(name), () => this.Action(name));
        }
        // 对应弹窗已从预制体移除，隐藏残留入口，不再构建奖品列表。
        const previewButton = this.Panel.getChildByName('奖品一览');
        if (previewButton) previewButton.active = false;
        const popup = this.Panel.getChildByName('免费获得弹窗');
        const close = () => { if (!this.opening) popup.active = false; };
        this.Bind(popup.getChildByName('关闭'), close);
        popup.getChildByName('遮罩').on(Node.EventType.TOUCH_END, close, this);
        this.Bind(this.Panel.getChildByPath('免费获得弹窗/领取'), () => this.WatchVideo());
        const skeleton = this.Panel.getChildByName('动画').getComponent(sp.Skeleton);
        skeleton.clearTracks();
        skeleton.setToSetupPose();
    }

    private Bind(node: Node, callback: () => void): void {
        node.getComponent(Button).clickEvents = [];
        node.on(Button.EventType.CLICK, () => {
            ZRSJZ_AudioManager.Instance.PlaySound('点击');
            callback();
        }, this);
    }

    // 保留编辑器已有的返回按钮事件入口。
    OnButtonClick(event: EventTouch): void { this.Action(event.getCurrentTarget().name); }

    private Action(name: string): void {
        if (this.opening) return;
        switch (name) {
            case '返回': ZRSJZ_UIManager.Instance.HidePanel(this.PanelName); break;
            case '单抽': void this.Open(1); break;
            case '十连抽': void this.Open(10); break;
            case '免费获得':
                this.ClosePopups();
                this.Panel.getChildByName('免费获得弹窗').active = true;
                this.Refresh();
                break;
        }
    }

    private async Open(count: number): Promise<void> {
        if (this.opening) return;
        const skeleton = this.Panel.getChildByName('动画').getComponent(sp.Skeleton);
        // 在扣款前验证三段动画，资源缺失时不给玩家扣砖。
        const animationData = skeleton.skeletonData?.getRuntimeData();
        if (Box.Rates.some(rate => !animationData?.findAnimation(rate.animation))) {
            ZRSJZ_UIManager.Instance.ShowTip('宝箱动画正在准备，请稍后重试');
            return;
        }
        const generation = ++this.generation;
        try {
            if (!Box.Pending) Box.Begin(count);
            const names = Box.Pending.names.slice();
            this.ClosePopups();
            this.SetOpening(true);
            this.Refresh();
            await this.PlayAnimation(skeleton, Box.Animation(names));
            if (!isValid(this.node) || generation !== this.generation) return;
            Box.Materialize();
            // 恢复中断开箱时只处理未摆放的实例，已入库或已转邮件的不会再生成。
            const pendingIDs = Box.Pending.propIDs.filter(id => {
                const prop = ZRSJZ_GameData.Instance.PropData[id];
                return prop && !prop.GridData?.some(grid => grid.GridX >= 0 && grid.GridY >= 0);
            });
            const mail = await ZRSJZ_UIManager.Instance.ReceiveExistingProps(pendingIDs);
            ZRSJZ_GameData.SaveData();
            Box.Complete();
            if (!isValid(this.node) || generation !== this.generation) return;
            // 奖励已经入库，通用弹窗只展示，关闭时不再重复发奖。
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, {
                Awards: names.map(name => ({ TaskAwardName: name, TaskAwardCount: 1 })),
                DisplayOnly: true,
            });
            if (mail.length) ZRSJZ_UIManager.Instance.ShowTip('仓库空间不足，部分奖励已发至邮箱');
        } catch (error) {
            console.error('[曼德尔箱]', error);
            if (isValid(this.node) && this.node.activeInHierarchy) {
                ZRSJZ_UIManager.Instance.ShowTip(Box.Pending ? '奖励已保留，重新打开可继续领取' : (error as Error).message);
            }
        } finally {
            if (isValid(this.node)) { this.SetOpening(false); this.Refresh(); }
        }
    }

    private PlayAnimation(skeleton: sp.Skeleton, animation: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let finished = false;
            const clean = () => { skeleton.setCompleteListener(null); this.animationCancel = null; };
            this.animationCancel = () => {
                if (finished) return;
                finished = true; clean(); reject(new Error('动画中断'));
            };
            skeleton.setCompleteListener(entry => {
                if (finished || entry.animation?.name !== animation) return;
                finished = true; clean(); resolve();
            });
            try {
                skeleton.clearTracks();
                skeleton.setToSetupPose();
                skeleton.timeScale = 1;
                if (!skeleton.setAnimation(0, animation, false)) throw new Error('宝箱动画启动失败');
            } catch (error) { finished = true; clean(); reject(error); }
        });
    }

    private SetOpening(value: boolean): void {
        this.opening = value;
        this.Panel.getChildByName('动画').active = value;
        this.Panel.getChildByName('宝箱').active = !value;
        this.Panel.getChildByName('开启提示').active = value;
        for (const name of ['返回', '单抽', '十连抽', '免费获得']) {
            this.Panel.getChildByName(name).getComponent(Button).interactable = !value;
        }
    }

    private Refresh(): void {
        if (!this.Panel || !this.initialized) return;
        this.Panel.getChildByName('货币数量').getComponent(Label).string = String(Box.Balance);
        const remaining = Box.Remaining();
        this.Panel.getChildByName('免费获得').active = remaining > 0;
        this.Panel.getChildByPath('免费获得/剩余次数').getComponent(Label).string = '剩余次数：' + remaining;
        this.Panel.getChildByPath('免费获得弹窗/次数').getComponent(Label).string = '今日剩余 ' + remaining + '/' + Box.DailyLimit + ' 次';
        this.Panel.getChildByPath('免费获得弹窗/领取').getComponent(Button).interactable = remaining > 0;
    }

    private WatchVideo(): void {
        if (this.opening) return;
        if (Box.Remaining() <= 0) { ZRSJZ_UIManager.Instance.ShowTip('今日免费次数已用完'); return; }
        if (Date.now() - this.lastAdClick < 1200) return;
        this.lastAdClick = Date.now();
        const grant = Box.VideoReward();
        // 现有广告接口只在完整观看后回调；一次回调只允许增加一次余额。
        Banner.Instance.ShowVideoAd(() => {
            if (!grant()) return;
            ZRSJZ_UIManager.Instance.ShowTip('获得5个曼德尔砖');
            if (isValid(this.node)) {
                this.Panel.getChildByName('免费获得弹窗').active = false;
                this.Refresh();
            }
        });
    }

    private ClosePopups(): void {
        this.Panel.getChildByName('免费获得弹窗').active = false;
    }
}


