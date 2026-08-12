import { _decorator, EventTouch, find, Label, Node, ScrollView, tween, Tween, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_Prepare } from '../UI/ZRSJZ_Prepare';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

const GridCol: number = 7;
@ccclass('ZRSJZ_WarehousePanel')
export class ZRSJZ_WarehousePanel extends ZRSJZ_Panel {

    public Prepare: ZRSJZ_Prepare = null;
    public Content: Node = null;
    public ContentUITansform: UITransform = null;
    public ScrollView: ScrollView = null;

    public CheckedNode: Node = null;
    public SellMask: Node = null;
    public SellValue: Label = null;

    private _warehouseName: string = "";
    private _warehouseNode: Node = null;
    private _curInventory: Node = null;
    private _isSelling: boolean = false;
    private _sellPropID: string[] = [];

    protected onLoad(): void {
        this.Prepare = find("Panel/备战", this.node).getComponent(ZRSJZ_Prepare);
        this.Content = find("Panel/仓库/Mask/Content", this.node);
        this.ContentUITansform = this.Content.getComponent(UITransform);
        this.ScrollView = find("Panel/仓库", this.node).getComponent(ScrollView);
        this.CheckedNode = find("Panel/仓库/物品按键/Checked", this.node);
        this.SellMask = find("Panel/Mask", this.node);
        this.SellValue = find("总价值/Count", this.SellMask).getComponent(Label);
        this._warehouseNode = find("Panel/仓库/物品按键/全部", this.node);
    }

    protected onEnable(): void {
        this.Prepare.Show();
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_ADD, this.AddSellProp, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    protected onDisable(): void {
        // 弹窗被死亡流程强制关闭时，批量出售状态也必须一并清理。
        if (this._isSelling) {
            this._isSelling = false;
            this._sellPropID = [];
            if (this.SellMask) this.SellMask.active = false;
            if (this._curInventory?.isValid) {
                ZRSJZ_EventManager.EmitPersist(
                    ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_HIDE,
                    this._curInventory.getComponent(ZRSJZ_Inventory)?.InventoryType,
                );
            }
        }
        if (this.ScrollView) this.ScrollView.enabled = true;
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_ADD, this.AddSellProp, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    protected start(): void {
        this.SwitchButton(this._warehouseNode);
    }

    //#region 仓库
    //初始化仓库
    async ShowInventory(inventoryName: string) {
        if (this._curInventory != null) {
            this._curInventory.active = false;
        }
        this._curInventory = await ZRSJZ_UIManager.Instance.GetInventory(`仓库_${inventoryName}`);
        this._curInventory.active = true;
        this._curInventory.parent = this.Content;
        this._curInventory.setPosition(Vec3.ZERO);
    }

    PropMove(move: boolean) {
        this.ScrollView.enabled = move;
    }

    //#region 按钮点击事件
    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.仓库界面);
                break;
            case "批量出售":
                if (!this._isSelling) {
                    //开始选择售卖
                    this.SellMask.active = true;
                    this._isSelling = true;
                    this._sellPropID = [];
                    this.RefreshSellValue();
                    ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_SHOW, this._curInventory.getComponent(ZRSJZ_Inventory).InventoryType);
                } else {
                    this._isSelling = false;
                    this.SellMask.active = false;
                    //售卖
                    ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_HIDE, this._curInventory.getComponent(ZRSJZ_Inventory).InventoryType);
                    this.SellProp();
                    // console.error(this._sellPropID);
                }
                break;
            case "收藏室":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.收藏室界面);
                break;
            case "Mask":
                this._isSelling = false;
                this.SellMask.active = false;
                this._sellPropID = [];
                this.RefreshSellValue();
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_HIDE, this._curInventory.getComponent(ZRSJZ_Inventory).InventoryType);
                break;
            default:
                this.SwitchButton(event.getCurrentTarget());
                break;
        }
    }

    SwitchButton(warehouseNode: Node) {
        const warehouseName = warehouseNode.name;
        if (this._warehouseName == warehouseName) return;
        this._warehouseName = warehouseName;
        Tween.stopAllByTarget(this.CheckedNode);
        tween(this.CheckedNode)
            .to(0.2, { position: warehouseNode.position.clone() }, { easing: 'backOut' })
            .call(() => {
                this.ShowWarehouseItem(warehouseNode);
            })
            .start();
        this.ShowInventory(warehouseName);
    }

    ShowWarehouseItem(target: Node) {
        if (this._warehouseNode) {
            find("默认", this._warehouseNode).active = true;
            find("选中", this._warehouseNode).active = false;
        }
        this._warehouseNode = target;
        find("默认", this._warehouseNode).active = false;
        find("选中", this._warehouseNode).active = true;
    }

    AddSellProp(propID: string) {
        if (this._sellPropID.includes(propID)) {
            this._sellPropID.splice(this._sellPropID.indexOf(propID), 1);
        } else {
            this._sellPropID.push(propID);
        }
        this.RefreshSellValue();
    }

    SellProp() {
        let totalValue = 0;
        this._sellPropID.forEach(propID => {
            const propData = ZRSJZ_GameData.Instance.PropData[propID];
            if (!propData) return;

            totalValue += propData.UnitPrice * propData.CurCount;
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, propID);
            ZRSJZ_GameData.Instance.RemovePropID(propID);
        });
        if (totalValue > 0) {
            ZRSJZ_GameData.Instance.ChangeGold(totalValue);
            ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
        }
        this._sellPropID = [];
        this.RefreshSellValue();
    }

    private RefreshSellValue() {
        const totalValue = this._sellPropID.reduce((value, propID) => {
            const propData = ZRSJZ_GameData.Instance.PropData[propID];
            return value + (propData ? propData.UnitPrice * propData.CurCount : 0);
        }, 0);
        this.SellValue.string = `${totalValue}`;
    }
}


