import { _decorator, Camera, Canvas, Component, director, EventKeyboard, input, Input, instantiate, KeyCode, Node, Prefab, SpriteFrame, Widget } from 'cc';
import { ZRSJZ_Panel } from '../Panel/ZRSJZ_Panel';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryAmmo } from '../UI/ZRSJZ_InventoryAmmo';
import { ZRSJZ_PoolManager } from './ZRSJZ_PoolManager';
import { ZRSJZ_CurrencyEffect } from '../UI/ZRSJZ_CurrencyEffect';
import { ZRSJZ_InventoryBackpack } from '../UI/ZRSJZ_InventoryBackpack';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_UIManager')
export class ZRSJZ_UIManager extends Component {

    private static _instance: ZRSJZ_UIManager = null;
    public static get Instance(): ZRSJZ_UIManager {
        if (!ZRSJZ_UIManager._instance) {
            ZRSJZ_UIManager.Init();
            ZRSJZ_UIManager.InitEvent();
            ZRSJZ_UIManager.InitUI();
            ZRSJZ_UIManager.InitInventory();
        }
        return ZRSJZ_UIManager._instance;
    }

    PropParent: Node = null;
    PropGridSFMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    PropSFMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    InventoryMap: Map<string, Node> = new Map<string, Node>();

    private _panelNode: Node = null;
    private _panelMap: Map<string, Node> = new Map<string, Node>();
    private _curPanel: string[] = [];

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
        uiiCamera.priority = 1;
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
                if (weaponry.includes(ZRSJZ_INVENTORY[key])) continue;
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

    public static InitEvent() {
    }

    //#region UI展示
    //展示面板
    public ShowPanel(panel: string, ...args: any[]) {
        const panelName = panel.split('/').pop() || panel;
        if (this._curPanel.includes(panelName)) return;//当前面板显示中
        this._curPanel.push(panelName);

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
            BundleManager.GetBundle(panel.split('/')[0]).load(resPath, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error(`加载 Bundle: 73_ZRSJZ Prefab 加载失败 Path: ${resPath}`);
                } else {
                    const panelNode = instantiate(prefab);
                    this._panelNode.addChild(panelNode);
                    panelNode.active = false;
                    this._panelMap.set(panelName, panelNode);
                    showPanel();
                }
            });
            return;
        }

        showPanel();
    }

    //隐藏面板
    public HidePanel(panel: string, ...args: any[]) {
        const panelName = panel.split('/').pop() || panel;
        if (!this._curPanel.includes(panelName)) return;//面板未显示
        this._curPanel.splice(this._curPanel.indexOf(panelName), 1);

        if (!this._panelMap.has(panelName)) return;
        this._panelMap.get(panelName).getComponent(ZRSJZ_Panel).Hide(...args);
    }

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

    //重新初始化背包
    public async ReloadBackpack() {
        ZRSJZ_GameData.Instance.ReloadPropData();
        const backpack = await this.GetInventory(ZRSJZ_INVENTORY.背包);
        backpack.getComponent(ZRSJZ_InventoryBackpack).Init();
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

    public async ShowCurrencyEffect() {
        if (this._curCurrencyUI.length <= 0) {
            console.error("没有显示的金币框！");
            return;
        }
        const effect: Node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/货币特效");
        effect.parent = this.node;
        effect.active = true;
        effect.getComponent(ZRSJZ_CurrencyEffect).Show(this._curCurrencyUI[this._curCurrencyUI.length - 1].getWorldPosition().clone())
    }

}


