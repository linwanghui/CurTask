import { _decorator, Button, EventTouch, find, Label } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_FragmentService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_FragmentService';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_FragmentPanel')
export class ZRSJZ_FragmentPanel extends ZRSJZ_Panel {
    private _lastClick = 0;

    protected onEnable(): void {
        this.schedule(this.Refresh, 1);
        this.Refresh();
    }

    protected onDisable(): void { this.unschedule(this.Refresh); }

    private Refresh(): void {
        const remaining = ZRSJZ_FragmentService.GetRemaining();
        if (remaining <= 0) {
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.宠物碎片弹窗);
            return;
        }
        const count = find('Panel/Count', this.node)?.getComponent(Label);
        if (count) count.string = `X${ZRSJZ_FragmentService.RewardCount}`;
        const label = find('Panel/解锁/Layout/UnlockLabel', this.node)?.getComponent(Label);
        if (label) label.string = '免费获取';
        const button = find('Panel/解锁', this.node)?.getComponent(Button);
        if (button) button.interactable = remaining > 0;
    }

    public OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        if (event.getCurrentTarget().name === '关闭') {
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.宠物碎片弹窗);
            return;
        }
        if (event.getCurrentTarget().name !== '解锁') return;
        if (ZRSJZ_FragmentService.GetRemaining() <= 0) {
            this.Refresh();
            return;
        }
        // 广告接口没有取消回调，使用短时防连点，取消后仍可重试。
        const now = Date.now();
        if (now - this._lastClick < 1000) return;
        this._lastClick = now;
        const reward = ZRSJZ_FragmentService.CreateVideoReward();
        Banner.Instance.ShowVideoAd(() => {
            const error = reward();
            ZRSJZ_UIManager.Instance?.ShowTip(error || `获得${ZRSJZ_FragmentService.RewardCount}个宠物碎片`);
            if (this.isValid && this.node.activeInHierarchy) this.Refresh();
        });
    }
}
