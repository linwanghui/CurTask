import {
    _decorator,
    Button,
    Color,
    Component,
    EventTouch,
    Graphics,
    instantiate,
    Label,
    Layout,
    Node,
    Prefab,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_GameData } from './WZSJZ_GameData';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_GameManager')
export class WZSJZ_GameManager extends Component {
    @property({ displayName: "布阵区", type: Node })
    public FormationZone: Node = null;

    @property({ displayName: "操作区", type: Node })
    public PreparationZone: Node = null;

    @property({ displayName: "拖拽层", type: Node })
    public DragLayer: Node = null;

    @property({ displayName: "墙体格子", type: Node })
    public WallCellNode: Node = null;

    @property({ displayName: "围墙显示节点", type: Node })
    public WallDisplayNode: Node = null;

    @property({ displayName: "格子预制体", type: Prefab })
    public CellPrefab: Prefab = null;

    @property({ displayName: "可购买物资", type: [Prefab] })
    public MaterialPrefabs: Prefab[] = [];

    @property({ displayName: "初始钞票", min: 0 })
    public StartMoney: number = 999;

    @property({ displayName: "初始食物", min: 0 })
    public StartFood: number = 999;

    @property({ displayName: "基础钞票价格", min: 0 })
    public BaseMoneyCost: number = 10;

    @property({ displayName: "基础食物价格", min: 0 })
    public BaseFoodCost: number = 10;

    @property({ displayName: "每5次涨价比例", min: 0, step: 0.1 })
    public PriceIncreaseRate: number = 0.5;

    private static _instance: WZSJZ_GameManager = null;
    public static get Instance(): WZSJZ_GameManager {
        return this._instance;
    }

    private _formationCells: WZSJZ_Cell[] = [];
    private _preparationCells: WZSJZ_Cell[] = [];
    private _formationObjectLayer: Node = null;
    private _preparationObjectLayer: Node = null;
    private _preparationItemLockLayer: Node = null;
    private _wallObjectLayer: Node = null;
    private _wallCell: WZSJZ_Cell = null;
    private _purchaseCount: number = 0;
    private _money: number = 0;
    private _food: number = 0;
    private _draggingNode: WZSJZ_GameNode = null;
    private _isGameStarted: boolean = false;
    private _enoughRequirementColor: Color = null;
    private _insufficientRequirementColor: Color = null;
    private _keySlotNode: Node = null;
    private _recycleNode: Node = null;
    private _keyDragVisual: Node = null;
    private _keyDragStartWorldPosition: Vec3 = new Vec3();
    private _keyDragStartUIPosition: Vec2 = new Vec2();
    private _isDraggingKey: boolean = false;
    private _keyUnlockHintNodes: Node[] = [];

    protected onLoad(): void {
        WZSJZ_GameManager._instance = this;
        this._money = this.StartMoney;
        this._food = this.StartFood;
    }

    protected start(): void {
        this.InitBoard();
        this.BindPurchaseButton();
        this.BindStartButton();
        this.SetupToolArea();
        this.CachePurchaseRequirementColors();
        this.RefreshResourceView();
        this.RefreshPriceView();
    }

    protected onDestroy(): void {
        this.unschedule(this.ProduceResources);
        this.UnbindToolArea();
        this.ClearKeyUnlockHints();
        if (WZSJZ_GameManager._instance === this) {
            WZSJZ_GameManager._instance = null;
        }
    }

    private InitBoard(): void {
        if (!this.FormationZone || !this.PreparationZone || !this.CellPrefab) {
            console.error("[WZSJZ] 请在 WZSJZ_GameManager 上绑定区域节点和格子预制体。");
            return;
        }

        const formationGrid = this.FormationZone.getChildByName("格子区");
        this._formationObjectLayer = this.FormationZone.getChildByName("物体区");
        const preparationFrame = this.PreparationZone.getChildByName("备战框") || this.PreparationZone;
        const preparationGrid = preparationFrame.getChildByName("格子区");
        this._preparationObjectLayer = preparationFrame.getChildByName("物体区");

        if (!formationGrid || !this._formationObjectLayer || !preparationGrid || !this._preparationObjectLayer) {
            console.error("[WZSJZ] 区域下必须包含“格子区”和“物体区”节点。");
            return;
        }

        // Cocos UI 同层节点按兄弟顺序绘制：后面的节点盖住前面的节点。
        this._formationObjectLayer.setSiblingIndex(this.FormationZone.children.length - 1);
        this._preparationObjectLayer.setSiblingIndex(preparationFrame.children.length - 1);
        this.SetupWallCell();
        this.SetupDragLayer();

        // 布阵区：5列×4行，第2~4行最右边两格开放。
        this._formationCells = this.CreateCells(formationGrid, 20, "formation", (index) => {
            const row = Math.floor(index / 5);
            const column = index % 5;
            return row >= 1 && row <= 3 && column >= 3;
        });

        // 备战框：默认开放前3格，并为相邻锁格生成道具锁物资。
        const preparationConfig = WZSJZ_Constant.PreparationGrid;
        this._preparationCells = this.CreateCells(
            preparationGrid,
            preparationConfig.Columns * preparationConfig.Rows,
            "preparation",
            (index) => index < preparationConfig.InitialUnlockedCount
        );
        this.SetupPreparationItemLockLayer(preparationFrame);
        this.RefreshPreparationItemLocks();
    }

