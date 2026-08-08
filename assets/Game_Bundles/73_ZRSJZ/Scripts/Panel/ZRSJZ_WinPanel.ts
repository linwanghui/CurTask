import { _decorator, EventTouch, find, Label, Node, ScrollView, sp, tween, Tween, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_GRID_INTERVAL, ZRSJZ_GRID_SIZE, ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_PropGrid } from '../UI/ZRSJZ_PropGrid';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_WinPanel')
export class ZRSJZ_WinPanel extends ZRSJZ_Panel {

    Earnings: Label = null;
    Evacuate: Label = null;
    BattleTime: Label = null;
    KillCount: Label = null;
    Skeleton: sp.Skeleton = null;
    Point: Node = null;
    Mask: Node = null;
    PropContent: Node = null;
    PropScrollView: ScrollView = null;

    private readonly _propColumnCount: number = 6;
    private _showPropVersion: number = 0;
    private _propNodeVersions: Map<Node, number> = new Map<Node, number>();
    private _isReturning: boolean = false;

    protected onLoad(): void {
        this.Earnings = find("Panel/收益/Earnings", this.node).getComponent(Label);
        this.Evacuate = find("Panel/Desc/撤离方式/Count", this.node).getComponent(Label);
        this.BattleTime = find("Panel/Desc/对局时间/Count", this.node).getComponent(Label);
        this.KillCount = find("Panel/Desc/击杀人数/Count", this.node).getComponent(Label);
        this.Skeleton = find("Panel/WinSkeleton", this.node).getComponent(sp.Skeleton);
        this.Point = find("Panel/WinPoint", this.node);
        this.Mask = find("Panel/Mask", this.node);
        this.PropContent = find("Panel/物资框/View/Content", this.node);
        this.PropScrollView = find("Panel/物资框", this.node).getComponent(ScrollView);
    }

    Show(...args: any[]) {
        super.Show();
        this._isReturning = false;
        this.Mask.active = true;
        this.Evacuate.string = args[0];
        this.BattleTime.string = args[1];
        this.KillCount.string = args[2];
        this.ShowAllProp(args[3]);
        Tween.stopAllByTarget(this.Skeleton.node);
        this.Skeleton.node.setPosition(Vec3.ZERO);
        this.Skeleton.node.setScale(2, 2, 1);
        this.Skeleton.setAnimation(0, "shengli", false);
        this.Skeleton.setCompleteListener(() => {
            this.Skeleton.setAnimation(0, "daiji", true);
            this.Mask.active = false;
            tween(this.Skeleton.node)
                .to(0.3, { worldPosition: this.Point.worldPosition.clone() }, { easing: 'circIn' })
                .start();
            tween(this.Skeleton.node)
                .to(0.3, { scale: Vec3.ONE }, { easing: 'circIn' })
                .start();
        });
    }

