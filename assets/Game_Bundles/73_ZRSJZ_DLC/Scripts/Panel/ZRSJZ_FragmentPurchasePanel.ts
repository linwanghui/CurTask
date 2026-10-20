import { _decorator, Button, EventTouch, Label } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PurchaseService, ZRSJZ_FRAGMENT_PRODUCT } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PurchaseService';
import type { ZRSJZ_FragmentKind } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_FragmentService';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_FragmentPurchasePanel')
export class ZRSJZ_FragmentPurchasePanel extends ZRSJZ_Panel {
    private paying = false;
    public get CanClose(): boolean { return !this.paying; }
    private get Kind(): ZRSJZ_FragmentKind {
        return this.node.name === '英雄碎片购买弹窗' ? '英雄碎片' : '宠物碎片';
    }
    private get PanelPath(): ZRSJZ_PANEL {
        return this.Kind === '英雄碎片' ? ZRSJZ_PANEL.英雄碎片购买弹窗 : ZRSJZ_PANEL.宠物碎片购买弹窗;
    }

    Show(..._args: any[]): void {
        super.Show();
        const count = this.node.getChildByPath('Panel/Count')?.getComponent(Label);
        if (count) count.string = 'X' + ZRSJZ_FRAGMENT_PRODUCT.count;
        const price = this.node.getChildByPath('Panel/解锁/UnlockLabel')?.getComponent(Label);
        if (price) price.string = '10   或1元购买';
        this.Refresh();
    }

    private Refresh(): void {
        const button = this.node.getChildByPath('Panel/解锁')?.getComponent(Button);
        if (button) button.interactable = !this.paying;
    }

    OnButtonClick(event: EventTouch): void {
        if (ZRSJZ_UIManager.Dragging || this.paying) return;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        const name = event.getCurrentTarget().name;
        if (name === 'Mask' || name === '关闭') {
            ZRSJZ_UIManager.Instance.HidePanel(this.PanelPath); return;
        }
        if (name !== '解锁') return;
        if (!ZRSJZ_UIManager.ZRSJZ_DLC) {
            ZRSJZ_UIManager.Instance.ShowTip('碎片购买资源正在加载，请稍后再试'); return;
        }
        const kind = this.Kind;
        this.paying = true; this.Refresh();
        ZRSJZ_PurchaseService.BuyFragments(kind, (message, rewarded) => {
            this.paying = false;
            if (!this.isValid) return;
            this.Refresh();
            ZRSJZ_UIManager.Instance.ShowTip(rewarded
                ? '购买成功，获得' + ZRSJZ_FRAGMENT_PRODUCT.count + '个' + kind : message);
            if (rewarded) ZRSJZ_UIManager.Instance.HidePanel(this.PanelPath);
        });
    }
}
