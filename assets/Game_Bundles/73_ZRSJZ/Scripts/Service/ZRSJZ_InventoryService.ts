import {
    ZRSJZ_AMMO_MAX_COUNT,
    ZRSJZ_GridData,
    ZRSJZ_INVENTORY,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PropData,
} from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";

/** 道具、装备、仓库、弹药及房卡相关业务。 */
export class ZRSJZ_InventoryService {
    private static _activePlayerIndex: number = 0;

    public static SetActivePlayerIndex(playerIndex: number): void {
        this._activePlayerIndex = playerIndex === 1 ? 1 : 0;
    }

    public static GetActivePlayerIndex(): number {
        return this._activePlayerIndex;
    }

    public static GetWeaponryIDs(playerIndex: number = this._activePlayerIndex): string[] {
        const data = ZRSJZ_GameData.Instance;
        return playerIndex === 1 ? data.Player2WeaponryID : data.WeaponryID;
    }

    public static GetAmmoIDs(playerIndex: number = this._activePlayerIndex): string[] {
        const data = ZRSJZ_GameData.Instance;
        return playerIndex === 1 ? data.Player2AmmoID : data.AmmoID;
    }

    public static GetRoomCardIDs(playerIndex: number = this._activePlayerIndex): string[] {
        const data = ZRSJZ_GameData.Instance;
        return playerIndex === 1 ? data.Player2RoomCard : data.RoomCard;
    }

    public static IsPlayerInventory(inventory: ZRSJZ_INVENTORY): boolean {
        return inventory === ZRSJZ_INVENTORY.背包
            || inventory === ZRSJZ_INVENTORY.保险箱
            || inventory === ZRSJZ_INVENTORY.卡包
            || inventory === ZRSJZ_INVENTORY.弹药
            || inventory === ZRSJZ_INVENTORY.武器_枪
            || inventory === ZRSJZ_INVENTORY.武器_头盔
            || inventory === ZRSJZ_INVENTORY.武器_防弹衣
            || inventory === ZRSJZ_INVENTORY.武器_背包
            || inventory === ZRSJZ_INVENTORY.武器_刀;
    }

    public static IsPropOwnedByActivePlayer(prop: ZRSJZ_PropData): boolean {
        if (!this.IsPlayerInventory(prop.CurInventory)) return true;
        return (prop.OwnerPlayerIndex ?? 0) === this._activePlayerIndex;
    }

    public static AddPropByName(propName: string, count: number = 1): string {
        const config = ZRSJZ_PROP_CONFIG.get(propName);
        if (!config) return "";
        const data = ZRSJZ_GameData.Instance;
        const propID = this.GetPropID();
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
        prop.GridData = [this.CreateEmptyGridData(), this.CreateEmptyGridData()];
        data.PropData[propID] = prop;
        ZRSJZ_GameData.SaveData();
        return propID;
    }

    public static AddAmmoToWarehouse(ammoName: string, totalCount: number): string[] {
        const config = ZRSJZ_PROP_CONFIG.get(ammoName);
        if (!config || config.PropType !== "弹药") return [];
        const data = ZRSJZ_GameData.Instance;
        const createdIDs: string[] = [];
        let remaining = Math.max(0, Math.floor(totalCount));
        while (remaining > 0) {
            const stackCount = Math.min(ZRSJZ_AMMO_MAX_COUNT, remaining);
            const propID = this.AddPropByName(ammoName, stackCount);
            const prop = data.PropData[propID];
            if (prop) {
                prop.CurInventory = ZRSJZ_INVENTORY.仓库_全部;
                prop.CurCount = stackCount;
                prop.MaxCount = ZRSJZ_AMMO_MAX_COUNT;
            }
            createdIDs.push(propID);
            remaining -= stackCount;
        }
        if (createdIDs.length > 0) this.NotifyInventoryChanged();
        return createdIDs;
    }

    public static RemovePropID(propID: string): void {
        const data = ZRSJZ_GameData.Instance;
        if (!data.PropData.hasOwnProperty(propID)) return;
        delete data.PropData[propID];
        this.RemoveLoadoutReference(propID);
        this.RefreshRoomCardIDs(0);
        this.RefreshRoomCardIDs(1);
        this.NotifyInventoryChanged();
    }

    public static SetWeaponry(weaponryIndex: number, weaponryID: string, playerIndex: number = this._activePlayerIndex): void {
        this.GetWeaponryIDs(playerIndex)[weaponryIndex] = weaponryID;
        ZRSJZ_GameData.SaveData();
    }

