import { _decorator, Component, Node, Sprite, UITransform, v2, Vec3 } from 'cc';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_INVENTORY, ZRSJZ_INVENTORY_CONFIG } from '../ZRSJZ_Constant';
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
        // this.ScaleNodeToFit(this._Normal);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this.CheckProp, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, this.RemoveProp, this);
        this.InventoryType = inventoryType;
        this._weaponryIndex = ZRSJZ_Tools.GetWeaponryIndexByInventory(inventoryType);
        this.Grids = [[""]];
        const id = ZRSJZ_GameData.Instance.WeaponryID[this._weaponryIndex];
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
                            this.ReplaceProp(id);
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

        this.createWeapon(id, false);
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, ZRSJZ_GameData.Instance.PropData[id].Name);
        return true;
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

        this.createWeapon(id, false);
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, ZRSJZ_GameData.Instance.PropData[id].Name);
        return true;
    }

    private ScaleNodeToFit(targetNode: Node): void {
        if (!targetNode) {
            return;
        }

        const parentUITransform = this.getComponent(UITransform);
        const targetUITransform = targetNode.getComponent(UITransform);
        if (!parentUITransform || !targetUITransform) {
            return;
        }

        const parentWidth = parentUITransform.width;
        const parentHeight = parentUITransform.height;
        const targetWidth = targetUITransform.width;
        const targetHeight = targetUITransform.height;

        if (parentWidth <= 0 || parentHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
            return;
        }

        const scaleX = parentWidth / targetWidth;
        const scaleY = parentHeight / targetHeight;
        const scale = Math.floor(Math.min(scaleX, scaleY) * 100);

        targetNode.getComponent(ZRSJZ_PropGrid).CurScale = scale / 100;
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
            ZRSJZ_GameData.Instance.SetWeaponry(this._weaponryIndex, "");
            this._GridSprite.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropGridUI(this.InventoryType == ZRSJZ_INVENTORY.武器_枪 ? "枪_灰" : "空格子_灰");
            this._Normal.active = true;
            if (propName) {
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, propName, false);
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
        ZRSJZ_GameData.Instance.SetWeaponry(this._weaponryIndex, id);
        ZRSJZ_GameData.Instance.MovePropToInventory(id, this.InventoryType, 1, 0, 0);
    }

    // 检查是否是同一个ID
    private checkID(id: string): boolean {
        return this.Grids[0][0] === id;
    }
}


