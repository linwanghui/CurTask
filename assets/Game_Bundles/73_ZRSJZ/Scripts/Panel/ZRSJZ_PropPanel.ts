import { _decorator, Component, EventTouch, find, Label, Node, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_ShopStats } from '../UI/ZRSJZ_ShopStats';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_PROPERTY, ZRSJZ_PROP_PROPERTY_MAX } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_InventoryWeaponry } from '../UI/ZRSJZ_InventoryWeaponry';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PropPanel')
export class ZRSJZ_PropPanel extends ZRSJZ_Panel {
    Name: Label = null;
    PropGrid: Sprite = null;
    PropIcon: Sprite = null;
    Price: Label = null;
    PropDesc1: Node = null;
    PropDesc2: Node = null;
    PropProperty: Node = null;
    LoadBtn: Node = null;
    UnloadBtn: Node = null;
    ReplaceBtn: Node = null;
    SellBtn: Node = null;

    private _propPropertyMap: Map<string, ZRSJZ_ShopStats> = new Map<string, ZRSJZ_ShopStats>();
    private _propID: string = "";
    private _showVersion: number = 0;
    private _isOperating: boolean = false;

    protected onLoad(): void {
        this.Name = find("Panel/PropName", this.node).getComponent(Label);
        this.PropGrid = find("Panel/PropGrid", this.node).getComponent(Sprite);
        this.PropIcon = find("Panel/PropGrid/PropIcon", this.node).getComponent(Sprite);
        this.Price = find("Panel/PropPrice/Price", this.node).getComponent(Label);
        this.PropDesc1 = find("Panel/描述1", this.node);
        this.PropDesc2 = find("Panel/描述2", this.node);
        this.PropProperty = find("Panel/属性", this.node);
        this.LoadBtn = find("Panel/Buttons/装备", this.node);
        this.UnloadBtn = find("Panel/Buttons/卸下", this.node);
        this.ReplaceBtn = find("Panel/Buttons/替换", this.node);
        this.SellBtn = find("Panel/Buttons/出售", this.node);

        this.PropProperty.children.forEach(child => {
            const shopStats = child.getComponent(ZRSJZ_ShopStats);
            shopStats.Init();
            this._propPropertyMap.set(child.name, shopStats);
        });
    }

    Show(...args: any[]) {
        super.Show();
        this.ShowProp(args[0]);
    }

