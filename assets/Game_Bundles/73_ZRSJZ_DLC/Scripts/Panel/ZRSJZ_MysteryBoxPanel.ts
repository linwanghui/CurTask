import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MysteryBoxPanel')
export class ZRSJZ_MysteryBoxPanel extends ZRSJZ_Panel {
    Show(...args: any[]): void {
        super.Show(...args);
    }
    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "返回":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.盲盒界面);
                break;

        }
    }
}


