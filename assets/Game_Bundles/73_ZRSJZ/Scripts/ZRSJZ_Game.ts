import { _decorator, Camera, Component, EventTouch, find, instantiate, Label, math, Node, Prefab, Rect, sp, Sprite, SpriteFrame, TiledLayer, tween, UITransform, v3, Vec3, Widget, } from 'cc';
import { ZRSJZ_Tools } from './ZRSJZ_Tools';
import { ZRSJZ_GameCamera } from './Camera/ZRSJZ_GameCamera';
import { ZRSJZ_Map } from './Controller/ZRSJZ_Map';
import { ZRSJZ_PoolManager } from './Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Effect_CB } from './Effect/ZRSJZ_Effect_CB';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { GetSpecialOperationConfig, ZRSJZ_BOMB_PLOT_SPAWN_CONFIG, ZRSJZ_INVENTORY, ZRSJZ_MainTaskAwardConfig, ZRSJZ_MAP_CONFIG, ZRSJZ_PANEL, ZRSJZ_PROP_PROPERTY, ZRSJZ_SPECIAL_OPERATION_CONFIG, ZRSJZ_SpecialOperationConfig, ZRSJZ_SpecialOperationTaskType } from './ZRSJZ_Constant';
import { ZRSJZ_GameData } from './ZRSJZ_GameData';
import { ZRSJZ_Player } from './Controller/ZRSJZ_Player';
import { ZRSJZ_LoadingPanel } from './Panel/ZRSJZ_LoadingPanel';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_InventoryService } from './Service/ZRSJZ_InventoryService';
import { ZRSJZ_TaskService } from './Service/ZRSJZ_TaskService';
import { ZRSJZ_ParacargoBox } from './Unit/ZRSJZ_ParacargoBox';
import { ZRSJZ_BombPlot } from './Unit/ZRSJZ_BombPlot';
import { ZRSJZ_SpecialOperationsTaskIcon } from './Unit/ZRSJZ_SpecialOperationsTaskIcon';
import { ZRSJZ_Door } from './Unit/ZRSJZ_Door';
import { ZRSJZ_Mailbox } from './Unit/ZRSJZ_Mailbox';
const { ccclass, property } = _decorator;

interface ZRSJZ_MiniMapTaskMarker {
    Node: Node;
    MapPosition: Vec3;
    TaskPoint: ZRSJZ_SpecialOperationsTaskIcon;
}

@ccclass('ZRSJZ_Game')
export class ZRSJZ_Game extends Component {
    public static Instance: ZRSJZ_Game = null;

    @property(Node)
    MapParent: Node = null;

    @property(ZRSJZ_GameCamera)
    Camera: ZRSJZ_GameCamera = null;

    @property(ZRSJZ_GameCamera)
    Camera_Player1: ZRSJZ_GameCamera = null;

    @property(ZRSJZ_GameCamera)
    Camera_Player2: ZRSJZ_GameCamera = null;

    @property(Node)
    UI: Node = null;

    @property(Label)
    GameTime: Label = null;

    @property(Label)
    Evacuate: Label = null;

    @property(Node)
    Direction: Node = null;

    @property(Node)
    Checked: Node = null;

    @property(Node)
    OnePlayerModel: Node = null;

    @property(Node)
    TwoPlayerModel: Node = null;

    @property(Node)
    Direction_Player1: Node = null;

    @property(Node)
    Direction_Player2: Node = null;

    @property(Node)
    Checked_Player1: Node = null;

    @property(Node)
    Checked_Player2: Node = null;

    @property
    IsTutorial: boolean = false;

    @property({ displayName: "战斗相机视野倍率", min: 1 })
    CameraViewScale: number = 1.5;

    CurMap: ZRSJZ_Map = null;
    CurPlayer: ZRSJZ_Player = null;
    readonly Players: ZRSJZ_Player[] = [];
    readonly Cameras: ZRSJZ_GameCamera[] = [];

    GamePaused: boolean = false;
    UnlimitedFirepower: boolean = false;
    Drug: number[][] = [[0, 0, 3], [0, 0, 3]];//两名玩家各自的高级/中级/低级药品

    private _player: Node = null;
    private _miniMapMask: Node = null;
    private _miniMapMapRoot: Node = null;
    private _miniMapContent: Node = null;
    private _miniMapPoint: Node = null;
    private _miniMapIcon: Sprite = null;
    private _miniMapPlayer2Point: Node = null;
    private _miniMapPlayer2Icon: Sprite = null;
    private _miniMapTaskPoint: Node = null;
    private readonly _miniMapTaskMarkers: ZRSJZ_MiniMapTaskMarker[] = [];
    private readonly _specialOperationTaskPoints: ZRSJZ_SpecialOperationsTaskIcon[] = [];
    private _miniMapParacargoPoint: Node = null;
    private _miniMapBombPlotPoint: Node = null;
    private readonly _miniMapTaskMapPosition: Vec3 = new Vec3();
    private _hasMiniMapTaskPoint: boolean = false;
    private _miniMapPointPosition: Vec3 = new Vec3();
    private _miniMapDisplayCenterPosition: Vec3 = new Vec3();
    private _miniMapClampedContentPosition: Vec3 = new Vec3();
    private _miniMapPlayer1Position: Vec3 = new Vec3();
    private _miniMapPlayer2Position: Vec3 = new Vec3();
    private _specialTaskWorldPosition: Vec3 = new Vec3();
    private _currentMapName: string = "";
    private _elapsedGameTime: number = 0;
    private _timeLimitSeconds: number = 0;
    private _killCount: number = 0;
    private _acceptedSpecialOperationMapKey: string = "";
    private _specialOperationStartTime: number = 0;
    private _specialOperationState: "未领取" | "进行中" | "已完成" | "已失败" = "未领取";
    private _specialOperationTaskType: ZRSJZ_SpecialOperationTaskType = "待定";
    private _specialOperationPlayerIndex: number = 0;
    private _specialOperationObjectiveCompleted: boolean = false;
    private _specialOperationSetupVersion: number = 0;
    private _specialOperationTargetEnemy: Node = null;
    private _specialOperationBombPlot: ZRSJZ_BombPlot = null;
    private readonly _specialOperationBombCenter: Vec3 = new Vec3();
    private _specialOperationBombRadius: number = 0;
    private readonly _breakWallMailboxes: ZRSJZ_Mailbox[] = [];
    private _breakWallTotalBoxCount: number = 0;
    private _taskStateNode: Node = null;
    private _taskStateSkeleton: sp.Skeleton = null;
    private _taskCountdownNode: Node = null;
    private _taskCountdownLabel: Label = null;
    private _taskStateAnimationVersion: number = 0;
    private _battleStarted: boolean = false;
    /** 每局只请求一次空投，异步加载期间也用于阻止重复生成。 */
    private _paracargoSpawnRequested: boolean = false;
    /** 空投实际生成后记录其落点，供地图弹窗显示空投标记。 */
    private _hasParacargoTarget: boolean = false;
    private readonly _paracargoTargetWorldPosition: Vec3 = new Vec3();
    private _activeBombPlot: ZRSJZ_BombPlot = null;
    private _bombPlotSpawnLoading: boolean = false;
    private _nextBombPlotSpawnTime: number = Number.POSITIVE_INFINITY;
    private readonly _evacuationDuration: number = 10;
    private _evacuationElapsed: number = 0;
    private _isEvacuating: boolean = false;
    private _isGameFinished: boolean = false;
    private _evacuationMethod: string = "固定撤离点";
    /** 记录每名玩家当前所在的撤离点；只有所有存活玩家位于同一撤离点才开始倒计时。 */
    private readonly _playerEvacuationPoints = new Map<number, string>();
    /** 双人模式中已经明确放弃复活的玩家。 */
    private readonly _playersGivenUpResurrection = new Set<number>();
    /** -1 表示左右分屏，0/1 表示当前由对应玩家独占全屏。 */
    private _fullscreenPlayerIndex: number = -1;
    private _directionEndWorld: Vec3 = new Vec3();
    private readonly _directions: Node[] = [];
    private readonly _checkedNodes: Node[] = [];
    private _cameraViewScaled: boolean = false;
    private static readonly PLAYER1_CHECKED_LAYER = 1 << 28;
    private static readonly PLAYER2_CHECKED_LAYER = 1 << 27;

    protected onLoad(): void {
        ZRSJZ_Game.Instance = this;
        this.ResolveBattleSceneNodes();
        this.ResolveSpecialOperationUI();
        this.ConfigureSceneControlModels();
        this._elapsedGameTime = 0;
        this._killCount = 0;
        this._acceptedSpecialOperationMapKey = "";
        this._specialOperationStartTime = 0;
        this._specialOperationState = "未领取";
        this._specialOperationTaskType = "待定";
        this._specialOperationPlayerIndex = 0;
        this._specialOperationObjectiveCompleted = false;
        this._specialOperationSetupVersion = 0;
        this._specialOperationTargetEnemy = null;
        this._specialOperationBombPlot = null;
        this._specialOperationBombCenter.set(0, 0, 0);
        this._specialOperationBombRadius = 0;
        this._breakWallMailboxes.length = 0;
        this._breakWallTotalBoxCount = 0;
        this._miniMapTaskMarkers.length = 0;
        this._specialOperationTaskPoints.length = 0;
        this.SetSpecialOperationCountdownVisible(false);
        if (this._taskStateNode) this._taskStateNode.active = false;
        this._battleStarted = false;
        this._paracargoSpawnRequested = false;
        this._hasParacargoTarget = false;
        this._paracargoTargetWorldPosition.set(0, 0, 0);
        this._activeBombPlot = null;
        this._bombPlotSpawnLoading = false;
        this._nextBombPlotSpawnTime = Number.POSITIVE_INFINITY;
        this._evacuationElapsed = 0;
        this._isEvacuating = false;
        this._playerEvacuationPoints.clear();
        this._playersGivenUpResurrection.clear();
        this._fullscreenPlayerIndex = -1;
        ZRSJZ_UIManager.SinglePlayerBattleIndex = -1;
        this._isGameFinished = false;
        this.InitializeBattleTimer();
        this.SetEvacuationVisible(false);
        for (const direction of this._directions) {
            if (direction) direction.active = false;
        }
        for (const checked of this._checkedNodes) {
            if (checked) checked.active = false;
        }
        // 双人模式不要在初始化阶段关闭再重启第二相机，避免部分平台未重新注册渲染相机。
        if (this.Camera_Player2) {
            this.Camera_Player2.node.active = ZRSJZ_GameData.Instance.CurModel === "2p" && !this.IsTutorial;
        }
    }

