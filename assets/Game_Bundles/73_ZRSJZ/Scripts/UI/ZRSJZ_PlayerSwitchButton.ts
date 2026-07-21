import { _decorator, Component, EventTouch, find, Node, tween, Tween, Vec3 } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PlayerSwitchButton')
export class ZRSJZ_PlayerSwitchButton extends Component {
    public static CurPlayer: string = "1p";

    Checked: Node = null;
    Checked_1p: Node = null;
    Checked_2p: Node = null;

    protected onLoad(): void {
        this.Checked = find("Checked", this.node);
        this.Checked_1p = find("Checked_1p", this.node);
        this.Checked_2p = find("Checked_2p", this.node);
    }

    protected onEnable(): void {
        ZRSJZ_PlayerSwitchButton.CurPlayer = "1p";
        this.ButtonTween(-1);
    }

    OnButtonClick(event: EventTouch) {
        const buttonName = event.getCurrentTarget().name;
        if (buttonName == ZRSJZ_PlayerSwitchButton.CurPlayer) return;
        ZRSJZ_PlayerSwitchButton.CurPlayer = buttonName;
        switch (buttonName) {
            case "1p":
                this.ButtonTween(-1);
                break;
            case "2p":
                this.ButtonTween(1);
                break;
        }
    }

    ButtonTween(player: number) {
        Tween.stopAllByTarget(this.Checked);
        tween(this.Checked)
            .to(0.2, { x: player * 82 }, { easing: 'backOut' })
            .call(() => {
                this.Checked_1p.active = player == -1;
                this.Checked_2p.active = player == 1;
                const roleName = ZRSJZ_GameData.Instance.CurRole[ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1];
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, roleName);
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, roleName);
            })
            .start();
    }
}


