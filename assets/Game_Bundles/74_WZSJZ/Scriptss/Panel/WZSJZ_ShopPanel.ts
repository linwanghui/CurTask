import { _decorator, Button, EventTouch } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_GameData } from '../WZSJZ_GameData';
import Banner from '../../../../Scripts/Banner';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';



const { ccclass } = _decorator;

@ccclass('WZSJZ_ShopPanel')
export class WZSJZ_ShopPanel extends PanelBase {
    private _buttonsBound: boolean = false;
    private _isRequestingAd: boolean = false;

    Show(): void {
        this._isRequestingAd = false;
        super.Show(this.node.getChildByName("Panel"));
        this.BindPurchaseButtons();
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "关闭":
                WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.ShopPanel);
                break;
        }
    }

    private BindPurchaseButtons(): void {
        if (this._buttonsBound) return;
        this._buttonsBound = true;
        this.BindButton("Panel/弹版/Content/钻石/购买", this.WatchVideoForDiamond);
        this.BindButton("Panel/弹版/Content/招募卡/购买", this.BuyRecruitCard);
        this.BindButton("Panel/弹版/Content/钥匙/购买", this.BuyKey);
    }

    private BindButton(path: string, callback: () => void): void {
        const target = this.node.getChildByPath(path);
        if (!target) {
            console.error(`[WZSJZ] ShopPanel缺少购买节点：${path}`);
            return;
        }
        if (!target.getComponent(Button)) target.addComponent(Button);
        target.on(Button.EventType.CLICK, callback, this);
    }

    private WatchVideoForDiamond = (): void => {
        if (this._isRequestingAd) return;
        this._isRequestingAd = true;
        Banner.Instance.ShowVideoAd(() => {
            this._isRequestingAd = false;
            const added = WZSJZ_GameData.Instance.AddDiamond(
                WZSJZ_Constant.Shop.VideoDiamondReward,
            );
            WZSJZ_AudioManager.Play('奖励获得', 0.8);
            WZSJZ_UIManager.Instance.ShowText(`获得钻石 +${added}`);
        });
    };

    private BuyRecruitCard = (): void => {
        const config = WZSJZ_Constant.Shop;
        if (!WZSJZ_GameData.Instance.TryBuyRecruitCards(
            config.RecruitCardPrice,
            config.RecruitCardAmount,
        )) {
            WZSJZ_AudioManager.Play('操作失败', 0.65);
            WZSJZ_UIManager.Instance.ShowText("钻石不足");
            return;
        }
        WZSJZ_AudioManager.Play('购买成功', 0.75);
        WZSJZ_UIManager.Instance.ShowText(`获得招募卡 +${config.RecruitCardAmount}`);
    };

    private BuyKey = (): void => {
        const config = WZSJZ_Constant.Shop;
        if (!WZSJZ_GameData.Instance.TryBuyKeys(config.KeyPrice, config.KeyAmount)) {
            WZSJZ_AudioManager.Play('操作失败', 0.65);
            WZSJZ_UIManager.Instance.ShowText("钻石不足");
            return;
        }
        WZSJZ_AudioManager.Play('购买成功', 0.75);
        WZSJZ_UIManager.Instance.ShowText(`获得钥匙 +${config.KeyAmount}`);
    };
}
