import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BoosterShotPanel')
export class ZRSJZ_BoosterShotPanel extends ZRSJZ_Panel {

    OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.增强针弹窗);
                break;

        }
    }


}


