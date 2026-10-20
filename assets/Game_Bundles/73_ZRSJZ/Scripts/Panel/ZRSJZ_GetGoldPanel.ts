import { ZRSJZ_AccountService } from '../Service/ZRSJZ_AccountService';
import { _decorator, Button, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PurchaseService, ZRSJZ_GOLD_PRODUCTS } from '../Service/ZRSJZ_PurchaseService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GetGoldPanel')
export class ZRSJZ_GetGoldPanel extends ZRSJZ_Panel {
    @property({ displayName: '视频奖励金额' }) public Gold: number = 1200000;
    private videoPending = false;
    private paying = false;
    public get CanClose(): boolean { return !this.paying; }

    protected onLoad(): void {
        for (const card of this.node.getChildByPath('Panel/Layout')?.children ?? []) {
            const button = card.getChildByName('购买');
            if (!button) continue;
            const component = button.getComponent(Button) ?? button.addComponent(Button);
            component.clickEvents = [];
            button.on(Button.EventType.CLICK, () => this.Buy(card.name), this);
        }
    }

    OnButtonClick(event: EventTouch): void {
        if (ZRSJZ_UIManager.Dragging) return;
        const target = event.getCurrentTarget() as Node;
        if (['Mask', '关闭'].includes(target.name)) {
            if (this.CanClose) ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.获取金币弹窗);
        } else if (target.name === '购买') this.Buy(target.parent.name);
    }

    private Buy(name: string): void {
        if (ZRSJZ_UIManager.Dragging || !this.CanClose || this.videoPending) return;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        if (name === '视频解锁') {
            if (ZRSJZ_PurchaseService.IsPaying) return;
            this.videoPending = true;
            let rewarded = false;
            try { Banner.Instance.ShowVideoAd(() => {
                if (rewarded) return;
                rewarded = true; this.videoPending = false;
                ZRSJZ_AccountService.ChangeGold(this.Gold);
                if (this.isValid) {
                    ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
                    ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.获取金币弹窗);
                }
            }, undefined, () => { this.videoPending = false; });
            } catch (error) { this.videoPending = false; console.error(error); }
            return;
        }
        if (!ZRSJZ_GOLD_PRODUCTS[name]) return;
        this.paying = true;
        ZRSJZ_PurchaseService.BuyGold(name, (message, rewarded) => {
            this.paying = false;
            if (!this.isValid) return;
            ZRSJZ_UIManager.Instance.ShowTip(message);
            if (rewarded) {
                ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.获取金币弹窗);
            }
        });
    }
}