    public static SetAmmoID(ammoID: string[], playerIndex: number = this._activePlayerIndex): void {
        const data = ZRSJZ_GameData.Instance;
        const normalizedIDs = ammoID.slice(0, 6);
        while (normalizedIDs.length < 6) normalizedIDs.push("");
        if (playerIndex === 1) data.Player2AmmoID = normalizedIDs;
        else data.AmmoID = normalizedIDs;
        ZRSJZ_GameData.SaveData();
    }

    public static ChangePropGridPos(propID: string, index: number, x: number, y: number, isRotate?: boolean): void {
        const prop = ZRSJZ_GameData.Instance.PropData[propID];
        if (!prop?.GridData?.[index]) return;
        prop.GridData[index].GridX = x;
        prop.GridData[index].GridY = y;
        if (isRotate !== undefined) prop.GridData[index].IsRotate = isRotate;
        ZRSJZ_GameData.SaveData();
    }

    public static MovePropToInventory(
        propID: string,
        inventory: ZRSJZ_INVENTORY,
        gridIndex: number,
        x: number,
        y: number,
        isRotate?: boolean,
        playerIndex: number = this._activePlayerIndex,
    ): void {
        const prop = ZRSJZ_GameData.Instance.PropData[propID];
        if (!prop?.GridData?.[gridIndex]) return;
        prop.CurInventory = inventory;
        prop.OwnerPlayerIndex = this.IsPlayerInventory(inventory)
            ? (playerIndex === 1 ? 1 : 0)
            : -1;
        for (const gridData of prop.GridData) {
            gridData.GridX = -1;
            gridData.GridY = -1;
        }
        prop.GridData[gridIndex].GridX = x;
        prop.GridData[gridIndex].GridY = y;
        if (isRotate !== undefined) prop.GridData[gridIndex].IsRotate = isRotate;
        this.RefreshRoomCardIDs(0);
        this.RefreshRoomCardIDs(1);
        this.NotifyInventoryChanged();
    }

    public static IsWarehouseUnlocked(inventory: ZRSJZ_INVENTORY): boolean {
        return inventory === ZRSJZ_INVENTORY.仓库_全部
            || (ZRSJZ_GameData.Instance.UnlockedWarehouses ?? []).includes(inventory);
    }

    public static UnlockWarehouse(inventory: ZRSJZ_INVENTORY): boolean {
        const warehouses = [
            ZRSJZ_INVENTORY.仓库_装备,
            ZRSJZ_INVENTORY.仓库_武器,
            ZRSJZ_INVENTORY.仓库_弹药,
            ZRSJZ_INVENTORY.仓库_物品,
        ];
        if (!warehouses.includes(inventory) || this.IsWarehouseUnlocked(inventory)) return false;
        const data = ZRSJZ_GameData.Instance;
        if (!data.UnlockedWarehouses) data.UnlockedWarehouses = [ZRSJZ_INVENTORY.仓库_全部];
        data.UnlockedWarehouses.push(inventory);
        this.NotifyInventoryChanged();
        return true;
    }

    public static GetEquippedRoomCardID(roomCardName: string, playerIndex: number = this._activePlayerIndex): string {
        if (!roomCardName) return "";
        const data = ZRSJZ_GameData.Instance;
        return Object.keys(data.PropData).find(propID => {
            const prop = data.PropData[propID];
            return prop?.Name === roomCardName
                && (prop.PropType === "房卡" || prop.PropType === "门禁卡")
                && prop.CurInventory === ZRSJZ_INVENTORY.卡包
                && (prop.OwnerPlayerIndex ?? 0) === playerIndex;
        }) ?? "";
    }

    public static HasEquippedRoomCard(roomCardName: string, playerIndex: number = this._activePlayerIndex): boolean {
        return this.GetEquippedRoomCardID(roomCardName, playerIndex) !== "";
    }

