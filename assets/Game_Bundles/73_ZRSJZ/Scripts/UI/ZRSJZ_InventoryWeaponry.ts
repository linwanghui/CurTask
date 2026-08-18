import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { _decorator, Component, Node, Sprite, UITransform, v2, Vec3 } from 'cc';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_GRID_INTERVAL, ZRSJZ_GRID_SIZE, ZRSJZ_INVENTORY, ZRSJZ_INVENTORY_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_PropGrid } from './ZRSJZ_PropGrid';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_InventoryWeaponry')
export class ZRSJZ_InventoryWeaponry extends ZRSJZ_Inventory {

    private _weaponryIndex: number = 0;
    private _Normal: Node = null;
    private _GridSprite: Sprite = null;
    async Init(inventoryType: ZRSJZ_INVENTORY) {
        this._Normal = this.node.getChildByName("Normal");
        this._GridSprite = this.getComponent(Sprite);
        this.UITransform = this.getComponent(UITransform);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this.CheckProp, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, this.RemoveProp, this);
        for (const child of this.node.children.slice()) {
            if (child !== this._Normal && child.getComponent(ZRSJZ_PropGrid)) {
                ZRSJZ_PoolManager.Instance.PutNode(child);
            }
        }
        // this.ScaleNodeToFit(this._Normal);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this.CheckProp, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, this.RemoveProp, this);
        this.InventoryType = inventoryType;
        this._weaponryIndex = ZRSJZ_Tools.GetWeaponryIndexByInventory(inventoryType);
        this.Grids = [[""]];
        const id = ZRSJZ_InventoryService.GetWeaponryIDs()[this._weaponryIndex];
        if (id != "") {
            this.createWeapon(id);
        }

        this._Normal.active = id == "";

