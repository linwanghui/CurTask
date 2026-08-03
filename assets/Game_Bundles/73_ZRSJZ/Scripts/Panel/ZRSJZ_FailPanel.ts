import { _decorator, Component, EventTouch, find, Label, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_FailPanel')
export class ZRSJZ_FailPanel extends ZRSJZ_Panel {

    BattleTime: Label = null;
    KillCount: Label = null;
    Point: Node = null;

    protected onLoad(): void {
        this.BattleTime = find("Panel/Desc/对局时间/Count", this.node).getComponent(Label);
        this.KillCount = find("Panel/Desc/击杀人数/Count", this.node).getComponent(Label);
        this.Point = find("Panel/FailPoint", this.node);
    }


    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.失败弹窗);
                break;
        }
    }

}


