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
                    () => ZRSJZ_Game.Instance.OnPlayerGiveUpResurrection(this.PlayerIndex),
                );
                break;
            case "立即复活":
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_UIManager.Instance.HidePlayerPanel(this.PanelName, this.PlayerIndex, () => {
                        ZRSJZ_EventManager.Emit(
                            ZRSJZ_MyEvent.ZRSJZ_PLAYER_RESURGENCE,
                            this.PlayerIndex,
                        );
                    });
                })
                break;
            case "安全撤离":
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_UIManager.Instance.HidePlayerPanel(this.PanelName, this.PlayerIndex);
                    ZRSJZ_Game.Instance.FinishGameByVipEvacuation();
                })
                break;
        }
    }

}
