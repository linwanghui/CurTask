import { _decorator, Component, EventTouch, find, instantiate, Label, math, Node, Prefab, Sprite, SpriteFrame, UITransform, Vec3, } from 'cc';
import { ZRSJZ_Tools } from './ZRSJZ_Tools';
import { ZRSJZ_GameCamera } from './Camera/ZRSJZ_GameCamera';
import { ZRSJZ_Map } from './Controller/ZRSJZ_Map';
import { ZRSJZ_PoolManager } from './Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Effect_CB } from './Effect/ZRSJZ_Effect_CB';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_MAP_CONFIG, ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_GameData } from './ZRSJZ_GameData';
import { ZRSJZ_Player } from './Controller/ZRSJZ_Player';
import { ZRSJZ_LoadingPanel } from './Panel/ZRSJZ_LoadingPanel';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Game')
export class ZRSJZ_Game extends Component {
    public static Instance: ZRSJZ_Game = null;

    @property(Node)
    MapParent: Node = null;

    @property(ZRSJZ_GameCamera)
    Camera: ZRSJZ_GameCamera = null;

    @property(Node)
    UI: Node = null;

    @property(Label)
    GameTime: Label = null;

    @property(Label)
    Evacuate: Label = null;

    CurMap: ZRSJZ_Map = null;
    CurPlayer: ZRSJZ_Player = null;

    GamePaused: boolean = false;
    UnlimitedFirepower: boolean = false;
    Drug: number[] = [0, 0, 1];//药品数量--高级/中级/低级

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

    protected onLoad(): void {
        ZRSJZ_Game.Instance = this;
        this._elapsedGameTime = 0;
        this._killCount = 0;
        this._battleStarted = false;
        this._evacuationElapsed = 0;
        this._isEvacuating = false;
        this._isGameFinished = false;
        this.InitializeBattleTimer();
        this.SetEvacuationVisible(false);
    }

    protected async start(): Promise<void> {
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
            if (timeoutReached) {
                this.FailEvacuationByTimeout();
                return;
            }
            if (evacuationCompleted) {
                this.CompleteEvacuation();
            }
        }
    }

    /** 玩家进入撤离点后开始计时；必须在区域内连续停留满 10 秒。 */
    StartEvacuation(evacuationPointName: string = "固定撤离点"): void {
        if (!this._battleStarted || this.GamePaused || this._isGameFinished) return;
        if (this._isEvacuating) return;

        this._evacuationMethod = evacuationPointName || "固定撤离点";
        this._evacuationElapsed = 0;
        this._isEvacuating = true;
        this.SetEvacuationVisible(true);
        this.RefreshEvacuationTime();
    }

    /** 玩家提前离开撤离点时取消并重置倒计时。 */
    CancelEvacuation(): void {
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
            this.LoadPlayer();
        })
    }

    LoadPlayer() {
        ZRSJZ_Tools.LoadPrefab("Prefabs/Unit/Player").then((prefab: Prefab) => {
            const player = instantiate(prefab);
            player.parent = this.CurMap.Unit;
            player.setWorldPosition(this.CurMap.PlayerPoints[math.randomRangeInt(0, this.CurMap.PlayerPoints.length)].worldPosition.clone());
            this.CurPlayer = player.getComponent(ZRSJZ_Player);
            this._player = player;
            this.Camera.Init(player, this.CurMap.Map);
            this.RefreshMiniMap();
            this.LoadUI();
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.加载界面);
            ZRSJZ_AudioManager.Instance.PlayMusic("战斗BGM");
        })
    }

    LoadUI() {
        this.Drug = [0, 0, 1];
        this.UI.active = true;
        this.RefreshGameTime();
        this._battleStarted = true;
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
