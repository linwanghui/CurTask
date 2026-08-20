import { _decorator, Camera, Component, EventTouch, find, instantiate, Label, math, Node, Prefab, Rect, Sprite, SpriteFrame, TiledLayer, tween, UITransform, v3, Vec3, Widget, } from 'cc';
import { ZRSJZ_Tools } from './ZRSJZ_Tools';
import { ZRSJZ_GameCamera } from './Camera/ZRSJZ_GameCamera';
import { ZRSJZ_Map } from './Controller/ZRSJZ_Map';
import { ZRSJZ_PoolManager } from './Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Effect_CB } from './Effect/ZRSJZ_Effect_CB';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_MAP_CONFIG, ZRSJZ_PANEL, ZRSJZ_PROP_PROPERTY } from './ZRSJZ_Constant';
import { ZRSJZ_GameData } from './ZRSJZ_GameData';
import { ZRSJZ_Player } from './Controller/ZRSJZ_Player';
import { ZRSJZ_LoadingPanel } from './Panel/ZRSJZ_LoadingPanel';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_InventoryService } from './Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

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
    private _miniMapContent: Node = null;
    private _miniMapPoint: Node = null;
    private _miniMapIcon: Sprite = null;
    private _miniMapPointPosition: Vec3 = new Vec3();
    private _currentMapName: string = "";
    private _elapsedGameTime: number = 0;
    private _timeLimitSeconds: number = 0;
    private _killCount: number = 0;
    private _battleStarted: boolean = false;
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
        this.ConfigureSceneControlModels();
        this._elapsedGameTime = 0;
        this._killCount = 0;
        this._battleStarted = false;
        this._evacuationElapsed = 0;
        this._isEvacuating = false;
        this._playerEvacuationPoints.clear();
        this._playersGivenUpResurrection.clear();
        this._fullscreenPlayerIndex = -1;
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
            this.Camera_Player2.node.active = ZRSJZ_GameData.Instance.CurModel === "2p";
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
        ZRSJZ_UIManager.IsBattle = false;
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

    /** 玩家进入撤离点；所有存活玩家都在同一撤离点时才开始计时。 */
    StartEvacuation(
        evacuationPointName: string = "固定撤离点",
        playerIndex: number = 0,
    ): void {
        if (!this._battleStarted || this.GamePaused || this._isGameFinished) return;
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
    }

    private FailEvacuationByTimeout(): void {
        if (this._isGameFinished) return;

        this.CancelEvacuation();
        this._isGameFinished = true;
        this._battleStarted = false;
        this.GamePaused = true;
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
            const playerCount = ZRSJZ_GameData.Instance.CurModel === "2p" ? 2 : 1;
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
        return ZRSJZ_GameData.Instance.CurModel === "2p" && this.Players.length > 1;
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
        );
    }

    private InitMiniMap(): void {
        const mapConfig = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        const miniMapMask = find("UICanvas/小地图/Mask");
        if (!mapConfig || !miniMapMask) {
            console.warn(`[ZRSJZ_Game] 无法初始化小地图: ${ZRSJZ_GameData.Instance.CurMap}`);
            return;
        }

        this._currentMapName = mapConfig.MapName;
        this._miniMapContent = miniMapMask.getChildByName(this._currentMapName);
        this._miniMapPoint = miniMapMask.getChildByName("我的位置");
        this._miniMapIcon = this._miniMapPoint?.getChildByName("Icon")?.getComponent(Sprite) ?? null;

        const mapNames = new Set(Array.from(ZRSJZ_MAP_CONFIG.values()).map(config => config.MapName));
        miniMapMask.children.forEach(child => {
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

        if (!this._miniMapContent || !this._miniMapPoint) {
            console.warn(`[ZRSJZ_Game] 找不到关卡对应的小地图节点: ${this._currentMapName}`);
            return;
        }

        this._miniMapPoint.active = true;
        this._miniMapPoint.setPosition(0, 0, this._miniMapPoint.position.z);
        this._miniMapPoint.setSiblingIndex(miniMapMask.children.length - 1);
    }

    /**
     * 小地图实时跟随：
     * 根据玩家在世界地图中的比例反向移动底图，
     * “我的位置”作为底图的同级节点始终固定在 Mask 中心。
     */
    private RefreshMiniMap(): void {
        if (!this._player?.isValid
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

        const playerPosition = this._player.worldPosition;
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

        // “我的位置”与地图底图是 Mask 下的同级节点，固定在遮罩中心并只移动底图。
        this._miniMapPoint.setPosition(0, 0, this._miniMapPoint.position.z);
        const mapScale = this._miniMapContent.scale;
        this._miniMapContent.setPosition(
            -this._miniMapPointPosition.x * mapScale.x,
            -this._miniMapPointPosition.y * mapScale.y,
            this._miniMapContent.position.z,
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
    RecordKill(count: number = 1): void {
        if (!Number.isFinite(count) || count <= 0) return;
        this._killCount += Math.floor(count);
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