    private SetupPreparationItemLockLayer(preparationFrame: Node): void {
        this._preparationItemLockLayer = preparationFrame.getChildByName("道具锁显示层");
        if (!this._preparationItemLockLayer) {
            this._preparationItemLockLayer = new Node("道具锁显示层");
            this._preparationItemLockLayer.layer = this._preparationObjectLayer.layer;
            this._preparationItemLockLayer.setParent(preparationFrame);
            this._preparationItemLockLayer.setPosition(this._preparationObjectLayer.position);

            const transform = this._preparationItemLockLayer.addComponent(UITransform);
            const objectTransform = this._preparationObjectLayer.getComponent(UITransform);
            if (objectTransform) {
                transform.setContentSize(objectTransform.contentSize);
                transform.setAnchorPoint(objectTransform.anchorPoint);
            }
        }

        for (const cell of this._preparationCells) {
            cell.MoveItemLockToLayer(this._preparationItemLockLayer);
        }
        this.EnsurePreparationLayerOrder();
    }

    private EnsurePreparationLayerOrder(): void {
        if (!this._preparationObjectLayer || !this._preparationItemLockLayer) {
            return;
        }
        // 先把物资层放到最后，再把锁层放到最后，最终锁图始终覆盖物资。
        const parent = this._preparationObjectLayer.parent;
        this._preparationObjectLayer.setSiblingIndex(parent.children.length - 1);
        this._preparationItemLockLayer.setSiblingIndex(parent.children.length - 1);
    }

    private SetupWallCell(): void {
        const canvas = this.FormationZone?.parent;
        this.WallCellNode = this.WallCellNode || canvas?.getChildByName("墙体格子");
        this.WallDisplayNode = this.WallDisplayNode || canvas?.getChildByName("围墙");
        if (!canvas || !this.WallCellNode) {
            console.error("[WZSJZ] 没有找到墙体格子。");
            return;
        }

        this._wallCell = this.WallCellNode.getComponent(WZSJZ_Cell)
            || this.WallCellNode.addComponent(WZSJZ_Cell);
        this._wallCell.Init(0, "wall", true);

        this._wallObjectLayer = canvas.getChildByName("墙体物体区");
        if (!this._wallObjectLayer) {
            this._wallObjectLayer = new Node("墙体物体区");
            this._wallObjectLayer.layer = this.WallCellNode.layer;
            this._wallObjectLayer.setParent(canvas);
            const transform = this._wallObjectLayer.addComponent(UITransform);
            const canvasTransform = canvas.getComponent(UITransform);
            if (canvasTransform) {
                transform.setContentSize(canvasTransform.contentSize);
                transform.setAnchorPoint(canvasTransform.anchorPoint);
            }
        }

        const wallPrefab = this.FindMaterialPrefab("围墙");
        if (wallPrefab && this._wallCell.IsEmpty()) {
            this.CreateMaterialAtCell(wallPrefab, this._wallCell, 1);
        } else if (!wallPrefab) {
            console.error("[WZSJZ] 可购买物资中没有配置围墙预制体。");
        }
    }

    private CreateCells(
        grid: Node,
        count: number,
        zone: string,
        unlockRule: (index: number) => boolean
    ): WZSJZ_Cell[] {
        grid.removeAllChildren();
        const cells: WZSJZ_Cell[] = [];
        for (let index = 0; index < count; index++) {
            const cellNode = instantiate(this.CellPrefab);
            cellNode.setParent(grid);
            const cell = cellNode.getComponent(WZSJZ_Cell) || cellNode.addComponent(WZSJZ_Cell);
            cell.Init(index, zone, unlockRule(index));
            cells.push(cell);
        }

        grid.getComponent(Layout)?.updateLayout();
        return cells;
    }

