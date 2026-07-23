import { _decorator, Component, EventTouch, find, Node, ScrollView } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_Prepare } from '../UI/ZRSJZ_Prepare';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BackpackPanel')
export class ZRSJZ_BackpackPanel extends ZRSJZ_Panel {

    Prepare: ZRSJZ_Prepare = null;
    BackpackContent: Node = null;
    public ScrollView: ScrollView = null;

    protected onLoad(): void {
        this.Prepare = find("Panel/备战", this.node).getComponent(ZRSJZ_Prepare);
        this.BackpackContent = find("Panel/背包/View/Content", this.node);
        this.ScrollView = find("Panel/背包", this.node).getComponent(ScrollView);
    }

    protected async start() {
        const backpack = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.背包);
        backpack.parent = this.BackpackContent;
        backpack.setPosition(0, 0, 0);
        backpack.active = true;
    }

    protected onEnable(): void {
        this.Prepare.Show(true);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.背包弹窗);
                break;
        }
    }

    PropMove(move: boolean) {
        this.ScrollView.enabled = move;
    }

}


