import { _decorator, Component, Enum, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_DeathPanel')
export class ZRSJZ_DeathPanel extends ZRSJZ_Panel {

    @property({ type: Enum(ZRSJZ_PANEL) })
    PanelName: ZRSJZ_PANEL = ZRSJZ_PANEL.死亡弹窗;

    Show(...args: any[]): void {
        this.PlayerIndex = args[0] === 1 ? 1 : 0;
        super.Show();
    }

    public OnButtonClick(event: EventTouch): void {
        const requestGame = ZRSJZ_Game.Instance;
        if (!requestGame || requestGame.IsGameFinished) return;
        const playerIndex = this.PlayerIndex;
        const panelName = this.PanelName;
        const canApplyResult = () => requestGame.isValid
            && ZRSJZ_Game.Instance === requestGame
            && !requestGame.IsGameFinished;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePlayerPanel(this.PanelName, this.PlayerIndex);
                if (ZRSJZ_Game.Instance.Players.every(player => player.IsDead)) {
                    ZRSJZ_Game.Instance.FinishGameByDeath();
                }
                break;
            case "关闭双人模式复活弹窗":
                ZRSJZ_UIManager.Instance.HidePlayerPanel(
                    this.PanelName,
                    this.PlayerIndex,
                    () => {
                        if (canApplyResult()) requestGame.OnPlayerGiveUpResurrection(playerIndex);
                    },
                );
                break;
            case "立即复活":
                Banner.Instance.ShowVideoAd(() => {
                    if (!canApplyResult()) return;
                    ZRSJZ_UIManager.Instance.HidePlayerPanel(panelName, playerIndex, () => {
                        if (!canApplyResult()) return;
                        ZRSJZ_EventManager.Emit(
                            ZRSJZ_MyEvent.ZRSJZ_PLAYER_RESURGENCE,
                            playerIndex,
                        );
                    });
                })
                break;
            case "安全撤离":
                Banner.Instance.ShowVideoAd(() => {
                    if (!canApplyResult()) return;
                    ZRSJZ_UIManager.Instance.HidePlayerPanel(panelName, playerIndex);
                    requestGame.FinishGameByVipEvacuation();
                })
                break;
        }
    }

}
