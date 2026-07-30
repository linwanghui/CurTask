import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Joystick_Drug')
export class ZRSJZ_Joystick_Drug extends Component {

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "背包":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.背包弹窗);
                break;
        }
    }
}