    protected async start(): Promise<void> {
        ZRSJZ_InventoryService.SetActivePlayerIndex(0);
        await ZRSJZ_UIManager.Instance.InitializeBattleInventories();
        this.LoadMap();
        this.InitMiniMap();
    }

    protected onEnable(): void {
        ZRSJZ_UIManager.IsBattle = true;
    }

    protected onDisable(): void {
        this.CancelEvacuation();
        this.SetSpecialOperationCountdownVisible(false);
        if (this._taskStateNode?.isValid) this._taskStateNode.active = false;
        ZRSJZ_UIManager.IsBattle = false;
        ZRSJZ_UIManager.SinglePlayerBattleIndex = -1;
    }

    protected lateUpdate(): void {
        this.RefreshMiniMap();
        for (let playerIndex = 0; playerIndex < this.Players.length; playerIndex++) {
            this.RefreshDirectionUI(playerIndex);
            this.RefreshCheckedUI(playerIndex);
        }
    }

    private RefreshDirectionUI(playerIndex: number): void {
        const direction = this._directions[playerIndex];
        const player = this.GetPlayer(playerIndex);
        const gameCamera = this.Cameras[playerIndex];
        if (!direction || !player?.node?.isValid || !this.UI?.isValid) return;
        if (player.IsDead || !gameCamera?.node.activeInHierarchy) {
            direction.active = false;
            return;
        }
        const worldCamera = gameCamera?.getComponent(Camera);
        const skeleton = player.PlayerSkeleton;
        if (!worldCamera || !skeleton) {
            direction.active = false;
            return;
        }

        let dirX = skeleton.AttackX;
        let dirY = skeleton.AttackY;
        let dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
        if (dirLength <= 0.0001) {
            dirX = skeleton.Facing || 1;
            dirY = 0;
            dirLength = 1;
        }
        dirX /= dirLength;
        dirY /= dirLength;

        const attackRange = this.GetPlayerAttackRange(playerIndex);
        if (attackRange <= 0) {
            direction.active = false;
            return;
        }

        const rangeOrigin = player.node.getChildByName("Point") ?? player.node;
        const playerWorld = rangeOrigin.worldPosition;
        this._directionEndWorld.set(
            playerWorld.x + dirX * attackRange,
            playerWorld.y + dirY * attackRange,
            playerWorld.z,
        );
        const startUI = worldCamera.convertToUINode(playerWorld, this.UI);
        const endUI = worldCamera.convertToUINode(this._directionEndWorld, this.UI);
        const uiDirX = endUI.x - startUI.x;
        const uiDirY = endUI.y - startUI.y;
        if (uiDirX * uiDirX + uiDirY * uiDirY <= 0.0001) {
            direction.active = false;
            return;
        }

        direction.active = true;
        // “方向”图片是攻击范围圆周的一小段，只放到射程边缘，不拉伸成箭头。
        const clampedPosition = this.ClampDirectionToPlayerScreen(
            playerIndex,
            endUI.x,
            endUI.y,
            direction,
        );
        direction.setPosition(clampedPosition.x, clampedPosition.y, direction.position.z);
        direction.setRotationFromEuler(
            0,
            0,
            Math.atan2(uiDirY, uiDirX) * 180 / Math.PI - 180,
        );
        const directionSprite = direction.getComponent(Sprite);
        if (directionSprite) directionSprite.sizeMode = Sprite.SizeMode.RAW;
    }

    /** 将方向标记限制在对应玩家的全屏/半屏范围内。 */
    private ClampDirectionToPlayerScreen(
        playerIndex: number,
        x: number,
        y: number,
        direction: Node,
    ): Vec3 {
        const canvasTransform = this.UI?.getComponent(UITransform);
        const directionTransform = direction.getComponent(UITransform);
        if (!canvasTransform) return new Vec3(x, y, 0);

        const padding = 16;
        const halfCanvasWidth = canvasTransform.width * 0.5;
        const halfCanvasHeight = canvasTransform.height * 0.5;
        const directionHalfWidth = (directionTransform?.width ?? 0) * Math.abs(direction.scale.x) * 0.5;
        const directionHalfHeight = (directionTransform?.height ?? 0) * Math.abs(direction.scale.y) * 0.5;
        const isTwoPlayer = this.Players.length > 1 && this._fullscreenPlayerIndex < 0;
        const minX = isTwoPlayer && playerIndex === 1
            ? padding + directionHalfWidth
            : -halfCanvasWidth + padding + directionHalfWidth;
        const maxX = isTwoPlayer && playerIndex === 0
            ? -padding - directionHalfWidth
            : halfCanvasWidth - padding - directionHalfWidth;
        const minY = -halfCanvasHeight + padding + directionHalfHeight;
        const maxY = halfCanvasHeight - padding - directionHalfHeight;

        return new Vec3(
            Math.min(maxX, Math.max(minX, x)),
            Math.min(maxY, Math.max(minY, y)),
            0,
        );
    }

    private RefreshCheckedUI(playerIndex: number) {
        const player = this.GetPlayer(playerIndex);
        const checked = this._checkedNodes[playerIndex];
        if (!checked) return;
        const gameCamera = this.Cameras[playerIndex];
        if (!player?.IsDead && gameCamera?.node.activeInHierarchy && player.TargetEnemy) {
            checked.active = true;
            checked.setWorldPosition(player.TargetEnemy.worldPosition.clone().add3f(0, 150, 0));
        } else {
            checked.active = false;
        }
    }

    private GetPlayerAttackRange(playerIndex: number): number {
        const player = this.GetPlayer(playerIndex);
        if (!player) return 0;
        // 近战实际伤害范围不变，这里只使用默认 1000 作为结界 UI 的显示半径。
        if (player.WeaponType === "刀") return 1000;

        const gunID = ZRSJZ_InventoryService.GetWeaponryIDs(playerIndex)[0];
        const gunName = ZRSJZ_GameData.Instance.PropData[gunID]?.Name;
        const range = gunName ? ZRSJZ_PROP_PROPERTY.get(gunName)?.["射程"] : 0;
        return Number.isFinite(range) ? Math.max(0, range) : 0;
    }

    protected update(deltaTime: number): void {
        if (this._battleStarted && !this.GamePaused && Number.isFinite(deltaTime) && deltaTime > 0) {
            const battleTimeBeforeTimeout = this._timeLimitSeconds > 0
                ? Math.max(0, this._timeLimitSeconds - this._elapsedGameTime)
                : Number.POSITIVE_INFINITY;
            const evacuationTimeBeforeComplete = this._isEvacuating
                ? Math.max(0, this._evacuationDuration - this._evacuationElapsed)
                : Number.POSITIVE_INFINITY;
            this._elapsedGameTime += deltaTime;
            this.RefreshGameTime();
            void this.TrySpawnParacargo();
            void this.TrySpawnBombPlot();
            this.UpdateSpecialOperation();

            if (this._isEvacuating) {
                this._evacuationElapsed += deltaTime;
                this.RefreshEvacuationTime();
            }

            const evacuationCompleted = this._isEvacuating
                && this._evacuationElapsed >= this._evacuationDuration;
            const timeoutReached = this._timeLimitSeconds > 0
                && this._elapsedGameTime >= this._timeLimitSeconds;

            // 同一帧同时跨过两个节点时，按实际所需时间更短的事件决定结果。
            if (evacuationCompleted && evacuationTimeBeforeComplete <= battleTimeBeforeTimeout) {
                this.CompleteEvacuation();
                return;
            }
            if (timeoutReached && !this.IsTutorial) {
                this.FailEvacuationByTimeout();
                return;
            }
            if (evacuationCompleted) {
                this.CompleteEvacuation();
            }
        }
    }

    /** 到达地图配置时间后，在 ParacargoPoints 的随机子节点上方生成一架空投。 */
    private async TrySpawnParacargo(): Promise<void> {
        if (this._paracargoSpawnRequested || this._isGameFinished || !this.CurMap?.node) return;
        const mapConfig = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        const config = mapConfig?.Paracargo;
        if (!mapConfig || !config || config.SpawnTimeSeconds <= 0) return;
        if (this._elapsedGameTime < config.SpawnTimeSeconds) return;

        this._paracargoSpawnRequested = true;
        const pointRoot = this.CurMap.node.getChildByName("ParacargoPoints");
        const points = pointRoot?.children.filter(point => point?.isValid) ?? [];
        if (points.length === 0) {
            console.warn(`[ZRSJZ_Game] 地图 ${mapConfig.MapName} 的 ParacargoPoints 没有可用落点`);
            return;
        }

        const point = points[math.randomRangeInt(0, points.length)];
        const targetWorldPosition = point.worldPosition.clone();
        const paracargoNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/箱子/空投");
        if (!paracargoNode) {
            console.error("[ZRSJZ_Game] 加载空投预制体失败");
            return;
        }
        if (this._isGameFinished || !this.CurMap?.Unit?.isValid) {
            ZRSJZ_PoolManager.Instance.PutNode(paracargoNode);
            return;
        }

        const paracargoBox = paracargoNode.getComponent(ZRSJZ_ParacargoBox);
        if (!paracargoBox) {
            console.error("[ZRSJZ_Game] 空投预制体缺少 ZRSJZ_ParacargoBox 组件");
            ZRSJZ_PoolManager.Instance.PutNode(paracargoNode);
            return;
        }

        paracargoNode.active = false;
        paracargoNode.parent = this.CurMap.Unit;
        this._paracargoTargetWorldPosition.set(targetWorldPosition);
        this._hasParacargoTarget = true;
        paracargoBox.Deploy(targetWorldPosition, config, mapConfig);
    }

    /** 空投尚未实际生成时返回 null；生成后返回空投的最终落点世界坐标。 */
    public GetParacargoTargetWorldPosition(): Readonly<Vec3> | null {
        return this._hasParacargoTarget ? this._paracargoTargetWorldPosition : null;
    }

    /** 返回当前处于预警或轰炸阶段的轰炸区。 */
    public GetActiveBombPlot(): ZRSJZ_BombPlot | null {
        return this._activeBombPlot?.IsRunning ? this._activeBombPlot : null;
    }

