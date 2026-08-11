import { _decorator, Component, EventTouch, Label, Node, Tween, tween, v3 } from 'cc';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_LoadingPanel } from './Panel/ZRSJZ_LoadingPanel';
import { ZRSJZ_SignInPanel } from './Panel/ZRSJZ_SignInPanel';
import { ZRSJZ_GameData } from './ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Start')
export class ZRSJZ_Start extends Component {

    @property(Node)
    Checked: Node = null;

    @property(Node)
    Confirm: Node = null;

    @property(Node)
    NameNode: Node = null;

    @property(Label)
    NameLabel: Label = null;

    @property(Node)
    SignBtn: Node = null;

    protected start(): void {
        ZRSJZ_UIManager.Instance;
        tween(this.Checked)
            .to(0.5, { scale: v3(1.2, 1.2, 1.2) }, { easing: "sineInOut" })
            .to(0.5, { scale: v3(1, 1, 1) }, { easing: "sineInOut" })
            .union()
            .repeatForever()
            .start();
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.加载界面);
        if (ZRSJZ_GameData.Instance.CanClaimSignInReward()) {
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.签到弹窗);
        }
        this.SignBtn.active = !ZRSJZ_GameData.Instance.IsSignInCompleted();
        ZRSJZ_AudioManager.Instance.PlayMusic("BGM", true, 0.3);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHECKED, this.OnMainChecked, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_AUDIO_INIT, () => {
            ZRSJZ_AudioManager.Instance.PlayMusic("BGM", true, 0.3);
        })
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHECKED, this.OnMainChecked, this);
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Switch":
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON);
                break;
            case "Slide":
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE);
                break;
            case "商城":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.商店界面);
                break;
            case "仓库":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.仓库界面);
                break;
            case "角色":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.角色界面);
                break;
            case "收藏室":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.收藏室界面);
                break;
            case "盲盒":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.盲盒界面);
                break;
            case "强化":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.强化界面);
                break;
            case "开始游戏":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.选关界面);
                break;
            case "签到":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.签到弹窗);
                break;
        }
    }

    OnMainChecked(target: Node, isChecked: boolean) {
        this.NameLabel.string = target.name;
        this.Confirm.active = isChecked;
        this.Checked.setWorldPosition(target.getWorldPosition().clone());
        this.Checked.active = isChecked;
        this.Confirm.name = target.name;
        this.NameNode.active = isChecked;
        if (isChecked) {
            Tween.stopAllByTarget(this.NameNode);
            this.NameNode.setWorldPosition(target.getWorldPosition().clone());
            tween(this.NameNode)
                .to(0.5, { worldPosition: target.getWorldPosition().clone().add3f(0, 300, 0) }, { easing: "backOut" })
                .start();
        }
    }
}


