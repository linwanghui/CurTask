import { _decorator, EventTouch, Label } from 'cc';
import { ZRSJZ_OnlineService as Online } from '../Service/ZRSJZ_OnlineService';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ProjectEvent, ProjectEventManager } from 'db://assets/Scripts/Framework/Managers/ProjectEventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PausePanel')
export class ZRSJZ_PausePanel extends ZRSJZ_Panel {

    protected update(): void {
        const leave = this.node.getChildByName('Panel')?.getChildByName('不再等待');
        if (leave) leave.active = Online.Battle && Online.PeerWaiting
            && !Online.LocalHolds.has('ad') && !Online.LocalHolds.has('background');
        const label = this.node.getChildByName('Panel')?.getChildByName('联机等待提示')?.getComponent(Label);
        if (label) {
            label.node.active = true;
            const ad = Object.values(Online.Holds).some(reasons => reasons.includes('ad') || reasons.includes('background'));
            label.string = !Online.Battle ? '点击空白区域关闭...' : ad ? '等待另一个玩家重连' : Online.PeerWaiting ? '队友已暂停，等待队友继续游戏' : '已同步暂停，点击继续游戏恢复';
        }
    }

    public OnButtonClick(event: EventTouch): void {
        const requestGame = ZRSJZ_Game.Instance;
        if (!requestGame || requestGame.IsGameFinished) return;
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case '不再等待':
                if (Online.Battle && Online.PeerWaiting && !Online.LocalHolds.has('ad') && !Online.LocalHolds.has('background')) {
                    Online.Events.emit('leave_wait');
                }
                break;
            case "继续游戏":
            case "Mask":
                if (Online.Battle) {
                    Online.SetHold('pause', false);
                    ZRSJZ_Game.Instance.GamePaused = false;
                    if (Online.PeerWaiting || Online.LocalHolds.has('ad') || Online.LocalHolds.has('background')) {
                        void ZRSJZ_UIManager.Instance.ShowTip('请等待队友恢复连接或结束暂停');
                        return;
                    }
                }
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
