import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { _decorator, AudioClip, Camera, Canvas, Component, director, EventKeyboard, find, input, Input, instantiate, KeyCode, Node, Prefab, Sprite, SpriteFrame, Texture2D, UITransform, v2, Vec3, Widget } from 'cc';
import { ZRSJZ_Panel } from '../Panel/ZRSJZ_Panel';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_INVENTORY, ZRSJZ_MAIL_TYPE, ZRSJZ_MailPropAward, ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryAmmo } from '../UI/ZRSJZ_InventoryAmmo';
import { ZRSJZ_PoolManager } from './ZRSJZ_PoolManager';
import { ZRSJZ_CurrencyEffect } from '../Effect/ZRSJZ_CurrencyEffect';
import { ZRSJZ_InventoryBackpack } from '../UI/ZRSJZ_InventoryBackpack';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_AudioManager } from './ZRSJZ_AudioManager';
import { ZRSJZ_Tip } from '../UI/ZRSJZ_Tip';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './ZRSJZ_EventManager';
import { ZRSJZ_MailService } from '../Service/ZRSJZ_MailService';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass, property } = _decorator;

export interface ZRSJZ_PropAwardInput {
    PropName: string;
    Count: number;
}

export interface ZRSJZ_ReceivePropAwardsResult {
    PlacedPropIDs: string[];
    MailAwards: ZRSJZ_MailPropAward[];
    MailID: string;
    InvalidAwards: ZRSJZ_PropAwardInput[];
}

@ccclass('ZRSJZ_UIManager')
export class ZRSJZ_UIManager extends Component {
    public static readonly LoadAssetsCount: number = 6;
    public static ZRSJZ_DLC: boolean = false;
    public static ZRSJZ_UI: boolean = false;
    public static Dragging: boolean = false;//是否正在拖动道具
    /** 当前拖动所属玩家；通过上下文隔离库存，避免改变旧事件的参数结构。 */
    public static DraggingPlayerIndex: number = -1;
    public static IsBattle: boolean = false;//是否正在战斗界面
    /** 双人局中改用单人操作布局时记录唯一存活玩家；-1 表示正常分屏。 */
    public static SinglePlayerBattleIndex: number = -1;

    private static _instance: ZRSJZ_UIManager = null;
    public static get Instance(): ZRSJZ_UIManager {
        return ZRSJZ_UIManager._instance;
    }

    PropParent: Node = null;
    PropGridSFMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    PropSFMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    HeroIconSFMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    BoxSFMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    RoleSkinIconSFMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    WeaponryTextureMap: Map<string, Texture2D> = new Map<string, Texture2D>();
    InventoryMap: Map<string, Node> = new Map<string, Node>();
    private _discardArea: Node = null;
    private _discardSprite: Sprite = null;
    private _discardDefaultSF: SpriteFrame = null;
    private _discardSelectedSF: SpriteFrame = null;
    private _playerDiscardAreas = new Map<number, {
        area: Node,
        sprite: Sprite,
        defaultSF: SpriteFrame,
        selectedSF: SpriteFrame,
    }>();
    private readonly _discardingPropIDs = new Set<string>();

    private _panelNode: Node = null;
    private _panelMap: Map<string, Node> = new Map<string, Node>();
    private _curPanel: string[] = [];
    /** 双人局内弹窗必须每名玩家各有一个实例，不能复用全局面板节点。 */
    private readonly _playerPanelMap = new Map<string, Node>();
    private readonly _curPlayerPanels = new Set<string>();
    private readonly _playerPanelRequestVersions: number[] = [0, 0];
    /** 双人同时打开背包时，各自使用独立的库存视图节点。 */
    private readonly _playerInventoryMap = new Map<string, Node>();
    /** 同一玩家库存正在创建时复用同一个任务，避免返回尚未初始化的节点。 */
    private readonly _playerInventoryTasks = new Map<string, Promise<Node>>();
    /** 关闭全部弹窗时递增，使之前尚未完成的异步加载不再自动显示。 */
    private _panelRequestVersion: number = 0;
    private _finishGameInventoryPromise: Promise<void> = null;
    /** 发奖涉及异步格子操作，串行执行可避免多次发奖抢占同一格。 */
    private _receiveAwardsQueue: Promise<void> = Promise.resolve();

    protected onLoad(): void {
        if (ZRSJZ_UIManager._instance == null) {
            ZRSJZ_UIManager._instance = this;
            ZRSJZ_UIManager.InitDLC();
            ZRSJZ_UIManager.InitAudio();
            ZRSJZ_UIManager.InitUI();
            ZRSJZ_UIManager.InitInventory();
            ZRSJZ_UIManager.InitEvent();
            director.addPersistRootNode(this.node);
        } else {
            this.node.removeFromParent();
            return;
        }
        this._panelNode = this.node.getChildByName("Panel");
        this.PropParent = this.node.getChildByName("PropParent");
    }
    //#region 初始化
    public static Init() {
        const node = new Node("ZRSJZ_UIManager");
        node.addComponent(ZRSJZ_UIManager);
        ZRSJZ_UIManager._instance = node.getComponent(ZRSJZ_UIManager);
        const uiiCameraNode = new Node("UICamera");
        uiiCameraNode.parent = node;
        const uiiCamera = uiiCameraNode.addComponent(Camera);
        uiiCamera.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
        uiiCamera.visibility = 1 << 0;
        uiiCamera.priority = 10;
        uiiCamera.projection = Camera.ProjectionType.ORTHO;
        const canvas = node.addComponent(Canvas);
        canvas.cameraComponent = uiiCamera;
        canvas.alignCanvasWithScreen = true;
        ZRSJZ_UIManager._instance._panelNode = new Node("Panel");
        ZRSJZ_UIManager._instance._panelNode.parent = node;

        director.addPersistRootNode(node);
        node.layer = 1 << 0;
        uiiCameraNode.layer = 1 << 0;
        ZRSJZ_UIManager._instance._panelNode.layer = 1 << 0;
        const widget = node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;

        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        const panelWidget = ZRSJZ_UIManager._instance._panelNode.addComponent(Widget);
        panelWidget.isAlignTop = true;
        panelWidget.isAlignBottom = true;
        panelWidget.isAlignLeft = true;
        panelWidget.isAlignRight = true;

        panelWidget.top = 0;
        panelWidget.bottom = 0;
        panelWidget.left = 0;
        panelWidget.right = 0;

        ZRSJZ_UIManager._instance.PropParent = new Node("Prop");
        ZRSJZ_UIManager._instance.PropParent.parent = node;
    }

