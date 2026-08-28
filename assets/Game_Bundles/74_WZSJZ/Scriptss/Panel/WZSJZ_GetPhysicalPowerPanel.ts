import { _decorator, EventTouch, Label } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_GameData } from '../WZSJZ_GameData';
import Banner from '../../../../Scripts/Banner';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';



const { ccclass, property } = _decorator;

@ccclass('WZSJZ_GetPhysicalPowerPanel')
export class WZSJZ_GetPhysicalPowerPanel extends PanelBase {
    private _isRequestingAd: boolean = false;

    Show(): void {
        this._isRequestingAd = false;
        super.Show(this.node.getChildByName("Panel"));
        const quantity = this.node.getChildByPath("Panel/弹版/数量")?.getComponent(Label);
        if (quantity) {
            quantity.string = `X${WZSJZ_Constant.HomeResource.PhysicalPowerAdReward}`;
        }
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "关闭":
                WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.GetPhysicalPowerPanel);
                break;
            case "获得": {
                if (this._isRequestingAd) return;
                this._isRequestingAd = true;
                Banner.Instance.ShowVideoAd(() => {
                    this._isRequestingAd = false;
                    const added = WZSJZ_GameData.Instance.AddPhysicalPower(
                        WZSJZ_Constant.HomeResource.PhysicalPowerAdReward,
                    );
                    WZSJZ_AudioManager.Play('奖励获得', 0.8);
                    WZSJZ_UIManager.Instance.ShowText(`获得体力 +${added}`);
                    WZSJZ_UIManager.Instance.HidePanel(
                        WZSJZ_Constant.Panel.GetPhysicalPowerPanel,
                    );
                });
                break;
            }
        }
    }
}