    private BindPurchaseButton(): void {
        const buttonNode = this.PreparationZone?.getChildByName("购买物资");
        if (buttonNode) {
            buttonNode.on(Button.EventType.CLICK, this.BuyMaterial, this);
        } else {
            console.warn("[WZSJZ] 没有找到“购买物资”按钮。");
        }
    }

    private BindStartButton(): void {
        const buttonNode = this.PreparationZone?.getChildByName("开始游戏");
        if (buttonNode) {
            buttonNode.on(Button.EventType.CLICK, this.StartGame, this);
        } else {
            console.warn("[WZSJZ] 没有找到“开始游戏”按钮。");
        }
    }

    public StartGame(): void {
        if (this._isGameStarted) {
            return;
        }
        this._isGameStarted = true;
        this.schedule(this.ProduceResources, 1);
    }

    /** 每秒只结算布阵区内物资的产出。 */
    private ProduceResources = (): void => {
        let moneyProduction = 0;
        let foodProduction = 0;

        for (const cell of this._formationCells) {
            if (!cell.IsUnlocked || cell.IsEmpty()) {
                continue;
            }
            const material = cell.Occupant.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
            if (!material) {
                continue;
            }

            const config = WZSJZ_Constant.GetMaterialConfig(material.Name);
            const production = material.GetProductionPerSecond();
            if (config?.ResourceType === "money") {
                moneyProduction += production;
            } else if (config?.ResourceType === "food") {
                foodProduction += production;
            }
        }

        this._money += moneyProduction;
        this._food += foodProduction;
        this.RefreshResourceView();
        this.RefreshPriceView();
    };

    public BuyMaterial(): boolean {
        if (this.MaterialPrefabs.length === 0) {
            console.error("[WZSJZ] 尚未配置可购买物资预制体。");
            return false;
        }
        const emptyCell = this._preparationCells.find((cell) => cell.IsUnlocked && cell.IsEmpty());
        if (!emptyCell) {
            console.warn("[WZSJZ] 备战框已满，无法购买物资。");
            return false;
        }

        const moneyCost = this.CurrentMoneyCost;
        const foodCost = this.CurrentFoodCost;
        if (this._money < moneyCost || this._food < foodCost) {
            console.warn(`[WZSJZ] 资源不足，需要钞票 ${moneyCost}、食物 ${foodCost}。`);
            return false;
        }

        const priceStage = Math.floor(this._purchaseCount / 5);
        const materialLevel = WZSJZ_Constant.GetPurchaseMaterialLevel(priceStage);
        const prefab = this.GetRandomMaterialPrefab("PurchaseWeight");
        if (!prefab) {
            return false;
        }

        this._money -= moneyCost;
        this._food -= foodCost;
        this._purchaseCount++;

        // 购买得到的钥匙与其他物资一样占用备战格，不计入 GameData[0]，也没有等级。
        const purchasedLevel = prefab.data.name === "钥匙" ? 1 : materialLevel;
        const purchaseSucceeded = this.CreateMaterialAtCell(prefab, emptyCell, purchasedLevel);
        if (!purchaseSucceeded) {
            this._money += moneyCost;
            this._food += foodCost;
            this._purchaseCount--;
            return false;
        }
        this.RefreshResourceView();
        this.RefreshPriceView();
        return true;
    }

    public get CurrentMoneyCost(): number {
        const priceLevel = Math.floor(this._purchaseCount / 5);
        return Math.ceil(this.BaseMoneyCost * (1 + priceLevel * this.PriceIncreaseRate));
    }

    public get CurrentFoodCost(): number {
        const priceLevel = Math.floor(this._purchaseCount / 5);
        return Math.ceil(this.BaseFoodCost * (1 + priceLevel * this.PriceIncreaseRate));
    }

    public BeginDrag(gameNode: WZSJZ_GameNode): void {
        this._draggingNode = gameNode;
        this.RefreshUpgradeHints(gameNode);
        if (gameNode.Name === "钥匙") {
            this.ShowKeyUnlockHints();
        }
        if (this.DragLayer) {
            // true 表示换父节点时保持世界坐标不变，画面不会跳动。
            gameNode.node.setParent(this.DragLayer, true);
            // 换父节点不会自动继承 Layer，让物资及其图片与拖拽层保持一致。
            this.SetLayerRecursively(gameNode.node, this.DragLayer.layer);
            gameNode.node.setSiblingIndex(this.DragLayer.children.length - 1);
        }
    }

    public CanBeginDrag(gameNode: WZSJZ_GameNode): boolean {
        // 已安装在墙体格中的围墙不能主动卸载，只能被备战围墙升级或替换。
        return !!gameNode.CurrentCell && gameNode.CurrentCell.Zone !== "wall";
    }