    public static InitUI() {

        let loadCount = 0;
        const loadCompleted: Function = () => {
            loadCount++;
            if (loadCount >= ZRSJZ_UIManager.LoadAssetsCount) {
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_UI);
                ZRSJZ_UIManager.ZRSJZ_UI = true;
            }
        }
        //初始话格子UI
        ZRSJZ_Tools.LoadSprites("Sprites/格子").then((sfs: SpriteFrame[]) => {
            sfs.forEach(sf => ZRSJZ_UIManager._instance.PropGridSFMap.set(sf.name, sf));
            loadCompleted();
        });
        //初始化道具UI
        ZRSJZ_Tools.LoadSprites("Sprites/Prop").then((sfs: SpriteFrame[]) => {
            sfs.forEach(sf => ZRSJZ_UIManager._instance.PropSFMap.set(sf.name, sf));
            loadCompleted();

        });
        //初始化皮肤Icon
        ZRSJZ_Tools.LoadSprites("Sprites/小地图/Icon").then((sfs: SpriteFrame[]) => {
            sfs.forEach(sf => ZRSJZ_UIManager._instance.HeroIconSFMap.set(sf.name, sf));
            loadCompleted();

        });
        //初始化武器UI
        ZRSJZ_Tools.LoadSprites("Sprites/Weaponry").then((sfs: SpriteFrame[]) => {
            sfs.forEach(sf => ZRSJZ_UIManager._instance.WeaponryTextureMap.set(sf.name, sf.texture as Texture2D));
            loadCompleted()
        });
        //初始化箱子
        ZRSJZ_Tools.LoadSprites("Sprites/箱子").then((sfs: SpriteFrame[]) => {
            sfs.forEach(sf => ZRSJZ_UIManager._instance.BoxSFMap.set(sf.name, sf));
            loadCompleted();
        });
        //初始化角色皮肤
        ZRSJZ_Tools.LoadSprites("Sprites/角色界面/皮肤").then((sfs: SpriteFrame[]) => {
            sfs.forEach(sf => ZRSJZ_UIManager._instance.RoleSkinIconSFMap.set(sf.name, sf));
            loadCompleted();
        });
    }

    public static InitDLC() {
        if (!Banner.TimeMask) return;
        BundleManager.LoadBundle("73_ZRSJZ_DLC", () => {
            ZRSJZ_UIManager.ZRSJZ_DLC = true;
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_DLC);
        })
    }

    //初始化仓库
    public static InitInventory() {
        const weaponry: ZRSJZ_INVENTORY[] = [
            ZRSJZ_INVENTORY.武器_枪,
            ZRSJZ_INVENTORY.武器_头盔,
            ZRSJZ_INVENTORY.武器_防弹衣,
            ZRSJZ_INVENTORY.武器_背包,
            ZRSJZ_INVENTORY.武器_刀,
        ]
        ZRSJZ_Tools.LoadPrefab("Prefabs/UI/Inventory/Inventory").then((perfab: Prefab) => {
            for (let key in ZRSJZ_INVENTORY) {
                if (
                    weaponry.includes(ZRSJZ_INVENTORY[key])
                    || ZRSJZ_INVENTORY[key] === ZRSJZ_INVENTORY.物资
                ) continue;
                const inventory: Node = instantiate(perfab);
                let inventoryComponent: ZRSJZ_Inventory;
                if (ZRSJZ_INVENTORY[key] === ZRSJZ_INVENTORY.弹药) {
                    inventory.getComponent(ZRSJZ_Inventory)?.destroy();
                    inventoryComponent = inventory.addComponent(ZRSJZ_InventoryAmmo);
                } else if (ZRSJZ_INVENTORY[key] === ZRSJZ_INVENTORY.背包) {
                    inventory.getComponent(ZRSJZ_Inventory)?.destroy();
                    inventoryComponent = inventory.addComponent(ZRSJZ_InventoryBackpack);
                } else {
                    inventoryComponent = inventory.getComponent(ZRSJZ_Inventory);
                }
                inventoryComponent.Init(ZRSJZ_INVENTORY[key]);
                ZRSJZ_UIManager._instance.InventoryMap.set(ZRSJZ_INVENTORY[key], inventory);
                inventory.active = false;
            }
        })
        weaponry.forEach(async (key: string) => {
            const perfab: Prefab = await ZRSJZ_Tools.LoadPrefab("Prefabs/UI/Inventory/" + key);
            const inventory: Node = instantiate(perfab);
            inventory.getComponent(ZRSJZ_Inventory).Init(ZRSJZ_INVENTORY[key]);
            ZRSJZ_UIManager._instance.InventoryMap.set(ZRSJZ_INVENTORY[key], inventory);
            inventory.active = false;
        })
    }

    public static InitAudio() {
        ZRSJZ_AudioManager.Instance = ZRSJZ_UIManager._instance.node.addComponent(ZRSJZ_AudioManager);
        ZRSJZ_AudioManager.Instance.Init();
        //音频资源地址
        const audioRes: string[] = [
            "73_ZRSJZ/Audios",
        ]
        let initCount = 0;
        audioRes.forEach(path => {
            const bundlePath: string = path.split("/").shift();
            const resPath: string = path.split("/").slice(1).join("/");
            ZRSJZ_Tools.LoadAudioClips(bundlePath, resPath).then((clips: AudioClip[]) => {
                clips.forEach((clip, index) => {
                    ZRSJZ_AudioManager.Instance.AudioClipMaps.set(clip.name, clip);
                    if (index === clips.length - 1) {
                        initCount++;
                        if (initCount === audioRes.length) {
                            //初始化完成
                            console.error("音频初始化完成");
                            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_AUDIO_INIT);
                        }
                    }
                })
            })
        });
    }

    public static InitEvent() {
        input.on(Input.EventType.KEY_DOWN, (event: EventKeyboard) => {
            if (event.keyCode == KeyCode.KEY_P) ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.作弊界面);
        });
    }

    //#region UI展示
    //展示面板
    public ShowPanel(panel: string, ...args: any[]) {
        const panelName = panel.split('/').pop() || panel;

        // 结算界面拥有最高优先级：显示前立即关闭其余弹窗，并终止未完成的异步弹窗请求。
        const winPanelName = ZRSJZ_PANEL.胜利弹窗.split('/').pop() || ZRSJZ_PANEL.胜利弹窗;
        const failPanelName = ZRSJZ_PANEL.失败弹窗.split('/').pop() || ZRSJZ_PANEL.失败弹窗;
        if (panelName === winPanelName || panelName === failPanelName) {
            // 已发起过同一结算面板的加载时不递增版本，否则会误取消它自己的异步请求。
            if (this._curPanel.includes(panelName)) return;
            this.CloseAllPanelsImmediately(panelName);
        }

        if (ZRSJZ_UIManager.Dragging) return;
        if (this._curPanel.includes(panelName)) return;//当前面板显示中
        this._curPanel.push(panelName);
        const requestVersion = this._panelRequestVersion;

        //显示面板
        const showPanel: Function = () => {
            const panelNode = this._panelMap.get(panelName);
            if (panelNode) {
                panelNode.setSiblingIndex(99);
                panelNode.getComponent(ZRSJZ_Panel).Show(...args);
            }
        }

        //加载面板
        if (!this._panelMap.has(panelName)) {
            const bundlePath = panel.split('/')[0];
            const resPath = panel.replace(bundlePath, '');
            BundleManager.GetBundle(bundlePath).load(resPath, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error(`加载 Bundle: 73_ZRSJZ Prefab 加载失败 Path: ${resPath}`);
                } else {
                    const panelNode = instantiate(prefab);
                    this._panelNode.addChild(panelNode);
                    panelNode.active = false;
                    this._panelMap.set(panelName, panelNode);
                    if (
                        requestVersion === this._panelRequestVersion
                        && this._curPanel.includes(panelName)
                    ) {
                        showPanel();
                    }
                }
            });
            return;
        }

        showPanel();
    }

    /** 在指定玩家的 UICanvas/.../PlayerX/Panel 下显示一份独立弹窗。 */
    public ShowPlayerPanel(panel: string, playerIndex: number, ...args: any[]): void {
        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        // 只有局内双人模式才使用玩家独立弹窗。仓库等局外界面即使已经
        // 选择了 2p，也仍然使用全局 Panel，否则打开和关闭会落入两套缓存。
        if (
            !ZRSJZ_UIManager.IsBattle
            || ZRSJZ_GameData.Instance.CurModel !== "2p"
            || ZRSJZ_UIManager.SinglePlayerBattleIndex >= 0
        ) {
            this.ShowPanel(panel, ...args);
            return;
        }

        const parent = this.GetPlayerPanelRoot(normalizedIndex);
        if (!parent) {
            console.warn(`[ZRSJZ_UIManager] 未找到玩家${normalizedIndex + 1}的 Panel 节点`);
            this.ShowPanel(panel, ...args);
            return;
        }

        const panelName = panel.split('/').pop() || panel;
        const panelKey = this.GetPlayerPanelKey(panelName, normalizedIndex);
        if (this._curPlayerPanels.has(panelKey)) return;

        this._curPlayerPanels.add(panelKey);
        const requestVersion = this._playerPanelRequestVersions[normalizedIndex];
        const showPanel = (): void => {
            const panelNode = this._playerPanelMap.get(panelKey);
            if (!panelNode?.isValid || !parent?.isValid) return;
            panelNode.parent = parent;
            panelNode.setPosition(0, 0, 0);
            panelNode.setSiblingIndex(parent.children.length - 1);
            const panelComponent = panelNode.getComponent(ZRSJZ_Panel);
            panelComponent.PlayerIndex = normalizedIndex;
            panelComponent.Show(...args);
        };

        const cachedPanel = this._playerPanelMap.get(panelKey);
        if (cachedPanel?.isValid) {
            showPanel();
            return;
        }
        if (cachedPanel) this._playerPanelMap.delete(panelKey);

        const bundlePath = panel.split('/')[0];
        const resPath = panel.replace(bundlePath, '');
        BundleManager.GetBundle(bundlePath).load(resPath, Prefab, (err: any, prefab: Prefab) => {
            if (err) {
                this._curPlayerPanels.delete(panelKey);
                console.error(`加载玩家弹窗失败 Path: ${resPath}`, err);
                return;
            }
            const panelNode = instantiate(prefab);
            parent.addChild(panelNode);
            panelNode.active = false;
            this._playerPanelMap.set(panelKey, panelNode);
            if (
                requestVersion === this._playerPanelRequestVersions[normalizedIndex]
                && this._curPlayerPanels.has(panelKey)
            ) {
                showPanel();
            }
        });
    }

    //隐藏面板
    public HidePanel(panel: string, ...args: any[]) {
        if (ZRSJZ_UIManager.Dragging) return;
        const panelName = panel.split('/').pop() || panel;
        if (!this._curPanel.includes(panelName)) return;//面板未显示
        this._curPanel.splice(this._curPanel.indexOf(panelName), 1);

        if (!this._panelMap.has(panelName)) return;
        this._panelMap.get(panelName).getComponent(ZRSJZ_Panel).Hide(...args);
    }

    public HidePlayerPanel(panel: string, playerIndex: number, ...args: any[]): void {
        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        if (
            !ZRSJZ_UIManager.IsBattle
            || ZRSJZ_GameData.Instance.CurModel !== "2p"
            || ZRSJZ_UIManager.SinglePlayerBattleIndex >= 0
        ) {
            this.HidePanel(panel, ...args);
            return;
        }
        const panelName = panel.split('/').pop() || panel;
        const panelKey = this.GetPlayerPanelKey(panelName, normalizedIndex);
        if (!this._curPlayerPanels.delete(panelKey)) {
            // ShowPlayerPanel 在场景缺少玩家容器时会回退到全局 Panel，关闭时
            // 也必须做同样的回退，保证回调与面板状态能够正常结束。
            if (this._curPanel.includes(panelName)) this.HidePanel(panel, ...args);
            return;
        }
        this._playerPanelMap.get(panelKey)?.getComponent(ZRSJZ_Panel)?.Hide(...args);
    }

    private GetPlayerPanelKey(panelName: string, playerIndex: number): string {
        return `${panelName}@Player${playerIndex + 1}`;
    }

    private GetPlayerPanelRoot(playerIndex: number): Node {
        const scene = director.getScene();
        return find(
            `UICanvas/TwoPlayerModel/${playerIndex === 1 ? "Player2" : "Player1"}/Panel`,
            scene,
        );
    }

    /**
     * 玩家死亡前统一终止 UI 操作并立即关闭全部弹窗。
     * 这里不走 HidePanel，避免拖动锁和关闭动画阻止死亡弹窗显示。
     */
    public PrepareForDeath(playerIndex: number = 0): void {
        if (
            ZRSJZ_GameData.Instance.CurModel === "2p"
            && ZRSJZ_UIManager.SinglePlayerBattleIndex < 0
        ) {
            this.CloseAllPlayerPanelsImmediately(playerIndex);
        } else {
            this.CloseAllPanelsImmediately();
        }
    }

    public CloseAllPlayerPanelsImmediately(playerIndex: number): void {
        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        this._playerPanelRequestVersions[normalizedIndex]++;
        for (const panelKey of Array.from(this._curPlayerPanels)) {
            if (panelKey.endsWith(`@Player${normalizedIndex + 1}`)) {
                this._curPlayerPanels.delete(panelKey);
            }
        }
        for (const [panelKey, panelNode] of this._playerPanelMap) {
            if (panelKey.endsWith(`@Player${normalizedIndex + 1}`) && panelNode?.isValid) {
                panelNode.active = false;
            }
        }
    }

    /**
     * 立即关闭所有已打开和正在异步加载的弹窗，可选择保留一个最高优先级面板。
     */
    CloseAllPanelsImmediately(excludedPanelName: string = ""): void {
        this._panelRequestVersion++;
        this._playerPanelRequestVersions[0]++;
        this._playerPanelRequestVersions[1]++;
        this._curPlayerPanels.clear();

        // 先取消拖动，归还跟随手指的临时道具节点，并恢复滚动等交互状态。
        ZRSJZ_UIManager.Dragging = false;
        ZRSJZ_UIManager.DraggingPlayerIndex = -1;
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CANCEL_PROP_DRAG);
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, true);

        // 清除所有库存中的拖动落点预览颜色。
        for (const inventoryNode of this.InventoryMap.values()) {
            const inventory = inventoryNode?.getComponent(ZRSJZ_Inventory);
            if (inventory) {
                ZRSJZ_EventManager.EmitPersist(
                    ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW,
                    inventory.InventoryType,
                );
            }
        }

        this._curPanel = excludedPanelName && this._curPanel.includes(excludedPanelName)
            ? [excludedPanelName]
            : [];
        for (const [panelName, panelNode] of this._panelMap) {
            if (panelName !== excludedPanelName && panelNode?.isValid) {
                panelNode.active = false;
            }
        }
        for (const panelNode of this._playerPanelMap.values()) {
            if (panelNode?.isValid) panelNode.active = false;
        }
    }

    //展示提示
    public async ShowTip(tip: string) {
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/Tip").then((tipNode: Node) => {
            tipNode.parent = this.node;
            tipNode.active = true;
            tipNode.getComponent(ZRSJZ_Tip).Show(tip);
        });
    }

    //展示获取金币特效
    public async ShowCurrencyEffect() {
        let TargetPos: Vec3 = new Vec3(0, 500, 0);
        if (this._curCurrencyUI.length > 0) {
            // console.error("没有显示的金币框！");
            // return;
            TargetPos = this._curCurrencyUI[this._curCurrencyUI.length - 1].getWorldPosition().clone();
        }
        const effect: Node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/货币特效");
        effect.parent = this.node;
        effect.active = true;
        effect.getComponent(ZRSJZ_CurrencyEffect).Show(TargetPos);
    }

    //#region 获取UI
    //获取格子UI
    public GetPropGridUI(propGridName: string): Promise<SpriteFrame> {
        if (this.PropGridSFMap.size == 0) {
            return new Promise(resolve => {
                setTimeout(async () => {
                    resolve(await this.GetPropGridUI(propGridName));
                }, 100);
            });
        }
        if (!this.PropGridSFMap.has(propGridName)) {
            console.error("没找到格子ui:", propGridName);
            return null;
        }
        return Promise.resolve(this.PropGridSFMap.get(propGridName));
    }

    //获取道具UI
    public GetPropUI(propName: string): Promise<SpriteFrame> {
        if (this.PropSFMap.size === 0) {
            return new Promise(resolve => {
                setTimeout(async () => {
                    resolve(await this.GetPropUI(propName));
                }, 100);
            });
        }

        if (!this.PropSFMap.has(propName)) {
            console.error("没找到道具ui:", propName);
            return null;
        }
        return Promise.resolve(this.PropSFMap.get(propName));
    }

    //获取道具UI
    public GetWeaponryUI(propName: string): Promise<Texture2D> {
        if (this.WeaponryTextureMap.size === 0) {
            return new Promise(resolve => {
                setTimeout(async () => {
                    resolve(await this.GetWeaponryUI(propName));
                }, 100);
            });
        }

        if (this.WeaponryTextureMap.has(propName)) {
            return Promise.resolve(this.WeaponryTextureMap.get(propName));
        }

        console.error("没找到武器ui:", propName);
        return Promise.resolve(null);
    }

    //获取玩家Icon
    public GetHeroUI(heroName: string): Promise<SpriteFrame> {
        if (this.HeroIconSFMap.has(heroName)) {
            return Promise.resolve(this.HeroIconSFMap.get(heroName));
        } else {
            return new Promise((resolve, reject) => {
                BundleManager.GetBundle("73_ZRSJZ").load(`Sprites/小地图/Icon/${heroName}/spriteFrame`, SpriteFrame, (err: any, sf: SpriteFrame) => {
                    if (err) {
                        reject(err);
                        console.error(`加载 ${heroName} 失败`);
                    } else {
                        this.HeroIconSFMap.set(sf.name, sf);
                        resolve && resolve(sf);
                    }
                });
            });
        }
    }

    //获取箱子Icon
    public GetBoxUI(boxName: string): Promise<SpriteFrame> {
        if (this.BoxSFMap.has(boxName)) {
            return Promise.resolve(this.BoxSFMap.get(boxName));
        } else {
            return new Promise((resolve, reject) => {
                BundleManager.GetBundle("73_ZRSJZ").load(`Sprites/箱子/${boxName}/spriteFrame`, SpriteFrame, (err: any, sf: SpriteFrame) => {
                    if (err) {
                        reject(err);
                        console.error(`加载 ${boxName} 失败`);
                    } else {
                        this.BoxSFMap.set(sf.name, sf);
                        resolve && resolve(sf);
                    }
                });
            });
        }
    }

    //获取玩家Icon
    public GetHeroSkinIconUI(SkinName: string): Promise<SpriteFrame> {
        if (this.RoleSkinIconSFMap.has(SkinName)) {
            return Promise.resolve(this.RoleSkinIconSFMap.get(SkinName));
        } else {
            return new Promise((resolve, reject) => {
                BundleManager.GetBundle("73_ZRSJZ").load(`Sprites/角色界面/皮肤/${SkinName}/spriteFrame`, SpriteFrame, (err: any, sf: SpriteFrame) => {
                    if (err) {
                        reject(err);
                        console.error(`加载 ${SkinName} 失败`);
                    } else {
                        this.RoleSkinIconSFMap.set(sf.name, sf);
                        resolve && resolve(sf);
                    }
                });
            });
        }
    }

    //获取仓库
    public async GetInventory(
        inventoryName: string,
        playerIndex?: number,
        forcePlayerInstance: boolean = false,
    ): Promise<Node> {
        if (this.InventoryMap.size === 0) {
            await new Promise<void>(resolve => setTimeout(resolve, 100));
            return this.GetInventory(inventoryName, playerIndex, forcePlayerInstance);
        }

        if (!this.InventoryMap.has(inventoryName)) {
            console.error("没找到仓库:", inventoryName);
            return null;
        }
        if (
            playerIndex !== undefined
            && (
                forcePlayerInstance
                || (
                    ZRSJZ_UIManager.IsBattle
                    && ZRSJZ_GameData.Instance.CurModel === "2p"
                )
            )
            && ZRSJZ_InventoryService.IsPlayerInventory(inventoryName as ZRSJZ_INVENTORY)
        ) {
            const normalizedIndex = playerIndex === 1 ? 1 : 0;
            const inventoryKey = `${inventoryName}@Player${normalizedIndex + 1}`;
            const existing = this._playerInventoryMap.get(inventoryKey);
            if (
                existing?.isValid
                && existing.getComponent(ZRSJZ_Inventory)?.PlayerViewIndex === normalizedIndex
            ) {
                return existing;
            }
            if (existing) this._playerInventoryMap.delete(inventoryKey);

            const creating = this._playerInventoryTasks.get(inventoryKey);
            if (creating) return creating;

            const createTask = (async (): Promise<Node> => {
                const inventory = instantiate(this.InventoryMap.get(inventoryName));
                inventory.name = inventoryKey;
                inventory.active = false;
                await inventory.getComponent(ZRSJZ_Inventory).Init(
                    inventoryName as ZRSJZ_INVENTORY,
                    normalizedIndex,
                );
                inventory.active = false;
                this._playerInventoryMap.set(inventoryKey, inventory);
                return inventory;
            })();
            this._playerInventoryTasks.set(inventoryKey, createTask);
            try {
                return await createTask;
            } finally {
                if (this._playerInventoryTasks.get(inventoryKey) === createTask) {
                    this._playerInventoryTasks.delete(inventoryKey);
                }
            }
        }

        return this.InventoryMap.get(inventoryName);
    }

    /**
     * 发放一批仓库道具：对应分类仓库 -> 主库 -> 一封邮件。
     * 同一批中能放下的道具正常入库，所有放不下的数量合并到同一封邮件。
     */
    public async ReceivePropAwards(
        awards: ReadonlyArray<Readonly<ZRSJZ_PropAwardInput>>,
        mailType: ZRSJZ_MAIL_TYPE = ZRSJZ_MAIL_TYPE.仓库已满,
    ): Promise<ZRSJZ_ReceivePropAwardsResult> {
        const previousTask = this._receiveAwardsQueue;
        let releaseQueue: () => void = () => { };
        this._receiveAwardsQueue = new Promise<void>(resolve => {
            releaseQueue = resolve;
        });
        await previousTask;

        try {
            return await this.DoReceivePropAwards(awards, mailType);
        } finally {
            releaseQueue();
        }
    }

    /** 领取邮件附件时复用入库规则，但失败项由原邮件保留，不再创建新邮件。 */
    public async ReceiveMailPropAwards(
        awards: ReadonlyArray<Readonly<ZRSJZ_PropAwardInput>>,
    ): Promise<ZRSJZ_ReceivePropAwardsResult> {
        const previousTask = this._receiveAwardsQueue;
        let releaseQueue: () => void = () => { };
        this._receiveAwardsQueue = new Promise<void>(resolve => {
            releaseQueue = resolve;
        });
        await previousTask;

        try {
            return await this.DoReceivePropAwards(
                awards,
                ZRSJZ_MAIL_TYPE.仓库已满,
                false,
            );
        } finally {
            releaseQueue();
        }
    }

    /**
     * 只预演道具入库，不创建道具、修改格子或保存数据。
     * 用于商店在扣款前确认整批商品都能按“分类仓库 -> 主库”的规则放下。
     */
    public async CanReceivePropAwards(
        awards: ReadonlyArray<Readonly<ZRSJZ_PropAwardInput>>,
    ): Promise<boolean> {
        // 等待正在执行的发奖结束，避免拿到尚未稳定的仓库布局。
        await this._receiveAwardsQueue;

        const simulatedGrids = new Map<ZRSJZ_INVENTORY, string[][]>();
        const getInventorySnapshot = async (inventoryType: ZRSJZ_INVENTORY): Promise<string[][]> => {
            const cached = simulatedGrids.get(inventoryType);
            if (cached) return cached;

            const inventoryNode = await this.WaitForInventory(inventoryType);
            const inventory = inventoryNode?.getComponent(ZRSJZ_Inventory);
            if (!inventory?.IsInitialized) return null;
            const grids = inventory.Grids.map(row => row.slice());
            simulatedGrids.set(inventoryType, grids);
            return grids;
        };
        const tryPlace = async (
            inventoryType: ZRSJZ_INVENTORY,
            width: number,
            height: number,
        ): Promise<boolean> => {
            const grids = await getInventorySnapshot(inventoryType);
            if (!grids?.length) return false;
            const colCount = grids[0]?.length ?? 0;
            const orientations = width === height
                ? [{ width, height }]
                : [{ width, height }, { width: height, height: width }];

            for (const orientation of orientations) {
                if (orientation.width > colCount) continue;
                for (let y = 0; y <= grids.length - orientation.height; y++) {
                    for (let x = 0; x <= colCount - orientation.width; x++) {
                        let canPlace = true;
                        for (let row = y; row < y + orientation.height && canPlace; row++) {
                            for (let col = x; col < x + orientation.width; col++) {
                                if (grids[row]?.[col] !== "") {
                                    canPlace = false;
                                    break;
                                }
                            }
                        }
                        if (!canPlace) continue;
                        for (let row = y; row < y + orientation.height; row++) {
                            for (let col = x; col < x + orientation.width; col++) {
                                grids[row][col] = "__SHOP_PREVIEW__";
                            }
                        }
                        return true;
                    }
                }
            }
            return false;
        };

        for (const award of awards) {
            const propConfig = ZRSJZ_PROP_CONFIG.get(award?.PropName);
            const totalCount = Math.max(0, Math.floor(Number(award?.Count) || 0));
            if (!propConfig || totalCount <= 0) return false;

            const width = Number(propConfig.GridType[2]);
            const height = Number(propConfig.GridType[0]);
            if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
                return false;
            }

            const maxCount = Math.max(1, Math.floor(Number(propConfig.MaxCount) || 1));
            const stackCount = Math.ceil(totalCount / maxCount);
            const preferredInventory = ZRSJZ_Tools.GetInventoryByPropType(propConfig.PropType);
            for (let index = 0; index < stackCount; index++) {
                let isPlaced = await tryPlace(preferredInventory, width, height);
                if (!isPlaced && preferredInventory !== ZRSJZ_INVENTORY.仓库_全部) {
                    isPlaced = await tryPlace(ZRSJZ_INVENTORY.仓库_全部, width, height);
                }
                if (!isPlaced) return false;
            }
        }
        return true;
    }

    private async DoReceivePropAwards(
        awards: ReadonlyArray<Readonly<ZRSJZ_PropAwardInput>>,
        mailType: ZRSJZ_MAIL_TYPE,
        createOverflowMail: boolean = true,
    ): Promise<ZRSJZ_ReceivePropAwardsResult> {
        const placedPropIDs: string[] = [];
        const invalidAwards: ZRSJZ_PropAwardInput[] = [];
        const overflowCounts = new Map<string, number>();

        for (const award of awards) {
            const propName = award?.PropName;
            const totalCount = Math.max(0, Math.floor(Number(award?.Count) || 0));
            const propConfig = ZRSJZ_PROP_CONFIG.get(propName);
            if (!propConfig || totalCount <= 0) {
                invalidAwards.push({ PropName: propName ?? "", Count: totalCount });
                continue;
            }

            const maxCount = Math.max(1, Math.floor(Number(propConfig.MaxCount) || 1));
            let remaining = totalCount;
            while (remaining > 0) {
                const stackCount = Math.min(maxCount, remaining);
                const propID = ZRSJZ_InventoryService.AddPropByName(propName, stackCount);
                const propData = ZRSJZ_GameData.Instance.PropData[propID];
                if (!propData) {
                    invalidAwards.push({ PropName: propName, Count: stackCount });
                    remaining -= stackCount;
                    continue;
                }

                const preferredInventory = ZRSJZ_Tools.GetInventoryByPropType(propData.PropType);
                let isPlaced = await this.TryPlaceAwardProp(propID, preferredInventory);
                if (!isPlaced && preferredInventory !== ZRSJZ_INVENTORY.仓库_全部) {
                    isPlaced = await this.TryPlaceAwardProp(propID, ZRSJZ_INVENTORY.仓库_全部);
                }

                if (isPlaced) {
                    placedPropIDs.push(propID);
                } else {
                    // 邮件只保存附件配置；删除临时实例，领取时再生成，避免它占用仓库容量。
                    delete ZRSJZ_GameData.Instance.PropData[propID];
                    overflowCounts.set(
                        propName,
                        (overflowCounts.get(propName) ?? 0) + stackCount,
                    );
                }
                remaining -= stackCount;
            }
        }

        const mailAwards: ZRSJZ_MailPropAward[] = Array.from(overflowCounts.entries())
            .map(([PropName, Count]) => ({ PropName, Count }));
        const mailID = createOverflowMail && mailAwards.length > 0
            ? ZRSJZ_MailService.AddMail(mailType, mailAwards)
            : "";

        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        ZRSJZ_GameData.SaveData();
        return {
            PlacedPropIDs: placedPropIDs,
            MailAwards: mailAwards,
            MailID: mailID,
            InvalidAwards: invalidAwards,
        };
    }

    private async TryPlaceAwardProp(
        propID: string,
        inventoryType: ZRSJZ_INVENTORY,
    ): Promise<boolean> {
        if (!inventoryType) return false;
        const propData = ZRSJZ_GameData.Instance.PropData[propID];
        if (!propData) return false;
        const inventoryNode = await this.WaitForInventory(inventoryType);
        const inventory = inventoryNode?.getComponent(ZRSJZ_Inventory);
        if (!inventory?.IsInitialized) return false;
        return inventory.TryReceiveProp(
            propData.CurInventory,
            propID,
            false,
        );
    }

    /** 把已经存在于局内库存的道具逐件转入仓库，失败项合并为一封邮件。 */
    private async ReceiveExistingProps(propIDs: ReadonlyArray<string>): Promise<void> {
        const overflowCounts = new Map<string, number>();
        for (const propID of propIDs) {
            const propData = ZRSJZ_GameData.Instance.PropData[propID];
            if (!propData) continue;

            const preferredInventory = ZRSJZ_Tools.GetInventoryByPropType(propData.PropType);
            let isPlaced = await this.TryPlaceAwardProp(propID, preferredInventory);
            if (!isPlaced && preferredInventory !== ZRSJZ_INVENTORY.仓库_全部) {
                isPlaced = await this.TryPlaceAwardProp(propID, ZRSJZ_INVENTORY.仓库_全部);
            }
            if (isPlaced) continue;

            overflowCounts.set(
                propData.Name,
                (overflowCounts.get(propData.Name) ?? 0) + Math.max(1, propData.CurCount || 1),
            );
            delete ZRSJZ_GameData.Instance.PropData[propID];
        }

        const mailAwards: ZRSJZ_MailPropAward[] = Array.from(overflowCounts.entries())
            .map(([PropName, Count]) => ({ PropName, Count }));
        if (mailAwards.length > 0) {
            ZRSJZ_MailService.AddMail(ZRSJZ_MAIL_TYPE.仓库已满, mailAwards);
        }
    }

    /** 面板激活前先停用玩家库存，防止旧视图的 onEnable 与新玩家 Init 并发。 */
    public DeactivatePlayerInventoryNodes(playerIndex?: number): void {
        for (const [inventoryName, inventoryNode] of this.InventoryMap) {
            if (
                inventoryNode?.isValid
                && ZRSJZ_InventoryService.IsPlayerInventory(inventoryName as ZRSJZ_INVENTORY)
            ) {
                inventoryNode.active = false;
            }
        }
        for (const [inventoryKey, inventoryNode] of this._playerInventoryMap) {
            if (!inventoryNode?.isValid) {
                this._playerInventoryMap.delete(inventoryKey);
                continue;
            }
            if (
                playerIndex === undefined
                || inventoryKey.endsWith(`@Player${(playerIndex === 1 ? 1 : 0) + 1}`)
            ) {
                inventoryNode.active = false;
            }
        }
    }

    public GetAllInventoryNodes(): Node[] {
        for (const [inventoryKey, inventoryNode] of this._playerInventoryMap) {
            if (!inventoryNode?.isValid) this._playerInventoryMap.delete(inventoryKey);
        }
        return Array.from(new Set<Node>([
            ...Array.from(this.InventoryMap.values()).filter(node => node?.isValid),
            ...Array.from(this._playerInventoryMap.values()).filter(node => node?.isValid),
        ]));
    }

    public RegisterDiscardArea(
        discardArea: Node,
        discardSFs: readonly SpriteFrame[] = [],
        playerIndex: number = -1,
    ): void {
        if (playerIndex >= 0) {
            this._playerDiscardAreas ??= new Map();
            const normalizedIndex = playerIndex === 1 ? 1 : 0;
            const sprite = discardArea?.getComponent(Sprite);
            const context = {
                area: discardArea,
                sprite,
                defaultSF: discardSFs[0] ?? sprite?.spriteFrame ?? null,
                selectedSF: discardSFs[1] ?? discardSFs[0] ?? sprite?.spriteFrame ?? null,
            };
            this._playerDiscardAreas.set(normalizedIndex, context);
            if (context.area?.isValid) context.area.active = true;
            this.SetDiscardAreaSelected(false, normalizedIndex);
            return;
        }
        this._discardArea = discardArea;
        this._discardSprite = discardArea?.getComponent(Sprite);
        this._discardDefaultSF = discardSFs[0] ?? this._discardSprite?.spriteFrame ?? null;
        this._discardSelectedSF = discardSFs[1] ?? this._discardDefaultSF;
        if (this._discardArea?.isValid) {
            this._discardArea.active = true;
            this.SetDiscardAreaSelected(false);
        }
    }

    public UnregisterDiscardArea(discardArea: Node, playerIndex: number = -1): void {
        if (playerIndex >= 0) {
            this._playerDiscardAreas ??= new Map();
            const normalizedIndex = playerIndex === 1 ? 1 : 0;
            if (this._playerDiscardAreas.get(normalizedIndex)?.area === discardArea) {
                this._playerDiscardAreas.delete(normalizedIndex);
            }
            return;
        }
        if (this._discardArea !== discardArea) return;
        this._discardArea = null;
        this._discardSprite = null;
        this._discardDefaultSF = null;
        this._discardSelectedSF = null;
    }

    /** 兼容原拖动调用：丢弃区域保持显示，只在拖动结束时恢复默认图标。 */
    public SetDiscardAreaVisible(_visible: boolean, playerIndex: number = -1): void {
        const context = this.GetDiscardAreaContext(playerIndex);
        if (!context.area?.isValid) return;
        context.area.active = true;
        this.SetDiscardAreaSelected(false, playerIndex);
    }

    /** 根据拖动道具中心是否进入丢弃范围切换默认/选中图标。 */
    public UpdateDiscardAreaState(worldPos: Vec3, playerIndex: number = -1): boolean {
        const isSelected = this.IsInsideDiscardArea(worldPos, playerIndex);
        this.SetDiscardAreaSelected(isSelected, playerIndex);
        return isSelected;
    }

    private SetDiscardAreaSelected(selected: boolean, playerIndex: number = -1): void {
        const context = this.GetDiscardAreaContext(playerIndex);
        if (!context.sprite?.isValid) return;
        context.sprite.spriteFrame = selected ? context.selectedSF : context.defaultSF;
    }

    private IsInsideDiscardArea(worldPos: Vec3, playerIndex: number = -1): boolean {
        const discardArea = this.GetDiscardAreaContext(playerIndex).area;
        const transform = discardArea?.getComponent(UITransform);
        return !!(
            discardArea?.isValid
            && discardArea.activeInHierarchy
            && transform
            && transform.getBoundingBoxToWorld().contains(v2(worldPos.x, worldPos.y))
        );
    }

    /** 返回 true 表示本次松手已被丢弃区域消费，不再执行库存落点。 */
    public TryDiscardDraggedProp(propID: string, worldPos: Vec3, playerIndex: number = -1): boolean {
        if (!this.IsInsideDiscardArea(worldPos, playerIndex)) {
            return false;
        }

        const propData = ZRSJZ_GameData.Instance.PropData[propID];
        if (!propData) return true;
        if (propData.PropType === "背包" || propData.PropType === "刀") {
            this.ShowTip("背包和刀无法丢弃");
            return true;
        }

        // 等当前触摸结束逻辑归还拖动预览后再删除原道具节点，避免对象池复用竞态。
        void Promise.resolve().then(() => this.DiscardProp(propID));
        return true;
    }

    private GetDiscardAreaContext(playerIndex: number): {
        area: Node,
        sprite: Sprite,
        defaultSF: SpriteFrame,
        selectedSF: SpriteFrame,
    } {
        if (playerIndex >= 0) {
            this._playerDiscardAreas ??= new Map();
            return this._playerDiscardAreas.get(playerIndex === 1 ? 1 : 0)
                ?? { area: null, sprite: null, defaultSF: null, selectedSF: null };
        }
        return {
            area: this._discardArea,
            sprite: this._discardSprite,
            defaultSF: this._discardDefaultSF,
            selectedSF: this._discardSelectedSF,
        };
    }

    private async DiscardProp(propID: string): Promise<void> {
        if (this._discardingPropIDs.has(propID)) return;
        this._discardingPropIDs.add(propID);
        try {
            const visitedNodes = new Set<Node>();
            // 背包弹窗和保险箱使用玩家独立库存实例；只遍历 InventoryMap
            // 会删掉数据却留下当前界面的格子节点，看起来就像没有删除。
            for (const inventoryNode of this.GetAllInventoryNodes()) {
                if (!inventoryNode?.isValid || visitedNodes.has(inventoryNode)) continue;
                visitedNodes.add(inventoryNode);
                const inventory = inventoryNode.getComponent(ZRSJZ_Inventory);
                if (inventory?.Grids.some(row => row.includes(propID))) {
                    await inventory.RemoveProp(propID);
                }
            }
            ZRSJZ_InventoryService.RemovePropID(propID);
        } finally {
            this._discardingPropIDs.delete(propID);
        }
    }

    /** 处理局内库存道具的双击快捷转移。 */
    public async QuickTransferProp(
        sourceInventory: ZRSJZ_INVENTORY,
        propID: string,
        playerIndex: number = ZRSJZ_InventoryService.GetActivePlayerIndex(),
    ): Promise<boolean> {
        const propData = ZRSJZ_GameData.Instance.PropData[propID];
        if (!propData) return false;

        let targetInventory: ZRSJZ_INVENTORY = null;
        let organizeBeforePlacement = false;
        if (sourceInventory === ZRSJZ_INVENTORY.物资) {
            targetInventory = ZRSJZ_INVENTORY.背包;
            organizeBeforePlacement = true;
        } else if (sourceInventory === ZRSJZ_INVENTORY.背包) {
            switch (propData.PropType) {
                case "枪":
                    targetInventory = ZRSJZ_INVENTORY.武器_枪;
                    break;
                case "头盔":
                    targetInventory = ZRSJZ_INVENTORY.武器_头盔;
                    break;
                case "防弹衣":
                    targetInventory = ZRSJZ_INVENTORY.武器_防弹衣;
                    break;
                case "背包":
                    targetInventory = ZRSJZ_INVENTORY.武器_背包;
                    break;
                case "刀":
                    targetInventory = ZRSJZ_INVENTORY.武器_刀;
                    break;
                case "房卡":
                case "门禁卡":
                    targetInventory = ZRSJZ_INVENTORY.卡包;
                    break;
                case "弹药":
                    targetInventory = ZRSJZ_INVENTORY.弹药;
                    break;
                default:
                    return false;
            }
        } else {
            return false;
        }

        // 物资/背包弹窗展示的是当前玩家独立库存实例。快捷转移也必须取得
        // 同一个实例；否则单人模式会写入全局默认背包，当前界面只看到物资消失。
        const normalizedPlayerIndex = playerIndex === 1 ? 1 : 0;
        const targetNode = await this.GetInventory(
            targetInventory,
            normalizedPlayerIndex,
            true,
        );
        const target = targetNode?.getComponent(ZRSJZ_Inventory);
        if (!target || target.PlayerViewIndex !== normalizedPlayerIndex) {
            console.error("快捷转移目标库存尚未初始化:", targetInventory);
            return false;
        }

        const hasEnoughGridCount = targetInventory === ZRSJZ_INVENTORY.背包
            && target.HasEnoughEmptyGridCount(propID);
        const success = await target.TryReceiveProp(
            sourceInventory,
            propID,
            organizeBeforePlacement,
        );
        if (!success) {
            this.ShowTip(
                targetInventory === ZRSJZ_INVENTORY.背包
                    ? (hasEnoughGridCount
                        ? "道具无法存放"
                        : "背包空间不足")
                    : "目标栏位空间不足",
            );
        }
        return success;
    }

    /**
     * 游戏结束时结算局内库存：
     * 1. 撤离成功时，背包和保险箱中的道具全部归仓；
     * 2. 撤离失败时，仅保险箱中的道具归仓；背包、刀以外的装备、子弹和房卡销毁；
     * 3. 仍留在物资箱中的道具直接销毁；
     * 4. 清空局内库存节点并同步仓库“全部”视图。
     */
    public FinishGameInventory(isEvacuationSuccess: boolean): Promise<void> {
        if (this._finishGameInventoryPromise) {
            return this._finishGameInventoryPromise;
        }

        this._finishGameInventoryPromise = this.DoFinishGameInventory(isEvacuationSuccess)
            .finally(() => {
                this._finishGameInventoryPromise = null;
            });
        return this._finishGameInventoryPromise;
    }

    private async DoFinishGameInventory(isEvacuationSuccess: boolean): Promise<void> {
        const affectedPropIDs = new Set<string>();
        const receivedPropIDs: string[] = [];

        for (const propID in ZRSJZ_GameData.Instance.PropData) {
            const propData = ZRSJZ_GameData.Instance.PropData[propID];

            if (propData.CurInventory === ZRSJZ_INVENTORY.物资) {
                affectedPropIDs.add(propID);
                delete ZRSJZ_GameData.Instance.PropData[propID];
                continue;
            }

            if (
                propData.CurInventory !== ZRSJZ_INVENTORY.背包
                && propData.CurInventory !== ZRSJZ_INVENTORY.保险箱
            ) {
                continue;
            }

            affectedPropIDs.add(propID);
            if (
                propData.CurInventory === ZRSJZ_INVENTORY.背包
                && !isEvacuationSuccess
            ) {
                delete ZRSJZ_GameData.Instance.PropData[propID];
                continue;
            }

            // 保留来源库存，稍后由统一格子逻辑逐件尝试“分类仓库 -> 主库”。
            // Owner 先重置为共享，避免双人模式下玩家2道具被大厅仓库拒收。
            propData.OwnerPlayerIndex = -1;
            propData.SourceBoxID = "";
            propData.IsSearchLocked = false;
            propData.GridData?.forEach(gridData => {
                gridData.GridX = -1;
                gridData.GridY = -1;
            });
            receivedPropIDs.push(propID);
        }

        if (receivedPropIDs.length > 0) {
            await this.ReceiveExistingProps(receivedPropIDs);
        }

        if (!isEvacuationSuccess) {
            const knifeIndex = 4;
            // 双人模式下两名玩家的装备引用完全独立。必须在删除道具
            // 实例的同时清空两组 ID，否则玩家2回到大厅后会被误判为持枪。
            for (const playerIndex of [0, 1]) {
                const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs(playerIndex);
                for (let index = 0; index < weaponryIDs.length; index++) {
                    if (index === knifeIndex) continue;

                    const equipmentID = weaponryIDs[index];
                    weaponryIDs[index] = "";
                    if (!equipmentID) continue;

                    affectedPropIDs.add(equipmentID);
                    delete ZRSJZ_GameData.Instance.PropData[equipmentID];
                }

                for (const ammoID of ZRSJZ_InventoryService.GetAmmoIDs(playerIndex)) {
                    if (!ammoID) continue;
                    affectedPropIDs.add(ammoID);
                    delete ZRSJZ_GameData.Instance.PropData[ammoID];
                }
                ZRSJZ_InventoryService.SetAmmoID([], playerIndex);

                if (playerIndex === 1) ZRSJZ_GameData.Instance.Player2RoomCard = ["", "", ""];
                else ZRSJZ_GameData.Instance.RoomCard = ["", "", ""];
            }

            const lostInventories = new Set<ZRSJZ_INVENTORY>([
                ZRSJZ_INVENTORY.武器_枪,
                ZRSJZ_INVENTORY.武器_头盔,
                ZRSJZ_INVENTORY.武器_防弹衣,
                ZRSJZ_INVENTORY.武器_背包,
                ZRSJZ_INVENTORY.弹药,
                ZRSJZ_INVENTORY.卡包,
            ]);
            for (const propID in ZRSJZ_GameData.Instance.PropData) {
                if (!lostInventories.has(ZRSJZ_GameData.Instance.PropData[propID].CurInventory)) {
                    continue;
                }

                affectedPropIDs.add(propID);
                delete ZRSJZ_GameData.Instance.PropData[propID];
            }
        }

        // 先保存最终数据，避免后续 UI 节点异步清理失败时丢失结算结果。
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        ZRSJZ_GameData.SaveData();

        const inventoryEntries = Array.from(this.InventoryMap.entries());
        for (const [inventoryKey, inventoryNode] of inventoryEntries) {
            if (!inventoryKey.startsWith("箱子物资_")) {
                continue;
            }

            this.InventoryMap.delete(inventoryKey);
            if (inventoryNode?.isValid) {
                inventoryNode.destroy();
            }
        }

        // 清除背包、保险箱等现有库存节点中的旧格子映射。
        const inventoryNodes = Array.from(this.InventoryMap.values());
        for (const inventoryNode of inventoryNodes) {
            const inventory = inventoryNode?.getComponent(ZRSJZ_Inventory);
            if (!inventory) {
                continue;
            }

            for (const propID of affectedPropIDs) {
                const currentProp = ZRSJZ_GameData.Instance.PropData[propID];
                // 成功归仓后的目标格子需要保留；这里只清理局内来源格或已删除道具。
                if (currentProp?.CurInventory === inventory.InventoryType) continue;
                if (inventory.Grids.some(row => row.includes(propID))) {
                    await inventory.RemoveProp(propID);
                }
            }
        }

        // 主界面复用常驻库存节点，结算完成后立即补充“仓库_全部”的新物资。
        const warehouseAll = this.InventoryMap
            .get(ZRSJZ_INVENTORY.仓库_全部)
            ?.getComponent(ZRSJZ_Inventory);
        if (warehouseAll) {
            await warehouseAll.ShowPropItem();
        }
    }

    /** 开始新对局前清除上局可能残留的背包、保险箱数据并重建库存。 */
    public async InitializeBattleInventories(): Promise<void> {
        // UIManager 是常驻节点，玩家独立库存也会跨场景缓存。先等正在创建的
        // 实例结束，再全部销毁，避免新局继续显示上局 Grids 中已经失效的道具 ID。
        const pendingPlayerInventories = Array.from(this._playerInventoryTasks.values());
        await Promise.all(pendingPlayerInventories.map(task => task.catch(() => null)));
        this._playerInventoryTasks.clear();
        for (const inventoryNode of this._playerInventoryMap.values()) {
            if (inventoryNode?.isValid) inventoryNode.destroy();
        }
        this._playerInventoryMap.clear();
        for (const [inventoryKey, inventoryNode] of Array.from(this.InventoryMap.entries())) {
            if (!inventoryKey.startsWith("箱子物资_")) continue;
            this.InventoryMap.delete(inventoryKey);
            if (inventoryNode?.isValid) inventoryNode.destroy();
        }

        const battleInventories = new Set<ZRSJZ_INVENTORY>([
            ZRSJZ_INVENTORY.背包,
            ZRSJZ_INVENTORY.保险箱,
            ZRSJZ_INVENTORY.物资,
        ]);

        for (const propID in ZRSJZ_GameData.Instance.PropData) {
            if (battleInventories.has(ZRSJZ_GameData.Instance.PropData[propID].CurInventory)) {
                delete ZRSJZ_GameData.Instance.PropData[propID];
            }
        }
        for (const playerIndex of [0, 1]) {
            const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs(playerIndex)
                .map(propID => ZRSJZ_GameData.Instance.PropData[propID] ? propID : "");
            const ammoIDs = ZRSJZ_InventoryService.GetAmmoIDs(playerIndex)
                .map(propID => ZRSJZ_GameData.Instance.PropData[propID] ? propID : "");
            if (playerIndex === 1) {
                ZRSJZ_GameData.Instance.Player2WeaponryID = weaponryIDs;
                ZRSJZ_GameData.Instance.Player2AmmoID = ammoIDs;
            } else {
                ZRSJZ_GameData.Instance.WeaponryID = weaponryIDs;
                ZRSJZ_GameData.Instance.AmmoID = ammoIDs;
            }
        }
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        ZRSJZ_GameData.SaveData();

        const [backpackNode, protectorCaseNode] = await Promise.all([
            this.WaitForInventory(ZRSJZ_INVENTORY.背包),
            this.WaitForInventory(ZRSJZ_INVENTORY.保险箱),
        ]);
        await backpackNode.getComponent(ZRSJZ_InventoryBackpack).Init(
            ZRSJZ_INVENTORY.背包,
            ZRSJZ_InventoryService.GetActivePlayerIndex(),
        );
        await protectorCaseNode.getComponent(ZRSJZ_Inventory).Init(ZRSJZ_INVENTORY.保险箱);
    }

    private WaitForInventory(inventoryType: ZRSJZ_INVENTORY): Promise<Node> {
        const inventory = this.InventoryMap.get(inventoryType);
        if (
            inventory?.isValid
            && inventory.getComponent(ZRSJZ_Inventory)?.IsInitialized
        ) {
            return Promise.resolve(inventory);
        }

        return new Promise(resolve => {
            setTimeout(() => resolve(this.WaitForInventory(inventoryType)), 50);
        });
    }


    //目前显示的金币框
    public _curCurrencyUI: Node[] = [];

    public AddCurrency(currency: Node) {
        if (this._curCurrencyUI.includes(currency)) return;
        this._curCurrencyUI.push(currency);
    }

    public RemoveCurrency(currency: Node) {
        if (!this._curCurrencyUI.includes(currency)) return;
        this._curCurrencyUI.splice(this._curCurrencyUI.indexOf(currency), 1);
    }


}


