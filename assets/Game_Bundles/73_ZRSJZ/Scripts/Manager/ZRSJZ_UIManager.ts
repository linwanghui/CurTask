import { _decorator, Camera, Canvas, Component, director, EventKeyboard, input, Input, instantiate, KeyCode, Node, Prefab, SpriteFrame, Widget } from 'cc';
import { ZRSJZ_Panel } from '../Panel/ZRSJZ_Panel';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
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
                inventory.getComponent(ZRSJZ_Inventory).Init(ZRSJZ_INVENTORY[key]);
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
        //开启键盘监听
        // Input.on(SystemEvent.EventType.KEY_DOWN, ZRSJZ_UIManager._instance.OnKeyDown, ZRSJZ_UIManager._instance);
        input.on(Input.EventType.KEY_DOWN, ZRSJZ_UIManager._instance.OnKeyDown, ZRSJZ_UIManager._instance);
    }

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
            ZRSJZ_Tools.LoadPrefab(panel).then(prefab => {
                const panelNode = instantiate(prefab);
                this._panelNode.addChild(panelNode);
                panelNode.active = false;
                this._panelMap.set(panelName, panelNode);
                showPanel();
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

    //监听案件p
    OnKeyDown(event: EventKeyboard) {
        if (event.keyCode == KeyCode.KEY_P) {
            this.ShowPanel(ZRSJZ_PANEL.作弊界面);
        }
    }
}


