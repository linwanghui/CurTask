import {
    ZRSJZ_AMMO_MAX_COUNT,
    ZRSJZ_GridData,
    ZRSJZ_INVENTORY,
    ZRSJZ_MAIN_TASK_CONFIG,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PropData,
} from "../ZRSJZ_Constant";
import type { ZRSJZ_GameData } from "../ZRSJZ_GameData";

/** 新存档初始化和旧存档迁移。此类不触发事件，也不主动写盘。 */
export class ZRSJZ_GameDataDefaults {
    public static Initialize(data: ZRSJZ_GameData): void {
        data.Gold = 100000;
        data.CurMap = "新手村";
        this.InitializePlayerKnife(data, 0);
        this.InitializePlayerKnife(data, 1);

        const task = ZRSJZ_MAIN_TASK_CONFIG.get("初入禁区");
        data.CurMainTask = {
            TaskName: task.TaskName,
            TaskTargetName: task.TaskTargets[0].TaskTargetName,
            CurCount: 0
        }

    }

    public static Migrate(data: ZRSJZ_GameData, savedData: any): boolean {
        let changed = false;
        if (savedData.WarehouseStorageVersion === undefined || data.WarehouseStorageVersion < 1) {
            changed = this.MigrateWarehouseStorage(data) || changed;
        }
        if (savedData.LoadoutStorageVersion === undefined || data.LoadoutStorageVersion < 1) {
            changed = this.MigratePlayerLoadouts(data) || changed;
        }
        return changed;
    }

    private static MigrateWarehouseStorage(data: ZRSJZ_GameData): boolean {
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

    private static MigratePlayerLoadouts(data: ZRSJZ_GameData): boolean {
        data.Player2WeaponryID = this.NormalizeIDs(data.Player2WeaponryID, 5);
        data.Player2AmmoID = this.NormalizeIDs(data.Player2AmmoID, 6);
        data.Player2RoomCard = this.NormalizeIDs(data.Player2RoomCard, 3);

        const playerInventories = new Set<ZRSJZ_INVENTORY>([
            ZRSJZ_INVENTORY.卡包,
            ZRSJZ_INVENTORY.弹药,
            ZRSJZ_INVENTORY.武器_枪,
            ZRSJZ_INVENTORY.武器_头盔,
            ZRSJZ_INVENTORY.武器_防弹衣,
            ZRSJZ_INVENTORY.武器_背包,
            ZRSJZ_INVENTORY.武器_刀,
        ]);
        for (const prop of Object.values(data.PropData ?? {})) {
            prop.OwnerPlayerIndex = playerInventories.has(prop.CurInventory) ? 0 : -1;
        }
        data.LoadoutStorageVersion = 1;
        return true;
    }

    private static NormalizeIDs(ids: string[], length: number): string[] {
        const result = Array.isArray(ids) ? ids.slice(0, length) : [];
        while (result.length < length) result.push("");
        return result;
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
        prop.OwnerPlayerIndex = -1;
        prop.UnitPrice = config.UnitPrice;
        prop.MaxCount = config.MaxCount;
        prop.CurCount = count;
        prop.Width = Number(config.GridType[2]);
        prop.Height = Number(config.GridType[0]);
        prop.GridData = [this.CreateGridData(), this.CreateGridData()];
        data.PropData[propID] = prop;
        return propID;
    }

    /** 为指定玩家创建独立的初始战术匕首，避免两个玩家引用同一个道具实例。 */
    private static InitializePlayerKnife(data: ZRSJZ_GameData, playerIndex: number): void {
        const knifeID = this.CreateProp(data, "战术匕首", 1);
        const weaponryIDs = playerIndex === 1 ? data.Player2WeaponryID : data.WeaponryID;
        weaponryIDs[4] = knifeID;
        this.PlaceProp(data, knifeID, ZRSJZ_INVENTORY.武器_刀, 1, 0, 0, playerIndex);
    }

    private static PlaceProp(
        data: ZRSJZ_GameData,
        propID: string,
        inventory: ZRSJZ_INVENTORY,
        gridIndex: number,
        x: number,
        y: number,
        playerIndex: number = 0,
    ): void {
        const prop = data.PropData[propID];
        prop.CurInventory = inventory;
        prop.OwnerPlayerIndex = playerIndex;
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
