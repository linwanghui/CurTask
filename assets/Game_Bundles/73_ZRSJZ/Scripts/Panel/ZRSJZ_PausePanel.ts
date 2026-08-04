import { _decorator, Component, director, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PausePanel')
export class ZRSJZ_PausePanel extends ZRSJZ_Panel {

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "继续游戏":
            case "Mask":
                ZRSJZ_Game.Instance.GamePaused = false;
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.暂停界面);
                break;
            case "返回主页":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.暂停界面, async () => {
                    await ZRSJZ_UIManager.Instance.FinishGameInventory();
                    director.loadScene("ZRSJZ_Star");
                });
                break;
        }
    }


}