    public EndDrag(gameNode: WZSJZ_GameNode, uiPosition: Vec2): void {
        this.RefreshUpgradeHints(null);
        this.ClearKeyUnlockHints();
        if (this._draggingNode !== gameNode || !gameNode.CurrentCell) {
            return;
        }
        this._draggingNode = null;

        const sourceCell = gameNode.CurrentCell;
        if (sourceCell.Zone === "wall") {
            this.SnapToCell(gameNode, sourceCell);
            return;
        }
        // 购买生成的钥匙只能解锁；成功后消耗场上的钥匙节点。
        if (gameNode.Name === "钥匙") {
            if (this.TryUnlockCellWithKey(uiPosition)) {
                sourceCell.Occupant = null;
                gameNode.CurrentCell = null;
                gameNode.node.destroy();
            } else {
                this.SnapToCell(gameNode, sourceCell);
            }
            return;
        }
        if (this.TryRecycleMaterial(gameNode, sourceCell, uiPosition)) {
            return;
        }
        const targetCell = this.FindDropCell(uiPosition);
        if (!targetCell || targetCell === sourceCell) {
            this.SnapToCell(gameNode, sourceCell);
            return;
        }

        if (!this.CanPlaceInCell(gameNode, targetCell)) {
            this.SnapToCell(gameNode, sourceCell);
            return;
        }

        // 道具锁格只能通过与格内默认物资合成来解锁，不能直接放入或交换。
        if (targetCell.IsItemLocked && targetCell.IsEmpty()) {
            this.SnapToCell(gameNode, sourceCell);
            return;
        }

        if (targetCell.IsEmpty()) {
            sourceCell.Occupant = null;
            targetCell.Occupant = gameNode.node;
            gameNode.CurrentCell = targetCell;
            this.SnapToCell(gameNode, targetCell);
            if (sourceCell.Zone === "wall" || targetCell.Zone === "wall") {
                this.RefreshWallDisplay();
            }
            return;
        }

        const targetNode = targetCell.Occupant.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
        const canMerge = this.CanMergeAtCell(gameNode, targetNode, targetCell);

        if (canMerge) {
            const unlockItemCell = targetCell.IsItemLocked;
            sourceCell.Occupant = null;
            targetNode.Upgrade();
            gameNode.CurrentCell = null;
            gameNode.node.destroy();
            if (unlockItemCell) {
                targetCell.SetUnlocked(true);
                this.RefreshPreparationItemLocks();
            }
            if (targetCell.Zone === "wall") {
                this.RefreshWallDisplay();
            }
            return;
        }

        if (targetCell.IsItemLocked) {
            this.SnapToCell(gameNode, sourceCell);
            return;
        }

        if (targetNode && this.CanPlaceInCell(targetNode, sourceCell)) {
            // 不能合成时交换位置；两个物资可以来自不同区域。
            sourceCell.Occupant = targetNode.node;
            targetCell.Occupant = gameNode.node;
            targetNode.CurrentCell = sourceCell;
            gameNode.CurrentCell = targetCell;

            this.SnapToCell(targetNode, sourceCell);
            this.SnapToCell(gameNode, targetCell);
            if (sourceCell.Zone === "wall" || targetCell.Zone === "wall") {
                this.RefreshWallDisplay();
            }
            return;
        }

        this.SnapToCell(gameNode, sourceCell);
    }

    private FindDropCell(uiPosition: Vec2): WZSJZ_Cell {
        const allCells = this.GetAllCells();
        return allCells.find((cell) =>
            (cell.IsUnlocked || cell.IsItemLocked)
            && cell.ContainsUIPosition(uiPosition)
        ) || null;
    }

    private RefreshUpgradeHints(draggingNode: WZSJZ_GameNode | null): void {
        const allCells = this.GetAllCells();
        for (const cell of allCells) {
            if (cell.IsEmpty()) {
                continue;
            }
            const material = cell.Occupant.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
            if (!material) {
                continue;
            }

            const canMerge = !!draggingNode
                && this.CanMergeAtCell(draggingNode, material, cell);
            material.SetUpgradeHint(canMerge);
        }
    }

    private GetAllCells(): WZSJZ_Cell[] {
        const cells = this._formationCells.concat(this._preparationCells);
        if (this._wallCell) {
            cells.push(this._wallCell);
        }
        return cells;
    }

