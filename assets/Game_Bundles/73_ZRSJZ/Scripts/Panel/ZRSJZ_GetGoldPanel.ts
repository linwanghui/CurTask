import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GetGoldPanel')
export class ZRSJZ_GetGoldPanel extends ZRSJZ_Panel {

    @property({ displayName: "奖励金额" })
    public Gold: number = 1000000;

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.获取金币弹窗);
                break;
            case "免费领取":
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_GameData.Instance.ChangeGold(this.Gold);
                    ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
                    ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.获取金币弹窗);
                })
                break;
        }
    }

}


