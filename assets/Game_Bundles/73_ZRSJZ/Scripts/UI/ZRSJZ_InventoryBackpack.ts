import { _decorator, UITransform } from 'cc';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_GRID_INTERVAL, ZRSJZ_GRID_SIZE, ZRSJZ_INVENTORY, ZRSJZ_INVENTORY_CONFIG, ZRSJZ_PROP_PROPERTY } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_InventoryBackpack')
export class ZRSJZ_InventoryBackpack extends ZRSJZ_Inventory {
    private static readonly DEFAULT_ROW = 2;
    private static readonly COL = 4;

    async Init(_inventoryType: ZRSJZ_INVENTORY = ZRSJZ_INVENTORY.背包) {
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this.CheckProp, this);
        for (let i = this.node.children.length - 1; i >= 0; i--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.node.children[i]);
        }
        this.IsInitialized = false;
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this.CheckProp, this);
        this.InventoryType = _inventoryType;
        const row = this.GetCurrentBackpackRow();
        this.Grids = [];
        this.InventoryConfig = { Row: row, Col: ZRSJZ_InventoryBackpack.COL, IsDilatation: false }
        for (let i = 0; i < row; i++) {
            const row = [];
            for (let j = 0; j < ZRSJZ_InventoryBackpack.COL; j++) {
                row.push("");
            }
            this.Grids.push(row);
        }

        //用空白格子填充
        for (let i = 0; i < this.Grids.length; i++) {
            for (let j = 0; j < this.Grids[i].length; j++) {
                if (this.Grids[i][j] == "") {
                    await this.CreateEmptyGrid(j, i);
                }
            }
        }


        const height = this.Grids.length * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL);
        this.UITransform = this.getComponent(UITransform);
        this.UITransform.height = height;
        this.IsInitialized = true;

        console.error("背包初始化完成");
    }


    // 背包可以存放任意类型的道具。
    IsAdaptive(_id: string): boolean {
        return true;
    }
    private GetCurrentBackpackRow(): number {
        const backpackID = ZRSJZ_GameData.Instance.WeaponryID[3];
        if (!backpackID) return ZRSJZ_InventoryBackpack.DEFAULT_ROW;

        const backpackData = ZRSJZ_GameData.Instance.PropData[backpackID];
        const capacity = backpackData
            ? ZRSJZ_PROP_PROPERTY.get(backpackData.Name)?.["容量"]
            : 0;
        if (!capacity || capacity <= 0) return ZRSJZ_InventoryBackpack.DEFAULT_ROW;

        return Math.max(
            ZRSJZ_InventoryBackpack.DEFAULT_ROW,
            Math.ceil(capacity / ZRSJZ_InventoryBackpack.COL),
        );
    }

}

