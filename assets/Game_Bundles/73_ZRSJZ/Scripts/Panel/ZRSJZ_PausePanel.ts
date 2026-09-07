import { _decorator, EventTouch } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ProjectEvent, ProjectEventManager } from 'db://assets/Scripts/Framework/Managers/ProjectEventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PausePanel')
export class ZRSJZ_PausePanel extends ZRSJZ_Panel {

    public OnButtonClick(event: EventTouch): void {
        const requestGame = ZRSJZ_Game.Instance;
        if (!requestGame || requestGame.IsGameFinished) return;
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "继续游戏":
            case "Mask":
                ZRSJZ_Game.Instance.GamePaused = false;
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.暂停界面);
                break;
            case "返回主页":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.暂停界面, async () => {
                    if (ZRSJZ_Game.Instance !== requestGame || requestGame.IsGameFinished) return;
                    await ZRSJZ_UIManager.Instance.FinishGameInventory(false);
                    ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.加载界面, "ZRSJZ_Start");
                    ProjectEventManager.emit(ProjectEvent.游戏结束, "真人三角洲");
                });
                break;
        }
    }


}


