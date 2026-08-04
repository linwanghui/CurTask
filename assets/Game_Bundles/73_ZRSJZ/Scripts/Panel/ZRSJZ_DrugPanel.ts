import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_DrugPanel')
export class ZRSJZ_DrugPanel extends ZRSJZ_Panel {

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "Mask":
            case "关闭":
                this.Close();
                break;
            case "观看视频":
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_DRUG_ADD);
                    this.Close();
                })
                break;
        }
    }

    Close() {
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.医疗箱弹窗, () => {
            ZRSJZ_Game.Instance.GamePaused = false;
        });
    }

}


