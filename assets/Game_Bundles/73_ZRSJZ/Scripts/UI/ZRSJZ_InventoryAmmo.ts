import { _decorator, Node, UITransform, v2, v3, Vec3 } from 'cc';
import { ZRSJZ_GRID_INTERVAL, ZRSJZ_GRID_SIZE, ZRSJZ_INVENTORY, ZRSJZ_INVENTORY_CONFIG, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_PropGrid } from './ZRSJZ_PropGrid';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_InventoryAmmo')
export class ZRSJZ_InventoryAmmo extends ZRSJZ_Inventory {
    private static readonly ROW = 2;
    private static readonly COL = 3;
    private _isAmmoInitialized: boolean = false;
    private _isChanging: boolean = false;
    private _rebuildTask: Promise<void> = Promise.resolve();

    protected onEnable(): void {
        if (this._isAmmoInitialized) this.RebuildView();
        this.IsVisible = true;
    }

    protected onDisable(): void {
        this.IsVisible = false;
    }

    async Init(_inventoryType: ZRSJZ_INVENTORY = ZRSJZ_INVENTORY.弹药) {
        this.InventoryType = ZRSJZ_INVENTORY.弹药;
        this.InventoryConfig = ZRSJZ_INVENTORY_CONFIG.get(this.InventoryType);
        this.UITransform = this.getComponent(UITransform);
        this.UITransform.height = ZRSJZ_InventoryAmmo.ROW * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL);

