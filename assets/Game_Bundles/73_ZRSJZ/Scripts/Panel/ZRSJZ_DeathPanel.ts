import { _decorator, Component, EventTouch, Node } from 'cc';
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

    public OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.死亡弹窗);
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.失败弹窗, "死亡", ZRSJZ_Game.Instance.GetGameTime(), ZRSJZ_Game.Instance.GetKillCount());
                break;
            case "立即复活":
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.死亡弹窗, () => {
                        ZRSJZ_Game.Instance.GamePaused = false;
                        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_RESURGENCE);
                    });
                })
                break;
            case "安全撤离":
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.死亡弹窗);
                    ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.胜利弹窗, "VIP通道", ZRSJZ_Game.Instance.GetGameTime(), ZRSJZ_Game.Instance.GetKillCount(), ZRSJZ_Game.Instance.GetAllGoodsID());
                })
                break;
        }
    }

}