    private RefreshPreparationItemLocks(): void {
        const unlockedCount = this._preparationCells.filter((cell) => cell.IsUnlocked).length;
        const materialLevel = WZSJZ_Constant.GetItemLockMaterialLevel(unlockedCount);
        for (const cell of this._preparationCells) {
            if (cell.IsUnlocked || cell.IsItemLocked || !this.IsNextToUnlockedPreparationCell(cell)) {
                continue;
            }

            const prefab = this.GetRandomMaterialPrefab("ItemLockWeight");
            if (!prefab) {
                continue;
            }
            cell.SetItemLocked();
            if (!this.CreateMaterialAtCell(prefab, cell, materialLevel)) {
                // 生成失败时恢复普通锁，避免出现无法解开的空道具锁。
                cell.SetUnlocked(false);
            }
        }
    }

    private IsNextToUnlockedPreparationCell(cell: WZSJZ_Cell): boolean {
        const config = WZSJZ_Constant.PreparationGrid;
        const row = Math.floor(cell.Index / config.Columns);
        const column = cell.Index % config.Columns;
        const neighborIndexes: number[] = [];

        if (column > 0) neighborIndexes.push(cell.Index - 1);
        if (column < config.Columns - 1) neighborIndexes.push(cell.Index + 1);
        if (row > 0) neighborIndexes.push(cell.Index - config.Columns);
        if (row < config.Rows - 1) neighborIndexes.push(cell.Index + config.Columns);

        return neighborIndexes.some((index) => this._preparationCells[index]?.IsUnlocked);
    }

    private CanPlaceInCell(gameNode: WZSJZ_GameNode, cell: WZSJZ_Cell): boolean {
        // 所有物资都可以暂存在备战框。
        if (cell.Zone === "preparation") {
            return true;
        }
        const config = WZSJZ_Constant.GetMaterialConfig(gameNode.Name);
        return !!config && config.BattlePlacement === cell.Zone;
    }

    private SetupToolArea(): void {
        const toolArea = this.PreparationZone?.getChildByName("道具区");
        this._keySlotNode = toolArea?.getChildByName("钥匙");
        this._recycleNode = toolArea?.getChildByName("回收");
        if (this._keySlotNode) {
            this._keySlotNode.on(Node.EventType.TOUCH_START, this.OnKeyTouchStart, this);
            this._keySlotNode.on(Node.EventType.TOUCH_MOVE, this.OnKeyTouchMove, this);
            this._keySlotNode.on(Node.EventType.TOUCH_END, this.OnKeyTouchEnd, this);
            this._keySlotNode.on(Node.EventType.TOUCH_CANCEL, this.OnKeyTouchEnd, this);
        }
        this.RefreshKeyCountView();
    }

    private UnbindToolArea(): void {
        if (!this._keySlotNode) {
            return;
        }
        this._keySlotNode.off(Node.EventType.TOUCH_START, this.OnKeyTouchStart, this);
        this._keySlotNode.off(Node.EventType.TOUCH_MOVE, this.OnKeyTouchMove, this);
        this._keySlotNode.off(Node.EventType.TOUCH_END, this.OnKeyTouchEnd, this);
        this._keySlotNode.off(Node.EventType.TOUCH_CANCEL, this.OnKeyTouchEnd, this);
    }

    private OnKeyTouchStart(event: EventTouch): void {
        if (this.KeyCount <= 0 || !this.DragLayer || this._isDraggingKey) {
            return;
        }
        const iconNode = this._keySlotNode?.getChildByName("钥匙");
        if (!iconNode) {
            return;
        }
        this._isDraggingKey = true;
        this.ShowKeyUnlockHints();
        this._keyDragVisual = instantiate(iconNode);
        this._keyDragVisual.setParent(this.DragLayer);
        this._keyDragVisual.setWorldPosition(iconNode.worldPosition);
        this.SetLayerRecursively(this._keyDragVisual, this.DragLayer.layer);
        this._keyDragVisual.setSiblingIndex(this.DragLayer.children.length - 1);
        this._keyDragStartWorldPosition.set(iconNode.worldPosition);
        const start = event.getUILocation();
        this._keyDragStartUIPosition.set(start.x, start.y);
    }

    private OnKeyTouchMove(event: EventTouch): void {
        if (!this._isDraggingKey || !this._keyDragVisual) {
            return;
        }
        const current = event.getUILocation();
        this._keyDragVisual.setWorldPosition(
            this._keyDragStartWorldPosition.x + current.x - this._keyDragStartUIPosition.x,
            this._keyDragStartWorldPosition.y + current.y - this._keyDragStartUIPosition.y,
            this._keyDragStartWorldPosition.z,
        );
    }

