import {
    ZRSJZ_AMMO_MAX_COUNT,
    ZRSJZ_GridData,
    ZRSJZ_INVENTORY,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PropData,
} from "../ZRSJZ_Constant";
import type { ZRSJZ_GameData } from "../ZRSJZ_GameData";

/** 新存档初始化和旧存档迁移。此类不触发事件，也不主动写盘。 */
export class ZRSJZ_GameDataDefaults {
    public static Initialize(data: ZRSJZ_GameData): void {
        data.Gold = 100000;
        data.CurMap = "新手村";
        const knifeID = this.CreateProp(data, "战术匕首", 1);
        data.WeaponryID[4] = knifeID;
        this.PlaceProp(data, knifeID, ZRSJZ_INVENTORY.武器_刀, 1, 0, 0);
    }

    public static Migrate(data: ZRSJZ_GameData, savedData: any): boolean {
        if (savedData.WarehouseStorageVersion !== undefined && data.WarehouseStorageVersion >= 1) {
            return false;
        }
        const categoryWarehouses = new Set<ZRSJZ_INVENTORY>([
            ZRSJZ_INVENTORY.仓库_装备,
            ZRSJZ_INVENTORY.仓库_武器,
            ZRSJZ_INVENTORY.仓库_弹药,
            ZRSJZ_INVENTORY.仓库_物品,
        ]);
        for (const prop of Object.values(data.PropData ?? {})) {
            if (!categoryWarehouses.has(prop.CurInventory)) continue;
            prop.CurInventory = ZRSJZ_INVENTORY.仓库_全部;
            for (const gridData of prop.GridData ?? []) {
                gridData.GridX = -1;
                gridData.GridY = -1;
            }
        }
        data.UnlockedWarehouses = [ZRSJZ_INVENTORY.仓库_全部];
        data.WarehouseStorageVersion = 1;
        return true;
    }

    private static CreateProp(data: ZRSJZ_GameData, propName: string, count: number): string {
        const config = ZRSJZ_PROP_CONFIG.get(propName);
        data.PropID++;
        const propID = `ZRSJZ_PropID_${data.PropID}`;
        const prop = new ZRSJZ_PropData();
        prop.InstanceID = propID;
        prop.Name = propName;
        prop.PropType = config.PropType;
        prop.CurInventory = ZRSJZ_INVENTORY.仓库_全部;
        prop.UnitPrice = config.UnitPrice;
        prop.MaxCount = config.MaxCount;
        prop.CurCount = count;
        prop.Width = Number(config.GridType[2]);
        prop.Height = Number(config.GridType[0]);
        prop.GridData = [this.CreateGridData(), this.CreateGridData()];
        data.PropData[propID] = prop;
        return propID;
    }

    private static PlaceProp(
        data: ZRSJZ_GameData,
        propID: string,
        inventory: ZRSJZ_INVENTORY,
        gridIndex: number,
        x: number,
        y: number,
    ): void {
        const prop = data.PropData[propID];
        prop.CurInventory = inventory;
        prop.GridData[gridIndex].GridX = x;
        prop.GridData[gridIndex].GridY = y;
    }

    private static CreateGridData(): ZRSJZ_GridData {
        const gridData = new ZRSJZ_GridData();
        gridData.IsRotate = false;
        gridData.GridX = -1;
        gridData.GridY = -1;
        return gridData;
    }
}
