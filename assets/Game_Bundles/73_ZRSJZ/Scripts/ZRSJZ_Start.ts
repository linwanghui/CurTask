import { _decorator, Component, director, EventTouch, Node } from 'cc';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_Tools } from './ZRSJZ_Tools';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Start')
export class ZRSJZ_Start extends Component {
    protected start(): void {
        ZRSJZ_UIManager.Instance;
    }

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "商店":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.商店界面);
                break;
            case "仓库":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.仓库界面);
                break;
            case "干员":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.角色界面);
                break;
            case "切换武器":
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON);
                break;
            case "背包":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.背包弹窗);
                break;
            case "开始行动":
                director.loadScene("ZRSJZ_Game");
                break;
            case "更多游戏":
                BundleManager.LoadBundle("73_ZRSJZ_DLC_BNS", () => {
                    director.loadScene("ZRSJZ_BNS_Game");
                })
                break;
            case "BGM0":
                ZRSJZ_AudioManager.Instance.PlayMusic("BGM0")
                break;
            case "BGM1":
                ZRSJZ_AudioManager.Instance.PlayMusic("BGM1")
                break;
            case "紫":
                ZRSJZ_AudioManager.Instance.PlayMusic("紫")
                break;
            case "枪声":
                ZRSJZ_AudioManager.Instance.PlaySound("枪声")
                break;
        }
    }
}