    async ShowProp(propID: string) {
        const propData = ZRSJZ_GameData.Instance.PropData[propID];
        if (!propData) {
            console.error("没找到道具Id:", propID);
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.道具弹窗);
            return;
        }
        const propConfig = ZRSJZ_PROP_CONFIG.get(propData.Name);
        if (!propConfig) {
            console.error("没找到道具配置:", propData.Name);
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.道具弹窗);
            return;
        }

        this._propID = propID;
        this._isOperating = false;
        const showVersion = ++this._showVersion;
        this.Name.string = propData.Name;
        this.Price.string = `${propData.UnitPrice * propData.CurCount}`;
        if (ZRSJZ_PROP_PROPERTY.has(propData.Name)) {
            //有属性
            this.PropDesc1.active = true;
            this.PropDesc2.active = false;
            this.PropProperty.active = true;
            //显示desc
            find("Desc", this.PropDesc1).getComponent(Label).string = `${propConfig.Description}`;
            //显示属性
            const propProperty = ZRSJZ_PROP_PROPERTY.get(propData.Name);
            for (const [key, propStats] of this._propPropertyMap) {
                if (propProperty.hasOwnProperty(key)) {
                    propStats.Show(propProperty[key], ZRSJZ_PROP_PROPERTY_MAX.get(key))
                } else {
                    propStats.Hide();
                }
            }
        } else {
            this.PropDesc1.active = false;
            this.PropDesc2.active = true;
            this.PropProperty.active = false;
            find("Desc", this.PropDesc2).getComponent(Label).string = `${propConfig.Description}`;
        }
        //显示按钮
        if (propConfig.PropType == "物品" || propConfig.PropType == "弹药") {
            this.LoadBtn.active = false;
            this.UnloadBtn.active = false;
            this.ReplaceBtn.active = false;
            this.SellBtn.active = !ZRSJZ_UIManager.IsBattle;
        } else {
            const isLockedEquipment = propData.CurInventory === ZRSJZ_INVENTORY.武器_刀
                || (
                    ZRSJZ_UIManager.IsBattle
                    && propData.CurInventory === ZRSJZ_INVENTORY.武器_背包
                );
            if (isLockedEquipment) {
                this.LoadBtn.active = false;
                this.UnloadBtn.active = false;
                this.ReplaceBtn.active = false;
                this.SellBtn.active = false;
            } else {
                const isLoading = ZRSJZ_GameData.Instance.WeaponryID.includes(propID);
                this.UnloadBtn.active = isLoading;
                const weaponIndex = ZRSJZ_Tools.GetWeaponryIndexByType(propConfig.PropType);
                const isHaveWeapon = ZRSJZ_GameData.Instance.WeaponryID[weaponIndex] != "";
                this.LoadBtn.active = !isLoading && !isHaveWeapon;
                this.ReplaceBtn.active = !isLoading && isHaveWeapon;
                this.SellBtn.active = !ZRSJZ_UIManager.IsBattle;
            }
        }

        const [gridSpriteFrame, propSpriteFrame] = await Promise.all([
            ZRSJZ_UIManager.Instance.GetPropGridUI(`${propConfig.Quality}1_2`),
            ZRSJZ_UIManager.Instance.GetPropUI(propData.Name),
        ]);
        if (showVersion !== this._showVersion || this._propID !== propID || !this.node.active) return;
        this.PropGrid.spriteFrame = gridSpriteFrame;
        this.PropIcon.spriteFrame = propSpriteFrame;
        ZRSJZ_Tools.ScaleNodeToFit(this.PropIcon.node, 269 - 30, 132 - 30);
    }

    async OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
                this.ClosePanel();
                break;
            case "卸下":
                await this.UnloadProp();
                break;
            case "装备":
                await this.EquipProp(false);
                break;
            case "替换":
                await this.EquipProp(true);
                break;
            case "出售":
                await this.SellProp();
                break;
        }
    }

    private ClosePanel() {
        this._showVersion++;
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.道具弹窗);
    }

    private GetWeaponryInventory(propType: string): ZRSJZ_INVENTORY {
        const inventories = [
            ZRSJZ_INVENTORY.武器_枪,
            ZRSJZ_INVENTORY.武器_头盔,
            ZRSJZ_INVENTORY.武器_防弹衣,
            ZRSJZ_INVENTORY.武器_背包,
            ZRSJZ_INVENTORY.武器_刀,
        ];
        return inventories[ZRSJZ_Tools.GetWeaponryIndexByType(propType)];
    }

    private async EquipProp(isReplace: boolean) {
        if (this._isOperating) return;
        const propData = ZRSJZ_GameData.Instance.PropData[this._propID];
        if (!propData) return;

        const inventoryType = this.GetWeaponryInventory(propData.PropType);
        const inventory = ZRSJZ_UIManager.Instance.InventoryMap
            .get(inventoryType)?.getComponent(ZRSJZ_InventoryWeaponry);
        if (!inventory) {
            console.error("装备栏尚未初始化:", inventoryType);
            return;
        }

        this._isOperating = true;
        try {
            const success = isReplace
                ? await inventory.ReplaceProp(this._propID)
                : await inventory.ChangeGrid(this._propID);
            if (success) this.ClosePanel();
        } finally {
            this._isOperating = false;
        }
    }

    private async UnloadProp() {
        if (this._isOperating) return;
        const propData = ZRSJZ_GameData.Instance.PropData[this._propID];
        if (!propData) return;

        const weaponryInventory = ZRSJZ_UIManager.Instance.InventoryMap
            .get(propData.CurInventory)?.getComponent(ZRSJZ_InventoryWeaponry);
        if (!weaponryInventory) return;

        this._isOperating = true;
        try {
            if (ZRSJZ_UIManager.IsBattle) {
                const backpack = ZRSJZ_UIManager.Instance.InventoryMap
                    .get(ZRSJZ_INVENTORY.背包)?.getComponent(ZRSJZ_Inventory);
                if (!backpack) return;

                // 由背包先完成容量、旋转和整理判断；成功转移后装备栏才会被清空。
                const hasEnoughGridCount = backpack.HasEnoughEmptyGridCount(this._propID);
                const success = await backpack.TryReceiveProp(
                    propData.CurInventory,
                    this._propID,
                    true,
                );
                if (!success) {
                    ZRSJZ_UIManager.Instance.ShowTip(
                        hasEnoughGridCount
                            ? "装备无法存放"
                            : "背包空间不足，无法卸下装备",
                    );
                    return;
                }
                this.ClosePanel();
                return;
            }

            const targetInventory = ZRSJZ_Tools.GetInventoryByPropType(propData.PropType);
            if (!targetInventory) return;
            await weaponryInventory.RemoveProp(this._propID);
            ZRSJZ_GameData.Instance.MovePropToInventory(this._propID, targetInventory, 1, -1, -1);
            await this.RefreshWarehouseInventories(targetInventory);
            this.ClosePanel();
        } finally {
            this._isOperating = false;
        }
    }

    private async SellProp() {
        if (this._isOperating) return;
        const propData = ZRSJZ_GameData.Instance.PropData[this._propID];
        if (!propData) return;

        this._isOperating = true;
        try {
            // 先等待各库存清理节点，避免删除数据后异步刷新仍访问该道具。
            for (const inventoryNode of ZRSJZ_UIManager.Instance.InventoryMap.values()) {
                const inventory = inventoryNode.getComponent(ZRSJZ_Inventory);
                if (inventory?.Grids.some(row => row.includes(this._propID))) {
                    await inventory.RemoveProp(this._propID);
                }
            }
            ZRSJZ_GameData.Instance.ChangeGold(propData.UnitPrice * propData.CurCount);
            ZRSJZ_GameData.Instance.RemovePropID(this._propID);
            this.ClosePanel();
        } finally {
            this._isOperating = false;
        }
    }

    private async RefreshWarehouseInventories(targetInventory: ZRSJZ_INVENTORY) {
        const inventories = [ZRSJZ_INVENTORY.仓库_全部, targetInventory];
        for (const inventoryType of inventories) {
            const inventory = ZRSJZ_UIManager.Instance.InventoryMap
                .get(inventoryType)?.getComponent(ZRSJZ_Inventory);
            if (inventory) await inventory.ShowPropItem();
        }
    }

}