    private OnKeyTouchEnd(event: EventTouch): void {
        if (!this._isDraggingKey) {
            return;
        }
        this._isDraggingKey = false;
        this.ClearKeyUnlockHints();
        if (this._keyDragVisual?.isValid) {
            this._keyDragVisual.destroy();
        }
        this._keyDragVisual = null;

        if (this.KeyCount <= 0 || !this.TryUnlockCellWithKey(event.getUILocation())) {
            return;
        }
        this.ChangeKeyCount(-1);
    }

    /** 两种钥匙都可解备战区道具锁，或布阵区尚未开放的普通锁格。 */
    private TryUnlockCellWithKey(uiPosition: Vec2): boolean {
        const preparationTarget = this._preparationCells.find((cell) =>
            cell.IsItemLocked && cell.ContainsUIPosition(uiPosition)
        );
        const formationTarget = this._formationCells.find((cell) =>
            !cell.IsUnlocked && cell.ContainsUIPosition(uiPosition)
        );
        const targetCell = preparationTarget || formationTarget;
        if (!targetCell) {
            return false;
        }

        targetCell.SetUnlocked(true);
        if (targetCell.Zone === "preparation") {
            this.RefreshPreparationItemLocks();
        }
        return true;
    }

    private GetKeyUnlockTargets(): WZSJZ_Cell[] {
        const preparationTargets = this._preparationCells.filter((cell) => cell.IsItemLocked);
        const formationTargets = this._formationCells.filter((cell) => !cell.IsUnlocked);
        return preparationTargets.concat(formationTargets);
    }

    private ShowKeyUnlockHints(): void {
        this.ClearKeyUnlockHints();
        if (!this.DragLayer) {
            return;
        }

        const hintColor = WZSJZ_Constant.KeyUnlockHintColor;
        for (const cell of this.GetKeyUnlockTargets()) {
            const cellTransform = cell.node.getComponent(UITransform);
            if (!cellTransform) {
                continue;
            }

            const hintNode = new Node("钥匙交互提示");
            hintNode.layer = this.DragLayer.layer;
            hintNode.setParent(this.DragLayer);
            hintNode.setWorldPosition(cell.node.worldPosition);

            const hintTransform = hintNode.addComponent(UITransform);
            hintTransform.setContentSize(cellTransform.contentSize);
            hintTransform.setAnchorPoint(cellTransform.anchorPoint);

            const graphics = hintNode.addComponent(Graphics);
            graphics.fillColor = new Color(
                hintColor.R,
                hintColor.G,
                hintColor.B,
                hintColor.A,
            );
            graphics.rect(
                -cellTransform.contentSize.width * cellTransform.anchorPoint.x,
                -cellTransform.contentSize.height * cellTransform.anchorPoint.y,
                cellTransform.contentSize.width,
                cellTransform.contentSize.height,
            );
            graphics.fill();
            this._keyUnlockHintNodes.push(hintNode);
        }
    }

    private ClearKeyUnlockHints(): void {
        for (const hintNode of this._keyUnlockHintNodes) {
            if (hintNode?.isValid) {
                hintNode.destroy();
            }
        }
        this._keyUnlockHintNodes.length = 0;
    }

    private get KeyCount(): number {
        const data = WZSJZ_GameData.Instance.GameData || [];
        return Math.max(0, Math.floor(data[0] || 0));
    }

    private ChangeKeyCount(delta: number, save: boolean = true): boolean {
        const gameData = WZSJZ_GameData.Instance;
        if (!gameData.GameData) {
            gameData.GameData = [];
        }
        const nextCount = Math.max(0, this.KeyCount + Math.floor(delta));
        if (delta < 0 && nextCount === this.KeyCount) {
            return false;
        }
        gameData.GameData[0] = nextCount;
        this.RefreshKeyCountView();
        if (save) {
            WZSJZ_GameData.DateSave();
        }
        return true;
    }

    private RefreshKeyCountView(): void {
        this.SetLabel(this._keySlotNode?.getChildByName("数量"), this.KeyCount);
    }

    private TryRecycleMaterial(
        gameNode: WZSJZ_GameNode,
        sourceCell: WZSJZ_Cell,
        uiPosition: Vec2,
    ): boolean {
        const recycleTransform = this._recycleNode?.getComponent(UITransform);
        if (!recycleTransform?.getBoundingBoxToWorld().contains(uiPosition)) {
            return false;
        }
        const reward = WZSJZ_Constant.GetRecycleReward(gameNode.Name, gameNode.Level);
        sourceCell.Occupant = null;
        gameNode.CurrentCell = null;
        gameNode.node.destroy();
        this._money += reward.Money;
        this._food += reward.Food;
        this.RefreshResourceView();
        this.RefreshPriceView();
        return true;
    }

