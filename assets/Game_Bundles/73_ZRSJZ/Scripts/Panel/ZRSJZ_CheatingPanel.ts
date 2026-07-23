import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_CheatingPanel')
export class ZRSJZ_CheatingPanel extends ZRSJZ_Panel {

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.作弊界面);
                break;
            case "所有道具加1":
                ZRSJZ_GameData.Instance.AddAllProp();
                break;
            case "所有子弹加20":
                ZRSJZ_GameData.Instance.AddAllAmmo(20);
                break;
        }
    }
}