    private ScheduleNextBombPlot(firstSpawn: boolean): void {
        if (this.IsTutorial || this._isGameFinished) {
            this._nextBombPlotSpawnTime = Number.POSITIVE_INFINITY;
            return;
        }
        const config = ZRSJZ_BOMB_PLOT_SPAWN_CONFIG;
        const minDelay = firstSpawn ? config.FirstSpawnMinSeconds : config.RepeatSpawnMinSeconds;
        const maxDelay = firstSpawn ? config.FirstSpawnMaxSeconds : config.RepeatSpawnMaxSeconds;
        const safeMin = Math.max(0, Math.min(minDelay, maxDelay));
        const safeMax = Math.max(safeMin, minDelay, maxDelay);
        this._nextBombPlotSpawnTime = this._elapsedGameTime
            + safeMin
            + Math.random() * (safeMax - safeMin);
    }

    private async TrySpawnBombPlot(): Promise<void> {
        if (this.IsTutorial
            || this._bombPlotSpawnLoading
            || (this._specialOperationState === "进行中" && this._specialOperationTaskType === "坚守轰炸区")
            || this.GetActiveBombPlot()
            || this._isGameFinished
            || this._elapsedGameTime < this._nextBombPlotSpawnTime
            || !this.CurMap?.Map?.isValid
            || !this.CurMap?.Unit?.isValid) {
            return;
        }

        this._bombPlotSpawnLoading = true;
        const bombPlotNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/BombPlot");
        this._bombPlotSpawnLoading = false;
        if (!bombPlotNode) {
            console.error("[ZRSJZ_Game] 加载 BombPlot 预制体失败");
            this.ScheduleNextBombPlot(false);
            return;
        }
        if (this._isGameFinished
            || (this._specialOperationState === "进行中" && this._specialOperationTaskType === "坚守轰炸区")
            || !this.CurMap?.Map?.isValid
            || !this.CurMap?.Unit?.isValid) {
            ZRSJZ_PoolManager.Instance.PutNode(bombPlotNode);
            return;
        }

        const bombPlot = bombPlotNode.getComponent(ZRSJZ_BombPlot);
        if (!bombPlot) {
            console.error("[ZRSJZ_Game] BombPlot 预制体缺少 ZRSJZ_BombPlot 组件");
            ZRSJZ_PoolManager.Instance.PutNode(bombPlotNode);
            this.ScheduleNextBombPlot(false);
            return;
        }

        bombPlotNode.active = false;
        bombPlotNode.parent = this.CurMap.Unit;
        this._activeBombPlot = bombPlot;
        const deployed = bombPlot.DeployRandom(this.CurMap.Map, this.CurMap.Unit, () => {
            if (this._activeBombPlot === bombPlot) this._activeBombPlot = null;
            this.ScheduleNextBombPlot(false);
        });
        if (!deployed) {
            this._activeBombPlot = null;
            ZRSJZ_PoolManager.Instance.PutNode(bombPlotNode);
            this.ScheduleNextBombPlot(false);
        }
    }

    /** 玩家进入撤离点；所有存活玩家都在同一撤离点时才开始计时。 */
    StartEvacuation(
        evacuationPointName: string = "固定撤离点",
        playerIndex: number = 0,
    ): void {
        if (!this._battleStarted || this.GamePaused || this._isGameFinished) return;
        if (this._specialOperationState === "进行中") {
            void ZRSJZ_UIManager.Instance.ShowTip("任务还未完成 无法撤离");
            return;
        }
        this._playerEvacuationPoints.set(
            playerIndex === 1 ? 1 : 0,
            evacuationPointName || "固定撤离点",
        );
        this.RefreshEvacuationEligibility();
    }

    /** 指定玩家离开撤离点；不传玩家索引时清空整场撤离状态。 */
    CancelEvacuation(playerIndex?: number): void {
        if (playerIndex === undefined) {
            this._playerEvacuationPoints.clear();
        } else {
            this._playerEvacuationPoints.delete(playerIndex === 1 ? 1 : 0);
        }
        this.RefreshEvacuationEligibility();
    }

    private RefreshEvacuationEligibility(): void {
        const livingPlayers = this.Players.filter(player => !player.IsDead);
        const evacuationPoint = livingPlayers.length > 0
            ? this._playerEvacuationPoints.get(livingPlayers[0].PlayerIndex)
            : "";
        const canEvacuate = !!evacuationPoint && livingPlayers.every(player =>
            this._playerEvacuationPoints.get(player.PlayerIndex) === evacuationPoint
        );

        if (canEvacuate) {
            if (this._isEvacuating && this._evacuationMethod === evacuationPoint) return;
            this._evacuationMethod = evacuationPoint;
            this._evacuationElapsed = 0;
            this._isEvacuating = true;
            this.SetEvacuationVisible(true);
            this.RefreshEvacuationTime();
            return;
        }

        if (!this._isEvacuating) return;

        this._isEvacuating = false;
        this._evacuationElapsed = 0;
        this.SetEvacuationVisible(false);
    }

    private RefreshEvacuationTime(): void {
        if (!this.Evacuate) return;
        const remainingSeconds = Math.max(
            0,
            Math.ceil(this._evacuationDuration * 100 - this._evacuationElapsed * 100),
        );
        this.Evacuate.string = `${Math.floor(remainingSeconds / 100).toString().padStart(2, "0")}:${(remainingSeconds % 100).toString().padStart(2, "0")}`;
    }

    private SetEvacuationVisible(visible: boolean): void {
        if (this.Evacuate?.node?.parent) {
            this.Evacuate.node.parent.active = visible;
        }
    }

