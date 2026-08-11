import { _decorator, Component, EventTouch, Label, Node, Sprite, SpriteFrame, UITransform, UIOpacity, v3, Vec2, Vec3, Widget } from 'cc';
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
    private _lastTapTime: number = 0;
    private _pendingTapPropID: string = "";
    private _isQuickTransferring: boolean = false;

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
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_CANCEL_PROP_DRAG, this.CancelCurrentDrag, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_PROP_DRAG_ROTATE, this.ChangeDragOrientation, this);
    }

    protected onDisable(): void {
        if (this._isMove || this._isCreatingMove) {
            ZRSJZ_UIManager.Dragging = false;
            ZRSJZ_UIManager.Instance.SetDiscardAreaVisible(false);
        }
        this._touchID = -1;
        this.unschedule(this.ShowPendingPropPanel);
        this._lastTapTime = 0;
        this._pendingTapPropID = "";
        this.node.off(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.OnTouchCancel, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_SHOW, this.ShowGrid, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_GRID_MOVE, this.ChangePosByGrid, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_EMPTY_GRID_REMOVE, this.RemoveEmptyProp, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_SHOW, this.SellShow, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_HIDE, this.SellHide, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_CANCEL_PROP_DRAG, this.CancelCurrentDrag, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_PROP_DRAG_ROTATE, this.ChangeDragOrientation, this);
    }

    async Init(
        propID: string,
        gridX: number = -1,
        gridY: number = -1,
        inventory: ZRSJZ_INVENTORY = ZRSJZ_INVENTORY.仓库_全部,
        useSavedOrientation: boolean = true,
    ) {
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
        this.unschedule(this.ShowPendingPropPanel);
        this._lastTapTime = 0;
        this._pendingTapPropID = "";
        this._isQuickTransferring = false;
        this._propGridSF = null;
        this._propSF = null;
        this.UIOpacity.opacity = 255;
        this.GridSprite.spriteFrame = null;
        this.IconSprite.spriteFrame = null;
        this.NameLabel.string = "";
        this.CountLabel.string = "";
        this.ApplyOrientation(false, 1, 1);
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
        this.ApplySearchLockedState();
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

        const gridIndex = inventory === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
        const isRotate = useSavedOrientation
            && this.SupportsAutoRotation(inventory)
            && this.PropData.GridData[gridIndex]?.IsRotate === true;
        this.ApplyOrientation(isRotate, this.PropData.Width, this.PropData.Height);

        const nameWidget: Widget = this.NameLabel.getComponent(Widget);
        nameWidget.isAlignLeft = true;
        nameWidget.left = 5;
        nameWidget.isAlignRight = true;
        nameWidget.right = 5;
        nameWidget.isAlignTop = true;
        nameWidget.top = 5;

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

        const checkWidget: Widget = this.Check.getComponent(Widget);
        checkWidget.isAlignTop = true;
        checkWidget.top = 0;
        checkWidget.isAlignRight = true;
        checkWidget.right = 0;

        const checkedWidget: Widget = this.Checked.getComponent(Widget);
        checkedWidget.isAlignTop = true;
        checkedWidget.top = -5;
        checkedWidget.isAlignRight = true;
        checkedWidget.right = -6;
    }

    private ApplyOrientation(isRotate: boolean, originalWidth: number, originalHeight: number): void {
        this.GridSprite.sizeMode = Sprite.SizeMode.RAW;
        this.IconSprite.node.setRotationFromEuler(0, 0, 0);
        this.node.setRotationFromEuler(0, 0, isRotate ? -90 : 0);

        // 节点锚点在左上角。顺时针旋转后向右补偿原高度，保持占格左上角不变。
        const baseX = this._gridX * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL);
        const baseY = -this._gridY * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL);
        const rotatedOffsetX = isRotate
            ? originalHeight * ZRSJZ_GRID_SIZE + Math.max(0, originalHeight - 1) * ZRSJZ_GRID_INTERVAL
            : 0;
        this.node.setPosition(baseX + rotatedOffsetX, baseY, this.node.position.z);
    }

    private SupportsAutoRotation(inventory: ZRSJZ_INVENTORY): boolean {
        return String(inventory).startsWith("仓库_")
            || inventory === ZRSJZ_INVENTORY.保险箱
            || inventory === ZRSJZ_INVENTORY.背包
            || inventory === ZRSJZ_INVENTORY.物资;
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
        if (
            ZRSJZ_UIManager.Dragging
            || this.PropID == ""
            || this.IsSearchLocked()
        ) return;
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
        if (this.PropID == "" || this._isSelling || this.IsSearchLocked()) return;
        if (event.getID() == this._touchID) {
            if (!this._isMove && this._dragAxis === 0) {
                const location = event.getUILocation();
                const offsetX = location.x - this._touchStartPos.x;
                const offsetY = location.y - this._touchStartPos.y;

                // 小范围移动视为手指抖动，超过阈值后锁定本次触摸方向。
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
                this._v_2 = event.getUILocation().clone().subtract(this._v_1)
                const targetPos: Vec3 = new Vec3();
                Vec3.lerp(targetPos, this._propSFNode.worldPosition, this._propSFNode.worldPosition.clone().add3f(this._v_2.x, this._v_2.y, 0), 1);
                this._propSFNode.setWorldPosition(targetPos);
                const placementWorldCenter = this._propSFNode.getComponent(ZRSJZ_PropSF)
                    .GetPlacementWorldCenter();
                ZRSJZ_EventManager.EmitPersist(
                    ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP,
                    this._inventory,
                    this.PropID,
                    placementWorldCenter,
                    false,
                );
                ZRSJZ_UIManager.Instance.UpdateDiscardAreaState(placementWorldCenter);
            }
            this._v_1.set(event.getUILocation().clone());
        }
    }

    OnTouchEnd(event: EventTouch) {
        if (this.PropID == "" || this.IsSearchLocked()) return;
        if (event.getID() == this._touchID) {
            this._touchID = -1;
            if (this._isMove) {
                ZRSJZ_UIManager.Dragging = false;
                const worldCenter = this._propSFNode.getComponent(ZRSJZ_PropSF)
                    .GetPlacementWorldCenter();
                const discardHandled = ZRSJZ_UIManager.Instance.TryDiscardDraggedProp(
                    this.PropID,
                    worldCenter,
                );
                ZRSJZ_UIManager.Instance.SetDiscardAreaVisible(false);
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, true);
                if (!discardHandled) {
                    ZRSJZ_EventManager.EmitPersist(
                        ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP,
                        this._inventory,
                        this.PropID,
                        worldCenter,
                        true,
                    );
                }
                this._isMove = false;
                ZRSJZ_PoolManager.Instance.PutNode(this._propSFNode);
                this._propSFNode = null;
                this.UIOpacity.opacity = 255;
            } else if (this._isSelling) {
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP_ADD, this.PropID);
                this._isSellCheck = !this._isSellCheck;
                this.ShowSellButton();
            } else if (!this._isCreatingMove) {
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, true);
                this.HandleTap();
            }
        }
    }

    private HandleTap(): void {
        if (!this.SupportsQuickTransfer()) {
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.道具弹窗, this.PropID);
            return;
        }

        const now = Date.now();
        const isDoubleTap = this._pendingTapPropID === this.PropID
            && now - this._lastTapTime <= 320;
        if (isDoubleTap) {
            this.unschedule(this.ShowPendingPropPanel);
            this._lastTapTime = 0;
            this._pendingTapPropID = "";
            void this.QuickTransfer();
            return;
        }

        this.unschedule(this.ShowPendingPropPanel);
        this._lastTapTime = now;
        this._pendingTapPropID = this.PropID;
        this.scheduleOnce(this.ShowPendingPropPanel, 0.32);
    }

    private readonly ShowPendingPropPanel = (): void => {
        const propID = this._pendingTapPropID;
        this._lastTapTime = 0;
        this._pendingTapPropID = "";
        if (propID && propID === this.PropID && ZRSJZ_GameData.Instance.PropData[propID]) {
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.道具弹窗, propID);
        }
    };

    private SupportsQuickTransfer(): boolean {
        if (this._inventory === ZRSJZ_INVENTORY.物资) return true;
        if (this._inventory !== ZRSJZ_INVENTORY.背包 || !this.PropData) return false;
        return [
            "枪",
            "头盔",
            "防弹衣",
            "背包",
            "刀",
            "房卡",
            "门禁卡",
            "弹药",
        ].includes(this.PropData.PropType);
    }

    private async QuickTransfer(): Promise<void> {
        if (this._isQuickTransferring || !this.PropID) return;
        this._isQuickTransferring = true;
        const propID = this.PropID;
        try {
            await ZRSJZ_UIManager.Instance.QuickTransferProp(this._inventory, propID);
        } finally {
            this._isQuickTransferring = false;
        }
    }

    OnTouchCancel(event: EventTouch) {
        if (this.PropID == "" || this.IsSearchLocked()) return;
        if (event.getID() == this._touchID) {
            this._touchID = -1;
            if (this._isMove) {
                ZRSJZ_UIManager.Dragging = false;
                const worldCenter = this._propSFNode.getComponent(ZRSJZ_PropSF)
                    .GetPlacementWorldCenter();
                const discardHandled = ZRSJZ_UIManager.Instance.TryDiscardDraggedProp(
                    this.PropID,
                    worldCenter,
                );
                ZRSJZ_UIManager.Instance.SetDiscardAreaVisible(false);
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, true);
                if (!discardHandled) {
                    ZRSJZ_EventManager.EmitPersist(
                        ZRSJZ_MyEvent.ZRSJZ_CHECK_PROP,
                        this._inventory,
                        this.PropID,
                        worldCenter,
                        true,
                    );
                }
                this._isMove = false;
                ZRSJZ_PoolManager.Instance.PutNode(this._propSFNode);
                this._propSFNode = null;
                this.UIOpacity.opacity = 255;
            }
        }
    }

    /**
     * 死亡等强制中断场景下取消拖动，不触发落点确认，因此不会移动道具。
     * 异步创建拖动节点尚未完成时，通过使 touchID 失效让 PropMove 自行回收节点。
     */
    public CancelCurrentDrag(): void {
        const wasOperating = this._touchID !== -1 || this._isMove || this._isCreatingMove;
        this._touchID = -1;
        this._dragAxis = 0;
        this._isMove = false;
        ZRSJZ_UIManager.Dragging = false;
        ZRSJZ_UIManager.Instance.SetDiscardAreaVisible(false);

        if (this._propSFNode?.isValid) {
            ZRSJZ_PoolManager.Instance.PutNode(this._propSFNode);
        }
        this._propSFNode = null;
        if (this.UIOpacity) this.UIOpacity.opacity = 255;

        if (wasOperating) {
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, true);
        }
    }

    private ChangeDragOrientation(id: string, isRotate: boolean): void {
        if (
            id !== this.PropID
            || !this._isMove
            || !this._propSFNode?.isValid
            || !this.PropData
        ) {
            return;
        }
        this._propSFNode.getComponent(ZRSJZ_PropSF).SetOrientation(isRotate);
        ZRSJZ_UIManager.Instance.UpdateDiscardAreaState(
            this._propSFNode.getComponent(ZRSJZ_PropSF).GetPlacementWorldCenter(),
        );
    }

    async PropMove() {
        // dragAxis=0 为长按触发，dragAxis=1 为横向滑动触发。
        if (
            this._isCreatingMove
            || this._dragAxis === 2
            || this.IsSearchLocked()
        ) return;

        this._isCreatingMove = true;
        ZRSJZ_UIManager.Dragging = true;
        const touchID = this._touchID;
        let propSFNode: Node;
        try {
            propSFNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/PropSF");
        } catch (error) {
            this._isCreatingMove = false;
            ZRSJZ_UIManager.Dragging = false;
            ZRSJZ_UIManager.Instance.SetDiscardAreaVisible(false);
            throw error;
        }
        this._isCreatingMove = false;

        // 获取对象池节点期间触摸可能已经结束或改为无效状态。
        if (
            this._touchID !== touchID
            || this._dragAxis === 2
            || this.IsSearchLocked()
        ) {
            ZRSJZ_UIManager.Dragging = false;
            ZRSJZ_UIManager.Instance.SetDiscardAreaVisible(false);
            ZRSJZ_PoolManager.Instance.PutNode(propSFNode);
            return;
        }

        this._isMove = true;
        ZRSJZ_UIManager.Instance.SetDiscardAreaVisible(true);
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, false);
        this._propSFNode = propSFNode;
        this._propSFNode.active = true;
        const logicalGridWorldPosition = this.node.parent.getComponent(UITransform).convertToWorldSpaceAR(v3(
            this._gridX * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL),
            -this._gridY * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL),
            0,
        ));
        this._propSFNode.parent = ZRSJZ_UIManager.Instance.PropParent;
        this._propSFNode.setWorldPosition(logicalGridWorldPosition);
        const gridIndex = this._inventory === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
        const isRotate = this.SupportsAutoRotation(this._inventory)
            && this.PropData.GridData[gridIndex]?.IsRotate === true;
        this._propSFNode.getComponent(ZRSJZ_PropSF).Init(
            this.PropID,
            this._propGridSF,
            this._propSF,
            isRotate,
        );
        ZRSJZ_UIManager.Instance.UpdateDiscardAreaState(
            this._propSFNode.getComponent(ZRSJZ_PropSF).GetPlacementWorldCenter(),
        );
        this.UIOpacity.opacity = 100;
    }

    public SetSearchLocked(locked: boolean): void {
        if (this.PropData) {
            this.PropData.IsSearchLocked = locked;
        }
        this.ApplySearchLockedState();
    }

    private IsSearchLocked(): boolean {
        return this.PropData?.IsSearchLocked === true;
    }

    private ApplySearchLockedState(): void {
        if (!this.UIOpacity) {
            return;
        }
        this.UIOpacity.opacity = this.IsSearchLocked() ? 0 : 255;
        if (this.IsSearchLocked()) {
            this._touchID = -1;
            this._dragAxis = 0;
        }
    }

    async ChangePosByGrid(id: string, inventory: ZRSJZ_INVENTORY, gridX: number, gridY: number, isRotate: boolean = false, isRemove: boolean = false) {
        if (id == this.PropID) {
            if (isRemove) {
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
                return;
            }
            //同一个库存直接移动
            if (inventory == this._inventory) {
                ZRSJZ_GameData.Instance.ChangePropGridPos(id, inventory == ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1, gridX, gridY, isRotate);
            } else {

            }
            this._gridX = gridX;
            this._gridY = gridY;
            this.node.setPosition(v3(gridX * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL), -gridY * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL), 0));
            if (this.PropData) {
                this.ApplyOrientation(isRotate && this.SupportsAutoRotation(inventory), this.PropData.Width, this.PropData.Height);
            }
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
        if (this.PropData) {
            const gridIndex = this._inventory === ZRSJZ_INVENTORY.仓库_全部 ? 0 : 1;
            const isRotate = this.SupportsAutoRotation(this._inventory)
                && this.PropData.GridData[gridIndex]?.IsRotate === true;
            this.ApplyOrientation(isRotate, this.PropData.Width, this.PropData.Height);
        }
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


