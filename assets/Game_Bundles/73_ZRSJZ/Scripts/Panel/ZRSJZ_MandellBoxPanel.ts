import { _decorator, Button, Enum, EventTouch, instantiate, isValid, Label, Node, ScrollView, sp, Sprite, UITransform } from 'cc';
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
    private previewReady = false;
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
        for (const name of ['返回', '单抽', '十连抽', '免费获得', '奖品一览']) {
            this.Bind(this.Panel.getChildByName(name), () => this.Action(name));
        }
        this.Panel.getChildByName('奖品一览').active = true;
        for (const name of ['免费获得弹窗', '奖品一览弹窗']) {
            const popup = this.Panel.getChildByName(name);
            const close = () => { if (!this.opening) popup.active = false; };
            this.Bind(popup.getChildByName('关闭'), close);
            popup.getChildByName('遮罩').on(Node.EventType.TOUCH_END, close, this);
        }
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
            case '奖品一览':
                this.ClosePopups();
                this.Panel.getChildByName('奖品一览弹窗').active = true;
                this.ShowPrizePreview();
                break;
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
                // 三种品质动画均为2.5秒；十连也只伴随本次动画播放一次。
                try { ZRSJZ_AudioManager.Instance.PlaySound('曼德尔开箱', 0.8); }
                catch (error) { console.warn('[曼德尔箱] 开箱音效播放失败', error); }
            } catch (error) { finished = true; clean(); reject(error); }
        });
    }

    private SetOpening(value: boolean): void {
        this.opening = value;
        this.Panel.getChildByName('动画').active = value;
        this.Panel.getChildByName('宝箱').active = !value;
        this.Panel.getChildByName('开启提示').active = value;
        for (const name of ['返回', '单抽', '十连抽', '免费获得', '奖品一览']) {
            this.Panel.getChildByName(name).getComponent(Button).interactable = !value;
        }
    }

    private Refresh(): void {
        if (!this.Panel || !this.initialized) return;
        this.Panel.getChildByName('货币数量').getComponent(Label).string = String(Box.Balance);
        this.Panel.getChildByName('免费获得').active = true;
        this.Panel.getChildByPath('免费获得/剩余次数').active = false;
        this.Panel.getChildByPath('免费获得弹窗/次数').getComponent(Label).string = '每次获得5个曼德尔砖';
        this.Panel.getChildByPath('免费获得弹窗/领取').getComponent(Button).interactable = !this.opening;
        const free = Box.CanFreeTen();
        this.Panel.getChildByPath('十连抽/消耗').getComponent(Label).string = free ? '免费' : '×10';
        this.Panel.getChildByPath('十连抽/标题').getComponent(Label).string = free ? '今日免费十连' : '开启10次';
        this.Panel.getChildByPath('十连抽/砖').active = !free;
    }

    private WatchVideo(): void {
        if (this.opening) return;
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
        this.Panel.getChildByName('奖品一览弹窗').active = false;
    }

    /** 公示直接读取实际奖池，使用预制体道具格模板，不执行发奖。 */
    private ShowPrizePreview(): void {
        const scroll = this.Panel.getChildByPath('奖品一览弹窗/列表').getComponent(ScrollView);
        if (!this.previewReady) {
            const content = scroll.content;
            const template = content.getChildByName('道具框模板');
            template.active = false;
            const pool = Box.Pool().sort((a, b) =>
                Box.Rates.findIndex(r => r.quality === b.Quality) - Box.Rates.findIndex(r => r.quality === a.Quality)
                || b.UnitPrice - a.UnitPrice);
            const width = content.getComponent(UITransform).width;
            const columns = 6;
            pool.forEach((prop, index) => {
                const item = instantiate(template);
                item.name = '奖品' + index;
                item.parent = content;
                item.active = true;
                item.setPosition(-width / 2 + width / columns * (index % columns + .5), -75 - Math.floor(index / columns) * 158);
                item.getChildByName('名称').getComponent(Label).string = prop.Name;
                const frame = item.getChildByName('品质框').getComponent(Sprite);
                const icon = item.getChildByName('图标').getComponent(Sprite);
                ZRSJZ_UIManager.Instance.GetPropGridUI(prop.Quality + '1_1')?.then(asset => {
                    if (isValid(frame)) frame.spriteFrame = asset;
                }).catch(error => console.warn('[曼德尔箱] 公示品质框加载失败', error));
                ZRSJZ_UIManager.Instance.GetPropUI(prop.Name)?.then(asset => {
                    if (!asset || !isValid(icon)) return;
                    icon.spriteFrame = asset;
                    icon.sizeMode = Sprite.SizeMode.CUSTOM;
                    const size = asset.originalSize;
                    const scale = Math.min(96 / Math.max(1, size.width), 96 / Math.max(1, size.height));
                    icon.getComponent(UITransform).setContentSize(size.width * scale, size.height * scale);
                }).catch(error => console.warn('[曼德尔箱] 公示图标加载失败', error));
                this.Bind(item, () => ZRSJZ_UIManager.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗, 0, prop.Name, 0));
            });
            content.getComponent(UITransform).height = Math.max(scroll.node.getComponent(UITransform).height, Math.ceil(pool.length / columns) * 158);
            this.previewReady = true;
        }
        this.scheduleOnce(() => { if (isValid(scroll)) scroll.scrollToTop(0); }, 0);
    }
}
