import { _decorator, Component, director, EventTouch, Node } from 'cc';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_Tools } from './ZRSJZ_Tools';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
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
            case "更多游戏":
                BundleManager.LoadBundle("73_ZRSJZ_DLC_BNS", () => {
                    director.loadScene("ZRSJZ_BNS_Game");
                })
                break;
        }
    }
}


