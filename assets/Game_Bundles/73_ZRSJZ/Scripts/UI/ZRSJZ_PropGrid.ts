import { _decorator, Component, EventTouch, Label, Node, Sprite, SpriteFrame, UIOpacity, v3, Vec2, Vec3, Widget } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PROP_CONFIG, ZRSJZ_GRID_TYPE, ZRSJZ_PropData, ZRSJZ_INVENTORY, ZRSJZ_GRID_SIZE, ZRSJZ_GRID_INTERVAL, ZRSJZ_INVENTORY_CONFIG, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_PropSF } from './ZRSJZ_PropSF';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PropGrid')
export class ZRSJZ_PropGrid extends Component {

    public set CurScale(value: number) {
        this.node.setScale(value, value, 1);
        this.NameLabel.node.setScale(1 / value, 1 / value, 1);
        this.CountLabel.node.setScale(1 / value, 1 / value, 1);
    }

    UIOpacity: UIOpacity = null;
    GridSprite: Sprite = null;
    IconSprite: Sprite = null;
    NameLabel: Label = null;
    CountLabel: Label = null;
    Check: Node = null;
    Checked: Node = null;

    PropID: string = "";
    PropName: string = "";
    PropGridType: ZRSJZ_GRID_TYPE = ZRSJZ_GRID_TYPE._1x1;
    PropData: ZRSJZ_PropData = null;

    private _propGridSF: SpriteFrame = null;
    private _propSF: SpriteFrame = null;
    private _isInit: boolean = false;
    private _touchID: number = -1;
    private _isMove: boolean = false;
    private _isCreatingMove: boolean = false;
    private _dragAxis: number = 0; // 0: 未确定，1: 横向，2: 纵向
    private _touchStartPos: Vec2 = new Vec2();
    private _v_1: Vec2 = new Vec2();
    private _v_2: Vec2 = new Vec2();
    private _propSFNode: Node = null;
    private _gridX: number = -1;
    private _gridY: number = -1;
    private _gridType: string = "";
    private _inventory: ZRSJZ_INVENTORY = ZRSJZ_INVENTORY.仓库_全部;
    private _isSelling: boolean = false;
    private _isSellCheck: boolean = false;
    private _initVersion: number = 0;
    private _gridStyleVersion: number = 0;

    public get GridX(): number {
        return this._gridX;
    }