    public static ConsumeEquippedRoomCard(roomCardName: string, playerIndex: number = this._activePlayerIndex): boolean {
        const roomCardID = this.GetEquippedRoomCardID(roomCardName, playerIndex);
        if (!roomCardID) return false;
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, roomCardID);
        delete ZRSJZ_GameData.Instance.PropData[roomCardID];
        this.RefreshRoomCardIDs(playerIndex);
        this.NotifyInventoryChanged();
        return true;
    }

    public static GetInventoryTotalValue(
        inventories: readonly ZRSJZ_INVENTORY[],
        playerIndex: number = this._activePlayerIndex,
    ): number {
        const inventorySet = new Set(inventories);
        return Object.values(ZRSJZ_GameData.Instance.PropData).reduce((total, prop) =>
            inventorySet.has(prop.CurInventory)
                && (!this.IsPlayerInventory(prop.CurInventory)
                    || (prop.OwnerPlayerIndex ?? 0) === playerIndex)
                ? total + prop.UnitPrice * prop.CurCount
                : total,
        0);
    }

    public static RemoveInventoryRows(inventory: ZRSJZ_INVENTORY, removedRows: number[]): void {
        if (removedRows.length === 0) return;
        const gridIndex = inventory === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
        for (const prop of Object.values(ZRSJZ_GameData.Instance.PropData)) {
            if (prop.CurInventory !== inventory) continue;
            const gridData = prop.GridData[gridIndex];
            if (!gridData || gridData.GridY < 0) continue;
            gridData.GridY -= removedRows.filter(row => row < gridData.GridY).length;
        }
        ZRSJZ_GameData.SaveData();
    }

    public static ReloadPropData(): void {
        const data = ZRSJZ_GameData.Instance;
        for (const propID in data.PropData) {
            const inventory = data.PropData[propID].CurInventory;
            if (inventory === ZRSJZ_INVENTORY.背包 || inventory === ZRSJZ_INVENTORY.物资) {
                delete data.PropData[propID];
            }
        }
        ZRSJZ_GameData.SaveData();
    }

    public static GetPropCountByName(propName: string): number {
        return Object.values(ZRSJZ_GameData.Instance.PropData).reduce((count, prop) =>
            prop.Name === propName ? count + prop.CurCount : count,
        0);
    }

    public static ConsumeProp(propName: string, count: number = 1): boolean {
        if (this.GetPropCountByName(propName) < count) return false;
        const data = ZRSJZ_GameData.Instance;
        for (const propID in data.PropData) {
            const prop = data.PropData[propID];
            if (prop.Name !== propName) continue;
            if (count < prop.CurCount) {
                prop.CurCount -= count;
                count = 0;
                break;
            }
            count -= prop.CurCount;
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, propID);
            this.RemoveLoadoutReference(propID);
            delete data.PropData[propID];
        }
        this.RefreshRoomCardIDs(0);
        this.RefreshRoomCardIDs(1);
        this.NotifyInventoryChanged();
        return count === 0;
    }

    public static AddAllProp(): void {
        for (const propName of ZRSJZ_PROP_CONFIG.keys()) this.AddPropByName(propName);
    }

    public static AddAllAmmo(count: number): void {
        for (const name of ["1级子弹", "2级子弹", "3级子弹", "4级子弹", "5级子弹", "6级子弹"]) {
            this.AddPropByName(name, count);
        }
    }

    private static GetPropID(): string {
        const data = ZRSJZ_GameData.Instance;
        data.PropID++;
        ZRSJZ_GameData.SaveData();
        return `ZRSJZ_PropID_${data.PropID}`;
    }

    private static CreateEmptyGridData(): ZRSJZ_GridData {
        const gridData = new ZRSJZ_GridData();
        gridData.IsRotate = false;
        gridData.GridX = -1;
        gridData.GridY = -1;
        return gridData;
    }

    private static RefreshRoomCardIDs(playerIndex: number): void {
        const roomCardIDs = ["低级房卡", "中级房卡", "高级房卡"]
            .map(roomCardName => this.GetEquippedRoomCardID(roomCardName, playerIndex));
        if (playerIndex === 1) ZRSJZ_GameData.Instance.Player2RoomCard = roomCardIDs;
        else ZRSJZ_GameData.Instance.RoomCard = roomCardIDs;
    }

    private static RemoveLoadoutReference(propID: string): void {
        for (const playerIndex of [0, 1]) {
            const weaponryIDs = this.GetWeaponryIDs(playerIndex);
            const ammoIDs = this.GetAmmoIDs(playerIndex);
            for (let index = 0; index < weaponryIDs.length; index++) {
                if (weaponryIDs[index] === propID) weaponryIDs[index] = "";
            }
            for (let index = 0; index < ammoIDs.length; index++) {
                if (ammoIDs[index] === propID) ammoIDs[index] = "";
            }
        }
    }

    private static NotifyInventoryChanged(): void {
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        ZRSJZ_GameData.SaveData();
    }
}
