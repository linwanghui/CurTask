import { _decorator, AudioClip, Camera, Canvas, Component, director, EventKeyboard, input, Input, instantiate, KeyCode, Node, Prefab, SpriteFrame, Texture2D, Widget } from 'cc';
import { ZRSJZ_Panel } from '../Panel/ZRSJZ_Panel';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryAmmo } from '../UI/ZRSJZ_InventoryAmmo';
import { ZRSJZ_PoolManager } from './ZRSJZ_PoolManager';
import { ZRSJZ_CurrencyEffect } from '../Effect/ZRSJZ_CurrencyEffect';
import { ZRSJZ_InventoryBackpack } from '../UI/ZRSJZ_InventoryBackpack';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_AudioManager } from './ZRSJZ_AudioManager';
import { ZRSJZ_Tip } from '../UI/ZRSJZ_Tip';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './ZRSJZ_EventManager';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_UIManager')
export class ZRSJZ_UIManager extends Component {
    public static ZRSJZ_DLC: boolean = false;
    public static Dragging: boolean = false;//是否正在拖动道具
    public static IsBattle: boolean = false;//是否正在战斗界面

    private static _instance: ZRSJZ_UIManager = null;
    public static get Instance(): ZRSJZ_UIManager {
        if (!ZRSJZ_UIManager._instance) {
            ZRSJZ_UIManager.Init();
            ZRSJZ_UIManager.InitDLC();
            ZRSJZ_UIManager.InitAudio();
            ZRSJZ_UIManager.InitUI();
            ZRSJZ_UIManager.InitInventory();
        }
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

    private _panelNode: Node = null;
    private _panelMap: Map<string, Node> = new Map<string, Node>();
    private _curPanel: string[] = [];
    /** 关闭全部弹窗时递增，使之前尚未完成的异步加载不再自动显示。 */
    private _panelRequestVersion: number = 0;
    private _finishGameInventoryPromise: Promise<void> = null;

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
        //初始话格子UI
        ZRSJZ_Tools.LoadSprites("Sprites/格子").then((sfs: SpriteFrame[]) => sfs.forEach(sf => ZRSJZ_UIManager._instance.PropGridSFMap.set(sf.name, sf)));
        //初始化道具UI
        ZRSJZ_Tools.LoadSprites("Sprites/Prop").then((sfs: SpriteFrame[]) => sfs.forEach(sf => ZRSJZ_UIManager._instance.PropSFMap.set(sf.name, sf)));
        //初始化皮肤Icon
        ZRSJZ_Tools.LoadSprites("Sprites/小地图/Icon").then((sfs: SpriteFrame[]) => sfs.forEach(sf => ZRSJZ_UIManager._instance.HeroIconSFMap.set(sf.name, sf)));
        //初始化武器UI
        ZRSJZ_Tools.LoadSprites("Sprites/Weaponry").then((sfs: SpriteFrame[]) => sfs.forEach(sf => ZRSJZ_UIManager._instance.WeaponryTextureMap.set(sf.name, sf.texture as Texture2D)));
        //初始化箱子
        ZRSJZ_Tools.LoadSprites("Sprites/箱子").then((sfs: SpriteFrame[]) => sfs.forEach(sf => ZRSJZ_UIManager._instance.BoxSFMap.set(sf.name, sf)));
        //初始化角色皮肤
        ZRSJZ_Tools.LoadSprites("Sprites/角色界面/Icon").then((sfs: SpriteFrame[]) => sfs.forEach(sf => ZRSJZ_UIManager._instance.RoleSkinIconSFMap.set(sf.name, sf)));
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

    //隐藏面板
    public HidePanel(panel: string, ...args: any[]) {
        if (ZRSJZ_UIManager.Dragging) return;
        const panelName = panel.split('/').pop() || panel;
        if (!this._curPanel.includes(panelName)) return;//面板未显示
        this._curPanel.splice(this._curPanel.indexOf(panelName), 1);

        if (!this._panelMap.has(panelName)) return;
        this._panelMap.get(panelName).getComponent(ZRSJZ_Panel).Hide(...args);
    }

    /**
     * 玩家死亡前统一终止 UI 操作并立即关闭全部弹窗。
     * 这里不走 HidePanel，避免拖动锁和关闭动画阻止死亡弹窗显示。
     */
    public PrepareForDeath(): void {
        this.CloseAllPanelsImmediately();
    }

    /**
     * 立即关闭所有已打开和正在异步加载的弹窗，可选择保留一个最高优先级面板。
     */
    private CloseAllPanelsImmediately(excludedPanelName: string = ""): void {
        this._panelRequestVersion++;

        // 先取消拖动，归还跟随手指的临时道具节点，并恢复滚动等交互状态。
        ZRSJZ_UIManager.Dragging = false;
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
    }

    //展示提示
    public async ShowTip(tip: string) {
        const tipNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/Tip")
        tipNode.parent = this.node;
        tipNode.active = true;
        tipNode.getComponent(ZRSJZ_Tip).Show(tip);
    }

    //展示获取金币特效
    public async ShowCurrencyEffect() {
        if (this._curCurrencyUI.length <= 0) {
            console.error("没有显示的金币框！");
            return;
        }
        const effect: Node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/货币特效");
        effect.parent = this.node;
        effect.active = true;
        effect.getComponent(ZRSJZ_CurrencyEffect).Show(this._curCurrencyUI[this._curCurrencyUI.length - 1].getWorldPosition().clone())
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
                BundleManager.GetBundle("73_ZRSJZ").load(`Sprites/角色界面/Icon/${SkinName}/spriteFrame`, SpriteFrame, (err: any, sf: SpriteFrame) => {
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
    public GetInventory(inventoryName: string): Promise<Node> {
        if (this.InventoryMap.size === 0) {
            return new Promise(resolve => {
                setTimeout(async () => {
                    resolve(await this.GetInventory(inventoryName));
                }, 100);
            });
        }

        if (!this.InventoryMap.has(inventoryName)) {
            console.error("没找到仓库:", inventoryName);
            return null;
        }
        return Promise.resolve(this.InventoryMap.get(inventoryName));
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

            const warehouse = ZRSJZ_Tools.GetInventoryByPropType(propData.PropType);
            if (!warehouse) {
                console.warn(`[ZRSJZ_UIManager] 道具无法转入仓库: ${propData.Name}`);
                delete ZRSJZ_GameData.Instance.PropData[propID];
                continue;
            }

            propData.CurInventory = warehouse;
            propData.SourceBoxID = "";
            propData.IsSearchLocked = false;
            propData.GridData?.forEach(gridData => {
                gridData.GridX = -1;
                gridData.GridY = -1;
            });
        }

        if (!isEvacuationSuccess) {
            const knifeIndex = 4;
            for (let index = 0; index < ZRSJZ_GameData.Instance.WeaponryID.length; index++) {
                if (index === knifeIndex) continue;

                const equipmentID = ZRSJZ_GameData.Instance.WeaponryID[index];
                ZRSJZ_GameData.Instance.WeaponryID[index] = "";
                if (!equipmentID) continue;

                affectedPropIDs.add(equipmentID);
                delete ZRSJZ_GameData.Instance.PropData[equipmentID];
            }

            for (const ammoID of ZRSJZ_GameData.Instance.AmmoID) {
                if (!ammoID) continue;
                affectedPropIDs.add(ammoID);
                delete ZRSJZ_GameData.Instance.PropData[ammoID];
            }
            ZRSJZ_GameData.Instance.AmmoID = ["", "", "", "", "", ""];

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
            ZRSJZ_GameData.Instance.RoomCard = ["", "", ""];
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
        const battleInventories = new Set<ZRSJZ_INVENTORY>([
            ZRSJZ_INVENTORY.背包,
            ZRSJZ_INVENTORY.保险箱,
        ]);

        for (const propID in ZRSJZ_GameData.Instance.PropData) {
            if (battleInventories.has(ZRSJZ_GameData.Instance.PropData[propID].CurInventory)) {
                delete ZRSJZ_GameData.Instance.PropData[propID];
            }
        }
        ZRSJZ_GameData.Instance.WeaponryID = ZRSJZ_GameData.Instance.WeaponryID
            .map(propID => ZRSJZ_GameData.Instance.PropData[propID] ? propID : "");
        ZRSJZ_GameData.Instance.AmmoID = ZRSJZ_GameData.Instance.AmmoID
            .map(propID => ZRSJZ_GameData.Instance.PropData[propID] ? propID : "");
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        ZRSJZ_GameData.SaveData();

        const [backpackNode, protectorCaseNode] = await Promise.all([
            this.WaitForInventory(ZRSJZ_INVENTORY.背包),
            this.WaitForInventory(ZRSJZ_INVENTORY.保险箱),
        ]);
        await backpackNode.getComponent(ZRSJZ_InventoryBackpack).Init();
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


