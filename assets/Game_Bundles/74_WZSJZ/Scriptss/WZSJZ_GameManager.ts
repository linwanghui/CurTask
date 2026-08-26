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
    tween,
    Tween,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_GameData } from './WZSJZ_GameData';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_CombatSystem } from './WZSJZ_CombatSystem';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_EconomySystem } from './WZSJZ_EconomySystem';
import { WZSJZ_CellEffectSystem } from './WZSJZ_CellEffectSystem';
import { WZSJZ_RecycleSystem } from './WZSJZ_RecycleSystem';
import { WZSJZ_NameUnitSystem } from './WZSJZ_NameUnitSystem';
import { WZSJZ_CommonEffectSystem } from './WZSJZ_CommonEffectSystem';
import { WZSJZ_ShieldBrotherCombatSystem } from './WZSJZ_ShieldBrotherCombatSystem';
import { WZSJZ_FengDogCombatSystem } from './WZSJZ_FengDogCombatSystem';
import { WZSJZ_SkillSystem } from './WZSJZ_SkillSystem';
import { WZSJZ_NodeInspectSystem } from './WZSJZ_NodeInspectSystem';
import { WZSJZ_DragIndicatorSystem } from './WZSJZ_DragIndicatorSystem';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
const { ccclass, property } = _decorator;