    public get GridY(): number {
        return this._gridY;
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchCancel, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.ShowGrid, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_MOVE, this.ChangePosByGrid, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_EMPTY_GRID_REMOVE, this.RemoveEmptyProp, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_SHOW, this.SellShow, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_HIDE, this.SellHide, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.OnTouchCancel, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.ShowGrid, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_MOVE, this.ChangePosByGrid, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_EMPTY_GRID_REMOVE, this.RemoveEmptyProp, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_SHOW, this.SellShow, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_HIDE, this.SellHide, this);
    }

    async Init(propID: string, gridX: number = -1, gridY: number = -1, inventory: ZRSJZ_INVENTORY = ZRSJZ_INVENTORY.仓库_全部) {
        const initVersion = ++this._initVersion;
        this._gridStyleVersion++;

        if (!this._isInit) {
            this._isInit = true;
            this.UIOpacity = this.getComponent(UIOpacity);
            this.GridSprite = this.getComponent(Sprite);
            this.IconSprite = this.node.getChildByName("Icon").getComponent(Sprite);
            this.NameLabel = this.node.getChildByName("Name").getComponent(Label);
            this.CountLabel = this.node.getChildByName("Count").getComponent(Label);
            this.Check = this.node.getChildByName("未选");
            this.Checked = this.node.getChildByName("勾选");
        }

        // 对象池节点每次复用时都必须清理上一次道具留下的交互和显示状态。
        this.PropID = propID;
        this.PropName = "";
        this.PropData = null;
        this._gridX = gridX;
        this._gridY = gridY;
        this._inventory = inventory;
        this._gridType = "";
        this._touchID = -1;
        this._isMove = false;
        this._isCreatingMove = false;
        this._dragAxis = 0;
        this._isSelling = false;
        this._isSellCheck = false;
        this._propGridSF = null;
        this._propSF = null;
        this.UIOpacity.opacity = 255;
        this.GridSprite.spriteFrame = null;
        this.IconSprite.spriteFrame = null;
        this.NameLabel.string = "";
        this.CountLabel.string = "";
        this.Check.active = false;
        this.Checked.active = false;

        if (propID == "") {
            this._gridType = "灰";
            const gridSpriteFrame = await ZRSJZ_UIManager.Instance.GetPropGridUI(`空格子_${this._gridType}`);
            if (initVersion !== this._initVersion || this.PropID !== "") return;
            this.GridSprite.spriteFrame = gridSpriteFrame;
            return;
        }
        this.PropData = ZRSJZ_GameData.Instance.PropData[propID];
        if (!this.PropData) return;
        const propName = this.PropData.Name;
        this.PropName = propName;
        if (!ZRSJZ_PROP_CONFIG.has(propName)) {
            console.error("没有装备： ", propName);
            return;
        }

        const equipment = ZRSJZ_PROP_CONFIG.get(propName);
        this.PropGridType = equipment.GridType;
        const propGridSF = await ZRSJZ_UIManager.Instance.GetPropGridUI(equipment.Quality + equipment.GridType);
        if (initVersion !== this._initVersion || this.PropID !== propID) return;
        const propSF = await ZRSJZ_UIManager.Instance.GetPropUI(propName);
        if (initVersion !== this._initVersion || this.PropID !== propID) return;

        this._propGridSF = propGridSF;
        this._propSF = propSF;

        this.GridSprite.spriteFrame = this._propGridSF;
        this.IconSprite.spriteFrame = this._propSF;
        this.NameLabel.string = this.PropName;
        this.CountLabel.string = `x${this.PropData.CurCount}`;

        const iconWidget: Widget = this.IconSprite.getComponent(Widget);
        iconWidget.isAlignHorizontalCenter = true;
        iconWidget.horizontalCenter = 0;
        iconWidget.isAlignVerticalCenter = true;
        iconWidget.verticalCenter = 0;

        const countWidget: Widget = this.CountLabel.getComponent(Widget);
        countWidget.isAlignBottom = true;
        countWidget.bottom = 2;
        countWidget.isAlignRight = true;
        countWidget.right = 5;
    }

    async ShowGrid(inventory: ZRSJZ_INVENTORY, gridX: number = -1, gridY: number = -1, gridType: string = "灰") {
        if (!this._isInit || this.PropID != "" || this.node.active == false) return;
        if (this._inventory == inventory && this._gridType != gridType) {
            if ((this._gridX == gridX && this._gridY == gridY) || (-1 == gridX && -1 == gridY)) {
                this._gridType = gridType;
                const styleVersion = ++this._gridStyleVersion;
                const initVersion = this._initVersion;
                const gridSpriteFrame = await ZRSJZ_UIManager.Instance.GetPropGridUI(`空格子_${gridType}`);
                if (
                    styleVersion !== this._gridStyleVersion
                    || initVersion !== this._initVersion
                    || this.PropID !== ""
                    || this._gridType !== gridType
                ) {
                    return;
                }
                this.GridSprite.spriteFrame = gridSpriteFrame;
            }
        }
    }

    OnTouchStart(event: EventTouch) {
        if (this.PropID == "") return;
        if (this._touchID == -1) {
            this._touchID = event.getID();
            if (this._isSelling) return;
            this._isMove = false;
            this._dragAxis = 0;
            this._touchStartPos.set(event.getUILocation());
            this._v_1.set(event.getUILocation());
            event.propagationStopped = true;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, false);
        }
    }

    OnTouchMove(event: EventTouch) {
        if (this.PropID == "" || this._isSelling) return;
        if (event.getID() == this._touchID) {
            if (!this._isMove && this._dragAxis === 0) {
                const location = event.getUILocation();
                const offsetX = location.x - this._touchStartPos.x;
                const offsetY = location.y - this._touchStartPos.y;

                // 小范围移动视为手指抖动，超过阈值后锁定本次触摸方向。
                // if (offsetY * offsetY > 10) {
                // if (offsetX * offsetX + offsetY * offsetY < 5) {
                //     this._touchID = -1;
                //     ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.道具弹窗, this.PropID);
                //     return;
                // } else
                if (ZRSJZ_Tools.IsSlide(this._inventory)) {

                    if (offsetY * offsetY > offsetX * offsetX) {
                        this._touchID = -1;
                        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, true);
                        return;
                    }
                    if (offsetX * offsetX < 10) return;
                } else if (offsetX * offsetX + offsetY * offsetY < 2) {
                    return;
                }

                this._dragAxis = 1;
                event.propagationStopped = true;
                if (this._dragAxis === 1 && !this._isCreatingMove) {
                    this.PropMove();
                }
            }

            // 长按进入拖动后不再限制方向；否则纵向滑动交给 ScrollView。
            if (!this._isMove && this._dragAxis !== 1) return;

            if (this._isMove && this._propSFNode != null) {
                const curPos = this._propSFNode.worldPosition.clone();
                this._v_2 = event.getUILocation().clone().subtract(this._v_1)
                const targetPos: Vec3 = new Vec3();
                Vec3.lerp(targetPos, this._propSFNode.worldPosition, this._propSFNode.worldPosition.clone().add3f(this._v_2.x, this._v_2.y, 0), 0.3);
                this._propSFNode.setWorldPosition(curPos.add3f(this._v_2.x, this._v_2.y, 0));
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this._inventory, this.PropID, this._propSFNode.worldPosition, false);
            }
            this._v_1.set(event.getUILocation().clone());
        }
    }

    OnTouchEnd(event: EventTouch) {
        if (this.PropID == "") return;
        if (event.getID() == this._touchID) {
            // if (!ZRSJZ_INVENTORY_CONFIG.get(this._inventory)?.IsDilatation) {
            //     event.propagationStopped = true;
            // }
            console.error(11);
            this._touchID = -1;
            if (this._isMove) {
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, true);
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this._inventory, this.PropID, this._propSFNode.worldPosition, true);
                this._isMove = false;
                ZRSJZ_PoolManager.Instance.PutNode(this._propSFNode);
                this._propSFNode = null;
                this.UIOpacity.opacity = 255;
            } else if (this._isSelling) {
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_ADD, this.PropID);
                this._isSellCheck = !this._isSellCheck;
                this.ShowSellButton();
            } else if (!this._isCreatingMove) {
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.道具弹窗, this.PropID);
            }
        }
    }

    OnTouchCancel(event: EventTouch) {
        if (this.PropID == "") return;
        if (event.getID() == this._touchID) {
            // if (!ZRSJZ_INVENTORY_CONFIG.get(this._inventory)?.IsDilatation) {
            //     event.propagationStopped = true;
            // }
            console.error(22);
            this._touchID = -1;
            if (this._isMove) {
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, true);
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP, this._inventory, this.PropID, this._propSFNode.worldPosition, true);
                this._isMove = false;
                ZRSJZ_PoolManager.Instance.PutNode(this._propSFNode);
                this._propSFNode = null;
                this.UIOpacity.opacity = 255;
            }
            // this.node.setWorldPosition(this._startPos);
        }
    }

    async PropMove() {
        // dragAxis=0 为长按触发，dragAxis=1 为横向滑动触发。
        if (this._isCreatingMove || this._dragAxis === 2) return;

        this._isCreatingMove = true;
        const touchID = this._touchID;
        const propSFNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/PropSF");
        this._isCreatingMove = false;

        // 获取对象池节点期间触摸可能已经结束或改为无效状态。
        if (this._touchID !== touchID || this._dragAxis === 2) {
            ZRSJZ_PoolManager.Instance.PutNode(propSFNode);
            return;
        }

        this._isMove = true;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, false);
        this._propSFNode = propSFNode;
        this._propSFNode.active = true;
        this._propSFNode.parent = ZRSJZ_UIManager.Instance.PropParent;
        this._propSFNode.setWorldPosition(this.node.worldPosition.clone());
        this._propSFNode.getComponent(ZRSJZ_PropSF).Init(this.PropID, this._propGridSF, this._propSF);
        this.UIOpacity.opacity = 100;
    }

    async ChangePosByGrid(id: string, inventory: ZRSJZ_INVENTORY, gridX: number, gridY: number, isRemove: boolean = false) {
        if (id == this.PropID) {
            if (isRemove) {
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
                return;
            }
            //同一个库存直接移动
            if (inventory == this._inventory) {
                ZRSJZ_GameData.Instance.ChangePropGridPos(id, inventory == ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1, gridX, gridY);
            } else {

            }
            this._gridX = gridX;
            this._gridY = gridY;
            this.node.setPosition(v3(gridX * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL), -gridY * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL), 0));
        }
    }

    RemoveEmptyProp(inventory: ZRSJZ_INVENTORY, gridX: number, gridY: number) {
        if (this.PropID == "" && inventory == this._inventory && gridX == this._gridX && gridY == this._gridY) {
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
        }
    }

    // 仓库删除空行后，同步当前格子的行号和显示位置。
    RemoveRows(inventory: ZRSJZ_INVENTORY, removedRows: number[]) {
        if (inventory !== this._inventory || this._gridY < 0 || removedRows.length === 0) {
            return;
        }

        if (this.PropID === "" && removedRows.includes(this._gridY)) {
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
            return;
        }

        const moveUpRowCount = removedRows.filter(row => row < this._gridY).length;
        if (moveUpRowCount === 0) {
            return;
        }

        this._gridY -= moveUpRowCount;
        this.node.setPosition(
            this._gridX * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL),
            -this._gridY * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL),
        );
    }

    //开始售卖
    SellShow(inventory: ZRSJZ_INVENTORY) {
        if (this._inventory == inventory && this.PropID != "") {
            this._isSelling = true;
            this._isSellCheck = false;
            this.ShowSellButton();
        }
    }

    //结束售卖
    SellHide(inventory: ZRSJZ_INVENTORY) {
        if (this._inventory == inventory && this.PropID != "") {
            this._isSelling = false;
            this.Check.active = false;
            this.Checked.active = false;
        }
    }

    //显示售卖按钮
    ShowSellButton() {
        this.Check.active = !this._isSellCheck;
        this.Checked.active = this._isSellCheck;
    }

}


