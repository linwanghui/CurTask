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

    /** 领取扩容后重建当前玩家的格子，已有道具位置保持不变。 */
    public async RefreshCapacity(): Promise<void> {
        while (this._isShowingPropItem) {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        await this.Init(ZRSJZ_INVENTORY.背包, this.PlayerViewIndex);
    }

    private GetCurrentBackpackRow(): number {
        const backpackID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerViewIndex)[3];
        const expansionRows = ZRSJZ_InventoryService.IsBackpackExpanded(this.PlayerViewIndex) ? 2 : 0;
        if (!backpackID) return ZRSJZ_InventoryBackpack.DEFAULT_ROW + expansionRows;

        const backpackData = ZRSJZ_GameData.Instance.PropData[backpackID];
        const capacity = backpackData
            ? ZRSJZ_PROP_PROPERTY.get(backpackData.Name)?.["容量"]
            : 0;
        if (!capacity || capacity <= 0) return ZRSJZ_InventoryBackpack.DEFAULT_ROW + expansionRows;

        return Math.max(
            ZRSJZ_InventoryBackpack.DEFAULT_ROW,
            Math.ceil(capacity / ZRSJZ_InventoryBackpack.COL),
        ) + expansionRows;
    }

}
