import { _decorator, Button, EventTouch, Node, ScrollView, Sprite, SpriteFrame, Tween, tween, v3 } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PurchaseService, ZRSJZ_GIFT_PRODUCTS } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PurchaseService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GiftPanel')
export class ZRSJZ_GiftPanel extends ZRSJZ_Panel {
    @property(SpriteFrame) BGSFs: SpriteFrame[] = [];
    private selected = '1元礼包';
    private paying = false;
    private permissionsPopup: Node = null;
    public get CanClose(): boolean { return !this.paying; }

    protected onLoad(): void {
        for (const name of Object.keys(ZRSJZ_GIFT_PRODUCTS)) {
            this.Bind(this.node.getChildByPath('Panel/礼包/' + name), () => this.Select(name));
            this.Bind(this.node.getChildByPath('Panel/' + name + '/购买'), () => this.Buy(name));
        }
        this.Bind(this.node.getChildByPath('Panel/返回/Close'), () => this.Close());
        this.permissionsPopup = this.node.getChildByPath('Panel/权限弹窗');
        this.Bind(this.node.getChildByPath('Panel/至尊礼包/查看权限'), () => this.ShowPermissions());
        this.Bind(this.permissionsPopup?.getChildByName('关闭权限'), () => this.HidePermissions());
        this.Bind(this.permissionsPopup?.getChildByName('遮罩'), () => this.HidePermissions());
        this.HidePermissions();
    }

    private Bind(node: Node, callback: () => void): void {
        if (!node) return;
        const button = node.getComponent(Button) ?? node.addComponent(Button);
        button.clickEvents = [];
        node.on(Button.EventType.CLICK, () => {
            if (ZRSJZ_UIManager.Dragging) return;
            ZRSJZ_AudioManager.Instance.PlaySound('点击'); callback();
        }, this);
    }

    Show(..._args: any[]): void {
        super.Show(); this.HidePermissions(); this.Select(this.selected, false);
    }

    private ShowPermissions(): void {
        if (!this.permissionsPopup) return;
        this.permissionsPopup.active = true;
        this.permissionsPopup.setSiblingIndex(this.permissionsPopup.parent.children.length - 1);
        const scroll = this.permissionsPopup.getChildByPath('外框/权限列表')?.getComponent(ScrollView);
        scroll?.stopAutoScroll();
        scroll?.scrollToTop(0);
    }

    private HidePermissions(): void {
        if (!this.permissionsPopup) return;
        this.permissionsPopup.getChildByPath('外框/权限列表')?.getComponent(ScrollView)?.stopAutoScroll();
        this.permissionsPopup.active = false;
    }

    private Select(name: string, animate = true): void {
        if (!ZRSJZ_GIFT_PRODUCTS[name]) return;
        this.selected = name;
        const tabs = this.node.getChildByPath('Panel/礼包');
        for (const gift of Object.keys(ZRSJZ_GIFT_PRODUCTS)) {
            const content = this.node.getChildByPath('Panel/' + gift);
            if (content) content.active = gift === name;
            const checked = tabs.getChildByName(gift + '_Checked');
            if (checked) checked.active = gift === name;
            // 选中视觉层不拦截后面的点击区域。
            const checkedButton = checked?.getComponent(Button);
            if (checkedButton) checkedButton.interactable = false;
        }
        const indicator = tabs.getChildByName('按钮');
        const tab = tabs.getChildByName(name);
        if (indicator && tab) {
            Tween.stopAllByTarget(indicator);
            const position = v3(indicator.position.x, tab.position.y, indicator.position.z);
            if (animate) tween(indicator).to(0.03, { position }, { easing: 'sineInOut' }).start();
            else indicator.setPosition(position);
        }
        this.Refresh();
    }

    private Refresh(): void {
        for (const name of Object.keys(ZRSJZ_GIFT_PRODUCTS)) {
            const content = this.node.getChildByPath('Panel/' + name);
            const owned = ZRSJZ_PurchaseService.HasGift(name);
            const buy = content?.getChildByName('购买');
            const purchased = content?.getChildByName('已购买');
            if (buy) { buy.active = !owned; buy.getComponent(Button).interactable = !this.paying; }
            if (purchased) purchased.active = owned;
        }
    }

    private Buy(name: string): void {
        if (this.paying) return;
        this.paying = true; this.Refresh();
        ZRSJZ_PurchaseService.BuyGift(name, (message, rewarded) => {
            this.paying = false;
            if (!this.isValid) return;
            this.Refresh();
            ZRSJZ_UIManager.Instance.ShowTip(rewarded && name === '1元礼包'
                ? '购买成功，背包已永久增加4行' : message);
            if (rewarded) {
                if (name !== '1元礼包') ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
                if (name === '新手礼包') {
                    // 支付服务已将奖励和购买记录一并保存，弹窗关闭时不再重复发奖。
                    const awards = [
                        { TaskAwardName: '枪蓝图', TaskAwardCount: 1 },
                        { TaskAwardName: '宠物碎片', TaskAwardCount: 20 },
                        { TaskAwardName: '英雄碎片', TaskAwardCount: 20 },
                        { TaskAwardName: '钞票', TaskAwardCount: 2000000 },
                    ].map(award => ({
                        ...award,
                        Icon: this.node.getChildByPath('Panel/新手礼包/奖品/' + award.TaskAwardName + '/Icon')
                            ?.getComponent(Sprite)?.spriteFrame,
                    }));
                    ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, {
                        Awards: awards, DisplayOnly: true,
                    });
                }
            }
        });
    }

    OnButtonClick(event: EventTouch): void {
        const target = event.getCurrentTarget() as Node;
        if (target.name === '查看权限') this.ShowPermissions();
        else if (target.name === '关闭权限') this.HidePermissions();
        else if (['Mask', 'Close', '关闭'].includes(target.name)) this.Close();
        else if (target.name === '购买') this.Buy(target.parent.name);
        else this.Select(target.name);
    }

    private Close(): void {
        if (this.permissionsPopup?.active) { this.HidePermissions(); return; }
        if (this.CanClose) ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.礼包界面);
    }
}
