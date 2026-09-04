import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ForgePanel')
export class ZRSJZ_ForgePanel extends ZRSJZ_Panel {
    Show(...args: any[]): void {
        this.PlayerIndex = args[0] === 1 ? 1 : 0;
        super.Show();
    }

    public OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "返回":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.锻造界面);
                break;

        }
    }
}


