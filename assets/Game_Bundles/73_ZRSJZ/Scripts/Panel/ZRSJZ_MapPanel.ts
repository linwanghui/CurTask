import { _decorator, EventTouch, find, instantiate, Layers, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MapPanel')
export class ZRSJZ_MapPanel extends ZRSJZ_Panel {

    Icon: Sprite = null;
    AllMap: Node = null;
    CurMap: Node = null;
    CurPoint: Node = null;
    Player2Icon: Sprite = null;
    Player2Point: Node = null;
    ParacargoPoint: Node = null;
    BombPlotPoint: Node = null;
    TaskPoint: Node = null;
    readonly TaskPoints: Node[] = [];
    private readonly _taskPointVisibility: boolean[] = [];
    private _pointWorldPosition: Vec3 = new Vec3();
    private _pointParentPosition: Vec3 = new Vec3();
    private _playerMapPosition: Vec3 = new Vec3();
    private _rangeWorldPosition: Vec3 = new Vec3();
    private _rangeParentPosition: Vec3 = new Vec3();

    protected onLoad(): void {
        this.AllMap = find("Panel/Map", this.node);
    }

    public Show(...args: any[]): void {
        super.Show();
        const requestedMap = args[0];
        const miniMapRoot = args[3] instanceof Node ? args[3] as Node : null;
        const taskMapPositions = Array.isArray(args[4])
            ? (args[4] as unknown[]).filter(position => position instanceof Vec3) as Vec3[]
            : [];
        const taskPointVisibility = Array.isArray(args[5])
            ? (args[5] as unknown[]).map(visible => visible === true)
            : [];
        if (miniMapRoot) {
            this.CopyMiniMapNodes(
                miniMapRoot,
                requestedMap,
                taskMapPositions,
                taskPointVisibility,
            );
        }
        if (!this.AllMap || this.AllMap.children.length === 0) {
            console.warn("[ZRSJZ_MapPanel] 地图弹窗中没有可显示的地图节点");
            return;
        }

        this.AllMap.children.forEach(map => map.active = false);
        if (typeof requestedMap === "string") {
            this.CurMap = this.AllMap.getChildByName(requestedMap) ?? this.AllMap.children[0];
        } else {
            const requestedMapIndex = Number(requestedMap ?? 0);
            const mapIndex = Number.isFinite(requestedMapIndex)
                ? Math.max(0, Math.min(this.AllMap.children.length - 1, Math.floor(requestedMapIndex)))
                : 0;
            this.CurMap = this.AllMap.children[mapIndex];
        }
        this.CurMap.active = true;

        this.BindCopiedMapPoints();

        const iconArgument = args[1];
        if (this.Icon && iconArgument instanceof SpriteFrame) {
            this.Icon.spriteFrame = iconArgument;
        }
        const player2IconArgument = args[2];
        if (this.Player2Icon && player2IconArgument instanceof SpriteFrame) {
            this.Player2Icon.spriteFrame = player2IconArgument;
        }

        this.RefreshMapPoints();
        // Panel 的 Widget/适配组件会在本帧结束时调整地图尺寸与缩放，
        // 下一帧再校准一次，避免不同屏幕比例下标记产生偏移。
        this.scheduleOnce(() => this.RefreshMapPoints(), 0);
    }

    /** 每次打开弹窗都复制当前小地图 Map 的直属节点，确保两处地点信息完全一致。 */
    private CopyMiniMapNodes(
        miniMapRoot: Node,
        requestedMap: unknown,
        taskMapPositions: ReadonlyArray<Readonly<Vec3>>,
        taskPointVisibility: ReadonlyArray<boolean>,
    ): void {
        if (!this.AllMap) return;
        for (const oldNode of [...this.AllMap.children]) {
            oldNode.removeFromParent();
            oldNode.destroy();
        }

        this._taskPointVisibility.length = 0;
        let taskIndex = 0;
        for (const sourceNode of miniMapRoot.children) {
            const copiedNode = instantiate(sourceNode);
            copiedNode.parent = this.AllMap;
            this.SetUILayerRecursively(copiedNode);
            // 小地图底图会为跟随玩家而实时偏移；弹窗需要显示完整地图，所以恢复到中心。
            if (typeof requestedMap === "string" && copiedNode.name === requestedMap) {
                copiedNode.setPosition(0, 0, copiedNode.position.z);
            }
            if (copiedNode.name.startsWith("任务_")) {
                const taskMapPosition = taskMapPositions[taskIndex];
                this._taskPointVisibility.push(taskPointVisibility[taskIndex] === true);
                taskIndex++;
                if (taskMapPosition) {
                    copiedNode.setPosition(taskMapPosition.x, taskMapPosition.y, copiedNode.position.z);
                }
            }
        }
    }

    /** 小地图可能使用 Map 等场景层；复制到弹窗后整棵节点树统一改为项目自定义 UI 层。 */
    private SetUILayerRecursively(root: Node): void {
        root.layer = 1 << 0;
        for (const child of root.children) this.SetUILayerRecursively(child);
    }

    private BindCopiedMapPoints(): void {
        this.CurPoint = this.AllMap?.getChildByName("我的位置") ?? null;
        this.Icon = this.CurPoint?.getChildByName("Icon")?.getComponent(Sprite) ?? null;
        this.Player2Point = this.AllMap?.getChildByName("玩家2") ?? null;
        this.Player2Icon = this.Player2Point?.getChildByName("Icon")?.getComponent(Sprite) ?? null;
        this.ParacargoPoint = this.AllMap?.getChildByName("空投") ?? null;
        this.BombPlotPoint = this.AllMap?.getChildByName("轰炸区") ?? null;
        this.TaskPoints.splice(
            0,
            this.TaskPoints.length,
            ...(this.AllMap?.children.filter(child => child.name.startsWith("任务_")) ?? []),
        );
        this.TaskPoint = this.TaskPoints[0] ?? null;
        if (this.ParacargoPoint) this.ParacargoPoint.active = false;
        if (this.BombPlotPoint) this.BombPlotPoint.active = false;
        this.TaskPoints.forEach((taskPoint, index) => {
            taskPoint.active = this._taskPointVisibility[index] === true;
        });
    }

    protected lateUpdate(): void {
        if (!this.node.activeInHierarchy || !this.CurMap) return;
        this.RefreshMapPoints();
    }

    public OnButtonClick(event: EventTouch): void {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.地图弹窗);
                break;
        }
    }

    /** 根据玩家的游戏世界坐标更新地图弹窗中的位置标记。 */
    public ShowPoint(x: number, y: number): void {
        this.SetPointPosition(this.CurPoint, x, y);
    }

    private SetPointPosition(point: Node, x: number, y: number): void {
        if (!this.CurMap || !point) {
            return;
        }

        const gameMap = ZRSJZ_Game.Instance?.CurMap?.Map;
        const worldMapTransform = gameMap?.getComponent(UITransform);
        const popupMapTransform = this.CurMap.getComponent(UITransform);
        const pointParentTransform = point.parent?.getComponent(UITransform);
        if (!worldMapTransform || !popupMapTransform || !pointParentTransform) {
            point.active = false;
            return;
        }

        const worldMapSize = worldMapTransform.contentSize;
        if (worldMapSize.width <= 0 || worldMapSize.height <= 0) {
            point.active = false;
            return;
        }

        // 先将玩家世界坐标转换到游戏地图的本地坐标。
        // 不能用世界轴对齐包围盒计算，否则地图或父节点存在缩放/旋转时会产生偏移。
        this._pointWorldPosition.set(x, y, gameMap.worldPosition.z);
        worldMapTransform.convertToNodeSpaceAR(
            this._pointWorldPosition,
            this._playerMapPosition,
        );

        const worldMapAnchor = worldMapTransform.anchorPoint;
        const normalizedX = Math.max(0, Math.min(1,
            this._playerMapPosition.x / worldMapSize.width + worldMapAnchor.x,
        ));
        const normalizedY = Math.max(0, Math.min(1,
            this._playerMapPosition.y / worldMapSize.height + worldMapAnchor.y,
        ));
        const mapSize = popupMapTransform.contentSize;
        const mapAnchor = popupMapTransform.anchorPoint;
        this._pointParentPosition.set(
            (normalizedX - mapAnchor.x) * mapSize.width,
            (normalizedY - mapAnchor.y) * mapSize.height,
            0,
        );

        popupMapTransform.convertToWorldSpaceAR(
            this._pointParentPosition,
            this._pointWorldPosition,
        );
        pointParentTransform.convertToNodeSpaceAR(
            this._pointWorldPosition,
            this._pointParentPosition,
        );
        point.setPosition(this._pointParentPosition);
        point.active = true;
    }

    /** 弹窗显示期间持续同步两个明确玩家槽位的位置。 */
    private RefreshPlayerPoints(): void {
        const game = ZRSJZ_Game.Instance;
        const player1 = game?.GetPlayer(0)?.node;
        if (player1?.isValid && player1.activeInHierarchy) {
            this.SetPointPosition(this.CurPoint, player1.worldPosition.x, player1.worldPosition.y);
        } else if (this.CurPoint) {
            this.CurPoint.active = false;
        }

        if (!game?.IsTwoPlayerMode()) {
            if (this.Player2Point) this.Player2Point.active = false;
            return;
        }

        const player2 = game.GetPlayer(1)?.node;
        if (player2?.isValid && player2.activeInHierarchy) {
            this.SetPointPosition(
                this.Player2Point,
                player2.worldPosition.x,
                player2.worldPosition.y,
            );
        } else if (this.Player2Point) {
            this.Player2Point.active = false;
        }
    }

    /** 同步玩家与空投等所有地图标记。 */
    private RefreshMapPoints(): void {
        this.RefreshPlayerPoints();

        const paracargoPosition = ZRSJZ_Game.Instance?.GetParacargoTargetWorldPosition();
        if (paracargoPosition) {
            this.SetPointPosition(
                this.ParacargoPoint,
                paracargoPosition.x,
                paracargoPosition.y,
            );
        } else if (this.ParacargoPoint) {
            this.ParacargoPoint.active = false;
        }

        this.RefreshBombPlotPoint();
    }

    private RefreshBombPlotPoint(): void {
        const bombPlot = ZRSJZ_Game.Instance?.GetActiveBombPlot();
        if (!bombPlot || !this.BombPlotPoint) {
            if (this.BombPlotPoint) this.BombPlotPoint.active = false;
            return;
        }

        const center = bombPlot.CenterWorldPosition;
        this.SetPointPosition(this.BombPlotPoint, center.x, center.y);

        const gameMapTransform = ZRSJZ_Game.Instance?.CurMap?.Map?.getComponent(UITransform);
        const popupMapTransform = this.CurMap?.getComponent(UITransform);
        const rangeTransform = this.BombPlotPoint.getComponent(UITransform);
        const pointParentTransform = this.BombPlotPoint.parent?.getComponent(UITransform);
        if (!gameMapTransform || !popupMapTransform || !rangeTransform || !pointParentTransform) return;

        const gameBounds = gameMapTransform.getBoundingBoxToWorld();
        const popupBounds = popupMapTransform.getBoundingBoxToWorld();
        if (gameBounds.width <= 0 || gameBounds.height <= 0) return;

        const diameterWorldX = bombPlot.Radius * 2 / gameBounds.width * popupBounds.width;
        const diameterWorldY = bombPlot.Radius * 2 / gameBounds.height * popupBounds.height;
        this._rangeWorldPosition.set(popupBounds.x, popupBounds.y, this.CurMap.worldPosition.z);
        pointParentTransform.convertToNodeSpaceAR(this._rangeWorldPosition, this._rangeParentPosition);
        const rangeOriginX = this._rangeParentPosition.x;
        const rangeOriginY = this._rangeParentPosition.y;

        this._rangeWorldPosition.set(
            popupBounds.x + diameterWorldX,
            popupBounds.y + diameterWorldY,
            this.CurMap.worldPosition.z,
        );
        pointParentTransform.convertToNodeSpaceAR(this._rangeWorldPosition, this._rangeParentPosition);
        rangeTransform.setContentSize(
            Math.abs(this._rangeParentPosition.x - rangeOriginX),
            Math.abs(this._rangeParentPosition.y - rangeOriginY),
        );
        this.BombPlotPoint.setScale(1, 1, 1);
    }
}