        if (this.node.active) {
            this.ShowPropItem();
        }
    }

    //道具拉动
    async CheckProp(inventory: ZRSJZ_INVENTORY, id: string, worldPos: Vec3, isConfirm: boolean) {
        if (!this.IsVisible || this.checkID(id)) return;
        if (this.node.active) {
            this._GridSprite.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropGridUI(this.InventoryType == ZRSJZ_INVENTORY.武器_枪 ? "枪_灰" : "空格子_灰");
            if (this.UITransform?.getBoundingBoxToWorld().contains(v2(worldPos.x, worldPos.y))) {
                //确定修改
                if (isConfirm) {
                    if (this.IsAdaptive(id)) {
                        if (this.Grids[0][0] === "") {
                            await this.ChangeGrid(id);
                        } else {
                            await this.ReplaceProp(id);
                        }
                    }
                } else {
                    const propType: string = this.Grids[0][0] === "" && this.IsAdaptive(id) ? "绿" : "红";
                    const gridName: string = this.InventoryType == ZRSJZ_INVENTORY.武器_枪 ? "枪_" : "空格子_";
                    this._GridSprite.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropGridUI(gridName + propType);
                }
            }
        }
    }

    async ChangeGrid(id: string): Promise<boolean> {

        const propData = ZRSJZ_GameData.Instance.PropData[id];
        if (!propData) return false;

        // 仓库_全部是综合视图，实际归属仍使用道具对应的分类仓库。
        const targetInventory = this.InventoryType;
        if (!targetInventory) return false;


        // 道具可能同时显示在“仓库_全部”和分类仓库中，跨仓库时一并清除旧映射。
        const inventoryNodes = Array.from(ZRSJZ_UIManager.Instance.InventoryMap.values());
        for (const inventoryNode of inventoryNodes) {
            const sourceInventory = inventoryNode.getComponent(ZRSJZ_Inventory);
            if (!sourceInventory) continue;
            if (sourceInventory.Grids.some(row => row.includes(id))) {
                await sourceInventory.RemoveProp(id);
            }
        }

        // 必须先等待装备栏与 WeaponryID 更新完成，再广播外观事件。
        // 局内摇杆收到外观事件后会根据最新装备切换角色武器动画。
        await this.createWeapon(id, false);
        ZRSJZ_EventManager.EmitPersist(
            ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT,
            ZRSJZ_GameData.Instance.PropData[id].Name,
            true,
            ZRSJZ_InventoryService.GetActivePlayerIndex(),
        );
        return true;
    }

    public async TryReceiveProp(
        _sourceInventory: ZRSJZ_INVENTORY,
        id: string,
        _organizeBeforePlacement: boolean = false,
    ): Promise<boolean> {
        if (!this.IsAdaptive(id)) return false;
        return this.Grids[0][0] === ""
            ? this.ChangeGrid(id)
            : this.ReplaceProp(id);
    }

    async ReplaceProp(id: string) {
        const propData = ZRSJZ_GameData.Instance.PropData[id];
        if (!propData) return false;

        // 仓库_全部是综合视图，实际归属仍使用道具对应的分类仓库。
        const targetInventory = this.InventoryType;
        if (!targetInventory) return false;


        // 道具可能同时显示在“仓库_全部”和分类仓库中，跨仓库时一并清除旧映射。
        const inventoryNodes = Array.from(ZRSJZ_UIManager.Instance.InventoryMap.values());
        for (const inventoryNode of inventoryNodes) {
            const sourceInventory = inventoryNode.getComponent(ZRSJZ_Inventory);
            if (!sourceInventory) continue;
            if (sourceInventory.Grids.some(row => row.includes(id))) {
                await sourceInventory.Replace(id, this.Grids[0][0]);
                const propNode = this.node.children.find(child => {
                    const propGrid = child.getComponent(ZRSJZ_PropGrid);
                    return propGrid?.PropID === this.Grids[0][0];
                });
                if (propNode) {
                    ZRSJZ_PoolManager.Instance.PutNode(propNode);
                }
            }
        }

        // 替换武器同样要先提交新装备数据，避免动画刷新时仍读取旧武器。
        await this.createWeapon(id, false);
        ZRSJZ_EventManager.EmitPersist(
            ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT,
            ZRSJZ_GameData.Instance.PropData[id].Name,
            true,
            ZRSJZ_InventoryService.GetActivePlayerIndex(),
        );
        return true;
    }

    private ScaleNodeToFit(targetNode: Node): void {
        if (!targetNode) {
            return;
        }

        const parentUITransform = this.getComponent(UITransform);
        const propGrid = targetNode.getComponent(ZRSJZ_PropGrid);
        const propData = propGrid?.PropData;
        if (!parentUITransform || !propGrid || !propData) {
            return;
        }

        const parentWidth = parentUITransform.width;
        const parentHeight = parentUITransform.height;
        // 使用配置中的逻辑占格尺寸，不使用贴图 RAW 模式产生的原始像素尺寸。
        // 枪械是 2×1 格，对应枪槽 269×132，正常情况下不应被再次缩小。
        const targetWidth = propData.Width * ZRSJZ_GRID_SIZE
            + Math.max(0, propData.Width - 1) * ZRSJZ_GRID_INTERVAL;
        const targetHeight = propData.Height * ZRSJZ_GRID_SIZE
            + Math.max(0, propData.Height - 1) * ZRSJZ_GRID_INTERVAL;

        if (parentWidth <= 0 || parentHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
            return;
        }

        const scaleX = parentWidth / targetWidth;
        const scaleY = parentHeight / targetHeight;
        const scale = Math.floor(Math.min(1, scaleX, scaleY) * 100);

        propGrid.CurScale = Math.max(0.01, scale / 100);
    }

    async RemoveProp(id: string, isRemoveProp: boolean = true) {
        if (this.Grids[0][0] == id) {
            const propName = ZRSJZ_GameData.Instance.PropData[id]?.Name;
            this.Grids[0][0] = "";
            const propNode = this.node.children.find(child => {
                const propGrid = child.getComponent(ZRSJZ_PropGrid);
                return propGrid?.PropID === id;
            });
            if (propNode && isRemoveProp) {
                propNode.getComponent(ZRSJZ_PropGrid).CurScale = 1;
                ZRSJZ_PoolManager.Instance.PutNode(propNode);
            }
            ZRSJZ_InventoryService.SetWeaponry(this._weaponryIndex, "");
            this._GridSprite.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropGridUI(this.InventoryType == ZRSJZ_INVENTORY.武器_枪 ? "枪_灰" : "空格子_灰");
            this._Normal.active = true;
            if (propName) {
                ZRSJZ_EventManager.EmitPersist(
                    ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT,
                    propName,
                    false,
                    ZRSJZ_InventoryService.GetActivePlayerIndex(),
                );
            }
        }
    }

    private async createWeapon(id: string, isInit: boolean = true) {
        const node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/PropGrid");
        // node.active = false;
        node.parent = this.node;
        node.setPosition(0, 0, 0);
        await node.getComponent(ZRSJZ_PropGrid).Init(id, 0, 0, this.InventoryType);
        this.ScaleNodeToFit(node);
        node.active = true;
        this.Grids[0][0] = id;
        if (isInit) return;
        ZRSJZ_InventoryService.SetWeaponry(this._weaponryIndex, id);
        ZRSJZ_InventoryService.MovePropToInventory(id, this.InventoryType, 1, 0, 0);
    }

    // 检查是否是同一个ID
    private checkID(id: string): boolean {
        return this.Grids[0][0] === id;
    }
}


