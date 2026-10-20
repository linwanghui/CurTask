import { _decorator, Component, EventTouch, find, Layout, Node, ScrollView, SpriteFrame, UITransform, Widget } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_MainTaskAwardConfig, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
import { ZRSJZ_AccountService } from '../Service/ZRSJZ_AccountService';
import { ZRSJZ_GradeService } from '../Service/ZRSJZ_GradeService';
const { ccclass, property } = _decorator;

export interface ZRSJZ_AwardDisplayConfig extends ZRSJZ_MainTaskAwardConfig {
    Icon?: SpriteFrame;
}
export interface ZRSJZ_GetAwardPanelOptions {
    Awards: ZRSJZ_AwardDisplayConfig[];
    DisplayOnly: true;
}

@ccclass('ZRSJZ_GetAwardPanel')
export class ZRSJZ_GetAwardPanel extends ZRSJZ_Panel {

    Award: Node = null;

    private _awards: ZRSJZ_MainTaskAwardConfig[] = [];
    private _displayOnly: boolean = false;
    private _displayVersion = 0;
    private _awardScroll: ScrollView = null;
    private _awardView: Node = null;

    protected onLoad(): void {
        this.Award = find("Panel/Award/View/Content", this.node);
        this._awardView = this.Award.parent;
        this._awardScroll = find('Panel/Award', this.node)?.getComponent(ScrollView);
        this.node.on(Node.EventType.SIZE_CHANGED, this.QueueAwardLayout, this);
        this._awardView.on(Node.EventType.SIZE_CHANGED, this.QueueAwardLayout, this);
    }

    Show(...args: any[]): void {
        super.Show(() => this.QueueAwardLayout());
        const options = args.length === 1
            && args[0]?.DisplayOnly === true
            && Array.isArray(args[0]?.Awards)
            ? args[0] as ZRSJZ_GetAwardPanelOptions
            : null;
        this._displayOnly = options !== null;
        this.ShowAward(...(options?.Awards ?? args));
    }

    ShowAward(...args: ZRSJZ_AwardDisplayConfig[]) {
        const version = ++this._displayVersion;
        for (let i = this.Award.children.length - 1; i >= 0; i--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.Award.children[i]);
        }
        this._awards = [...args];
        this.RefreshAwardLayout();
        // 等全部奖励加载完成后按传入顺序排版，避免异步加载顺序影响列表位置。
        void Promise.all(args.map(async award => {
            try {
                const node = await ZRSJZ_PoolManager.Instance.GetNode('Prefabs/UI/TaskAward');
                return { node, award };
            } catch (error) {
                console.error('[获取奖励弹窗] 奖励节点加载失败', error);
                return null;
            }
        })).then(items => {
            const ready = items.filter(item => item !== null);
            if (version !== this._displayVersion || !this.node.isValid || !this.node.activeInHierarchy) {
                ready.forEach(item => ZRSJZ_PoolManager.Instance.PutNode(item.node));
                return;
            }
            ready.forEach(({ node, award }) => {
                node.parent = this.Award;
                node.active = true;
                node.getComponent(ZRSJZ_TaskAward).Init(award.TaskAwardName, award.TaskAwardCount, award.TaskAwardName, award.Icon);
            });
            this.RefreshAwardLayout();
            this.QueueAwardLayout();
        });
    }

    private QueueAwardLayout(): void {
        this.unschedule(this.RefreshAwardLayout);
        this.scheduleOnce(this.RefreshAwardLayout, 0);
    }

    private RefreshAwardLayout(): void {
        if (!this.Award?.isValid || !this._awardView?.isValid) return;
        this._awardScroll?.stopAutoScroll();
        this._awardView.parent?.getComponent(Widget)?.updateAlignment();
        this._awardView.getComponent(Widget)?.updateAlignment();
        const content = this.Award.getComponent(UITransform);
        const viewport = this._awardView.getComponent(UITransform);
        if (!content || !viewport) return;
        const layout = this.Award.getComponent(Layout);
        if (layout) {
            // 左右留白相同，内容矩形居中时奖励本身也居中。
            const padding = (layout.paddingLeft + layout.paddingRight) / 2;
            layout.paddingLeft = padding;
            layout.paddingRight = padding;
            layout.updateLayout();
        }
        const hasAwards = this.Award.children.some(child => child.active);
        if (!hasAwards) content.setContentSize(0, content.height);
        const overflow = hasAwards && content.width * Math.abs(this.Award.scale.x) > viewport.width + 0.5;
        if (this._awardScroll) {
            this._awardScroll.horizontal = true;
            this._awardScroll.vertical = false;
            this._awardScroll.enabled = overflow;
        }
        this.Award.setPosition(
            (0.5 - viewport.anchorX) * viewport.width + (content.anchorX - 0.5) * content.width * this.Award.scale.x,
            (0.5 - viewport.anchorY) * viewport.height + (content.anchorY - 0.5) * content.height * this.Award.scale.y,
            this.Award.position.z,
        );
        if (overflow) this._awardScroll?.scrollToPercentHorizontal(0.5, 0, false);
    }

    protected onDisable(): void {
        this.unschedule(this.RefreshAwardLayout);
        this._awardScroll?.stopAutoScroll();
    }

    OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ++this._displayVersion;
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.获取奖励弹窗);
                if (this._displayOnly) {
                    this._awards = [];
                    this._displayOnly = false;
                } else {
                    void this.GetAwards();
                }
                break;
        }
    }

    async GetAwards(): Promise<void> {
        const awards = this._awards;
        this._awards = [];
        let exp = 0;
        const propAwards: { PropName: string, Count: number }[] = [];
        awards.forEach(award => {
            // 主线服务已在领奖时永久解锁；弹窗仅展示，不当成道具重复发放。
            if (award.TaskAwardName === '安全箱扩容') return;
            if (award.TaskAwardName == "钞票") {
                ZRSJZ_AccountService.ChangeGold(award.TaskAwardCount);
                ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
            } else if (award.TaskAwardName == "经验") {
                exp = award.TaskAwardCount;
            } else {
                propAwards.push({
                    PropName: award.TaskAwardName,
                    Count: award.TaskAwardCount,
                });
            }
        })
        if (exp != 0) ZRSJZ_GradeService.AddExperience(exp);
        if (propAwards.length <= 0) return;

        const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards(propAwards);
        if (result.MailAwards.length > 0) {
            ZRSJZ_UIManager.Instance.ShowTip("仓库空间不足，剩余道具已发送至邮件");
        } else {
            ZRSJZ_UIManager.Instance.ShowTip("道具已添加到仓库");
        }
    }

}