    private CanMergeAtCell(
        draggingNode: WZSJZ_GameNode,
        targetNode: WZSJZ_GameNode,
        targetCell: WZSJZ_Cell
    ): boolean {
        if (!targetNode || targetNode === draggingNode || !this.CanPlaceInCell(draggingNode, targetCell)) {
            return false;
        }
        const config = WZSJZ_Constant.GetMaterialConfig(draggingNode.Name);
        return targetNode.Name === draggingNode.Name
            && targetNode.Level === draggingNode.Level
            && config?.MergeSameLevelCount === 2
            && targetNode.CanUpgrade();
    }

    private FindMaterialPrefab(materialName: string): Prefab {
        return this.MaterialPrefabs.find((prefab) => prefab?.data?.name === materialName) || null;
    }

    private GetRandomMaterialPrefab(
        weightField: "PurchaseWeight" | "ItemLockWeight"
    ): Prefab {
        const candidates = this.MaterialPrefabs
            .map((prefab) => ({
                prefab,
                weight: WZSJZ_Constant.GetMaterialConfig(prefab?.data?.name)?.[weightField] || 0,
            }))
            .filter((item) => item.weight > 0);
        const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
        if (totalWeight <= 0) {
            console.error(`[WZSJZ] Constant 中没有有效的 ${weightField} 配置。`);
            return null;
        }

        let random = Math.random() * totalWeight;
        for (const item of candidates) {
            random -= item.weight;
            if (random < 0) {
                return item.prefab;
            }
        }
        return candidates[candidates.length - 1].prefab;
    }

    private CreateMaterialAtCell(prefab: Prefab, cell: WZSJZ_Cell, level: number): boolean {
        const targetLayer = this.GetObjectLayer(cell);
        if (!prefab || !targetLayer || !cell.IsEmpty()) {
            return false;
        }

        const materialNode = instantiate(prefab);
        materialNode.setParent(targetLayer);
        const material = materialNode.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
        if (!material) {
            materialNode.destroy();
            console.error("[WZSJZ] 物资预制体缺少 WZSJZ_GameNode 组件。");
            return false;
        }

        cell.Occupant = materialNode;
        material.Init(cell, level);
        this.SnapToCell(material, cell);
        if (cell.Zone === "wall") {
            this.RefreshWallDisplay();
        }
        return true;
    }

    private async RefreshWallDisplay(): Promise<void> {
        if (!this.WallDisplayNode || !this._wallCell || this._wallCell.IsEmpty()) {
            if (this.WallDisplayNode) {
                this.WallDisplayNode.active = false;
            }
            return;
        }

        const wallNode = this._wallCell.Occupant;
        const wall = wallNode.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
        const levelConfig = wall
            ? WZSJZ_Constant.GetMaterialLevelConfig(wall.Name, wall.Level)
            : null;
        const displaySprite = this.WallDisplayNode.getComponent(Sprite);
        if (!wall || wall.Name !== "围墙" || !levelConfig?.DisplaySpritePath || !displaySprite) {
            this.WallDisplayNode.active = false;
            return;
        }

        this.WallDisplayNode.active = true;
        const expectedLevel = wall.Level;
        const spriteFrame = await WZSJZ_Incident.LoadSprite(levelConfig.DisplaySpritePath) as SpriteFrame;
        if (spriteFrame
            && this._wallCell.Occupant === wallNode
            && wall.Level === expectedLevel
            && this.WallDisplayNode.isValid) {
            displaySprite.spriteFrame = spriteFrame;
        }
    }

    private GetObjectLayer(cell: WZSJZ_Cell): Node {
        switch (cell.Zone) {
            case "formation":
                return this._formationObjectLayer;
            case "preparation":
                return this._preparationObjectLayer;
            case "wall":
                return this._wallObjectLayer;
            default:
                return null;
        }
    }

    private MoveToZoneLayer(gameNode: WZSJZ_GameNode, cell: WZSJZ_Cell): void {
        const targetLayer = this.GetObjectLayer(cell);
        if (targetLayer && gameNode.node.parent !== targetLayer) {
            gameNode.node.setParent(targetLayer, true);
        }
        if (targetLayer) {
            // 放回区域后恢复成该物体区使用的 Layer。
            this.SetLayerRecursively(gameNode.node, targetLayer.layer);
            targetLayer.setSiblingIndex(targetLayer.parent.children.length - 1);
            gameNode.node.setSiblingIndex(targetLayer.children.length - 1);
            if (cell.Zone === "preparation") {
                this.EnsurePreparationLayerOrder();
            }
            // 墙体物体区直属 Canvas，放回围墙后仍要保证拖拽层处于最上方。
            if (this.DragLayer?.parent) {
                this.DragLayer.setSiblingIndex(this.DragLayer.parent.children.length - 1);
            }
        }
    }

