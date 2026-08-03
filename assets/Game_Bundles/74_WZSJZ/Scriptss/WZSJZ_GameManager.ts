import {
    _decorator,
    Button,
    Component,
    EventTouch,
    instantiate,
    Label,
    Layout,
    Node,
    Prefab,
    UITransform,
    Vec2,
} from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
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
    private _purchaseCount: number = 0;
    private _money: number = 0;
    private _food: number = 0;
    private _draggingNode: WZSJZ_GameNode = null;
    private _isGameStarted: boolean = false;

    protected onLoad(): void {
        WZSJZ_GameManager._instance = this;
        this._money = this.StartMoney;
        this._food = this.StartFood;
    }

    protected start(): void {
        this.InitBoard();
        this.BindPurchaseButton();
        this.BindStartButton();
        this.RefreshResourceView();
        this.RefreshPriceView();
    }

    protected onDestroy(): void {
        this.unschedule(this.ProduceResources);
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
        this.SetupDragLayer();

        // 布阵区：5列×4行，第2~4行最右边两格开放。
        this._formationCells = this.CreateCells(formationGrid, 20, "formation", (index) => {
            const row = Math.floor(index / 5);
            const column = index % 5;
            return row >= 1 && row <= 3 && column >= 3;
        });

        // 备战框：12列×2行，按排版顺序最前3格开放。
        this._preparationCells = this.CreateCells(preparationGrid, 24, "preparation", (index) => index < 3);
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
    };

    public BuyMaterial(): boolean {
        const emptyCell = this._preparationCells.find((cell) => cell.IsUnlocked && cell.IsEmpty());
        if (!emptyCell) {
            console.warn("[WZSJZ] 备战框已满，无法购买物资。");
            return false;
        }
        if (this.MaterialPrefabs.length === 0) {
            console.error("[WZSJZ] 尚未配置可购买物资预制体。");
            return false;
        }

        const moneyCost = this.CurrentMoneyCost;
        const foodCost = this.CurrentFoodCost;
        if (this._money < moneyCost || this._food < foodCost) {
            console.warn(`[WZSJZ] 资源不足，需要钞票 ${moneyCost}、食物 ${foodCost}。`);
            return false;
        }

        this._money -= moneyCost;
        this._food -= foodCost;
        this._purchaseCount++;

        const prefab = this.MaterialPrefabs[Math.floor(Math.random() * this.MaterialPrefabs.length)];
        const materialNode = instantiate(prefab);
        materialNode.setParent(this._preparationObjectLayer);
        const material = materialNode.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
        if (!material) {
            materialNode.destroy();
            this._money += moneyCost;
            this._food += foodCost;
            this._purchaseCount--;
            console.error("[WZSJZ] 物资预制体缺少 WZSJZ_GameNode 组件。");
            return false;
        }

        emptyCell.Occupant = materialNode;
        material.Init(emptyCell, 1);
        this.SnapToCell(material, emptyCell);
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
        if (this.DragLayer) {
            // true 表示换父节点时保持世界坐标不变，画面不会跳动。
            gameNode.node.setParent(this.DragLayer, true);
            // 换父节点不会自动继承 Layer，让物资及其图片与拖拽层保持一致。
            this.SetLayerRecursively(gameNode.node, this.DragLayer.layer);
            gameNode.node.setSiblingIndex(this.DragLayer.children.length - 1);
        }
    }

    public EndDrag(gameNode: WZSJZ_GameNode, uiPosition: Vec2): void {
        this.RefreshUpgradeHints(null);
        if (this._draggingNode !== gameNode || !gameNode.CurrentCell) {
            return;
        }
        this._draggingNode = null;

        const sourceCell = gameNode.CurrentCell;
        const targetCell = this.FindDropCell(uiPosition);
        if (!targetCell || targetCell === sourceCell) {
            this.SnapToCell(gameNode, sourceCell);
            return;
        }

        if (targetCell.IsEmpty()) {
            sourceCell.Occupant = null;
            targetCell.Occupant = gameNode.node;
            gameNode.CurrentCell = targetCell;
            this.SnapToCell(gameNode, targetCell);
            return;
        }

        const targetNode = targetCell.Occupant.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
        const materialConfig = WZSJZ_Constant.GetMaterialConfig(gameNode.Name);
        const canMerge = targetNode
            && targetNode !== gameNode
            && targetNode.Name === gameNode.Name
            && targetNode.Level === gameNode.Level
            && materialConfig?.MergeSameLevelCount === 2
            && targetNode.CanUpgrade();

        if (canMerge) {
            sourceCell.Occupant = null;
            targetNode.Upgrade();
            gameNode.CurrentCell = null;
            gameNode.node.destroy();
            return;
        }

        if (targetNode) {
            // 不能合成时交换位置；两个物资可以来自不同区域。
            sourceCell.Occupant = targetNode.node;
            targetCell.Occupant = gameNode.node;
            targetNode.CurrentCell = sourceCell;
            gameNode.CurrentCell = targetCell;

            this.SnapToCell(targetNode, sourceCell);
            this.SnapToCell(gameNode, targetCell);
            return;
        }

        this.SnapToCell(gameNode, sourceCell);
    }

    private FindDropCell(uiPosition: Vec2): WZSJZ_Cell {
        const allCells = this._formationCells.concat(this._preparationCells);
        return allCells.find((cell) => cell.IsUnlocked && cell.ContainsUIPosition(uiPosition)) || null;
    }

    private RefreshUpgradeHints(draggingNode: WZSJZ_GameNode | null): void {
        const allCells = this._formationCells.concat(this._preparationCells);
        for (const cell of allCells) {
            if (cell.IsEmpty()) {
                continue;
            }
            const material = cell.Occupant.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
            if (!material) {
                continue;
            }

            const canMerge = !!draggingNode
                && material !== draggingNode
                && material.Name === draggingNode.Name
                && material.Level === draggingNode.Level
                && material.CanUpgrade();
            material.SetUpgradeHint(canMerge);
        }
    }

    private MoveToZoneLayer(gameNode: WZSJZ_GameNode, cell: WZSJZ_Cell): void {
        const targetLayer = cell.Zone === "formation"
            ? this._formationObjectLayer
            : this._preparationObjectLayer;
        if (targetLayer && gameNode.node.parent !== targetLayer) {
            gameNode.node.setParent(targetLayer, true);
        }
        if (targetLayer) {
            // 放回区域后恢复成该物体区使用的 Layer。
            this.SetLayerRecursively(gameNode.node, targetLayer.layer);
            targetLayer.setSiblingIndex(targetLayer.parent.children.length - 1);
            gameNode.node.setSiblingIndex(targetLayer.children.length - 1);
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
        // 如果以后在购买按钮下加入“价格”Label，会自动显示，无需再改逻辑。
        const priceNode = this.PreparationZone
            ?.getChildByName("购买物资")
            ?.getChildByName("价格");
        const label = priceNode?.getComponent(Label);
        if (label) {
            label.string = `${this.CurrentMoneyCost}/${this.CurrentFoodCost}`;
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