    private CompleteEvacuation(): void {
        if (!this._isEvacuating || this._isGameFinished) return;

        this._isEvacuating = false;
        this._isGameFinished = true;
        this._battleStarted = false;
        this.GamePaused = true;
        this.SetEvacuationVisible(false);
        ZRSJZ_UIManager.Instance.ShowPanel(
            ZRSJZ_PANEL.胜利弹窗,
            this._evacuationMethod,
            this.GetGameTime(),
            this.GetKillCount(),
            this.GetAllGoodsID(),
        );
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL, 5);
        ZRSJZ_TaskService.CompleteTask(`进入[${ZRSJZ_GameData.Instance.CurMap}]并成功撤离`, 1);
    }

    private FailEvacuationByTimeout(): void {
        if (this._isGameFinished) return;

        this.CancelEvacuation();
        this._isGameFinished = true;
        this._battleStarted = false;
        this.GamePaused = true;
        this.SetSpecialOperationCountdownVisible(false);
        this.RefreshGameTime();
        ZRSJZ_UIManager.Instance.ShowPanel(
            ZRSJZ_PANEL.失败弹窗,
            "撤离失败",
            this.GetGameTime(),
            this.GetKillCount(),
        );
    }

    LoadMap() {
        const mapConfig = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        if (!mapConfig) {
            console.error(`[ZRSJZ_Game] 未找到地图配置: ${ZRSJZ_GameData.Instance.CurMap}`);
            return;
        }

        ZRSJZ_Tools.LoadPrefab("Prefabs/Map/" + mapConfig.MapName).then((prefab: Prefab) => {
            const map = instantiate(prefab);
            map.parent = this.MapParent;
            this.CurMap = map.getComponent(ZRSJZ_Map);
            this.CurMap.Init();
            this.InitializeSpecialOperationPoints();
            this.ConfigureTileMapForPlayerCount();
            this.LoadPlayer();
        })
    }

    /**
     * Cocos 3.8 的 TiledLayer 只使用第一个可见相机计算裁剪区域。
     * 双人分屏时若继续开启裁剪，玩家2超出玩家1视野的瓦片不会生成渲染数据。
     */
    private ConfigureTileMapForPlayerCount(): void {
        if (ZRSJZ_GameData.Instance.CurModel !== "2p" || !this.CurMap?.node) return;
        const tiledLayers = this.CurMap.node.getComponentsInChildren(TiledLayer);
        for (const tiledLayer of tiledLayers) {
            tiledLayer.enableCulling = false;
        }
    }

    LoadPlayer() {
        ZRSJZ_Tools.LoadPrefab("Prefabs/Unit/Player").then((prefab: Prefab) => {
            const playerCount = ZRSJZ_GameData.Instance.CurModel === "2p" && !this.IsTutorial ? 2 : 1;
            this.Players.length = 0;
            this.Cameras.length = 0;
            const usedSpawnIndexes = new Set<number>();

            for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
                const player = instantiate(prefab);
                player.active = false;
                player.parent = this.CurMap.Unit;
                let spawnIndex = math.randomRangeInt(0, this.CurMap.PlayerPoints.length);
                if (this.CurMap.PlayerPoints.length > 1) {
                    while (usedSpawnIndexes.has(spawnIndex)) {
                        spawnIndex = (spawnIndex + 1) % this.CurMap.PlayerPoints.length;
                    }
                }
                usedSpawnIndexes.add(spawnIndex);
                player.setWorldPosition(this.CurMap.PlayerPoints[spawnIndex].worldPosition.clone());
                const playerComponent = player.getComponent(ZRSJZ_Player);
                playerComponent.PlayerIndex = playerIndex;
                const playerSkeleton = (playerComponent.PlayerSkeleton
                    ?? player.getComponentInChildren('ZRSJZ_PlayerSkeleton')) as any;
                if (playerSkeleton) playerSkeleton.CurPlayerIndex = playerIndex;
                player.name = `Player${playerIndex + 1}`;
                player.active = true;
                this.Players.push(playerComponent);
            }

            this.CurPlayer = this.Players[0];
            this._player = this.CurPlayer.node;
            this.SetupBattleCameras();
            this.RefreshMiniMap();
            this.LoadUI();
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.加载界面);
            ZRSJZ_AudioManager.Instance.PlayMusic("战斗BGM");
        })
    }

    LoadUI() {
        this.Drug = [[0, 0, 3], [0, 0, 3]];
        this.UI.active = true;
        this.ApplyControlModelVisibility();
        this.RefreshGameTime();
        this._battleStarted = true;
        this.ScheduleNextBombPlot(true);
        for (const checked of this._checkedNodes.slice(0, this.Players.length)) {
            if (!checked) continue;
            tween(checked)
                .to(0.5, { scale: v3(0.6, 0.6, 0.6) }, { easing: "sineInOut" })
                .to(0.5, { scale: v3(0.5, 0.5, 0.5) }, { easing: "sineInOut" })
                .union()
                .repeatForever()
                .start();
            checked.active = false;
        }
    }

    GetPlayer(playerIndex: number = 0): ZRSJZ_Player {
        return this.Players[playerIndex === 1 ? 1 : 0] ?? this.CurPlayer;
    }

    public IsTwoPlayerMode(): boolean {
        return ZRSJZ_GameData.Instance.CurModel === "2p" && !this.IsTutorial && this.Players.length > 1;
    }

    public IsUsingSinglePlayerLayout(playerIndex?: number): boolean {
        if (this._fullscreenPlayerIndex < 0) return false;
        return playerIndex === undefined
            || this._fullscreenPlayerIndex === (playerIndex === 1 ? 1 : 0);
    }

    /** 返回分屏中指定玩家用于承载局内弹窗的 Panel 节点。 */
    public GetPlayerPanelRoot(playerIndex: number): Node {
        if (!this.IsTwoPlayerMode()) return null;
        const playerRoot = this.TwoPlayerModel?.getChildByName(
            playerIndex === 1 ? "Player2" : "Player1",
        );
        return playerRoot?.getChildByName("Panel") ?? null;
    }

    /** 玩家死亡只冻结自己；两名玩家均死亡后才暂停整场游戏。 */
    public OnPlayerDied(playerIndex: number): void {
        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        this._playersGivenUpResurrection.delete(normalizedIndex);
        this._playerEvacuationPoints.delete(normalizedIndex);
        this.RefreshEvacuationEligibility();
        this.GamePaused = this.Players.length > 0
            && this.Players.every(player => player.IsDead);
    }

    /** 复活只恢复指定玩家，并重新校验双人撤离条件。 */
    public OnPlayerResurrected(playerIndex: number): void {
        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        this._playersGivenUpResurrection.delete(normalizedIndex);
        this.GamePaused = false;
        this._playerEvacuationPoints.delete(normalizedIndex);
        this.RefreshEvacuationEligibility();
        this.RefreshPlayerViewportLayout();
    }

    /**
     * 双人模式玩家明确放弃复活：有队友存活时由队友接管全屏，
     * 两名玩家都死亡且都放弃后结束本局。
     */
    public OnPlayerGiveUpResurrection(playerIndex: number): void {
        if (!this.IsTwoPlayerMode() || this._isGameFinished) return;

        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        const player = this.GetPlayer(normalizedIndex);
        if (!player?.IsDead) return;
        this._playersGivenUpResurrection.add(normalizedIndex);

        const allPlayersGaveUp = this.Players.length > 0
            && this.Players.every(currentPlayer =>
                currentPlayer.IsDead
                && this._playersGivenUpResurrection.has(currentPlayer.PlayerIndex)
            );
        if (allPlayersGaveUp) {
            this.FinishGameByDeath();
            return;
        }

        this.RefreshPlayerViewportLayout();
    }

    private FinishGameByDeath(): void {
        if (this._isGameFinished) return;

        this.CancelEvacuation();
        this._isGameFinished = true;
        this._battleStarted = false;
        this.GamePaused = true;
        this.SetSpecialOperationCountdownVisible(false);
        this.RefreshGameTime();
        ZRSJZ_UIManager.Instance.ShowPanel(
            ZRSJZ_PANEL.失败弹窗,
            "死亡",
            this.GetGameTime(),
            this.GetKillCount(),
        );
    }

    /** 根据存活和放弃复活状态，在左右分屏与单玩家全屏之间切换。 */
    private RefreshPlayerViewportLayout(): void {
        if (!this.IsTwoPlayerMode()) return;

        const livingPlayers = this.Players.filter(player => !player.IsDead);
        const fullscreenPlayerIndex = this._playersGivenUpResurrection.size > 0
            && livingPlayers.length === 1
            ? livingPlayers[0].PlayerIndex
            : -1;
        this.ApplyPlayerViewportLayout(fullscreenPlayerIndex);
    }

    private ApplyPlayerViewportLayout(fullscreenPlayerIndex: number): void {
        this._fullscreenPlayerIndex = fullscreenPlayerIndex === 0 || fullscreenPlayerIndex === 1
            ? fullscreenPlayerIndex
            : -1;
        ZRSJZ_UIManager.SinglePlayerBattleIndex = this._fullscreenPlayerIndex;
        const splitLine = this.TwoPlayerModel?.getChildByName("Mask");
        if (splitLine) splitLine.active = this._fullscreenPlayerIndex < 0;

        for (let playerIndex = 0; playerIndex < 2; playerIndex++) {
            const playerRoot = this.TwoPlayerModel?.getChildByName(
                playerIndex === 1 ? "Player2" : "Player1",
            );
            if (!playerRoot) continue;

            playerRoot.active = this._fullscreenPlayerIndex < 0
                || playerIndex === this._fullscreenPlayerIndex;
            const widget = playerRoot.getComponent(Widget);
            if (!widget) continue;

            widget.isAlignLeft = true;
            widget.isAlignRight = true;
            if (this._fullscreenPlayerIndex >= 0) {
                widget.isAbsoluteLeft = true;
                widget.isAbsoluteRight = true;
                widget.left = 0;
                widget.right = 0;
            } else if (playerIndex === 0) {
                widget.isAbsoluteLeft = true;
                widget.isAbsoluteRight = false;
                widget.left = 0;
                widget.right = 0.5;
            } else {
                widget.isAbsoluteLeft = false;
                widget.isAbsoluteRight = true;
                widget.left = 0.5;
                widget.right = 0;
            }
            widget.updateAlignment();
        }

        const firstCamera = this.Camera_Player1?.getComponent(Camera);
        const secondCamera = this.Camera_Player2?.getComponent(Camera);
        if (this._fullscreenPlayerIndex < 0) {
            if (firstCamera) firstCamera.rect = new Rect(0, 0, 0.5, 1);
            if (secondCamera) secondCamera.rect = new Rect(0.5, 0, 0.5, 1);
            if (this.Camera_Player1) this.Camera_Player1.node.active = true;
            if (this.Camera_Player2) this.Camera_Player2.node.active = true;
            this.CurPlayer = this.Players[0];
        } else {
            const survivorCamera = this._fullscreenPlayerIndex === 1
                ? this.Camera_Player2
                : this.Camera_Player1;
            const hiddenCamera = this._fullscreenPlayerIndex === 1
                ? this.Camera_Player1
                : this.Camera_Player2;
            const camera = survivorCamera?.getComponent(Camera);
            if (camera) camera.rect = new Rect(0, 0, 1, 1);
            if (survivorCamera) survivorCamera.node.active = true;
            if (hiddenCamera) hiddenCamera.node.active = false;
            this.CurPlayer = this.Players[this._fullscreenPlayerIndex];
        }
        this._player = this.CurPlayer?.node ?? null;

        // 最后一名存活玩家使用真正的单人操作布局，而不是拉伸半屏操作节点。
        const useSinglePlayerControls = this._fullscreenPlayerIndex >= 0;
        if (useSinglePlayerControls) {
            this.ConfigureControlRoot(this.OnePlayerModel, this._fullscreenPlayerIndex);
            if (this.TwoPlayerModel) this.TwoPlayerModel.active = false;
            if (this.OnePlayerModel) this.OnePlayerModel.active = true;
        } else {
            this.ConfigureControlRoot(this.TwoPlayerModel?.getChildByName("Player1"), 0);
            this.ConfigureControlRoot(this.TwoPlayerModel?.getChildByName("Player2"), 1);
            if (this.OnePlayerModel) this.OnePlayerModel.active = false;
            if (this.TwoPlayerModel) this.TwoPlayerModel.active = true;
        }
    }

    /** 使用场景中已有的 Camera_Player1 / Camera_Player2，不再运行时复制相机。 */
    private SetupBattleCameras(): void {
        const firstGameCamera = this.Camera_Player1 ?? this.Camera;
        const secondGameCamera = this.Camera_Player2;
        const firstCamera = firstGameCamera?.getComponent(Camera);
        if (!firstGameCamera || !firstCamera) {
            console.error("[ZRSJZ_Game] 场景缺少 Camera_Player1 或 ZRSJZ_GameCamera 组件");
            return;
        }

        this.Cameras.length = 0;
        this.Cameras.push(firstGameCamera);
        firstCamera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        firstCamera.priority = 0;
        this.ApplyCameraViewScale(firstCamera, secondGameCamera?.getComponent(Camera));
        if (this.Players.length < 2) {
            firstCamera.rect = new Rect(0, 0, 1, 1);
            firstGameCamera.node.active = true;
            firstGameCamera.Init(this.Players[0].node, this.CurMap.Map);
            if (secondGameCamera) secondGameCamera.node.active = false;
            this.ConfigureCheckedLayers(false);
            return;
        }

        firstCamera.rect = new Rect(0, 0, 0.5, 1);
        firstGameCamera.node.active = true;
        firstGameCamera.Init(this.Players[0].node, this.CurMap.Map);
        const secondCamera = secondGameCamera?.getComponent(Camera);
        if (!secondCamera) {
            console.error("[ZRSJZ_Game] 双人模式缺少 Camera_Player2 或 ZRSJZ_GameCamera 组件");
            return;
        }
        secondGameCamera.node.active = true;
        secondCamera.rect = new Rect(0.5, 0, 0.5, 1);
        secondCamera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
        secondCamera.priority = 1;
        secondCamera.visibility = firstCamera.visibility;
        secondGameCamera.Init(this.Players[1].node, this.CurMap.Map);
        this.Cameras.push(secondGameCamera);
        this.ConfigureCheckedLayers(true);
    }

    /** 正交相机的 orthoHeight 越大，可见世界范围越大。 */
    private ApplyCameraViewScale(firstCamera: Camera, secondCamera: Camera): void {
        if (this._cameraViewScaled) return;
        const scale = Math.max(1, this.CameraViewScale || 1);
        firstCamera.orthoHeight *= scale;
        if (secondCamera) secondCamera.orthoHeight *= scale;
        this._cameraViewScaled = true;
    }

    /** 场景节点解析兼容旧序列化字段，之后可直接在编辑器拖拽绑定新增属性。 */
    private ResolveBattleSceneNodes(): void {
        const worldCanvas = this.Camera?.node?.parent ?? this.node.getChildByName("Canvas");
        this.Camera_Player1 = this.Camera_Player1
            ?? worldCanvas?.getChildByName("Camera_Player1")?.getComponent(ZRSJZ_GameCamera)
            ?? this.Camera;
        this.Camera_Player2 = this.Camera_Player2
            ?? worldCanvas?.getChildByName("Camera_Player2")?.getComponent(ZRSJZ_GameCamera);
        this.OnePlayerModel = this.OnePlayerModel ?? this.UI?.getChildByName("OnePlayerModel");
        this.TwoPlayerModel = this.TwoPlayerModel ?? this.UI?.getChildByName("TwoPlayerModel");
        this.Direction_Player1 = this.Direction_Player1
            ?? this.UI?.getChildByName("方向_Player1")
            ?? this.Direction;
        this.Direction_Player2 = this.Direction_Player2
            ?? this.UI?.getChildByName("方向_Player2");
        this.Checked_Player1 = this.Checked_Player1
            ?? worldCanvas?.getChildByName("Checked_Player1")
            ?? this.Checked;
        this.Checked_Player2 = this.Checked_Player2
            ?? worldCanvas?.getChildByName("Checked_Player2");

        this.Camera = this.Camera_Player1;
        this.Direction = this.Direction_Player1;
        this.Checked = this.Checked_Player1;
        this._directions.splice(0, this._directions.length, this.Direction_Player1, this.Direction_Player2);
        this._checkedNodes.splice(0, this._checkedNodes.length, this.Checked_Player1, this.Checked_Player2);
    }

    private ResolveSpecialOperationUI(): void {
        this._taskStateNode = find("UICanvas/TaskState");
        this._taskStateSkeleton = this._taskStateNode?.getComponent(sp.Skeleton) ?? null;
        this._taskCountdownNode = find("UICanvas/任务倒计时");
        this._taskCountdownLabel = this._taskCountdownNode
            ?.getChildByName("Time")
            ?.getComponent(Label) ?? null;
    }

    /** 给场景内现成的两套操作组件写入玩家索引。 */
    private ConfigureSceneControlModels(): void {
        if (this.OnePlayerModel) this.OnePlayerModel.active = false;
        if (this.TwoPlayerModel) this.TwoPlayerModel.active = false;
        this.ConfigureControlRoot(this.OnePlayerModel, 0);
        this.ConfigureControlRoot(this.TwoPlayerModel?.getChildByName("Player1"), 0);
        this.ConfigureControlRoot(this.TwoPlayerModel?.getChildByName("Player2"), 1);
    }

    private ConfigureControlRoot(root: Node, playerIndex: number): void {
        if (!root) return;
        const controllerNames = [
            "ZRSJZ_Joystick",
            "ZRSJZ_Joystick_Attack",
            "ZRSJZ_Joystick_Drug",
        ];
        for (const componentName of controllerNames) {
            const controller = root.getComponentInChildren(componentName) as any;
            if (controller) controller.PlayerIndex = playerIndex;
        }
    }

    private ApplyControlModelVisibility(): void {
        const isTwoPlayer = this.Players.length > 1;
        if (this.OnePlayerModel) this.OnePlayerModel.active = !isTwoPlayer;
        if (this.TwoPlayerModel) this.TwoPlayerModel.active = isTwoPlayer;
        if (isTwoPlayer) {
            this.ConfigureControlRoot(this.TwoPlayerModel?.getChildByName("Player1"), 0);
            this.ConfigureControlRoot(this.TwoPlayerModel?.getChildByName("Player2"), 1);
        } else {
            this.ConfigureControlRoot(this.OnePlayerModel, 0);
        }
        if (this.Direction_Player2) this.Direction_Player2.active = false;
        if (this.Checked_Player2) this.Checked_Player2.active = false;
    }

    /** Checked 节点使用独立渲染层，避免两个选中标记同时出现在两块屏幕。 */
    private ConfigureCheckedLayers(isTwoPlayer: boolean): void {
        const player1Camera = this.Camera_Player1?.getComponent(Camera);
        const player2Camera = this.Camera_Player2?.getComponent(Camera);
        if (!player1Camera || !this.Checked_Player1) return;

        this.Checked_Player1.layer = ZRSJZ_Game.PLAYER1_CHECKED_LAYER;
        player1Camera.visibility |= ZRSJZ_Game.PLAYER1_CHECKED_LAYER;
        if (!isTwoPlayer || !player2Camera || !this.Checked_Player2) return;

        this.Checked_Player2.layer = ZRSJZ_Game.PLAYER2_CHECKED_LAYER;
        player2Camera.visibility |= ZRSJZ_Game.PLAYER2_CHECKED_LAYER;
        player1Camera.visibility &= ~ZRSJZ_Game.PLAYER2_CHECKED_LAYER;
        player2Camera.visibility &= ~ZRSJZ_Game.PLAYER1_CHECKED_LAYER;
    }

    async CreateDieEffect(worldPos: Vec3, cb: Function = null) {
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/DieEffect").then((effect: Node) => {
            effect.parent = this.CurMap.BulletParent;
            effect.active = true;
            effect.getComponent(ZRSJZ_Effect_CB).Show(worldPos, cb);
        });
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "小地图":
                this.OpenMapPanel();
                break;
            case "设置":
                this.GamePaused = true;
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.暂停界面);
                break;
        }
    }


    private OpenMapPanel(): void {
        ZRSJZ_UIManager.Instance.ShowPanel(
            ZRSJZ_PANEL.地图弹窗,
            this._currentMapName,
            this._miniMapIcon?.spriteFrame ?? null,
            this._miniMapPlayer2Icon?.spriteFrame ?? null,
            this._miniMapMapRoot,
            this._miniMapTaskMarkers.map(marker => marker.MapPosition.clone()),
            this._miniMapTaskMarkers.map(marker => marker.TaskPoint?.IsAvailable ?? false),
        );
    }

    private InitMiniMap(): void {
        const mapConfig = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        const miniMapMask = find("UICanvas/小地图/Mask");
        const isConfiguredTwoPlayer = ZRSJZ_GameData.Instance.CurModel === "2p" && !this.IsTutorial;
        if (!mapConfig || !miniMapMask) {
            console.warn(`[ZRSJZ_Game] 无法初始化小地图: ${ZRSJZ_GameData.Instance.CurMap}`);
            return;
        }

        this._currentMapName = mapConfig.MapName;
        this._miniMapMask = miniMapMask;
        // 新版小地图将地图、地点和动态标记统一放在 Mask/Map 下；
        // 没有 Map 包装节点时继续兼容旧场景结构。
        this._miniMapMapRoot = miniMapMask.getChildByName("Map") ?? miniMapMask;
        this._miniMapMapRoot.setPosition(0, 0, this._miniMapMapRoot.position.z);
        this._miniMapContent = this._miniMapMapRoot.getChildByName(this._currentMapName);
        this._miniMapPoint = this._miniMapMapRoot.getChildByName("我的位置");
        this._miniMapIcon = this._miniMapPoint?.getChildByName("Icon")?.getComponent(Sprite) ?? null;
        this._miniMapPlayer2Point = this._miniMapMapRoot.getChildByName("玩家2");
        this._miniMapPlayer2Icon = this._miniMapPlayer2Point
            ?.getChildByName("Icon")
            ?.getComponent(Sprite) ?? null;
        this._miniMapTaskPoint = this._miniMapMapRoot.getChildByName("任务")
            ?? this._miniMapMapRoot.getChildByName("特别行动");
        this._miniMapParacargoPoint = this._miniMapMapRoot.getChildByName("空投");
        this._miniMapBombPlotPoint = this._miniMapMapRoot.getChildByName("轰炸区");
        this._hasMiniMapTaskPoint = false;
        if (this._miniMapTaskPoint) {
            this._miniMapTaskMapPosition.set(this._miniMapTaskPoint.position);
            this._miniMapTaskPoint.active = false;
        }

        const mapNames = new Set(Array.from(ZRSJZ_MAP_CONFIG.values()).map(config => config.MapName));
        this._miniMapMapRoot.children.forEach(child => {
            if (mapNames.has(child.name)) {
                child.active = child === this._miniMapContent;
            }
        });

        if (this._miniMapIcon) {
            ZRSJZ_UIManager.Instance.GetHeroUI(ZRSJZ_GameData.Instance.CurSkin[0])
                .then((sf: SpriteFrame) => {
                    if (this._miniMapIcon?.node?.isValid) {
                        this._miniMapIcon.spriteFrame = sf;
                    }
                })
                .catch(() => undefined);
        }
        if (this._miniMapPlayer2Icon && isConfiguredTwoPlayer) {
            ZRSJZ_UIManager.Instance.GetHeroUI(
                ZRSJZ_GameData.Instance.CurSkin[1]
                ?? ZRSJZ_GameData.Instance.CurSkin[0],
            )
                .then((sf: SpriteFrame) => {
                    if (this._miniMapPlayer2Icon?.node?.isValid) {
                        this._miniMapPlayer2Icon.spriteFrame = sf;
                    }
                })
                .catch(() => undefined);
        }

        if (!this._miniMapContent || !this._miniMapPoint) {
            console.warn(`[ZRSJZ_Game] 找不到关卡对应的小地图节点: ${this._currentMapName}`);
            return;
        }

        this._miniMapPoint.active = true;
        this._miniMapPoint.setPosition(0, 0, this._miniMapPoint.position.z);
        this._miniMapPoint.setSiblingIndex(this._miniMapMapRoot.children.length - 1);
        if (this._miniMapPlayer2Point) {
            this._miniMapPlayer2Point.active = isConfiguredTwoPlayer;
            this._miniMapPlayer2Point.setSiblingIndex(this._miniMapMapRoot.children.length - 1);
        }
        if (this.CurMap) this.InitializeSpecialOperationPoints();
        if (this._miniMapParacargoPoint) this._miniMapParacargoPoint.active = false;
        if (this._miniMapBombPlotPoint) this._miniMapBombPlotPoint.active = false;
    }

    /** 按当前地图中实际放置的特别行动预制体数量创建同等数量的小地图图标。 */
    private InitializeSpecialOperationPoints(): void {
        if (!this.CurMap?.node || !this._miniMapMapRoot || !this._miniMapContent) return;

        for (const marker of this._miniMapTaskMarkers) {
            if (!marker.Node?.isValid || marker.Node === this._miniMapTaskPoint) continue;
            marker.Node.removeFromParent();
            marker.Node.destroy();
        }
        this._miniMapTaskMarkers.length = 0;
        this._specialOperationTaskPoints.splice(
            0,
            this._specialOperationTaskPoints.length,
            ...this.CurMap.node.getComponentsInChildren(ZRSJZ_SpecialOperationsTaskIcon)
                .filter(point => point?.node?.isValid),
        );

        const template = this._miniMapTaskPoint;
        if (!template) {
            if (this._specialOperationTaskPoints.length > 0) {
                console.warn("[ZRSJZ_Game] 小地图缺少任务图标模板节点");
            }
            return;
        }
        template.active = false;

        const worldMapTransform = this.CurMap.Map?.getComponent(UITransform);
        const miniMapTransform = this._miniMapContent.getComponent(UITransform);
        if (!worldMapTransform || !miniMapTransform) return;
        const worldMapSize = worldMapTransform.contentSize;
        if (worldMapSize.width <= 0 || worldMapSize.height <= 0) return;

        const worldMapAnchor = worldMapTransform.anchorPoint;
        const miniMapSize = miniMapTransform.contentSize;
        const miniMapAnchor = miniMapTransform.anchorPoint;
        for (let index = 0; index < this._specialOperationTaskPoints.length; index++) {
            const taskPoint = this._specialOperationTaskPoints[index];
            const markerNode = index === 0 ? template : instantiate(template);
            if (index > 0) markerNode.parent = this._miniMapMapRoot;
            markerNode.name = `任务_${index}`;
            markerNode.setSiblingIndex(this._miniMapMapRoot.children.length - 1);

            worldMapTransform.convertToNodeSpaceAR(
                taskPoint.node.worldPosition,
                this._specialTaskWorldPosition,
            );
            const normalizedX = Math.max(0, Math.min(1,
                this._specialTaskWorldPosition.x / worldMapSize.width + worldMapAnchor.x,
            ));
            const normalizedY = Math.max(0, Math.min(1,
                this._specialTaskWorldPosition.y / worldMapSize.height + worldMapAnchor.y,
            ));
            const mapPosition = new Vec3(
                (normalizedX - miniMapAnchor.x) * miniMapSize.width,
                (normalizedY - miniMapAnchor.y) * miniMapSize.height,
                markerNode.position.z,
            );
            markerNode.active = taskPoint.IsAvailable;
            this._miniMapTaskMarkers.push({
                Node: markerNode,
                MapPosition: mapPosition,
                TaskPoint: taskPoint,
            });
        }
        this._hasMiniMapTaskPoint = this._miniMapTaskMarkers.length > 0;
        if (this._hasMiniMapTaskPoint) {
            this._miniMapTaskMapPosition.set(this._miniMapTaskMarkers[0].MapPosition);
        }
    }

    /**
     * 小地图实时跟随：
     * 根据玩家在世界地图中的比例反向移动底图，
     * “我的位置”作为底图的同级节点始终固定在 Mask 中心。
     */
    private RefreshMiniMap(): void {
        const centerPlayerIndex = this._fullscreenPlayerIndex === 1 ? 1 : 0;
        const centerPlayer = this.GetPlayer(centerPlayerIndex)?.node;
        if (!centerPlayer?.isValid
            || !this.CurMap?.Map?.isValid
            || !this._miniMapContent?.isValid
            || !this._miniMapPoint?.isValid) {
            return;
        }

        const worldMapTransform = this.CurMap.Map.getComponent(UITransform);
        const miniMapTransform = this._miniMapContent.getComponent(UITransform);
        if (!worldMapTransform || !miniMapTransform) {
            return;
        }

        const worldBounds = worldMapTransform.getBoundingBoxToWorld();
        if (worldBounds.width <= 0 || worldBounds.height <= 0) {
            return;
        }

        const playerPosition = centerPlayer.worldPosition;
        const normalizedX = Math.max(
            0,
            Math.min(1, (playerPosition.x - worldBounds.xMin) / worldBounds.width),
        );
        const normalizedY = Math.max(
            0,
            Math.min(1, (playerPosition.y - worldBounds.yMin) / worldBounds.height),
        );
        const mapSize = miniMapTransform.contentSize;
        const mapAnchor = miniMapTransform.anchorPoint;
        this._miniMapPointPosition.set(
            (normalizedX - mapAnchor.x) * mapSize.width,
            (normalizedY - mapAnchor.y) * mapSize.height,
            0,
        );

        // 地图中部优先让玩家保持在遮罩中心；接近地图边界时底图停止，改由玩家标记移向边缘。
        this._miniMapPoint.setPosition(0, 0, this._miniMapPoint.position.z);
        const mapScale = this._miniMapContent.scale;
        const desiredMapX = -this._miniMapPointPosition.x * mapScale.x;
        const desiredMapY = -this._miniMapPointPosition.y * mapScale.y;
        const clampedMapPosition = this.ClampMiniMapContentPosition(
            desiredMapX,
            desiredMapY,
            miniMapTransform,
            mapScale,
        );
        this._miniMapContent.setPosition(
            clampedMapPosition.x,
            clampedMapPosition.y,
            this._miniMapContent.position.z,
        );
        this._miniMapDisplayCenterPosition.set(
            Math.abs(mapScale.x) > 0.0001
                ? -clampedMapPosition.x / mapScale.x
                : this._miniMapPointPosition.x,
            Math.abs(mapScale.y) > 0.0001
                ? -clampedMapPosition.y / mapScale.y
                : this._miniMapPointPosition.y,
            0,
        );
        for (const marker of this._miniMapTaskMarkers) {
            if (!marker.Node?.isValid) continue;
            marker.Node.setPosition(
                (marker.MapPosition.x - this._miniMapDisplayCenterPosition.x) * mapScale.x,
                (marker.MapPosition.y - this._miniMapDisplayCenterPosition.y) * mapScale.y,
                marker.Node.position.z,
            );
            marker.Node.active = marker.TaskPoint?.IsAvailable ?? false;
        }

        const player1 = this.GetPlayer(0)?.node;
        if (player1?.isValid) {
            this.UpdateMiniMapPlayerPoint(
                this._miniMapPoint,
                player1.worldPosition,
                worldBounds,
                mapSize.width,
                mapSize.height,
                mapAnchor.x,
                mapAnchor.y,
                mapScale,
                this._miniMapDisplayCenterPosition,
                this._miniMapPlayer1Position,
            );
            this._miniMapPoint.active = !this._playersGivenUpResurrection.has(0);
        }
        const player2 = this.GetPlayer(1)?.node;
        if (this._miniMapPlayer2Point && player2?.isValid && this.IsTwoPlayerMode()) {
            this.UpdateMiniMapPlayerPoint(
                this._miniMapPlayer2Point,
                player2.worldPosition,
                worldBounds,
                mapSize.width,
                mapSize.height,
                mapAnchor.x,
                mapAnchor.y,
                mapScale,
                this._miniMapDisplayCenterPosition,
                this._miniMapPlayer2Position,
            );
            this._miniMapPlayer2Point.active = !this._playersGivenUpResurrection.has(1);
        }

        const paracargoPosition = this.GetParacargoTargetWorldPosition();
        this.RefreshMiniMapImportantPoint(
            this._miniMapParacargoPoint,
            paracargoPosition,
            worldBounds,
            mapSize.width,
            mapSize.height,
            mapAnchor.x,
            mapAnchor.y,
            mapScale,
        );

        const bombPlot = this.GetActiveBombPlot();
        this.RefreshMiniMapImportantPoint(
            this._miniMapBombPlotPoint,
            bombPlot?.CenterWorldPosition ?? null,
            worldBounds,
            mapSize.width,
            mapSize.height,
            mapAnchor.x,
            mapAnchor.y,
            mapScale,
        );
        if (bombPlot && this._miniMapBombPlotPoint) {
            const rangeTransform = this._miniMapBombPlotPoint.getComponent(UITransform);
            if (rangeTransform) {
                rangeTransform.setContentSize(
                    bombPlot.Radius * 2 / worldBounds.width * mapSize.width * Math.abs(mapScale.x),
                    bombPlot.Radius * 2 / worldBounds.height * mapSize.height * Math.abs(mapScale.y),
                );
                this._miniMapBombPlotPoint.setScale(1, 1, 1);
            }
        }
    }

    private RefreshMiniMapImportantPoint(
        point: Node,
        worldPosition: Readonly<Vec3> | null,
        worldBounds: Rect,
        mapWidth: number,
        mapHeight: number,
        anchorX: number,
        anchorY: number,
        mapScale: Vec3,
    ): void {
        if (!point) return;
        if (!worldPosition) {
            point.active = false;
            return;
        }
        this.UpdateMiniMapPlayerPoint(
            point,
            worldPosition,
            worldBounds,
            mapWidth,
            mapHeight,
            anchorX,
            anchorY,
            mapScale,
            this._miniMapDisplayCenterPosition,
        );
        point.active = true;
    }

    /**
     * 限制底图移动范围，使底图四边始终位于小地图遮罩之外；
     * 当底图某一轴比遮罩还小时，则在该轴居中显示。
     */
    private ClampMiniMapContentPosition(
        desiredX: number,
        desiredY: number,
        mapTransform: UITransform,
        mapScale: Readonly<Vec3>,
    ): Vec3 {
        const maskTransform = this._miniMapMask?.getComponent(UITransform);
        if (!maskTransform) {
            this._miniMapClampedContentPosition.set(desiredX, desiredY, 0);
            return this._miniMapClampedContentPosition;
        }

        const mapSize = mapTransform.contentSize;
        const mapAnchor = mapTransform.anchorPoint;
        const maskSize = maskTransform.contentSize;
        const maskAnchor = maskTransform.anchorPoint;
        const scaledMapWidth = mapSize.width * Math.abs(mapScale.x);
        const scaledMapHeight = mapSize.height * Math.abs(mapScale.y);

        const maskLeft = -maskAnchor.x * maskSize.width;
        const maskRight = (1 - maskAnchor.x) * maskSize.width;
        const maskBottom = -maskAnchor.y * maskSize.height;
        const maskTop = (1 - maskAnchor.y) * maskSize.height;
        const minX = maskRight - (1 - mapAnchor.x) * scaledMapWidth;
        const maxX = maskLeft + mapAnchor.x * scaledMapWidth;
        const minY = maskTop - (1 - mapAnchor.y) * scaledMapHeight;
        const maxY = maskBottom + mapAnchor.y * scaledMapHeight;

        const centeredX = (maskLeft + maskRight) * 0.5
            - (0.5 - mapAnchor.x) * scaledMapWidth;
        const centeredY = (maskBottom + maskTop) * 0.5
            - (0.5 - mapAnchor.y) * scaledMapHeight;
        this._miniMapClampedContentPosition.set(
            minX <= maxX ? Math.max(minX, Math.min(maxX, desiredX)) : centeredX,
            minY <= maxY ? Math.max(minY, Math.min(maxY, desiredY)) : centeredY,
            0,
        );
        return this._miniMapClampedContentPosition;
    }

    private UpdateMiniMapPlayerPoint(
        point: Node,
        worldPosition: Readonly<Vec3>,
        worldBounds: Rect,
        mapWidth: number,
        mapHeight: number,
        anchorX: number,
        anchorY: number,
        mapScale: Vec3,
        centerMapPosition: Vec3,
        output: Vec3 = new Vec3(),
    ): void {
        const normalizedX = Math.max(0, Math.min(1,
            (worldPosition.x - worldBounds.xMin) / worldBounds.width,
        ));
        const normalizedY = Math.max(0, Math.min(1,
            (worldPosition.y - worldBounds.yMin) / worldBounds.height,
        ));
        output.set(
            (normalizedX - anchorX) * mapWidth,
            (normalizedY - anchorY) * mapHeight,
            0,
        );
        point.setPosition(
            (output.x - centerMapPosition.x) * mapScale.x,
            (output.y - centerMapPosition.y) * mapScale.y,
            point.position.z,
        );
    }

    //#region 获取游戏时间
    private InitializeBattleTimer(): void {
        const mapConfig = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        const limitMinutes = Number(mapConfig?.TimeLimitMinutes ?? 0);
        this._timeLimitSeconds = Number.isFinite(limitMinutes)
            ? Math.max(0, limitMinutes * 60)
            : 0;
        this.RefreshGameTime();
    }

    private RefreshGameTime(): void {
        if (!this.GameTime) return;
        this.GameTime.string = this._timeLimitSeconds > 0
            ? this.GetRemainingGameTime()
            : this.GetGameTime();
    }

    private GetRemainingGameTime(): string {
        const remainingSeconds = Math.max(
            0,
            Math.ceil(this._timeLimitSeconds - this._elapsedGameTime),
        );
        return this.FormatTime(remainingSeconds);
    }

    GetGameTime(): string {
        const totalSeconds = Math.max(0, Math.floor(this._elapsedGameTime));
        return this.FormatTime(totalSeconds);
    }

    private FormatTime(totalSeconds: number): string {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    //#region 获取击杀数
    GetKillCount(): string {
        return Math.max(0, Math.floor(this._killCount)).toString();
    }

    /** 敌人首次确认死亡时登记击杀，防止死亡表现或回收流程重复计数。 */
    RecordKill(count: number = 1, killedEnemy: Node = null): void {
        if (!Number.isFinite(count) || count <= 0) return;
        this._killCount += Math.floor(count);
        if (this._specialOperationState === "进行中"
            && this._specialOperationTaskType === "高价值目标"
            && killedEnemy === this._specialOperationTargetEnemy) {
            this._specialOperationObjectiveCompleted = true;
        }
    }

    /** 同一时刻只允许执行一个特别行动；完成或失败后可以接取剩余任务点。 */
    AcceptSpecialOperation(
        mapKey: string,
        sourceTaskPoint: ZRSJZ_SpecialOperationsTaskIcon = null,
        playerIndex: number = 0,
    ): boolean {
        if (this._isGameFinished || this._specialOperationState === "进行中") return false;
        const baseConfig = ZRSJZ_SPECIAL_OPERATION_CONFIG.get(mapKey);
        const taskType = baseConfig
            ? sourceTaskPoint?.ResolveTaskType(baseConfig.TaskType)
            : undefined;
        const config = GetSpecialOperationConfig(mapKey, taskType);
        if (mapKey !== ZRSJZ_GameData.Instance.CurMap || !config) return false;
        if (config.TaskType === "待定") return false;
        if (!sourceTaskPoint?.IsAvailable) return false;
        const taskWorldPosition = sourceTaskPoint.node.worldPosition.clone();
        const configuredTargetPrefab = sourceTaskPoint.HighValueTarget;
        const configuredTargetPoint = sourceTaskPoint.HighValueTargetPoint;
        const targetWorldPosition = configuredTargetPoint?.isValid
            ? configuredTargetPoint.worldPosition.clone()
            : taskWorldPosition;
        const hasConfiguredTargetPoint = configuredTargetPoint?.isValid === true;
        this._acceptedSpecialOperationMapKey = mapKey;
        this._specialOperationStartTime = this._elapsedGameTime;
        this._specialOperationState = "进行中";
        this._specialOperationTaskType = config.TaskType;
        this._specialOperationPlayerIndex = playerIndex === 1 ? 1 : 0;
        this._specialOperationObjectiveCompleted = false;
        const setupVersion = ++this._specialOperationSetupVersion;
        this.CancelEvacuation();
        this.HideSpecialOperationPoint(sourceTaskPoint, playerIndex);
        this.PlayTaskStateAnimation("kaishi", "kaishi");
        this.SetSpecialOperationCountdownVisible(true);
        this.RefreshSpecialOperationCountdown();
        if (config.TaskType === "高价值目标") {
            void this.SpawnSpecialOperationTarget(
                configuredTargetPrefab,
                targetWorldPosition,
                hasConfiguredTargetPoint,
                setupVersion,
            );
        } else if (config.TaskType === "坚守轰炸区") {
            const playerPosition = this.GetPlayer(this._specialOperationPlayerIndex)
                ?.node?.worldPosition?.clone() ?? taskWorldPosition;
            void this.StartHoldBombPlot(config, playerPosition, setupVersion);
        } else if (config.TaskType === "破壁行动") {
            this.StartBreakWallOperation();
        }
        return true;
    }

    IsSpecialOperationAccepted(mapKey: string = ZRSJZ_GameData.Instance.CurMap): boolean {
        return this._specialOperationState === "进行中"
            && this._acceptedSpecialOperationMapKey === mapKey;
    }

    IsSpecialOperationInProgress(): boolean {
        return this._specialOperationState === "进行中";
    }

    public IsBreakWallOperationInProgress(): boolean {
        return this._specialOperationState === "进行中"
            && this._specialOperationTaskType === "破壁行动";
    }

    public NotifyBreakWallBoxOpened(mailbox: ZRSJZ_Mailbox): void {
        if (!this.IsBreakWallOperationInProgress() || !this._breakWallMailboxes.includes(mailbox)) {
            return;
        }
        const openedCount = this._breakWallMailboxes.reduce(
            (sum, item) => sum + item.OpenedBoxCount,
            0,
        );
        if (openedCount >= this._breakWallTotalBoxCount && this._breakWallTotalBoxCount > 0) {
            this._specialOperationObjectiveCompleted = true;
        }
    }

    GetSpecialOperationState(): "未领取" | "进行中" | "已完成" | "已失败" {
        return this._specialOperationState;
    }

    /** 领取后按局内有效时间计时；完成时发放钞票，并逐项独立判定概率物资。 */
    private UpdateSpecialOperation(): void {
        if (this._specialOperationState !== "进行中") return;
        const config = GetSpecialOperationConfig(
            this._acceptedSpecialOperationMapKey,
            this._specialOperationTaskType,
        );
        if (!config) {
            this._specialOperationState = "已失败";
            this.SetSpecialOperationCountdownVisible(false);
            return;
        }

        if (config.TaskType === "坚守轰炸区" && this._specialOperationBombRadius > 0) {
            const player = this.GetPlayer(this._specialOperationPlayerIndex)?.node;
            if (player?.isValid) {
                const dx = player.worldPosition.x - this._specialOperationBombCenter.x;
                const dy = player.worldPosition.y - this._specialOperationBombCenter.y;
                if (dx * dx + dy * dy > this._specialOperationBombRadius * this._specialOperationBombRadius) {
                    this.FailSpecialOperation("已离开轰炸区，特别行动失败");
                    return;
                }
            }
        }

        if (this._specialOperationObjectiveCompleted) {
            this.CompleteSpecialOperation(config);
            return;
        }

        if (this._elapsedGameTime - this._specialOperationStartTime >= config.TimeLimitSeconds) {
            if (config.TaskType === "坚守轰炸区" && this._specialOperationBombRadius > 0) {
                this.CompleteSpecialOperation(config);
                return;
            }
            this.FailSpecialOperation("特别行动已超时");
            return;
        }
        this.RefreshSpecialOperationCountdown();
    }

    private CompleteSpecialOperation(config: Readonly<ZRSJZ_SpecialOperationConfig>): void {
        this._specialOperationState = "已完成";
        this._specialOperationTargetEnemy = null;
        this.SetSpecialOperationCountdownVisible(false);
        if (config.TaskType === "坚守轰炸区" && this._specialOperationBombPlot?.node?.isValid) {
            const bombPlot = this._specialOperationBombPlot;
            if (this._activeBombPlot === bombPlot) this._activeBombPlot = null;
            this._specialOperationBombPlot = null;
            bombPlot.Cancel();
            this.ScheduleNextBombPlot(false);
        }
        this._specialOperationBombRadius = 0;
        const earnedAwards: ZRSJZ_MainTaskAwardConfig[] = [{
            TaskAwardName: "钞票",
            TaskAwardCount: config.GoldReward,
        }];
        for (const award of config.PropAwards) {
            if (Math.random() >= award.Probability) continue;
            earnedAwards.push({
                TaskAwardName: award.PropName,
                TaskAwardCount: award.Count,
            });
        }
        ZRSJZ_UIManager.Instance.ShowPanel(
            ZRSJZ_PANEL.获取奖励弹窗,
            ...earnedAwards,
        );
    }

    /** 破壁行动开始时重置9个邮箱箱位，并自动开启地图中的保险门。 */
    private StartBreakWallOperation(): void {
        this._breakWallMailboxes.splice(
            0,
            this._breakWallMailboxes.length,
            ...(this.CurMap?.node?.getComponentsInChildren(ZRSJZ_Mailbox) ?? [])
                .filter(mailbox => mailbox?.node?.isValid),
        );
        this._breakWallTotalBoxCount = this._breakWallMailboxes.reduce(
            (sum, mailbox) => sum + mailbox.TotalBoxCount,
            0,
        );
        if (this._breakWallTotalBoxCount <= 0) {
            this.FailSpecialOperationSetup("地图中未配置破壁行动邮箱");
            return;
        }
        for (const mailbox of this._breakWallMailboxes) mailbox.ResetForBreakWallTask();

        const insuranceDoors = (this.CurMap?.node?.getComponentsInChildren(ZRSJZ_Door) ?? [])
            .filter(door => door?.node?.isValid && door.Skin === "保险门");
        for (const door of insuranceDoors) door.Open();
        if (insuranceDoors.length === 0) {
            console.warn("[ZRSJZ_Game] 破壁行动未找到 Skin=保险门 的门节点");
        }
        void ZRSJZ_UIManager.Instance.ShowTip(
            `保险门已开启，请在限时内打开全部${this._breakWallTotalBoxCount}个邮箱箱位`,
        );
    }

    /** 高价值目标优先使用任务点配置的敌人和地点，未配置时沿用地图默认规则。 */
    private async SpawnSpecialOperationTarget(
        configuredPrefab: Prefab,
        taskWorldPosition: Readonly<Vec3>,
        useExactPosition: boolean,
        setupVersion: number,
    ): Promise<void> {
        const mapName = ZRSJZ_MAP_CONFIG.get(this._acceptedSpecialOperationMapKey)?.MapName;
        const targetName = mapName === "城镇" ? "Boss1" : mapName === "沙漠" ? "Boss2" : "Boss3";
        let prefab: Prefab = configuredPrefab;
        if (!prefab) {
            try {
                prefab = await ZRSJZ_Tools.LoadPrefab(`Prefabs/Unit/Enemy/${targetName}`);
            } catch (error) {
                console.error(`[ZRSJZ_Game] 加载高价值目标失败: ${targetName}`, error);
            }
        }
        if (setupVersion !== this._specialOperationSetupVersion
            || this._specialOperationState !== "进行中"
            || this._specialOperationTaskType !== "高价值目标") {
            return;
        }
        if (!prefab || !this.CurMap?.Unit?.isValid) {
            this.FailSpecialOperationSetup("高价值目标生成失败");
            return;
        }

        const target = instantiate(prefab);
        target.active = false;
        target.parent = this.CurMap.Unit;
        const mapBounds = this.CurMap.Map?.getComponent(UITransform)?.getBoundingBoxToWorld();
        const spawnAngle = Math.random() * Math.PI * 2;
        const desiredX = useExactPosition
            ? taskWorldPosition.x
            : taskWorldPosition.x + Math.cos(spawnAngle) * 600;
        const desiredY = useExactPosition
            ? taskWorldPosition.y
            : taskWorldPosition.y + Math.sin(spawnAngle) * 600;
        const spawnX = mapBounds
            ? Math.max(mapBounds.xMin + 100, Math.min(mapBounds.xMax - 100, desiredX))
            : desiredX;
        const spawnY = mapBounds
            ? Math.max(mapBounds.yMin + 100, Math.min(mapBounds.yMax - 100, desiredY))
            : desiredY;
        target.setWorldPosition(
            spawnX,
            spawnY,
            taskWorldPosition.z,
        );
        this._specialOperationTargetEnemy = target;
        target.active = true;
        void ZRSJZ_UIManager.Instance.ShowTip("高价值目标已出现");
    }

    /** 删除旧轰炸区后，以接取瞬间的玩家坐标为圆心生成任务轰炸区。 */
    private async StartHoldBombPlot(
        config: Readonly<ZRSJZ_SpecialOperationConfig>,
        playerWorldPosition: Readonly<Vec3>,
        setupVersion: number,
    ): Promise<void> {
        this.RemoveActiveBombPlot();
        this._bombPlotSpawnLoading = true;
        const bombPlotNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/BombPlot");
        this._bombPlotSpawnLoading = false;
        if (setupVersion !== this._specialOperationSetupVersion
            || this._specialOperationState !== "进行中"
            || this._specialOperationTaskType !== "坚守轰炸区") {
            if (bombPlotNode) ZRSJZ_PoolManager.Instance.PutNode(bombPlotNode);
            return;
        }
        if (!bombPlotNode || !this.CurMap?.Map?.isValid || !this.CurMap?.Unit?.isValid) {
            this.FailSpecialOperationSetup("任务轰炸区生成失败");
            return;
        }
        const bombPlot = bombPlotNode.getComponent(ZRSJZ_BombPlot);
        if (!bombPlot) {
            ZRSJZ_PoolManager.Instance.PutNode(bombPlotNode);
            this.FailSpecialOperationSetup("任务轰炸区缺少脚本");
            return;
        }

        bombPlotNode.active = false;
        bombPlotNode.parent = this.CurMap.Unit;
        this._activeBombPlot = bombPlot;
        this._specialOperationBombPlot = bombPlot;
        this._specialOperationBombCenter.set(playerWorldPosition);
        this._specialOperationBombRadius = Math.max(1, bombPlot.Radius);
        const deployed = bombPlot.DeployAtWorldPosition(
            playerWorldPosition,
            this.CurMap.Map,
            this.CurMap.Unit,
            config.TimeLimitSeconds,
            () => {
                if (this._activeBombPlot === bombPlot) this._activeBombPlot = null;
                if (this._specialOperationBombPlot === bombPlot) this._specialOperationBombPlot = null;
                this.ScheduleNextBombPlot(false);
            },
        );
        if (!deployed) {
            this._activeBombPlot = null;
            this._specialOperationBombPlot = null;
            ZRSJZ_PoolManager.Instance.PutNode(bombPlotNode);
            this.FailSpecialOperationSetup("任务轰炸区生成失败");
        }
    }

    private RemoveActiveBombPlot(): void {
        const bombPlot = this._activeBombPlot;
        this._activeBombPlot = null;
        if (this._specialOperationBombPlot === bombPlot) this._specialOperationBombPlot = null;
        if (bombPlot?.node?.isValid) bombPlot.Cancel();
    }

    private CleanupFailedSpecialOperationObjective(): void {
        if (this._specialOperationTargetEnemy?.isValid) {
            this._specialOperationTargetEnemy.destroy();
        }
        this._specialOperationTargetEnemy = null;
        if (this._specialOperationBombPlot?.node?.isValid) {
            const bombPlot = this._specialOperationBombPlot;
            if (this._activeBombPlot === bombPlot) this._activeBombPlot = null;
            this._specialOperationBombPlot = null;
            bombPlot.Cancel();
            this.ScheduleNextBombPlot(false);
        }
        if (this._specialOperationTaskType === "破壁行动") {
            for (const mailbox of this._breakWallMailboxes) mailbox.CancelBreakWallTask();
        }
        this._specialOperationBombRadius = 0;
    }

    private FailSpecialOperationSetup(tip: string): void {
        this.FailSpecialOperation(tip);
    }

    private FailSpecialOperation(tip: string): void {
        if (this._specialOperationState !== "进行中") return;
        this._specialOperationState = "已失败";
        ++this._specialOperationSetupVersion;
        this.SetSpecialOperationCountdownVisible(false);
        this.CleanupFailedSpecialOperationObjective();
        this.PlayTaskStateAnimation("shibai", "shibai");
        void ZRSJZ_UIManager.Instance.ShowTip(tip);
    }

    private RefreshSpecialOperationCountdown(): void {
        if (!this._taskCountdownLabel || this._specialOperationState !== "进行中") return;
        const config = GetSpecialOperationConfig(
            this._acceptedSpecialOperationMapKey,
            this._specialOperationTaskType,
        );
        if (!config) return;
        const remainingSeconds = Math.max(
            0,
            Math.ceil(config.TimeLimitSeconds - (this._elapsedGameTime - this._specialOperationStartTime)),
        );
        this._taskCountdownLabel.string = this.FormatTime(remainingSeconds);
    }

    private SetSpecialOperationCountdownVisible(visible: boolean): void {
        if (this._taskCountdownNode?.isValid) this._taskCountdownNode.active = visible;
    }

    private PlayTaskStateAnimation(skinName: string, animationName: string): void {
        const taskState = this._taskStateNode;
        const skeleton = this._taskStateSkeleton;
        if (!taskState?.isValid || !skeleton) {
            console.warn("[ZRSJZ_Game] Game场景缺少 TaskState Spine");
            return;
        }
        const animationVersion = ++this._taskStateAnimationVersion;
        taskState.active = true;
        skeleton.setCompleteListener(null);
        skeleton.setSkin(skinName);
        skeleton.setSlotsToSetupPose();
        skeleton.setAnimation(0, animationName, false);
        skeleton.setCompleteListener(() => {
            if (animationVersion !== this._taskStateAnimationVersion) return;
            skeleton.setCompleteListener(null);
            if (taskState?.isValid) taskState.active = false;
        });
    }

    /** 接取后只关闭本次选中的场景接取点及其一一对应的地图图标。 */
    private HideSpecialOperationPoint(
        taskPoint: ZRSJZ_SpecialOperationsTaskIcon,
        playerIndex: number,
    ): void {
        taskPoint?.Deactivate();
        const marker = this._miniMapTaskMarkers.find(item => item.TaskPoint === taskPoint);
        if (marker?.Node?.isValid) marker.Node.active = false;
        ZRSJZ_EventManager.Emit(
            ZRSJZ_MyEvent.ZRSJZ_PLAYER_SPECIAL_OPERATION,
            null,
            playerIndex === 1 ? 1 : 0,
        );
    }

    //#region 战利品ID（背包跟保险箱）
    GetAllGoodsID(): string[] {
        const goodsInventories = new Set<ZRSJZ_INVENTORY>([
            ZRSJZ_INVENTORY.背包,
            ZRSJZ_INVENTORY.保险箱,
        ]);

        return Object.entries(ZRSJZ_GameData.Instance.PropData ?? {})
            .filter(([id, propData]) => !!id
                && !!propData
                && propData.CurCount > 0
                && goodsInventories.has(propData.CurInventory))
            .map(([id]) => id);
    }
}
