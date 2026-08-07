import { _decorator, Component, Node, UITransform, v2, v3, Vec3 } from 'cc';
import { ZRSJZ_GRID_INTERVAL, ZRSJZ_GRID_SIZE, ZRSJZ_INVENTORY, ZRSJZ_INVENTORY_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_PropGrid } from './ZRSJZ_PropGrid';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Inventory')
export class ZRSJZ_Inventory extends Component {

    public InventoryType: ZRSJZ_INVENTORY = ZRSJZ_INVENTORY.仓库_全部;
    public Grids: string[][] = [];
    public UITransform: UITransform = null;

    public InventoryConfig: { Row: number, Col: number, IsDilatation: boolean };
    public IsInitialized: boolean = false;
    private _newAddPropID: string[] = [];
    private _isShowingPropItem: boolean = false;
    IsVisible: boolean = true;

    protected onEnable(): void {
        if (this.IsInitialized) {
            this.ShowPropItem();
        }
        this.IsVisible = true;
    }

    protected onDisable(): void {
        this.IsVisible = false;
    }

    async Init(inventoryType: ZRSJZ_INVENTORY) {
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this.CheckProp, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, this.RemoveProp, this);
        for (let i = this.node.children.length - 1; i >= 0; i--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.node.children[i]);
        }
        this.Grids = [];
        this.IsInitialized = false;

        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this.CheckProp, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, this.RemoveProp, this);
        this.InventoryType = inventoryType;
        this.InventoryConfig = ZRSJZ_INVENTORY_CONFIG.get(inventoryType);
        for (let i = 0; i < this.InventoryConfig.Row; i++) {
            const row = [];
            for (let j = 0; j < this.InventoryConfig.Col; j++) {
                row.push("");
            }
            this.Grids.push(row);
        }

        this._newAddPropID = [];

        const gridIndex = inventoryType == ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;

        for (let key in ZRSJZ_GameData.Instance.PropData) {
            const propData = ZRSJZ_GameData.Instance.PropData[key];
            if (this.BelongsToInventory(propData, inventoryType)) {
                if (propData.GridData[gridIndex].GridX == -1) {
                    this._newAddPropID.push(propData.InstanceID);
                } else {
                    await this.OccupyGrid(propData.InstanceID, propData.GridData[gridIndex].GridX, propData.GridData[gridIndex].GridY, propData.Width, propData.Height)
                }
            }
        }

        //添加那些暂未添加到仓库的道具
        for (let index = 0; index < this._newAddPropID.length; index++) {
            const propData = ZRSJZ_GameData.Instance.PropData[this._newAddPropID[index]];
            const gridPos: { x: number, y: number } = this.FindEmptyGrid(propData.Width, propData.Height);
            ZRSJZ_GameData.Instance.ChangePropGridPos(propData.InstanceID, gridIndex, gridPos.x, gridPos.y);
            await this.OccupyGrid(propData.InstanceID, propData.GridData[gridIndex].GridX, propData.GridData[gridIndex].GridY, propData.Width, propData.Height)
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

        if (this.node.active) {
            this.ShowPropItem();
        }
    }

    async ShowPropItem() {
        if (!this.IsInitialized || !this.InventoryConfig || this._isShowingPropItem) {
            return;
        }

        this._isShowingPropItem = true;
        try {
            const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
            const oldRowCount = this.Grids.length;
            const newPropIDs: string[] = [];

            // 查找游戏过程中新增、但还没有放入当前仓库的道具。
            for (const propID in ZRSJZ_GameData.Instance.PropData) {
                const propData = ZRSJZ_GameData.Instance.PropData[propID];
                const belongsToInventory = this.BelongsToInventory(
                    propData,
                    this.InventoryType,
                );
                if (belongsToInventory && propData.GridData[gridIndex]?.GridX === -1) {
                    newPropIDs.push(propID);
                }
            }

            for (const propID of newPropIDs) {
                const propData = ZRSJZ_GameData.Instance.PropData[propID];
                const gridPos = this.FindEmptyGrid(propData.Width, propData.Height);
                if (!gridPos) {
                    continue;
                }

                ZRSJZ_GameData.Instance.ChangePropGridPos(propID, gridIndex, gridPos.x, gridPos.y);
                await this.OccupyGrid(propID, gridPos.x, gridPos.y, propData.Width, propData.Height);

                // 移除新道具所覆盖位置上的空格子节点。
                for (let row = gridPos.y; row < gridPos.y + propData.Height; row++) {
                    for (let col = gridPos.x; col < gridPos.x + propData.Width; col++) {
                        ZRSJZ_EventManager.EmitPersist(
                            ZRSJZ_MyEvent.ZRSJZ_EMPTY_GRID_REMOVE,
                            this.InventoryType,
                            col,
                            row,
                        );
                    }
                }
            }

            // 扩容产生的新行还没有空格子节点，在新增道具完成后统一补齐。
            for (let row = oldRowCount; row < this.Grids.length; row++) {
                for (let col = 0; col < this.Grids[row].length; col++) {
                    if (this.Grids[row][col] === "") {
                        await this.CreateEmptyGrid(col, row);
                    }
                }
            }

            if (
                this.InventoryConfig.IsDilatation
                && this.ShouldRemoveEmptyRows()
                && this.Grids.length > 4
            ) {
                // 最后三行始终保留，只检查它们之前的行。
                const removableRowCount = this.Grids.length - 4;
                const removedRows: number[] = [];
                for (let row = 0; row < removableRowCount; row++) {
                    if (this.Grids[row].every(id => id === "")) {
                        removedRows.push(row);
                    }
                }

                if (removedRows.length > 0) {
                    const removedRowSet = new Set(removedRows);
                    this.Grids = this.Grids.filter((_row, index) => !removedRowSet.has(index));

                    // 使用副本遍历，因为空格子节点会在 RemoveRows 中被放回对象池。
                    const propGrids = this.node.children
                        .map(child => child.getComponent(ZRSJZ_PropGrid))
                        .filter(propGrid => propGrid != null);
                    propGrids.forEach(propGrid => propGrid.RemoveRows(this.InventoryType, removedRows));

                    ZRSJZ_GameData.Instance.RemoveInventoryRows(this.InventoryType, removedRows);
                }
            }

            // 删行、扩容和新增道具完成后，以 Grids 为准校正所有空格节点。
            await this.SyncEmptyGridNodes();

            if (!this.UITransform) {
                this.UITransform = this.getComponent(UITransform);
            }
            this.UITransform.height = this.Grids.length * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL);
        } finally {
            this._isShowingPropItem = false;
        }
    }

    /** 子类可覆写库存归属规则，例如箱子库存按 SourceBoxID 隔离。 */
    protected BelongsToInventory(
        propData: { CurInventory: ZRSJZ_INVENTORY },
        inventoryType: ZRSJZ_INVENTORY,
    ): boolean {
        return (
            inventoryType === ZRSJZ_INVENTORY.仓库_全部
            && this.checkIsInWarhouse(propData.CurInventory)
        ) || propData.CurInventory === inventoryType;
    }

    /** 箱子等需要固定展示位置的库存可关闭自动删除空行。 */
    protected ShouldRemoveEmptyRows(): boolean {
        return true;
    }

    private async SyncEmptyGridNodes() {
        const expectedEmptyGrids = new Set<string>();
        for (let row = 0; row < this.Grids.length; row++) {
            for (let col = 0; col < this.Grids[row].length; col++) {
                if (this.Grids[row][col] === "") {
                    expectedEmptyGrids.add(`${col}_${row}`);
                }
            }
        }

        const existingEmptyGrids = new Set<string>();
        const children = this.node.children.slice();
        for (const child of children) {
            const propGrid = child.getComponent(ZRSJZ_PropGrid);
            if (!propGrid || propGrid.PropID !== "") {
                continue;
            }

            const key = `${propGrid.GridX}_${propGrid.GridY}`;
            if (!expectedEmptyGrids.has(key) || existingEmptyGrids.has(key)) {
                ZRSJZ_PoolManager.Instance.PutNode(child);
                continue;
            }

            existingEmptyGrids.add(key);
        }

        for (const key of expectedEmptyGrids) {
            if (existingEmptyGrids.has(key)) {
                continue;
            }

            const [gridX, gridY] = key.split("_").map(Number);
            await this.CreateEmptyGrid(gridX, gridY);
        }
    }

    async CreateEmptyGrid(gridX: number, gridY: number) {
        const node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/PropGrid");
        node.active = false;
        node.parent = this.node;
        node.setPosition(gridX * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL), -gridY * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL));
        node.getComponent(ZRSJZ_PropGrid).Init("", gridX, gridY, this.InventoryType);
        node.active = true;
    }

    // 找一个能放下 width x height 的空区域
    FindEmptyGrid(width: number, height: number): { x: number, y: number } {
        for (let y = 0; y < this.Grids.length; y++) {
            for (let x = 0; x <= this.InventoryConfig.Col - width; x++) {
                if (this.CanPlace(x, y, width, height)) {
                    return { x, y };
                }
            }
        }

        // 当前行数不够就扩展 ----允许扩容的仓库才行
        if (this.InventoryConfig.IsDilatation) {
            this.Grids.push(this.GetEmptyRow());
            return this.FindEmptyGrid(width, height);
        } else {
            return null;
        }
    }

    //判断能不能放
    CanPlace(x: number, y: number, width: number, height: number, normalID: string = "跳过"): boolean {
        for (let row = y; row < y + height; row++) {
            if (!this.Grids[row]) return false;

            for (let col = x; col < x + width; col++) {
                if (this.Grids[row][col] === normalID) continue;
                if (this.Grids[row][col] !== "") return false;
            }
        }

        return true;
    }

    //放进去后要把占用格标记掉：
    async OccupyGrid(id: string, gridX: number, gridY: number, width: number, height: number) {
        if (this.InventoryConfig.IsDilatation && this.Grids.length < gridY + height + 3) {
            //创建行
            for (let i = this.Grids.length; i < gridY + height + 3; i++) {
                this.Grids.push(this.GetEmptyRow());
            }
        }

        for (let row = gridY; row < gridY + height; row++) {
            for (let col = gridX; col < gridX + width; col++) {
                this.Grids[row][col] = id;
            }
        }

        //创造道具Item
        const node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/PropGrid");
        // node.active = false;
        node.parent = this.node;
        node.setPosition(gridX * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL), -gridY * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL));
        node.getComponent(ZRSJZ_PropGrid).Init(id, gridX, gridY, this.InventoryType);
        node.active = true;
    }

    //获取空的一行
    GetEmptyRow(): string[] {
        let row: string[] = [];
        for (let i = 0; i < this.InventoryConfig.Col; i++) {
            row.push("")
        }
        return row;
    }

    //道具拉动
    async CheckProp(inventory: ZRSJZ_INVENTORY, id: string, worldPos: Vec3, isConfirm: boolean) {
        if (!this.IsVisible) return;
        if (inventory == ZRSJZ_INVENTORY.武器_刀) return;
        if (this.node.active) {
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.InventoryType);
            const newPos: Vec3 = v3(worldPos.x + 50, worldPos.y - 50, worldPos.z)
            if (this.UITransform?.getBoundingBoxToWorld().contains(v2(newPos.x, newPos.y))) {
                const pos: Vec3 = this.UITransform.convertToNodeSpaceAR(newPos);
                const gridX: number = Math.floor(pos.x / (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL));
                const gridY: number = Math.floor(-pos.y / (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL));
                const width: number = ZRSJZ_GameData.Instance.PropData[id].Width;
                const height: number = ZRSJZ_GameData.Instance.PropData[id].Height;

                //确定修改
                if (isConfirm) {
                    if (this.CanPlace(gridX, gridY, width, height, id) && this.IsAdaptive(id)) {
                        const isMoved = await this.ChangeGrid(inventory, id, gridX, gridY, width, height);
                        if (isMoved && inventory === this.InventoryType) {
                            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_MOVE, id, this.InventoryType, gridX, gridY);
                        }
                    }
                } else {
                    const propType: string = this.CanPlace(gridX, gridY, width, height, id) && this.IsAdaptive(id) ? "绿" : "红";
                    for (let i = gridX; i < gridX + width; i++) {
                        for (let j = gridY; j < gridY + height; j++) {
                            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.InventoryType, i, j, propType);
                        }
                    }
                }
                // console.error(gridX, gridY,);
            }
        }
    }

    async ChangeGrid(inventory: ZRSJZ_INVENTORY, id: string, gridX: number, gridY: number, width: number, height: number): Promise<boolean> {
        if (inventory == this.InventoryType) {
            //在本仓库内移动
            // 清除旧占用数据。
            for (let i = 0; i < this.Grids.length; i++) {
                for (let j = 0; j < this.Grids[i].length; j++) {
                    if (this.Grids[i][j] == id) {
                        this.Grids[i][j] = "";
                    }
                }
            }

            // 写入新的占用数据。
            for (let row = gridY; row < gridY + height; row++) {
                for (let col = gridX; col < gridX + width; col++) {
                    this.Grids[row][col] = id;
                }
            }

            // 统一按 Grids 重建空格映射，避免删行后继续使用旧坐标增量修改。
            await this.SyncEmptyGridNodes();
        } else {
            const propData = ZRSJZ_GameData.Instance.PropData[id];
            if (!propData) return false;

            // 仓库_全部是综合视图，实际归属仍使用道具对应的分类仓库。
            const targetInventory = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部
                ? ZRSJZ_Tools.GetInventoryByPropType(propData.PropType)
                : this.InventoryType;
            if (!targetInventory) return false;


            // 道具可能同时显示在“仓库_全部”和分类仓库中，跨仓库时一并清除旧映射。
            const inventoryNodes = Array.from(ZRSJZ_UIManager.Instance.InventoryMap.values());
            for (const inventoryNode of inventoryNodes) {
                const sourceInventory = inventoryNode.getComponent(ZRSJZ_Inventory);
                if (!sourceInventory || sourceInventory === this) continue;
                if (sourceInventory.Grids.some(row => row.includes(id))) {
                    await sourceInventory.RemoveProp(id);
                }
            }

            const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
            ZRSJZ_GameData.Instance.MovePropToInventory(id, targetInventory, gridIndex, gridX, gridY);
            await this.OccupyGrid(id, gridX, gridY, width, height);
            await this.SyncEmptyGridNodes();
        }

        return true;
    }

    async RemoveProp(id: string, isRemoveProp: boolean = true) {
        // Inventory 即使未激活也会收到出售事件，因此在这里直接清理道具节点，
        // 不能依赖 PropGrid.onEnable 注册的事件。
        const propNode = this.node.children.find(child => {
            const propGrid = child.getComponent(ZRSJZ_PropGrid);
            return propGrid?.PropID === id;
        });
        if (propNode && isRemoveProp) {
            ZRSJZ_PoolManager.Instance.PutNode(propNode);
        }

        const emptyGrids: { x: number, y: number }[] = [];
        for (let i = 0; i < this.Grids.length; i++) {
            for (let j = 0; j < this.Grids[i].length; j++) {
                if (this.Grids[i][j] == id) {
                    this.Grids[i][j] = "";
                    emptyGrids.push({ x: j, y: i });
                }
            }
        }

        for (const grid of emptyGrids) {
            await this.CreateEmptyGrid(grid.x, grid.y);
        }
    }

    async Replace(oldID: string, newID: string) {
        // Inventory 即使未激活也会收到出售事件，因此在这里直接清理道具节点，
        // 不能依赖 PropGrid.onEnable 注册的事件。
        const propNode = this.node.children.find(child => {
            const propGrid = child.getComponent(ZRSJZ_PropGrid);
            return propGrid?.PropID === oldID;
        });
        if (propNode) {
            ZRSJZ_PoolManager.Instance.PutNode(propNode);
        }

        const emptyGrids: { x: number, y: number }[] = [];
        for (let i = 0; i < this.Grids.length; i++) {
            for (let j = 0; j < this.Grids[i].length; j++) {
                if (this.Grids[i][j] == oldID) {
                    this.Grids[i][j] = newID;
                    emptyGrids.push({ x: j, y: i });
                }
            }
        }

        ZRSJZ_GameData.Instance.MovePropToInventory(newID, ZRSJZ_Tools.GetInventoryByPropType(ZRSJZ_GameData.Instance.PropData[newID].PropType),
            this.InventoryType == ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1, emptyGrids[0].x, emptyGrids[0].y);

        //创造道具Item
        const node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/PropGrid");
        // node.active = false;
        node.parent = this.node;
        node.setPosition(emptyGrids[0].x * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL), - emptyGrids[0].y * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL));
        node.getComponent(ZRSJZ_PropGrid).Init(newID, emptyGrids[0].x, emptyGrids[0].y, this.InventoryType);
        node.active = true;
    }

    IsAdaptive(id: string): boolean {
        if (this.InventoryType == ZRSJZ_INVENTORY.仓库_全部 || this.InventoryType == ZRSJZ_INVENTORY.保险箱) return true;
        switch (ZRSJZ_GameData.Instance.PropData[id].PropType) {
            case "头盔":
                return this.InventoryType == ZRSJZ_INVENTORY.仓库_装备 || this.InventoryType == ZRSJZ_INVENTORY.武器_头盔;
            case "防弹衣":
                return this.InventoryType == ZRSJZ_INVENTORY.仓库_装备 || this.InventoryType == ZRSJZ_INVENTORY.武器_防弹衣;
            case "背包":
                return this.InventoryType == ZRSJZ_INVENTORY.仓库_装备 || this.InventoryType == ZRSJZ_INVENTORY.武器_背包;
            case "枪":
                return this.InventoryType == ZRSJZ_INVENTORY.仓库_武器 || this.InventoryType == ZRSJZ_INVENTORY.武器_枪;
            case "刀":
                return this.InventoryType == ZRSJZ_INVENTORY.仓库_武器 || this.InventoryType == ZRSJZ_INVENTORY.武器_刀;
            case "弹药":
                return this.InventoryType == ZRSJZ_INVENTORY.仓库_弹药 || this.InventoryType == ZRSJZ_INVENTORY.弹药;
            case "门禁卡":
            case "房卡":
                return this.InventoryType == ZRSJZ_INVENTORY.仓库_物品 || this.InventoryType == ZRSJZ_INVENTORY.卡包;
            case "物品":
                return this.InventoryType == ZRSJZ_INVENTORY.仓库_物品;
        }
    }

    //查看是否在仓库
    private checkIsInWarhouse(inventory: ZRSJZ_INVENTORY): boolean {
        return inventory == ZRSJZ_INVENTORY.仓库_弹药 || inventory == ZRSJZ_INVENTORY.仓库_武器 || inventory == ZRSJZ_INVENTORY.仓库_物品 || inventory == ZRSJZ_INVENTORY.仓库_装备;
    }

}