/** 场景总入口；具体战斗、技能与表现逻辑由各子系统负责。 */
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
    private _draggingNode: WZSJZ_GameNode = null;
    private _isGameStarted: boolean = false;
    private _keySlotNode: Node = null;
    private _keyDragVisual: Node = null;
    private _keyDragStartWorldPosition: Vec3 = new Vec3();
    private _keyDragStartUIPosition: Vec2 = new Vec2();
    private _isDraggingKey: boolean = false;
    private _keyUnlockHintNodes: Node[] = [];
    private _wallBehavior: WZSJZ_Wall = null;
    private _combatSystem: WZSJZ_CombatSystem = null;
    private _economySystem: WZSJZ_EconomySystem = null;
    private _cellEffectSystem: WZSJZ_CellEffectSystem = null;
    private _recycleSystem: WZSJZ_RecycleSystem = null;
    private _nameUnitSystem: WZSJZ_NameUnitSystem = null;
    private _commonEffectSystem: WZSJZ_CommonEffectSystem = null;
    private _shieldBrotherCombatSystem: WZSJZ_ShieldBrotherCombatSystem = null;
    private _fengDogCombatSystem: WZSJZ_FengDogCombatSystem = null;
    private _skillSystem: WZSJZ_SkillSystem = null;
    private _nodeInspectSystem: WZSJZ_NodeInspectSystem = null;
    private _dragIndicatorSystem: WZSJZ_DragIndicatorSystem = null;

    public get IsGameStarted(): boolean {
        return this._isGameStarted;
    }

    protected onLoad(): void {
        WZSJZ_GameManager._instance = this;
        WZSJZ_EventManager.BindSceneEventNode(this.node);
        this.node.on(WZSJZ_EventManager.修改增加钥匙, this.OnCheatAddKeys, this);
        this.node.on(WZSJZ_EventManager.修改添加单位, this.OnCheatAddUnit, this);
        this.node.on(WZSJZ_EventManager.修改城墙无敌, this.OnCheatToggleWallInvincible, this);
    }

    protected start(): void {
        this.InitBoard();
        void this.PrepareRuntimeMaterialPrefabs();
        this._nodeInspectSystem = this.node.getComponent(WZSJZ_NodeInspectSystem)
            || this.node.addComponent(WZSJZ_NodeInspectSystem);
        this._nodeInspectSystem.Configure(
            this.FormationZone?.parent?.getChildByName('攻击范围显示') || null,
        );
        this._dragIndicatorSystem = this.node.getComponent(WZSJZ_DragIndicatorSystem)
            || this.node.addComponent(WZSJZ_DragIndicatorSystem);
        this._dragIndicatorSystem.Configure(this.DragLayer);
        this._combatSystem = this.node.getComponent(WZSJZ_CombatSystem)
            || this.node.addComponent(WZSJZ_CombatSystem);
        this._combatSystem.Configure(this.FormationZone?.parent, this.DragLayer);
        this._commonEffectSystem = this.node.getComponent(WZSJZ_CommonEffectSystem)
            || this.node.addComponent(WZSJZ_CommonEffectSystem);
        this._commonEffectSystem.Configure(this.FormationZone?.parent, this.DragLayer);
        this._skillSystem = this.node.getComponent(WZSJZ_SkillSystem)
            || this.node.addComponent(WZSJZ_SkillSystem);
        this._skillSystem.Configure(
            this.PreparationZone,
            this.WallDisplayNode,
            this.FormationZone?.parent,
            this._formationCells,
            this._dragIndicatorSystem,
        );
        this._shieldBrotherCombatSystem = this.node.getComponent(WZSJZ_ShieldBrotherCombatSystem)
            || this.node.addComponent(WZSJZ_ShieldBrotherCombatSystem);
        this._shieldBrotherCombatSystem.Configure(this.FormationZone?.parent, this.DragLayer);
        this._fengDogCombatSystem = this.node.getComponent(WZSJZ_FengDogCombatSystem)
            || this.node.addComponent(WZSJZ_FengDogCombatSystem);
        this._fengDogCombatSystem.Configure(this.FormationZone?.parent, this.DragLayer);
        this._cellEffectSystem = this.node.getComponent(WZSJZ_CellEffectSystem)
            || this.node.addComponent(WZSJZ_CellEffectSystem);
        this._cellEffectSystem.Configure(this.FormationZone?.parent, this.DragLayer);
        this._economySystem = this.node.getComponent(WZSJZ_EconomySystem)
            || this.node.addComponent(WZSJZ_EconomySystem);
        this._economySystem.Configure(
            this.PreparationZone,
            this._formationCells,
            this._preparationCells,
            this.MaterialPrefabs,
            this.StartMoney,
            this.StartFood,
            this.BaseMoneyCost,
            this.BaseFoodCost,
            this.PriceIncreaseRate,
            (prefab, cell, level) => this.CreateMaterialAtCell(prefab, cell, level, true),
        );
        this._nameUnitSystem = this.node.getComponent(WZSJZ_NameUnitSystem)
            || this.node.addComponent(WZSJZ_NameUnitSystem);
        this._nameUnitSystem.Configure(this._formationCells, this._formationObjectLayer);
        // 道具锁内的默认物资依赖经济模块的权重池，必须在其配置完成后生成。
        this.RefreshPreparationItemLocks();
        this.BindStartButton();
        this.SetupToolArea();
    }

    private async PrepareRuntimeMaterialPrefabs(): Promise<void> {
        for (const path of WZSJZ_Constant.RuntimeMaterialPrefabPaths) {
            try {
                const prefab = await WZSJZ_Incident.Loadprefab(path);
                if (this.node?.isValid
                    && !this.MaterialPrefabs.some((item) => item?.data?.name === prefab.data.name)) {
                    this.MaterialPrefabs.push(prefab);
                }
            } catch (error) {
                console.error(`[WZSJZ] 动态物资预制体加载失败：${path}`, error);
            }
        }
    }

    protected onDestroy(): void {
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
        // 墙体格子现在属于布阵区；保留场景绑定和旧Canvas结构作为兼容兜底。
        this.WallCellNode = this.WallCellNode
            || this.FormationZone?.getChildByName("墙体格子")
            || canvas?.getChildByName("墙体格子");
        this.WallDisplayNode = this.WallDisplayNode
            || this.FormationZone?.getChildByName("围墙")
            || canvas?.getChildByName("围墙");
        if (!canvas || !this.WallCellNode) {
            console.error("[WZSJZ] 没有找到墙体格子。");
            return;
        }

        this._wallCell = this.WallCellNode.getComponent(WZSJZ_Cell)
            || this.WallCellNode.addComponent(WZSJZ_Cell);
        this._wallCell.Init(0, "wall", true);

        this._wallObjectLayer = this.FormationZone.getChildByName("墙体物体区");
        if (!this._wallObjectLayer) {
            this._wallObjectLayer = new Node("墙体物体区");
            this._wallObjectLayer.layer = this.WallCellNode.layer;
            this._wallObjectLayer.setParent(this.FormationZone);
            const transform = this._wallObjectLayer.addComponent(UITransform);
            const formationTransform = this.FormationZone.getComponent(UITransform);
            if (formationTransform) {
                transform.setContentSize(formationTransform.contentSize);
                transform.setAnchorPoint(formationTransform.anchorPoint);
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

    private BindStartButton(): void {
        const buttonNode = this.GetStartButtonNode();
        if (buttonNode) {
            buttonNode.on(Button.EventType.CLICK, this.StartGame, this);
        } else {
            console.warn("[WZSJZ] 没有找到“开始游戏”按钮。");
        }
    }

    private GetStartButtonNode(): Node {
        return this.FormationZone?.parent?.getChildByName("开始游戏") || null;
    }

    public StartGame(): void {
        if (this._isGameStarted) {
            return;
        }
        this._isGameStarted = true;
        const startButton = this.GetStartButtonNode();
        if (startButton) {
            startButton.active = false;
        }
        this.InitializeWallHealth(true);
        this.node.emit(WZSJZ_EventManager.游戏开始, this._wallBehavior);
    }

    public BeginDrag(gameNode: WZSJZ_GameNode): void {
        this._draggingNode = gameNode;
        this.node.emit(WZSJZ_EventManager.拖拽物变化, gameNode);
        this.RefreshUpgradeHints(gameNode);
        this._dragIndicatorSystem?.Begin(gameNode);
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

    public UpdateDragIndicator(uiPosition: Vec2): void {
        if (!this._draggingNode) return;
        if (this._draggingNode.Name === '钥匙') {
            const keyTarget = this.GetAllCells().find((cell) =>
                ((cell.Zone === 'preparation' && cell.IsItemLocked)
                    || (cell.Zone === 'formation' && !cell.IsUnlocked))
                && cell.ContainsUIPosition(uiPosition),
            ) || null;
            this._dragIndicatorSystem?.Update(uiPosition, keyTarget);
            return;
        }
        const targetCell = this.FindDropCell(uiPosition);
        const validTarget = this.IsValidDragPreviewTarget(this._draggingNode, targetCell)
            ? targetCell : null;
        this._dragIndicatorSystem?.Update(uiPosition, validTarget);
    }

    private IsValidDragPreviewTarget(gameNode: WZSJZ_GameNode, targetCell: WZSJZ_Cell): boolean {
        const sourceCell = gameNode.CurrentCell;
        if (!sourceCell || !targetCell || targetCell === sourceCell
            || !this.CanPlaceInCell(gameNode, targetCell)) {
            return false;
        }
        if (targetCell.IsEmpty()) {
            return !targetCell.IsItemLocked;
        }
        const targetNode = targetCell.Occupant.getComponent('WZSJZ_GameNode') as WZSJZ_GameNode;
        if (this.CanMergeAtCell(gameNode, targetNode, targetCell)) {
            return true;
        }
        return !targetCell.IsItemLocked
            && !!targetNode
            && this.CanPlaceInCell(targetNode, sourceCell);
    }

    public EndDrag(gameNode: WZSJZ_GameNode, uiPosition: Vec2): void {
        this._dragIndicatorSystem?.Clear();
        this.RefreshUpgradeHints(null);
        this.ClearKeyUnlockHints();
        if (this._draggingNode !== gameNode) {
            return;
        }
        this._draggingNode = null;
        this.node.emit(WZSJZ_EventManager.拖拽物变化, null);
        if (!gameNode.CurrentCell) {
            return;
        }

        const sourceCell = gameNode.CurrentCell;
        try {
            if (sourceCell.Zone === "wall") {
                this.SnapToCell(gameNode, sourceCell);
                return;
            }
            // 回收优先于钥匙解锁判断，使备战框中购买获得的钥匙也能拖入回收区。
            if (this._recycleSystem?.TryRecycle(gameNode, sourceCell, uiPosition)) {
                return;
            }
            // 购买生成的钥匙除回收外只能用于解锁；成功后消耗场上的钥匙节点。
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

            if (this._nameUnitSystem?.TryFeedCombination(gameNode, sourceCell, targetCell)) {
                this._cellEffectSystem?.PlayUpgrade(targetCell);
                return;
            }

            if (targetCell.IsEmpty()) {
                sourceCell.Occupant = null;
                targetCell.Occupant = gameNode.node;
                gameNode.CurrentCell = targetCell;
                this.SnapToCell(gameNode, targetCell);
                this.PlayMaterialPopAnimation(gameNode.node);
                this._cellEffectSystem?.PlayMove(targetCell);
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
                this.PlayMaterialPopAnimation(targetNode.node);
                this._cellEffectSystem?.PlayUpgrade(targetCell);
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
                this.PlayMaterialPopAnimation(targetNode.node);
                this.PlayMaterialPopAnimation(gameNode.node);
                this._cellEffectSystem?.PlayMove(sourceCell);
                this._cellEffectSystem?.PlayMove(targetCell);
                if (sourceCell.Zone === "wall" || targetCell.Zone === "wall") {
                    this.RefreshWallDisplay();
                }
                return;
            }

            this.SnapToCell(gameNode, sourceCell);
        } finally {
            this.node.emit(WZSJZ_EventManager.布阵变化);
        }
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

            const prefab = this._economySystem?.RollMaterialPrefab("ItemLockWeight");
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
        const recycleNode = toolArea?.getChildByName("回收") || null;
        this._recycleSystem = this.node.getComponent(WZSJZ_RecycleSystem)
            || this.node.addComponent(WZSJZ_RecycleSystem);
        this._recycleSystem.Configure(recycleNode, this._economySystem);
        if (this._keySlotNode) {
            this._keySlotNode.on(Node.EventType.TOUCH_START, this.OnKeyTouchStart, this);
            this._keySlotNode.on(Node.EventType.TOUCH_MOVE, this.OnKeyTouchMove, this);
            this._keySlotNode.on(Node.EventType.TOUCH_END, this.OnKeyTouchEnd, this);
            this._keySlotNode.on(Node.EventType.TOUCH_CANCEL, this.OnKeyTouchEnd, this);
        }
        this.RefreshKeyCountView();
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

    private OnCheatAddKeys(amount: number): void {
        const safeAmount = Math.max(0, Math.floor(amount || 0));
        if (safeAmount <= 0) return;
        this.ChangeKeyCount(safeAmount);
        WZSJZ_UIManager.Instance.ShowText(`已增加${safeAmount}把钥匙`);
    }

    private OnCheatToggleWallInvincible(): void {
        if (!this._wallBehavior?.node?.isValid) {
            WZSJZ_UIManager.Instance.ShowText('当前没有可用的城墙');
            return;
        }
        const enabled = this._wallBehavior.TogglePermanentInvincible();
        WZSJZ_UIManager.Instance.ShowText(enabled ? '城墙无敌已开启' : '城墙无敌已关闭');
    }

    private OnCheatAddUnit(unitText: string): void {
        const match = (unitText || '').trim().match(/^(.+?)(?:\s*[：:]?\s*(\d+))?$/);
        const materialName = match?.[1]?.trim() || '';
        const prefab = this.FindMaterialPrefab(materialName);
        if (!prefab) {
            WZSJZ_UIManager.Instance.ShowText(`没有找到单位：${materialName || unitText}`);
            return;
        }
        const cell = this._preparationCells.find((item) => item.IsUnlocked && item.IsEmpty());
        if (!cell) {
            WZSJZ_UIManager.Instance.ShowText('备战框没有空位');
            return;
        }
        const config = WZSJZ_Constant.GetMaterialConfig(materialName);
        const requestedLevel = Number(match?.[2] || WZSJZ_Constant.Cheat.DefaultUnitLevel);
        const level = Math.max(1, Math.min(Math.floor(requestedLevel), config?.MaxLevel || 1));
        if (this.CreateMaterialAtCell(prefab, cell, level, true)) {
            WZSJZ_UIManager.Instance.ShowText(`已添加${level}级${materialName}`);
        }
    }

    private CreateMaterialAtCell(
        prefab: Prefab,
        cell: WZSJZ_Cell,
        level: number,
        playAppearAnimation: boolean = false,
    ): boolean {
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
        if (playAppearAnimation) {
            this.PlayMaterialPopAnimation(materialNode);
        }
        if (cell.Zone === "wall") {
            this.RefreshWallDisplay();
        }
        return true;
    }

    private PlayMaterialPopAnimation(materialNode: Node): void {
        if (!materialNode?.isValid) {
            return;
        }
        const config = WZSJZ_Constant.MaterialPopAnimation;
        const targetScale = materialNode.scale.clone();
        Tween.stopAllByTarget(materialNode);
        materialNode.setScale(
            targetScale.x * config.StartScale,
            targetScale.y * config.StartScale,
            targetScale.z,
        );
        tween(materialNode)
            .to(
                config.Duration,
                { scale: targetScale },
                { easing: config.Easing as any },
            )
            .start();
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
        this.InitializeWallHealth(!this._isGameStarted);
        const expectedLevel = wall.Level;
        const spriteFrame = await WZSJZ_Incident.LoadSprite(levelConfig.DisplaySpritePath) as SpriteFrame;
        if (spriteFrame
            && this._wallCell.Occupant === wallNode
            && wall.Level === expectedLevel
            && this.WallDisplayNode.isValid) {
            displaySprite.spriteFrame = spriteFrame;
        }
    }

    private InitializeWallHealth(refill: boolean): void {
        if (!this.WallDisplayNode || !this._wallCell || this._wallCell.IsEmpty()) {
            return;
        }
        this._wallBehavior = this.WallDisplayNode.getComponent(WZSJZ_Wall);
        const wall = this._wallCell.Occupant.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
        if (this._wallBehavior && wall) {
            const healthViewNode = this.FormationZone?.getChildByName("生命值")
                || this.WallDisplayNode.getChildByName("生命值");
            this._wallBehavior.SetHealthViewNode(healthViewNode);
            this._wallBehavior.SetMaxHealth(wall.GetMaxHealth(), refill);
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
                this._economySystem?.BuyMaterial();
                break;
            case "开始游戏":
                this.StartGame();
                break;
        }
    }
}
