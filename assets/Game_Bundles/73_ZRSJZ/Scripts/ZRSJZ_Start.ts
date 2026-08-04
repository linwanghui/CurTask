import { _decorator, Component, director, EventTouch, instantiate, Label, Node, Prefab, tween, v3 } from 'cc';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Start')
export class ZRSJZ_Start extends Component {

    @property(Node)
    Checked: Node = null;

    @property(Node)
    Confirm: Node = null;

    @property(Label)
    ConfirmName: Label = null;

    protected start(): void {
        ZRSJZ_UIManager.Instance;
        ZRSJZ_AudioManager.Instance.PlayMusic("BGM0");
        tween(this.Checked)
            .to(0.5, { scale: v3(1.2, 1.2, 1.2) }, { easing: "sineInOut" })
            .to(0.5, { scale: v3(1, 1, 1) }, { easing: "sineInOut" })
            .union()
            .repeatForever()
            .start();
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHECKED, this.OnMainChecked, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHECKED, this.OnMainChecked, this);
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
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
            case "收藏室":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.收藏室界面);
                break;
            case "盲盒":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.盲盒界面);
                break;
            case "靶场":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.升级弹窗, "靶场");
                break;
            case "研究所":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.升级弹窗, "研究所");
                break;
            case "健身":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.升级弹窗, "健身");
                break;
            case "选择地图":
                director.loadScene("ZRSJZ_Game");
                break;
        }
    }

    OnMainChecked(target: Node, isChecked: boolean) {
        this.ConfirmName.string = target.name;
        this.Confirm.active = isChecked;
        this.Checked.setWorldPosition(target.getWorldPosition().clone());
        this.Checked.active = isChecked;
        this.Confirm.name = target.name;
    }
}


