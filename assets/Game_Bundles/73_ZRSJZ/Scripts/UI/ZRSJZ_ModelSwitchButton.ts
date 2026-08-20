import { _decorator, Component, EventTouch, find, Node, tween, Tween } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ModelSwitchButton')
export class ZRSJZ_ModelSwitchButton extends Component {

    Checked: Node = null;
    Checked_1p: Node = null;
    Checked_2p: Node = null;

    protected onLoad(): void {
        this.Checked = find("Checked", this.node);
        this.Checked_1p = find("Checked_1p", this.node);
        this.Checked_2p = find("Checked_2p", this.node);
    }

    protected start(): void {
        ZRSJZ_GameData.Instance.CurModel === "1p" ? this.ButtonTween(-1) : this.ButtonTween(1);
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        const buttonName = event.getCurrentTarget().name;
        if (buttonName == ZRSJZ_GameData.Instance.CurModel) return;
        ZRSJZ_GameData.Instance.CurModel = buttonName;
        ZRSJZ_GameData.SaveData();
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
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MODEL_SWITCH);
            })
            .start();
    }
}


