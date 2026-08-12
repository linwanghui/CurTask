import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';

const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_SettingPanel')
export class ZRSJZ_SettingPanel extends ZRSJZ_Panel {

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "音乐点击区":
                //位置左边X为-75，右边为45
                break;
            case "音效点击区":

                break;
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.设置界面);
                break;

        }
    }
}


