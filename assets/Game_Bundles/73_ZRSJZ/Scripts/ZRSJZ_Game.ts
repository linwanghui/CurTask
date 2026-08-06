import { _decorator, Component, EventTouch, find, instantiate, math, Node, Prefab, Sprite, SpriteFrame, UITransform, Vec3, } from 'cc';
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

    CurMap: ZRSJZ_Map = null;
    CurPlayer: ZRSJZ_Player = null;

    GamePaused: boolean = false;
    UnlimitedFirepower: boolean = false;
    Drug: number[] = [0, 0, 0];//药品数量--高级/中级/低级

    private _player: Node = null;
    private _miniMapContent: Node = null;
    private _miniMapPoint: Node = null;
    private _miniMapIcon: Sprite = null;
    private _miniMapPointPosition: Vec3 = new Vec3();
    private _elapsedGameTime: number = 0;
    private _killCount: number = 0;
    private _battleStarted: boolean = false;

    protected onLoad(): void {
        ZRSJZ_Game.Instance = this;
        this._elapsedGameTime = 0;
        this._killCount = 0;
        this._battleStarted = false;
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
        ZRSJZ_UIManager.IsBattle = false;
    }

    protected lateUpdate(): void {
        this.RefreshMiniMap();
    }

    protected update(deltaTime: number): void {
        if (this._battleStarted && !this.GamePaused && Number.isFinite(deltaTime) && deltaTime > 0) {
            this._elapsedGameTime += deltaTime;
        }
    }

    LoadMap() {
        // const mapConfig = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        // if (!mapConfig) {
        //     console.error(`[ZRSJZ_Game] 未找到地图配置: ${ZRSJZ_GameData.Instance.CurMap}`);
        //     return;
        // }

        ZRSJZ_Tools.LoadPrefab("Prefabs/Map/" + "雪地").then((prefab: Prefab) => {
            // ZRSJZ_Tools.LoadPrefab("Prefabs/Map/" + mapConfig.MapName).then((prefab: Prefab) => {
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
        })
    }

    LoadUI() {
        this.Drug = [0, 0, 0];
        this.UI.active = true;
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
            0,
            this._miniMapIcon.spriteFrame,
        );
    }

    private InitMiniMap(): void {
        this._miniMapContent = find("UICanvas/小地图/Mask/地图");
        this._miniMapPoint = find("UICanvas/小地图/Mask/地图/我的位置");
        this._miniMapIcon = find("UICanvas/小地图/Mask/地图/我的位置/Icon")?.getComponent(Sprite);
        console.error(ZRSJZ_GameData.Instance.HaveRole[0]);
        ZRSJZ_UIManager.Instance.GetHeroUI(ZRSJZ_GameData.Instance.CurSkin[0]).then((sf: SpriteFrame) => this._miniMapIcon.spriteFrame = sf);

        if (!this._miniMapContent || !this._miniMapPoint) {
            console.warn("[ZRSJZ_Game] 小地图节点结构不完整");
            return;
        }
    }

    /**
     * 小地图实时跟随：
     * “我的位置”在地图底图中使用真实比例定位，再反向移动底图，
     * 从而让玩家标记始终保持在 Mask 中心。
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

        this._miniMapPoint.setPosition(this._miniMapPointPosition);
        const mapScale = this._miniMapContent.scale;
        this._miniMapContent.setPosition(
            -this._miniMapPointPosition.x * mapScale.x,
            -this._miniMapPointPosition.y * mapScale.y,
            this._miniMapContent.position.z,
        );
    }

    //#region 获取游戏时间
    GetGameTime(): string {
        const totalSeconds = Math.max(0, Math.floor(this._elapsedGameTime));
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