    async ShowAllProp(propID: string[]) {
        const showVersion = ++this._showPropVersion;
        const propIDs = Array.isArray(propID) ? propID : [];
        const occupiedGrids: boolean[][] = [];
        const propPlacements: {
            id: string,
            gridX: number,
            gridY: number,
            width: number,
            height: number,
        }[] = [];
        let earnings = 0;
        let occupiedRowCount = 0;

        this.ClearPropContent();

        for (const id of propIDs) {
            const propData = ZRSJZ_GameData.Instance.PropData[id];
            if (!propData) {
                console.warn(`[ZRSJZ_WinPanel] 未找到战利品ID: ${id}`);
                continue;
            }

            earnings += propData.UnitPrice * propData.CurCount;
            const width = Math.max(1, Math.min(this._propColumnCount, Math.floor(propData.Width || 1)));
            const height = Math.max(1, Math.floor(propData.Height || 1));
            const gridPos = this.FindPropGrid(occupiedGrids, width, height);
            this.OccupyPropGrid(occupiedGrids, gridPos.x, gridPos.y, width, height);
            propPlacements.push({ id, gridX: gridPos.x, gridY: gridPos.y, width, height });
            occupiedRowCount = Math.max(occupiedRowCount, gridPos.y + height);
        }

        const contentHeight = occupiedRowCount === 0
            ? 0
            : occupiedRowCount * ZRSJZ_GRID_SIZE + (occupiedRowCount - 1) * ZRSJZ_GRID_INTERVAL;
        this.PropContent.getComponent(UITransform).height = contentHeight;
        this.Earnings.string = `${earnings}`;

        for (const placement of propPlacements) {
            if (showVersion !== this._showPropVersion) return;

            const propNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/PropGrid");
            if (!propNode) continue;

            const propGrid = propNode.getComponent(ZRSJZ_PropGrid);
            propNode.active = false;
            propGrid.enabled = false;
            propNode.parent = this.PropContent;
            this._propNodeVersions.set(propNode, showVersion);
            propNode.setPosition(
                placement.gridX * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL),
                -placement.gridY * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL),
            );
            propNode.getComponent(UITransform).setContentSize(
                placement.width * ZRSJZ_GRID_SIZE + (placement.width - 1) * ZRSJZ_GRID_INTERVAL,
                placement.height * ZRSJZ_GRID_SIZE + (placement.height - 1) * ZRSJZ_GRID_INTERVAL,
            );
            // 结算界面使用自己计算的紧凑网格，不继承道具在库存中的旋转状态。
            // 必须把坐标传给 Init，否则初始化方向时会按默认的 (-1, -1) 重置位置，导致全部重叠。
            await propGrid.Init(
                placement.id,
                placement.gridX,
                placement.gridY,
                ZRSJZ_INVENTORY.仓库_全部,
                false,
            );

            if (showVersion !== this._showPropVersion || !this.node.active) {
                if (this._propNodeVersions.get(propNode) === showVersion) {
                    this.PutPropNode(propNode);
                }
                return;
            }

            propNode.active = true;
        }

        if (showVersion !== this._showPropVersion) return;

        this.scheduleOnce(() => {
            if (showVersion === this._showPropVersion && this.node.active) {
                this.PropScrollView.scrollToTop();
            }
        });
    }

    private ClearPropContent(): void {
        for (const child of [...this.PropContent.children]) {
            this.PutPropNode(child);
        }
        this.PropContent.getComponent(UITransform).height = 0;
    }

    private FindPropGrid(grids: boolean[][], width: number, height: number): { x: number, y: number } {
        for (let y = 0; ; y++) {
            for (let x = 0; x <= this._propColumnCount - width; x++) {
                let canPlace = true;
                for (let row = y; row < y + height && canPlace; row++) {
                    for (let col = x; col < x + width; col++) {
                        if (grids[row]?.[col]) {
                            canPlace = false;
                            break;
                        }
                    }
                }
                if (canPlace) return { x, y };
            }
        }
    }

    private OccupyPropGrid(
        grids: boolean[][],
        gridX: number,
        gridY: number,
        width: number,
        height: number,
    ): void {
        for (let row = gridY; row < gridY + height; row++) {
            if (!grids[row]) grids[row] = new Array(this._propColumnCount).fill(false);
            for (let col = gridX; col < gridX + width; col++) {
                grids[row][col] = true;
            }
        }
    }

    private PutPropNode(propNode: Node): void {
        const propGrid = propNode.getComponent(ZRSJZ_PropGrid);
        this._propNodeVersions.delete(propNode);
        propNode.getComponent(UITransform)?.setContentSize(ZRSJZ_GRID_SIZE, ZRSJZ_GRID_SIZE);
        ZRSJZ_PoolManager.Instance.PutNode(propNode);
        if (propGrid) propGrid.enabled = true;
    }

    public async OnButtonClick(event: EventTouch): Promise<void> {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
                if (this._isReturning) return;
                this._isReturning = true;
                await ZRSJZ_UIManager.Instance.FinishGameInventory(true);
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.加载界面, "ZRSJZ_Star");
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.胜利弹窗);
                break;
        }
    }


}
