import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PetPanel')
export class ZRSJZ_PetPanel extends ZRSJZ_Panel {

    public OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.宠物界面);
                break;
        }
    }
}


