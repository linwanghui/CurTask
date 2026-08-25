import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { _decorator, Component, Node, UITransform, v2, v3, Vec3 } from 'cc';
import { ZRSJZ_GRID_INTERVAL, ZRSJZ_GRID_SIZE, ZRSJZ_INVENTORY, ZRSJZ_INVENTORY_CONFIG, ZRSJZ_PropData } from '../ZRSJZ_Constant';
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
    /** 当前库存节点正在展示的玩家，避免异步重建期间读取到变化后的全局玩家。 */
    public PlayerViewIndex: number = -1;
    private _newAddPropID: string[] = [];
    /** 子类销毁临时库存前需要等待本轮异步格子刷新结束。 */
    protected _isShowingPropItem: boolean = false;
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

    async Init(
        inventoryType: ZRSJZ_INVENTORY,
        playerIndex: number = ZRSJZ_InventoryService.GetActivePlayerIndex(),
    ) {
        this.PlayerViewIndex = playerIndex === 1 ? 1 : 0;
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
        this.InventoryConfig = this.GetInventoryConfig(inventoryType);
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
                    const size = this.GetPlacedSize(propData, gridIndex);
                    await this.OccupyGrid(propData.InstanceID, propData.GridData[gridIndex].GridX, propData.GridData[gridIndex].GridY, size.width, size.height)
                }
            }
        }

        //添加那些暂未添加到仓库的道具
        for (let index = 0; index < this._newAddPropID.length; index++) {
            const propData = ZRSJZ_GameData.Instance.PropData[this._newAddPropID[index]];
            const placement = this.FindEmptyGridForProp(propData);
            if (!placement) continue;
            ZRSJZ_InventoryService.ChangePropGridPos(propData.InstanceID, gridIndex, placement.x, placement.y, placement.isRotate);
            await this.OccupyGrid(propData.InstanceID, placement.x, placement.y, placement.width, placement.height)
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

    /** 同一玩家重复打开只刷新；只有切换玩家时才清空并重建格子节点。 */
    public async ShowForPlayer(
        inventoryType: ZRSJZ_INVENTORY,
        playerIndex: number,
    ): Promise<void> {
        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        if (
            this.IsInitialized
            && this.InventoryType === inventoryType
            && this.PlayerViewIndex === normalizedIndex
        ) {
            await this.ShowPropItem();
            return;
        }

        // 等待上一次显示结束，避免 ShowPropItem 与 Init 同时修改 Grids。
        while (this._isShowingPropItem) {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        await this.Init(inventoryType, normalizedIndex);
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
                const placement = this.FindEmptyGridForProp(propData);
                if (!placement) {
                    continue;
                }

                ZRSJZ_InventoryService.ChangePropGridPos(propID, gridIndex, placement.x, placement.y, placement.isRotate);
                await this.OccupyGrid(propID, placement.x, placement.y, placement.width, placement.height);

                // 移除新道具所覆盖位置上的空格子节点。
                for (let row = placement.y; row < placement.y + placement.height; row++) {
                    for (let col = placement.x; col < placement.x + placement.width; col++) {
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

                    ZRSJZ_InventoryService.RemoveInventoryRows(this.InventoryType, removedRows);
                }
            }

            // 删行、扩容和新增道具完成后，以 Grids 为准校正所有空格节点。
            await this.SyncEmptyGridNodes();

            // 临时箱子库存可能在等待异步格子创建期间被关闭。
            // 节点已经销毁时不能再通过 Component.getComponent 访问它。
            if (!this.node?.isValid) return;
            if (!this.UITransform) {
                this.UITransform = this.getComponent(UITransform);
            }
            if (this.UITransform) {
                this.UITransform.height = this.Grids.length * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL);
            }
        } finally {
            this._isShowingPropItem = false;
        }
    }

    /** 子类可覆写库存归属规则，例如箱子库存按 SourceBoxID 隔离。 */
    protected BelongsToInventory(
        propData: ZRSJZ_PropData,
        inventoryType: ZRSJZ_INVENTORY,
    ): boolean {
        // 每件道具只属于一个仓库；“全部”不再是分类仓库的聚合视图。
        if (propData.CurInventory !== inventoryType) return false;
        if (!ZRSJZ_InventoryService.IsPlayerInventory(inventoryType)) return true;
        return (propData.OwnerPlayerIndex ?? 0) === this.PlayerViewIndex;
    }

    /** 箱子等需要固定展示位置的库存可关闭自动删除空行。 */
    protected ShouldRemoveEmptyRows(): boolean {
        return true;
    }

    /** 子类可覆写库存尺寸，例如战斗背包按当前装备动态计算容量。 */
    protected GetInventoryConfig(
        inventoryType: ZRSJZ_INVENTORY,
    ): { Row: number, Col: number, IsDilatation: boolean } {
        return ZRSJZ_INVENTORY_CONFIG.get(inventoryType);
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
    private SupportsAutoRotation(): boolean {
        return String(this.InventoryType).startsWith("仓库_")
            || this.InventoryType === ZRSJZ_INVENTORY.保险箱
            || this.InventoryType === ZRSJZ_INVENTORY.背包
            || this.InventoryType === ZRSJZ_INVENTORY.物资;
    }

    private GetPlacedSize(propData: ZRSJZ_PropData, gridIndex: number): { width: number, height: number } {
        const isRotate = this.SupportsAutoRotation() && propData.GridData[gridIndex]?.IsRotate === true;
        return isRotate
            ? { width: propData.Height, height: propData.Width }
            : { width: propData.Width, height: propData.Height };
    }

    /** 在现有行中同时尝试横放和竖放；都放不下时，仓库再逐行扩容。 */
    private FindEmptyGridForProp(propData: ZRSJZ_PropData): {
        x: number,
        y: number,
        width: number,
        height: number,
        isRotate: boolean,
    } {
        if (!this.SupportsAutoRotation() || propData.Width === propData.Height) {
            const pos = this.FindEmptyGrid(propData.Width, propData.Height);
            return pos ? { ...pos, width: propData.Width, height: propData.Height, isRotate: false } : null;
        }

        const orientations = [
            { width: propData.Width, height: propData.Height, isRotate: false },
            { width: propData.Height, height: propData.Width, isRotate: true },
        ];
        if (orientations.every(item => item.width > this.InventoryConfig.Col)) return null;

        while (true) {
            let best: { x: number, y: number, width: number, height: number, isRotate: boolean } = null;
            for (const orientation of orientations) {
                const pos = this.FindEmptyGridInCurrentRows(orientation.width, orientation.height);
                if (
                    pos
                    && (!best || pos.y < best.y || (pos.y === best.y && pos.x < best.x))
                ) {
                    best = { ...pos, ...orientation };
                }
            }
            if (best) return best;
            if (!this.InventoryConfig.IsDilatation) return null;
            this.Grids.push(this.GetEmptyRow());
        }
    }

    private FindEmptyGridInCurrentRows(width: number, height: number): { x: number, y: number } {
        if (width > this.InventoryConfig.Col) return null;
        for (let y = 0; y < this.Grids.length; y++) {
            for (let x = 0; x <= this.InventoryConfig.Col - width; x++) {
                if (this.CanPlace(x, y, width, height)) return { x, y };
            }
        }
        return null;
    }

    private GetDropPlacement(propData: ZRSJZ_PropData, centerX: number, centerY: number, id: string): {
        width: number,
        height: number,
        isRotate: boolean,
        gridX: number,
        gridY: number,
    } {
        // 拖动时固定优先横放；横放失败后再检测竖放，不受上一次保存方向影响。
        const defaultOrientation = { width: propData.Width, height: propData.Height, isRotate: false };
        const rotatedOrientation = { width: propData.Height, height: propData.Width, isRotate: true };
        const horizontalOrientation = defaultOrientation.width >= defaultOrientation.height
            ? defaultOrientation
            : rotatedOrientation;
        const verticalOrientation = horizontalOrientation === defaultOrientation
            ? rotatedOrientation
            : defaultOrientation;
        const horizontalGrid = this.GetGridPositionByCenter(
            centerX,
            centerY,
            horizontalOrientation.width,
            horizontalOrientation.height,
        );
        // 以道具中心反算横放时的左上格。
        if (
            (!horizontalOrientation.isRotate || this.SupportsAutoRotation())
            && this.CanPlace(horizontalGrid.gridX, horizontalGrid.gridY, horizontalOrientation.width, horizontalOrientation.height, id)
        ) {
            return {
                ...horizontalOrientation,
                ...horizontalGrid,
            };
        }

        // 横放失败后保持中心点不变，重新按竖放尺寸反算左上格。
        if (!verticalOrientation.isRotate || this.SupportsAutoRotation()) {
            const verticalGrid = this.GetGridPositionByCenter(
                centerX,
                centerY,
                verticalOrientation.width,
                verticalOrientation.height,
            );
            if (this.CanPlace(verticalGrid.gridX, verticalGrid.gridY, verticalOrientation.width, verticalOrientation.height, id)) {
                return {
                    ...verticalOrientation,
                    ...verticalGrid,
                };
            }
        }
        return null;
    }

    /** 根据道具中心点及实际占格尺寸，计算吸附后的左上格坐标。 */
    private GetGridPositionByCenter(
        centerX: number,
        centerY: number,
        width: number,
        height: number,
    ): { gridX: number, gridY: number } {
        const step = ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL;
        const occupiedWidth = width * ZRSJZ_GRID_SIZE + (width - 1) * ZRSJZ_GRID_INTERVAL;
        const occupiedHeight = height * ZRSJZ_GRID_SIZE + (height - 1) * ZRSJZ_GRID_INTERVAL;
        return {
            gridX: Math.round((centerX - occupiedWidth / 2) / step),
            gridY: Math.round((-centerY - occupiedHeight / 2) / step),
        };
    }

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
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL, 3, node, id);
    }

    /** 自动整理当前库存，并按面积从大到小重新紧凑排列。 */
    public async AutoOrganize(): Promise<boolean> {
        if (!this.IsInitialized || !this.InventoryConfig) return false;

        const propIDs = Array.from(new Set(this.Grids.flat().filter(id => id !== "")))
            .filter(id => ZRSJZ_GameData.Instance.PropData[id] != null)
            .sort((a, b) => {
                const propA = ZRSJZ_GameData.Instance.PropData[a];
                const propB = ZRSJZ_GameData.Instance.PropData[b];
                return propB.Width * propB.Height - propA.Width * propA.Height;
            });
        const originalGrids = this.Grids;
        this.Grids = Array.from(
            { length: originalGrids.length },
            () => this.GetEmptyRow(),
        );

        const placements = new Map<string, {
            x: number,
            y: number,
            width: number,
            height: number,
            isRotate: boolean,
        }>();
        for (const id of propIDs) {
            const propData = ZRSJZ_GameData.Instance.PropData[id];
            const placement = this.FindEmptyGridForProp(propData);
            if (!placement) {
                this.Grids = originalGrids;
                return false;
            }
            placements.set(id, placement);
            for (let row = placement.y; row < placement.y + placement.height; row++) {
                for (let col = placement.x; col < placement.x + placement.width; col++) {
                    this.Grids[row][col] = id;
                }
            }
        }

        const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
        for (const [id, placement] of placements) {
            ZRSJZ_InventoryService.ChangePropGridPos(
                id,
                gridIndex,
                placement.x,
                placement.y,
                placement.isRotate,
            );
        }

        for (const child of this.node.children.slice()) {
            ZRSJZ_PoolManager.Instance.PutNode(child);
        }
        for (const [id, placement] of placements) {
            await this.OccupyGrid(
                id,
                placement.x,
                placement.y,
                placement.width,
                placement.height,
            );
        }
        await this.SyncEmptyGridNodes();
        return true;
    }

    /**
     * 将待加入道具一并纳入布局搜索，为大件预留连续空间。
     * 返回待加入道具的落点；现有道具会按搜索结果重新排列。
     */
    private async AutoOrganizeForIncomingProp(incomingID: string): Promise<{
        x: number,
        y: number,
        width: number,
        height: number,
        isRotate: boolean,
    }> {
        const incomingData = ZRSJZ_GameData.Instance.PropData[incomingID];
        if (!incomingData) return null;

        const existingIDs = Array.from(new Set(this.Grids.flat().filter(id => id !== "")))
            .filter(id => id !== incomingID && ZRSJZ_GameData.Instance.PropData[id] != null);
        const allIDs = [...existingIDs, incomingID].sort((a, b) => {
            const propA = ZRSJZ_GameData.Instance.PropData[a];
            const propB = ZRSJZ_GameData.Instance.PropData[b];
            const areaDifference = propB.Width * propB.Height - propA.Width * propA.Height;
            if (areaDifference !== 0) return areaDifference;
            if (a === incomingID) return -1;
            if (b === incomingID) return 1;
            return 0;
        });
        const workingGrids = Array.from(
            { length: this.Grids.length },
            () => this.GetEmptyRow(),
        );
        const placements = new Map<string, {
            x: number,
            y: number,
            width: number,
            height: number,
            isRotate: boolean,
        }>();
        const failedStates = new Set<string>();

        const canPlace = (x: number, y: number, width: number, height: number): boolean => {
            if (x < 0 || y < 0 || x + width > this.InventoryConfig.Col) return false;
            if (y + height > workingGrids.length) return false;
            for (let row = y; row < y + height; row++) {
                for (let col = x; col < x + width; col++) {
                    if (workingGrids[row][col] !== "") return false;
                }
            }
            return true;
        };
        const fill = (id: string, x: number, y: number, width: number, height: number): void => {
            for (let row = y; row < y + height; row++) {
                for (let col = x; col < x + width; col++) {
                    workingGrids[row][col] = id;
                }
            }
        };
        const clear = (x: number, y: number, width: number, height: number): void => {
            for (let row = y; row < y + height; row++) {
                for (let col = x; col < x + width; col++) {
                    workingGrids[row][col] = "";
                }
            }
        };
        const search = (index: number): boolean => {
            if (index >= allIDs.length) return true;
            const stateKey = `${index}:${workingGrids.map(row => row.map(id => id ? "1" : "0").join("")).join("")}`;
            if (failedStates.has(stateKey)) return false;

            const id = allIDs[index];
            const propData = ZRSJZ_GameData.Instance.PropData[id];
            const orientations = [{
                width: propData.Width,
                height: propData.Height,
                isRotate: false,
            }];
            if (this.SupportsAutoRotation() && propData.Width !== propData.Height) {
                orientations.push({
                    width: propData.Height,
                    height: propData.Width,
                    isRotate: true,
                });
            }

            for (const orientation of orientations) {
                for (let y = 0; y <= workingGrids.length - orientation.height; y++) {
                    for (let x = 0; x <= this.InventoryConfig.Col - orientation.width; x++) {
                        if (!canPlace(x, y, orientation.width, orientation.height)) continue;
                        fill(id, x, y, orientation.width, orientation.height);
                        placements.set(id, { x, y, ...orientation });
                        if (search(index + 1)) return true;
                        placements.delete(id);
                        clear(x, y, orientation.width, orientation.height);
                    }
                }
            }

            failedStates.add(stateKey);
            return false;
        };

        if (!search(0)) return null;
        const incomingPlacement = placements.get(incomingID);
        if (!incomingPlacement) return null;

        // 待加入道具暂不写入目标库存，由后续 ChangeGrid 完成正式转移。
        clear(
            incomingPlacement.x,
            incomingPlacement.y,
            incomingPlacement.width,
            incomingPlacement.height,
        );
        this.Grids = workingGrids;
        const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
        for (const id of existingIDs) {
            const placement = placements.get(id);
            if (!placement) continue;
            ZRSJZ_InventoryService.ChangePropGridPos(
                id,
                gridIndex,
                placement.x,
                placement.y,
                placement.isRotate,
            );
        }

        for (const child of this.node.children.slice()) {
            ZRSJZ_PoolManager.Instance.PutNode(child);
        }
        for (const id of existingIDs) {
            const placement = placements.get(id);
            if (!placement) continue;
            await this.OccupyGrid(
                id,
                placement.x,
                placement.y,
                placement.width,
                placement.height,
            );
        }
        await this.SyncEmptyGridNodes();
        return incomingPlacement;
    }

    /** 仅比较空格总数与道具占格数，不判断这些空格是否连续。 */
    public HasEnoughEmptyGridCount(id: string): boolean {
        const propData = ZRSJZ_GameData.Instance.PropData[id];
        if (!propData) return false;
        const requiredGridCount = propData.Width * propData.Height;
        const emptyGridCount = this.Grids.reduce(
            (count, row) => count + row.filter(gridID => gridID === "").length,
            0,
        );
        return emptyGridCount >= requiredGridCount;
    }

    /** 使用当前库存规则，把指定道具自动放入一个可用位置。 */
    public async TryReceiveProp(
        sourceInventory: ZRSJZ_INVENTORY,
        id: string,
        organizeBeforePlacement: boolean = false,
    ): Promise<boolean> {
        const propData = ZRSJZ_GameData.Instance.PropData[id];
        if (!propData || !this.IsAdaptive(id)) return false;

        if (organizeBeforePlacement) {
            // 总空格数量不足时，任何整理或旋转都无法放入，直接返回空间不足。
            if (!this.HasEnoughEmptyGridCount(id)) return false;
        }

        // 优先使用当前布局中的可用位置，只有直接放不下时才整理库存。
        // FindEmptyGridForProp 会同时尝试原方向和旋转方向，并选择更靠前的可用位置。
        let placement = this.FindEmptyGridForProp(propData);
        if (!placement && organizeBeforePlacement) {
            placement = await this.AutoOrganizeForIncomingProp(id);
        }

        if (!placement) return false;
        return this.ChangeGrid(
            sourceInventory,
            id,
            placement.x,
            placement.y,
            placement.width,
            placement.height,
            placement.isRotate,
        );
    }

    /** 在已经腾空的原位置恢复道具，用于装备/弹药替换后把旧道具放回来源格。 */
    public async RestorePropAt(id: string, gridX: number, gridY: number): Promise<boolean> {
        const propData = ZRSJZ_GameData.Instance.PropData[id];
        if (!propData) return false;
        const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
        const size = this.GetPlacedSize(propData, gridIndex);
        if (
            gridX < 0
            || gridY < 0
            || !this.CanPlace(gridX, gridY, size.width, size.height, id)
        ) {
            return false;
        }

        await this.OccupyGrid(
            id,
            gridX,
            gridY,
            size.width,
            size.height,
        );
        await this.SyncEmptyGridNodes();
        return true;
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
    async CheckProp(
        inventory: ZRSJZ_INVENTORY,
        id: string,
        worldPos: Vec3,
        isConfirm: boolean,
    ) {
        const dragPlayerIndex = ZRSJZ_UIManager.DraggingPlayerIndex;
        if (!this.IsVisible || !worldPos || !this.InventoryConfig || !this.UITransform) return;
        if (
            dragPlayerIndex >= 0
            && ZRSJZ_UIManager.IsBattle
            && this.PlayerViewIndex !== dragPlayerIndex
        ) return;
        if (
            inventory === ZRSJZ_INVENTORY.武器_刀
            || (
                ZRSJZ_UIManager.IsBattle
                && inventory === ZRSJZ_INVENTORY.武器_背包
            )
        ) return;
        if (this.node.active) {
            ZRSJZ_EventManager.EmitPersist(
                ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW,
                this.InventoryType,
                -1,
                -1,
                "灰",
            );
            if (this.UITransform?.getBoundingBoxToWorld().contains(v2(worldPos.x, worldPos.y))) {
                const pos: Vec3 = this.UITransform.convertToNodeSpaceAR(worldPos);
                const propData = ZRSJZ_GameData.Instance.PropData[id];
                if (!propData) return;
                const placement = this.GetDropPlacement(propData, pos.x, pos.y, id);

                //确定修改
                if (isConfirm) {
                    if (placement && this.IsAdaptive(id)) {
                        const isMoved = await this.ChangeGrid(inventory, id, placement.gridX, placement.gridY, placement.width, placement.height, placement.isRotate);
                        if (isMoved && inventory === this.InventoryType) {
                            ZRSJZ_EventManager.EmitPersist(
                                ZRSJZ_MyEvent.ZRSJZ_GRID_MOVE,
                                id,
                                this.InventoryType,
                                placement.gridX,
                                placement.gridY,
                                placement.isRotate,
                            );
                        }
                    }
                } else {
                    const propType: string = placement && this.IsAdaptive(id) ? "绿" : "红";
                    if (placement && this.IsAdaptive(id)) {
                        ZRSJZ_EventManager.EmitPersist(
                            ZRSJZ_MyEvent.ZRSJZ_PROP_DRAG_ROTATE,
                            id,
                            placement.isRotate,
                        );
                    }
                    const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
                    const currentSize = this.GetPlacedSize(propData, gridIndex);
                    const previewWidth = placement?.width ?? currentSize.width;
                    const previewHeight = placement?.height ?? currentSize.height;
                    const previewGrid = this.GetGridPositionByCenter(
                        pos.x,
                        pos.y,
                        previewWidth,
                        previewHeight,
                    );
                    const previewGridX = placement?.gridX ?? previewGrid.gridX;
                    const previewGridY = placement?.gridY ?? previewGrid.gridY;
                    for (let i = previewGridX; i < previewGridX + previewWidth; i++) {
                        for (let j = previewGridY; j < previewGridY + previewHeight; j++) {
                            ZRSJZ_EventManager.EmitPersist(
                                ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW,
                                this.InventoryType,
                                i,
                                j,
                                propType,
                            );
                        }
                    }
                }
                // console.error(gridX, gridY,);
            }
        }
    }

    async ChangeGrid(inventory: ZRSJZ_INVENTORY, id: string, gridX: number, gridY: number, width: number, height: number, isRotate: boolean = false): Promise<boolean> {
        const movingProp = ZRSJZ_GameData.Instance.PropData[id];
        if (
            ZRSJZ_UIManager.IsBattle
            && (movingProp?.OwnerPlayerIndex === 0 || movingProp?.OwnerPlayerIndex === 1)
            && movingProp.OwnerPlayerIndex !== this.PlayerViewIndex
        ) return false;

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

            const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
            ZRSJZ_InventoryService.ChangePropGridPos(id, gridIndex, gridX, gridY, isRotate);

            // 统一按 Grids 重建空格映射，避免删行后继续使用旧坐标增量修改。
            await this.SyncEmptyGridNodes();
        } else {
            const propData = ZRSJZ_GameData.Instance.PropData[id];
            if (!propData) return false;

            const targetInventory = this.InventoryType;
            if (!targetInventory) return false;


            // 跨库存时清除旧库存中的节点和占格；数据层只保留一个 CurInventory。
            const inventoryNodes = ZRSJZ_UIManager.Instance.GetAllInventoryNodes();
            for (const inventoryNode of inventoryNodes) {
                const sourceInventory = inventoryNode.getComponent(ZRSJZ_Inventory);
                if (!sourceInventory || sourceInventory === this) continue;
                if (sourceInventory.Grids.some(row => row.includes(id))) {
                    await sourceInventory.RemoveProp(id);
                }
            }

            const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
            ZRSJZ_InventoryService.MovePropToInventory(
                id,
                targetInventory,
                gridIndex,
                gridX,
                gridY,
                isRotate,
                this.PlayerViewIndex,
            );
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

    async Replace(oldID: string, newID: string): Promise<boolean> {
        const newPropData = ZRSJZ_GameData.Instance.PropData[newID];
        if (!newPropData) return false;

        const occupiedGrids: { x: number, y: number }[] = [];
        for (let row = 0; row < this.Grids.length; row++) {
            for (let col = 0; col < this.Grids[row].length; col++) {
                if (this.Grids[row][col] === oldID) {
                    occupiedGrids.push({ x: col, y: row });
                }
            }
        }
        if (occupiedGrids.length === 0) return false;

        const sourceX = Math.min(...occupiedGrids.map(grid => grid.x));
        const sourceY = Math.min(...occupiedGrids.map(grid => grid.y));
        for (const grid of occupiedGrids) {
            this.Grids[grid.y][grid.x] = "";
        }

        const gridIndex = this.InventoryType === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
        const savedIsRotate = this.SupportsAutoRotation()
            && newPropData.GridData[gridIndex]?.IsRotate === true;
        const orientationFlags = !this.SupportsAutoRotation()
            || newPropData.Width === newPropData.Height
            ? [false]
            : [savedIsRotate, !savedIsRotate];
        const orientations = orientationFlags
            .map(isRotate => ({
                width: isRotate ? newPropData.Height : newPropData.Width,
                height: isRotate ? newPropData.Width : newPropData.Height,
                isRotate,
            }));

        let placement: {
            x: number,
            y: number,
            width: number,
            height: number,
            isRotate: boolean,
        } = null;
        for (const orientation of orientations) {
            if (this.CanPlace(sourceX, sourceY, orientation.width, orientation.height)) {
                placement = { x: sourceX, y: sourceY, ...orientation };
                break;
            }
        }
        placement ??= this.FindEmptyGridForProp(newPropData);

        if (!placement) {
            for (const grid of occupiedGrids) {
                this.Grids[grid.y][grid.x] = oldID;
            }
            return false;
        }

        // Inventory 即使未激活也会收到替换操作，因此直接清理来源武器节点。
        const propNode = this.node.children.find(child => {
            const propGrid = child.getComponent(ZRSJZ_PropGrid);
            return propGrid?.PropID === oldID;
        });
        if (propNode) {
            ZRSJZ_PoolManager.Instance.PutNode(propNode);
        }

        const targetInventory = this.InventoryType;
        ZRSJZ_InventoryService.MovePropToInventory(
            newID,
            targetInventory,
            gridIndex,
            placement.x,
            placement.y,
            placement.isRotate,
            this.PlayerViewIndex,
        );
        await this.OccupyGrid(
            newID,
            placement.x,
            placement.y,
            placement.width,
            placement.height,
        );
        await this.SyncEmptyGridNodes();
        return true;
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