    private SetupDragLayer(): void {
        const canvas = this.FormationZone?.parent;
        if (!canvas) {
            return;
        }

        // 优先使用 Inspector 绑定的场景节点，其次按名称查找，最后才运行时创建。
        this.DragLayer = this.DragLayer || canvas.getChildByName("拖拽层");
        if (!this.DragLayer) {
            this.DragLayer = new Node("拖拽层");
            this.DragLayer.layer = canvas.layer;
            this.DragLayer.setParent(canvas);
            this.DragLayer.setPosition(0, 0, 0);
        }

        let dragTransform = this.DragLayer.getComponent(UITransform);
        if (!dragTransform) {
            dragTransform = this.DragLayer.addComponent(UITransform);
        }
        const canvasTransform = canvas.getComponent(UITransform);
        if (canvasTransform) {
            dragTransform.setContentSize(canvasTransform.contentSize);
            dragTransform.setAnchorPoint(canvasTransform.anchorPoint);
        }
        this.DragLayer.setSiblingIndex(canvas.children.length - 1);
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }

    private SnapToCell(gameNode: WZSJZ_GameNode, cell: WZSJZ_Cell): void {
        this.MoveToZoneLayer(gameNode, cell);
        const parentTransform = gameNode.node.parent?.getComponent(UITransform);
        if (!parentTransform) {
            return;
        }
        const localPosition = parentTransform.convertToNodeSpaceAR(cell.node.worldPosition);
        gameNode.node.setPosition(localPosition.x, localPosition.y, 0);
    }

    private RefreshResourceView(): void {
        const canvas = this.FormationZone?.parent;
        const dataBar = canvas?.getChildByName("数据栏");
        this.SetLabel(dataBar?.getChildByName("钞票")?.getChildByName("数量"), this._money);
        this.SetLabel(dataBar?.getChildByName("食物")?.getChildByName("数量"), this._food);
    }

    private RefreshPriceView(): void {
        const requirementNode = this.PreparationZone?.getChildByName("购买需求");
        const foodLabel = requirementNode?.getChildByName("食物数量")?.getComponent(Label);
        const moneyLabel = requirementNode?.getChildByName("钞票数量")?.getComponent(Label);

        this.SetRequirementLabel(
            foodLabel,
            this.CurrentFoodCost,
            this._food >= this.CurrentFoodCost,
        );
        this.SetRequirementLabel(
            moneyLabel,
            this.CurrentMoneyCost,
            this._money >= this.CurrentMoneyCost,
        );

        // 保留旧“价格”Label 的兼容显示。
        const priceNode = this.PreparationZone
            ?.getChildByName("购买物资")
            ?.getChildByName("价格");
        const label = priceNode?.getComponent(Label);
        if (label) {
            label.string = `${this.CurrentMoneyCost}/${this.CurrentFoodCost}`;
        }
    }

    /** 使用场景中两个需求文本的编辑器颜色作为状态色，不在脚本中写死纯红/纯绿。 */
    private CachePurchaseRequirementColors(): void {
        const requirementNode = this.PreparationZone?.getChildByName("购买需求");
        const foodLabel = requirementNode?.getChildByName("食物数量")?.getComponent(Label);
        const moneyLabel = requirementNode?.getChildByName("钞票数量")?.getComponent(Label);
        this._enoughRequirementColor = foodLabel?.color.clone() || null;
        this._insufficientRequirementColor = moneyLabel?.color.clone() || null;
    }

    private SetRequirementLabel(label: Label, cost: number, isEnough: boolean): void {
        if (!label) {
            return;
        }
        label.string = Math.max(0, Math.ceil(cost)).toString();
        const color = isEnough
            ? this._enoughRequirementColor
            : this._insufficientRequirementColor;
        if (color) {
            label.color = color.clone();
        }
    }

    private SetLabel(node: Node, value: number): void {
        const label = node?.getComponent(Label);
        if (label) {
            label.string = Math.max(0, Math.floor(value)).toString();
        }
    }

    /** 兼容在编辑器 Button ClickEvents 中手动绑定的旧入口。 */
    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "购买物资":
                this.BuyMaterial();
                break;
            case "开始游戏":
                this.StartGame();
                break;
        }
    }
}