        this.NormalizeAmmoIDs();
        this.MigrateOldAmmoData();
        this.SyncAmmoDataPosition();

        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this.CheckProp, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, this.RemoveProp, this);
        this._isAmmoInitialized = true;
        await this.RebuildView();
    }

    async CheckProp(inventory: ZRSJZ_INVENTORY, id: string, worldPos: Vec3, isConfirm: boolean) {
        if (!this.IsVisible) return;
        if (!this.node.active || this._isChanging) return;
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.InventoryType);

        const checkPos = v3(worldPos.x + 50, worldPos.y - 50, worldPos.z);
        if (!this.UITransform.getBoundingBoxToWorld().contains(v2(checkPos.x, checkPos.y))) return;

        const localPos = this.UITransform.convertToNodeSpaceAR(checkPos);
        const gridX = Math.floor(localPos.x / (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL));
        const gridY = Math.floor(-localPos.y / (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL));
        const width: number = ZRSJZ_GameData.Instance.PropData[id].Width;
        const height: number = ZRSJZ_GameData.Instance.PropData[id].Height;
        const propData = ZRSJZ_GameData.Instance.PropData[id];

        if (!propData || propData.PropType !== "弹药" || !this.IsValidGrid(gridX, gridY)) {
            // ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.InventoryType, gridX, gridY, "绿",);
            for (let i = gridX; i < gridX + width; i++) {
                for (let j = gridY; j < gridY + height; j++) {
                    if (!isConfirm) ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.InventoryType, i, j, "红");
                }
            }
            return;
        }

        if (!isConfirm) {
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.InventoryType, gridX, gridY, "绿",);
            return;
        }

        this._isChanging = true;
        try {
            await this.PlaceAmmo(inventory, id, gridX, gridY);
        } finally {
            this._isChanging = false;
        }
    }

    async RemoveProp(id: string, isRemoveProp: boolean = true) {
        let changed = false;
        const ammoIDs = ZRSJZ_GameData.Instance.AmmoID;
        for (let i = 0; i < ammoIDs.length; i++) {
            if (ammoIDs[i] === id) {
                ammoIDs[i] = "";
                changed = true;
            }
        }
        if (changed) ZRSJZ_GameData.Instance.SetAmmoID(ammoIDs);
        await super.RemoveProp(id, isRemoveProp);
    }

    private async PlaceAmmo(sourceInventory: ZRSJZ_INVENTORY, incomingID: string, gridX: number, gridY: number) {
        const targetIndex = this.GetIndex(gridX, gridY);
        const ammoIDs = ZRSJZ_GameData.Instance.AmmoID;
        const targetID = ammoIDs[targetIndex];
        const sourceIndex = ammoIDs.indexOf(incomingID);

        if (targetID === incomingID) return;

        if (!targetID) {
            if (sourceIndex >= 0) ammoIDs[sourceIndex] = "";
            await this.RemoveFromOtherInventories(incomingID);
            ammoIDs[targetIndex] = incomingID;
            this.SaveAmmoPosition(incomingID, targetIndex);
            ZRSJZ_GameData.Instance.SetAmmoID(ammoIDs);
            await this.RebuildView();
            return;
        }

        const incomingData = ZRSJZ_GameData.Instance.PropData[incomingID];
        const targetData = ZRSJZ_GameData.Instance.PropData[targetID];
        if (!incomingData || !targetData) return;

        if (incomingData.Name === targetData.Name) {
            await this.MergeAmmo(incomingID, targetID, sourceIndex);
            return;
        }

        // 备战弹药栏内部拖动时交换格子；从外部拖入时，旧弹药退回弹药仓库。
        if (sourceInventory === this.InventoryType && sourceIndex >= 0) {
            ammoIDs[sourceIndex] = targetID;
            ammoIDs[targetIndex] = incomingID;
            this.SaveAmmoPosition(targetID, sourceIndex);
        } else {
            await this.RemoveFromOtherInventories(incomingID);
            ammoIDs[targetIndex] = incomingID;
            ZRSJZ_GameData.Instance.MovePropToInventory(targetID, ZRSJZ_INVENTORY.仓库_弹药, 1, -1, -1);
            await this.RefreshInventory(ZRSJZ_INVENTORY.仓库_弹药);
            await this.RefreshInventory(ZRSJZ_INVENTORY.仓库_全部);
        }

        this.SaveAmmoPosition(incomingID, targetIndex);
        ZRSJZ_GameData.Instance.SetAmmoID(ammoIDs);
        await this.RebuildView();
    }

    private async MergeAmmo(incomingID: string, targetID: string, sourceIndex: number) {
        const incomingData = ZRSJZ_GameData.Instance.PropData[incomingID];
        const targetData = ZRSJZ_GameData.Instance.PropData[targetID];
        if (!incomingData || !targetData || incomingData.Name !== targetData.Name) return;

        // 使用最新配置刷新实例上限，兼容旧存档中 MaxCount 仍为 1 的弹药。
        const maxCount = ZRSJZ_PROP_CONFIG.get(targetData.Name)?.MaxCount ?? targetData.MaxCount;
        incomingData.MaxCount = maxCount;
        targetData.MaxCount = maxCount;
        const moveCount = Math.min(
            incomingData.CurCount,
            Math.max(0, maxCount - targetData.CurCount),
        );
        if (moveCount <= 0) return;

        targetData.CurCount += moveCount;
        incomingData.CurCount -= moveCount;
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);

        if (incomingData.CurCount <= 0) {
            if (sourceIndex >= 0) ZRSJZ_GameData.Instance.AmmoID[sourceIndex] = "";
            await this.RemoveFromAllInventories(incomingID);
            ZRSJZ_GameData.Instance.RemovePropID(incomingID);
        } else {
            ZRSJZ_GameData.SaveData();
            this.RefreshPropCount(incomingID);
        }

        ZRSJZ_GameData.Instance.SetAmmoID(ZRSJZ_GameData.Instance.AmmoID);
        this.RefreshPropCount(targetID);
        await this.RebuildView();
    }

    private async RemoveFromOtherInventories(id: string) {
        for (const inventoryNode of ZRSJZ_UIManager.Instance.InventoryMap.values()) {
            const inventory = inventoryNode.getComponent(ZRSJZ_Inventory);
            if (!inventory || inventory === this) continue;
            if (inventory.Grids.some(row => row.includes(id))) await inventory.RemoveProp(id);
        }
    }

    private async RemoveFromAllInventories(id: string) {
        for (const inventoryNode of ZRSJZ_UIManager.Instance.InventoryMap.values()) {
            const inventory = inventoryNode.getComponent(ZRSJZ_Inventory);
            if (inventory?.Grids.some(row => row.includes(id))) await inventory.RemoveProp(id);
        }
    }

    private async RefreshInventory(inventoryType: ZRSJZ_INVENTORY) {
        const inventory = ZRSJZ_UIManager.Instance.InventoryMap.get(inventoryType)?.getComponent(ZRSJZ_Inventory);
        if (inventory) await inventory.ShowPropItem();
    }

    private RefreshPropCount(id: string) {
        for (const inventoryNode of ZRSJZ_UIManager.Instance.InventoryMap.values()) {
            for (const child of inventoryNode.children) {
                const propGrid = child.getComponent(ZRSJZ_PropGrid);
                if (propGrid?.PropID === id && propGrid.CountLabel) {
                    propGrid.CountLabel.string = `x${ZRSJZ_GameData.Instance.PropData[id]?.CurCount || 0}`;
                }
            }
        }
    }

    private RebuildView(): Promise<void> {
        this._rebuildTask = this._rebuildTask.then(
            () => this.DoRebuildView(),
            () => this.DoRebuildView(),
        );
        return this._rebuildTask;
    }

    private async DoRebuildView() {
        const ammoIDs = ZRSJZ_GameData.Instance.AmmoID;
        const desiredGrids = Array.from({ length: ZRSJZ_InventoryAmmo.ROW }, () =>
            Array(ZRSJZ_InventoryAmmo.COL).fill(""),
        );
        const desiredPropPositions = new Map<string, { x: number, y: number }>();
        const desiredEmptyPositions = new Set<string>();

        for (let y = 0; y < ZRSJZ_InventoryAmmo.ROW; y++) {
            for (let x = 0; x < ZRSJZ_InventoryAmmo.COL; x++) {
                const id = ammoIDs[this.GetIndex(x, y)];
                if (id && ZRSJZ_GameData.Instance.PropData[id]) {
                    desiredGrids[y][x] = id;
                    desiredPropPositions.set(id, { x, y });
                } else {
                    desiredEmptyPositions.add(`${x}_${y}`);
                }
            }
        }

        this.Grids = desiredGrids;

        const existingPropNodes = new Map<string, Node>();
        const existingEmptyPositions = new Set<string>();

        // 保留仍存在的道具节点，只移动位置并更新数量；已经移除或重复的节点才回收。
        for (const child of this.node.children.slice()) {
            const propGrid = child.getComponent(ZRSJZ_PropGrid);
            if (!propGrid) continue;

            if (propGrid.PropID) {
                const targetPos = desiredPropPositions.get(propGrid.PropID);
                if (!targetPos || existingPropNodes.has(propGrid.PropID)) {
                    ZRSJZ_PoolManager.Instance.PutNode(child);
                    continue;
                }

                existingPropNodes.set(propGrid.PropID, child);
                if (propGrid.GridX !== targetPos.x || propGrid.GridY !== targetPos.y) {
                    propGrid.ChangePosByGrid(
                        propGrid.PropID,
                        this.InventoryType,
                        targetPos.x,
                        targetPos.y,
                    );
                }
                if (propGrid.CountLabel) {
                    propGrid.CountLabel.string = `x${ZRSJZ_GameData.Instance.PropData[propGrid.PropID].CurCount}`;
                }
                continue;
            }

            const emptyKey = `${propGrid.GridX}_${propGrid.GridY}`;
            if (!desiredEmptyPositions.has(emptyKey) || existingEmptyPositions.has(emptyKey)) {
                ZRSJZ_PoolManager.Instance.PutNode(child);
                continue;
            }
            existingEmptyPositions.add(emptyKey);
        }

        // 仅为新加入的弹药创建节点。
        for (const [id, pos] of desiredPropPositions) {
            if (!existingPropNodes.has(id)) {
                await this.OccupyGrid(id, pos.x, pos.y, 1, 1);
            }
        }

        // 仅补充因移动、替换或删除产生的新空格节点。
        for (const emptyKey of desiredEmptyPositions) {
            if (existingEmptyPositions.has(emptyKey)) continue;
            const [x, y] = emptyKey.split('_').map(Number);
            await this.CreateEmptyGrid(x, y);
        }
    }

    private NormalizeAmmoIDs() {
        const ammoIDs = Array.isArray(ZRSJZ_GameData.Instance.AmmoID)
            ? ZRSJZ_GameData.Instance.AmmoID.slice(0, 6)
            : [];
        while (ammoIDs.length < 6) ammoIDs.push("");
        for (let i = 0; i < ammoIDs.length; i++) {
            const data = ZRSJZ_GameData.Instance.PropData[ammoIDs[i]];
            if (!data || data.PropType !== "弹药") ammoIDs[i] = "";
        }
        ZRSJZ_GameData.Instance.SetAmmoID(ammoIDs);
    }

    private MigrateOldAmmoData() {
        const ammoIDs = ZRSJZ_GameData.Instance.AmmoID;
        for (const id in ZRSJZ_GameData.Instance.PropData) {
            const data = ZRSJZ_GameData.Instance.PropData[id];
            if (data.PropType !== "弹药" || data.CurInventory !== this.InventoryType || ammoIDs.includes(id)) continue;
            const preferred = data.GridData[1]?.GridY * 3 + data.GridData[1]?.GridX;
            const index = preferred >= 0 && preferred < 6 && !ammoIDs[preferred]
                ? preferred
                : ammoIDs.indexOf("");
            if (index >= 0) ammoIDs[index] = id;
        }
        ZRSJZ_GameData.Instance.SetAmmoID(ammoIDs);
    }

    private SyncAmmoDataPosition() {
        ZRSJZ_GameData.Instance.AmmoID.forEach((id, index) => {
            if (id) this.SaveAmmoPosition(id, index);
        });
        ZRSJZ_GameData.SaveData();
    }

    private SaveAmmoPosition(id: string, index: number) {
        ZRSJZ_GameData.Instance.MovePropToInventory(
            id,
            this.InventoryType,
            1,
            index % ZRSJZ_InventoryAmmo.COL,
            Math.floor(index / ZRSJZ_InventoryAmmo.COL),
        );
    }

    private GetIndex(gridX: number, gridY: number): number {
        return gridY * ZRSJZ_InventoryAmmo.COL + gridX;
    }

    private IsValidGrid(gridX: number, gridY: number): boolean {
        return gridX >= 0 && gridX < ZRSJZ_InventoryAmmo.COL
            && gridY >= 0 && gridY < ZRSJZ_InventoryAmmo.ROW;
    }
}
