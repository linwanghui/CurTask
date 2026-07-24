import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_UpLevelPanel')
export class ZRSJZ_BNS_UpLevelPanel extends ZRSJZ_Panel {

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.避难所_升级界面);
                break;
            case "升级":
                this.UpLevelClick();
                break;
        }

    }

    UpLevelClick() {


    }
}


