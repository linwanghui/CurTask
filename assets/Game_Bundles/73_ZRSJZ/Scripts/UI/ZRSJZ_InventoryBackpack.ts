import { _decorator } from 'cc';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_INVENTORY, ZRSJZ_PROP_PROPERTY } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_InventoryBackpack')
export class ZRSJZ_InventoryBackpack extends ZRSJZ_Inventory {
    private static readonly DEFAULT_ROW = 2;
    private static readonly COL = 4;

    // 背包可以存放任意类型的道具。
    IsAdaptive(_id: string): boolean {
        return true;
    }

    protected GetInventoryConfig(
        _inventoryType: ZRSJZ_INVENTORY,
    ): { Row: number, Col: number, IsDilatation: boolean } {
        return {
            Row: this.GetCurrentBackpackRow(),
            Col: ZRSJZ_InventoryBackpack.COL,
            IsDilatation: false,
        };
    }

    private GetCurrentBackpackRow(): number {
        const backpackID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerViewIndex)[3];
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
