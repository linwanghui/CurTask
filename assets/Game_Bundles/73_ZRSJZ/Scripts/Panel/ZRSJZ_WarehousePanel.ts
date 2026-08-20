import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, EventTouch, find, Label, Node, ScrollView, tween, Tween, UIOpacity, UITransform, v2, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_Prepare } from '../UI/ZRSJZ_Prepare';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

const GridCol: number = 7;
@ccclass('ZRSJZ_WarehousePanel')
export class ZRSJZ_WarehousePanel extends ZRSJZ_Panel {

    PanelUIOpacity: UIOpacity = null;

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
    private _warehouseButtons: Node[] = [];
    private _playerLoadoutRefreshTask: Promise<void> = Promise.resolve();

    protected onLoad(): void {
        this.Prepare = find("Panel/备战", this.node).getComponent(ZRSJZ_Prepare);
        this.Content = find("Panel/仓库/Mask/Content", this.node);
        this.ContentUITansform = this.Content.getComponent(UITransform);
        this.ScrollView = find("Panel/仓库", this.node).getComponent(ScrollView);
        this.CheckedNode = find("Panel/仓库/物品按键/Checked", this.node);
        this.SellMask = find("Panel/Mask", this.node);
        this.SellValue = find("总价值/Count", this.SellMask).getComponent(Label);
        this._warehouseNode = find("Panel/仓库/物品按键/全部", this.node);
        const buttonParent = this._warehouseNode?.parent;
        this._warehouseButtons = ["全部", "装备", "武器", "弹药", "物品"]
            .map(name => buttonParent?.getChildByName(name))
            .filter(button => button != null);
        this.RefreshWarehouseLocks();
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_ADD, this.AddSellProp, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_WAREHOUSE_DROP, this.OnWarehouseDrop, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_LOADOUT_PLAYER_CHANGE, this.OnLoadoutPlayerChange, this);
        this.OnLoadoutPlayerChange();
        this.RefreshWarehouseLocks();
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
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_WAREHOUSE_DROP, this.OnWarehouseDrop, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_LOADOUT_PLAYER_CHANGE, this.OnLoadoutPlayerChange, this);
        this.ClearWarehouseDropFeedback();
    }

    protected start(): void {
        this.SwitchButton(this._warehouseNode);
    }

    // Show(...args: any[]) {
    //     if (!this.PanelUIOpacity) {
    //         this.Panel = find("Panel", this.node);
    //         this.PanelUIOpacity = this.Panel.getComponent(UIOpacity);
    //     }
    //     Tween.stopAllByTarget(this.PanelUIOpacity);
    //     this.PanelUIOpacity.opacity = 0;
    //     this.node.active = true;
    //     tween(this.PanelUIOpacity)
    //         .to(0.3, { opacity: 255 }, { easing: 'backOut' })
    //         .start();
    // }

    private OnLoadoutPlayerChange(): void {
        this._playerLoadoutRefreshTask = this._playerLoadoutRefreshTask.then(
            () => this.RefreshPlayerLoadout(),
            () => this.RefreshPlayerLoadout(),
        );
    }

    private async RefreshPlayerLoadout(): Promise<void> {
        const playerIndex = ZRSJZ_InventoryService.GetActivePlayerIndex();
        if (this.node.activeInHierarchy) await this.Prepare.Show(false, playerIndex);
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
        if (!warehouseNode) return;
        const inventory = this.GetWarehouseInventory(warehouseNode.name);
        if (!ZRSJZ_InventoryService.IsWarehouseUnlocked(inventory)) {
            ZRSJZ_UIManager.Instance.ShowPanel(
                ZRSJZ_PANEL.解锁仓库弹窗,
                warehouseNode.name,
                inventory,
                () => {
                    this.RefreshWarehouseLocks();
                    if (this.node.activeInHierarchy && warehouseNode.isValid) {
                        this.SwitchButton(warehouseNode);
                    }
                },
            );
            return;
        }
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

    /** 外部解锁系统可直接调用，例如 panel.UnlockWarehouse(ZRSJZ_INVENTORY.仓库_武器)。 */
    public UnlockWarehouse(inventory: ZRSJZ_INVENTORY): boolean {
        const unlocked = ZRSJZ_InventoryService.UnlockWarehouse(inventory);
        this.RefreshWarehouseLocks();
        return unlocked;
    }

    private GetWarehouseInventory(name: string): ZRSJZ_INVENTORY {
        return `仓库_${name}` as ZRSJZ_INVENTORY;
    }

    private RefreshWarehouseLocks(): void {
        for (const button of this._warehouseButtons) {
            const inventory = this.GetWarehouseInventory(button.name);
            const locked = !ZRSJZ_InventoryService.IsWarehouseUnlocked(inventory);
            const lockNode = button.getChildByName("锁");
            if (lockNode) lockNode.active = locked;
            const checkedTrue = button.getChildByName("Checked_True");
            const checkedFalse = button.getChildByName("Checked_False");
            if (checkedTrue) checkedTrue.active = false;
            if (checkedFalse) checkedFalse.active = false;
        }
    }

    private OnWarehouseDrop(
        sourceInventory: ZRSJZ_INVENTORY,
        propID: string,
        worldPos: Vec3,
        isConfirm: boolean,
        setHandled: (handled: boolean) => void,
    ): void {
        this.ClearWarehouseDropFeedback();
        if (!worldPos) return;

        const targetButton = this._warehouseButtons.find(button =>
            button.getComponent(UITransform)?.getBoundingBoxToWorld().contains(v2(worldPos.x, worldPos.y))
        );
        if (!targetButton) return;

        const targetInventory = this.GetWarehouseInventory(targetButton.name);
        const unlocked = ZRSJZ_InventoryService.IsWarehouseUnlocked(targetInventory);
        const adaptive = this.CanPropEnterWarehouse(propID, targetInventory);
        const canTransfer = unlocked && adaptive && targetInventory !== sourceInventory;
        const feedback = targetButton.getChildByName(canTransfer ? "Checked_True" : "Checked_False");
        if (feedback) feedback.active = true;

        if (!isConfirm) return;

        // 命中按钮区后由仓库面板消费本次松手，锁定或不适配时也不能落入下方库存。
        setHandled?.(true);
        this.ClearWarehouseDropFeedback();
        if (targetInventory === sourceInventory) {
            ZRSJZ_UIManager.Instance.ShowTip("道具已经在该仓库中");
            return;
        }
        if (!unlocked) {
            ZRSJZ_UIManager.Instance.ShowTip(`${targetButton.name}仓库尚未解锁`);
            return;
        }

        const propData = ZRSJZ_GameData.Instance.PropData[propID];
        if (!propData) return;
        if (!adaptive) {
            ZRSJZ_UIManager.Instance.ShowTip(`该道具不能放入${targetButton.name}仓库`);
            return;
        }
        void this.TransferPropToWarehouse(sourceInventory, targetInventory, targetButton.name, propID);
    }

    private ClearWarehouseDropFeedback(): void {
        for (const button of this._warehouseButtons) {
            const checkedTrue = button.getChildByName("Checked_True");
            const checkedFalse = button.getChildByName("Checked_False");
            if (checkedTrue) checkedTrue.active = false;
            if (checkedFalse) checkedFalse.active = false;
        }
    }

    private CanPropEnterWarehouse(propID: string, inventory: ZRSJZ_INVENTORY): boolean {
        const propType = ZRSJZ_GameData.Instance.PropData[propID]?.PropType;
        if (!propType) return false;
        switch (inventory) {
            case ZRSJZ_INVENTORY.仓库_全部:
                return true;
            case ZRSJZ_INVENTORY.仓库_装备:
                return propType === "头盔" || propType === "防弹衣" || propType === "背包";
            case ZRSJZ_INVENTORY.仓库_武器:
                return propType === "枪" || propType === "刀";
            case ZRSJZ_INVENTORY.仓库_弹药:
                return propType === "弹药";
            case ZRSJZ_INVENTORY.仓库_物品:
                return propType === "物品" || propType === "门禁卡" || propType === "房卡";
            default:
                return false;
        }
    }

    private async TransferPropToWarehouse(
        sourceInventory: ZRSJZ_INVENTORY,
        targetInventory: ZRSJZ_INVENTORY,
        targetName: string,
        propID: string,
    ): Promise<void> {
        try {
            const targetNode = await ZRSJZ_UIManager.Instance.GetInventory(targetInventory);
            const target = targetNode?.getComponent(ZRSJZ_Inventory);
            if (!target || !target.IsAdaptive(propID)) {
                await ZRSJZ_UIManager.Instance.ShowTip(`该道具不能放入${targetName}仓库`);
                return;
            }
            const moved = await target.TryReceiveProp(sourceInventory, propID, true);
            if (!moved) {
                await ZRSJZ_UIManager.Instance.ShowTip(`${targetName}仓库空间不足`);
            }
        } finally {
            // 成功、失败或异步加载异常都恢复两边仓库的格子显示状态。
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, sourceInventory);
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, targetInventory);
        }
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
            ZRSJZ_InventoryService.RemovePropID(propID);
        });
        if (totalValue > 0) {
            ZRSJZ_AccountService.ChangeGold(totalValue);
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


