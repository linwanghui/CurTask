import { _decorator, EventTouch, find, Label, Node, ScrollView } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_Prepare } from '../UI/ZRSJZ_Prepare';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BackpackPanel')
export class ZRSJZ_BackpackPanel extends ZRSJZ_Panel {

    Prepare: ZRSJZ_Prepare = null;
    BackpackContent: Node = null;
    public ScrollView: ScrollView = null;
    private _totalValue: Label = null;
    private _discardArea: Node = null;

    protected onLoad(): void {
        this.Prepare = find("Panel/备战", this.node).getComponent(ZRSJZ_Prepare);
        this.BackpackContent = find("Panel/背包/View/Content", this.node);
        this.ScrollView = find("Panel/背包", this.node).getComponent(ScrollView);
        this._totalValue = find("Panel/背包总价值/Count", this.node).getComponent(Label);
        this._discardArea = find("Panel/丢弃范围", this.node);
    }


    protected onEnable(): void {
        this.Prepare.Show(true);
        this.ShowBackpack();
        this.RefreshTotalValue();
        ZRSJZ_UIManager.Instance.RegisterDiscardArea(this._discardArea);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshTotalValue, this);
    }

    protected onDisable(): void {
        if (this._discardArea) this._discardArea.active = false;
        ZRSJZ_UIManager.Instance.UnregisterDiscardArea(this._discardArea);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshTotalValue, this);
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.背包弹窗);
                break;
        }
    }

    PropMove(move: boolean) {
        this.ScrollView.enabled = move;
    }

    private RefreshTotalValue() {
        const totalValue = ZRSJZ_GameData.Instance.GetInventoryTotalValue([
            ZRSJZ_INVENTORY.背包,
            ZRSJZ_INVENTORY.保险箱,
        ]);
        this._totalValue.string = `${totalValue}`;
    }

    ShowBackpack() {
        ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.背包).then(backpack => {
            backpack.parent = this.BackpackContent;
            backpack.setPosition(0, 0, 0);
            backpack.active = true;
        });
    }

}


