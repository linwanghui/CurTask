import {
    _decorator,
    EventTouch,
    find,
    Label,
    Mask,
    Node,
    ScrollView,
    Sprite,
    SpriteFrame,
    UIOpacity,
    UITransform,
} from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_Prepare } from '../UI/ZRSJZ_Prepare';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import {
    ZRSJZ_GRID_INTERVAL,
    ZRSJZ_GRID_SIZE,
    ZRSJZ_INVENTORY,
    ZRSJZ_INVENTORY_CONFIG,
    ZRSJZ_PANEL,
    ZRSJZ_PROP_CONFIG,
} from '../ZRSJZ_Constant';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_BoxInventory } from '../UI/ZRSJZ_BoxInventory';
import { ZRSJZ_PropGrid } from '../UI/ZRSJZ_PropGrid';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_SearchPropEffect } from '../Effect/ZRSJZ_SearchPropEffect';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

type ZRSJZ_SearchReservation = {
    goods: ZRSJZ_BoxInventory,
    token: string,
    gridX: number,
    gridY: number,
    width: number,
    height: number,
};

@ccclass('ZRSJZ_GoodsPanel')
export class ZRSJZ_GoodsPanel extends ZRSJZ_Panel {
    @property({ displayName: '每件物资搜索时间（秒）', min: 0.05 })
    SearchInterval: number = 0.5;

    @property(SpriteFrame)
    DiscardSFs: SpriteFrame[] = [];

    Prepare: ZRSJZ_Prepare = null;
    BackpackContent: Node = null;
    GoodsContent: Node = null;
    public ScrollView: ScrollView = null;
    public GoodsScrollView: ScrollView = null;
    private _totalValue: Label = null;
    private _discardArea: Node = null;
    private _discardSprite: Sprite = null;
    private _isOrganizing: boolean = false;

    private _revealSerial: number = 0;
    private _arrayInventorySerial: number = 0;
    private _revealCallback: () => void = null;
    private _activeGoodsInventory: ZRSJZ_BoxInventory = null;
    private _arrayGoodsInventory: ZRSJZ_BoxInventory = null;
    private readonly _searchPlaceholders: Array<Node | null> = [];
    private readonly _searchReservations = new Map<Node, ZRSJZ_SearchReservation>();

    protected onLoad(): void {
        this.Prepare = find("Panel/备战", this.node).getComponent(ZRSJZ_Prepare);
        this.BackpackContent = find("Panel/背包/View/Content", this.node);
        this.ScrollView = find("Panel/背包", this.node).getComponent(ScrollView);
        this._totalValue = find("Panel/武器装备/背包总价值/Count", this.node).getComponent(Label);
        this._discardArea = find("Panel/丢弃范围", this.node);
        this._discardSprite = find("Panel/丢弃范围", this.node).getComponent(Sprite);
        this.GoodsContent = this.EnsureGoodsContent();
    }

    protected onEnable(): void {
        this.Prepare.Show(true);
        this.ShowBackpack();
        this.RefreshTotalValue();
        ZRSJZ_UIManager.Instance.RegisterDiscardArea(this._discardArea, this.DiscardSFs);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshTotalValue, this);
    }

    protected onDisable(): void {
        if (this._discardArea) this._discardArea.active = false;
        ZRSJZ_UIManager.Instance.UnregisterDiscardArea(this._discardArea);
        this.CancelReveal();
        if (this._activeGoodsInventory?.node?.isValid) {
            this._activeGoodsInventory.node.active = false;
        }
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshTotalValue, this);
    }

    Show(...args: any[]): void {
        super.Show();

        const source = args[0];
        const box = source instanceof ZRSJZ_Box ? source : null;
        // 防止其他入口直接打开物资弹窗而绕过密码验证。
        if (box?.RequiresPassword() && !box.IsPasswordUnlocked()) {
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.物资弹窗, () => {
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.密码箱弹窗, box);
            });
            return;
        }
        const props = Array.isArray(source)
            ? source.filter(propName => typeof propName === 'string')
            : [];
        box?.Open();
        const interval = typeof args[1] === 'number'
            ? Math.max(0.05, args[1])
            : Math.max(0.05, this.SearchInterval);
        this.StartReveal(props, interval, box);
    }

    async OnButtonClick(event: EventTouch): Promise<void> {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.物资弹窗);
                break;
            case "整理背包":
                await this.OrganizeBackpack();
                break;
        }
    }

    private async OrganizeBackpack(): Promise<void> {
        if (this._isOrganizing) return;
        this._isOrganizing = true;
        try {
            const backpackNode = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.背包);
            const organized = await backpackNode?.getComponent(ZRSJZ_Inventory)?.AutoOrganize();
            if (!organized) {
                await ZRSJZ_UIManager.Instance.ShowTip("背包整理失败");
            }
        } finally {
            this._isOrganizing = false;
        }
    }

    PropMove(move: boolean) {
        this.ScrollView.enabled = move;
        if (this.GoodsScrollView) {
            this.GoodsScrollView.enabled = move;
        }
    }

    private RefreshTotalValue(): void {
        const totalValue = ZRSJZ_GameData.Instance.GetInventoryTotalValue([
            ZRSJZ_INVENTORY.背包,
            ZRSJZ_INVENTORY.保险箱,
        ]);
        this._totalValue.string = `${totalValue}`;
    }

    async ShowBackpack(): Promise<ZRSJZ_Inventory> {
        const backpack = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.背包);
        backpack.parent = this.BackpackContent;
        backpack.setPosition(0, 0, 0);
        backpack.active = true;
        return backpack.getComponent(ZRSJZ_Inventory);
    }

    private async StartReveal(
        propNames: string[],
        interval: number,
        box: ZRSJZ_Box = null,
    ): Promise<void> {
        this.CancelReveal();

        const serial = this._revealSerial;
        const goods = await this.ShowGoods(box);
        if (serial !== this._revealSerial || !this.node.activeInHierarchy || !goods) {
            return;
        }
        if (propNames.length === 0 && !box?.HasUnclaimedLoot()) {
            return;
        }

        const pendingProps = box
            ? Array.from(box.GetUnclaimedLootProps())
            : propNames.slice();
        await this.ShowSearchPlaceholders(goods, pendingProps, serial);
        if (serial !== this._revealSerial || !this.node.activeInHierarchy) {
            return;
        }

        let index = 0;
        const revealNext = (): void => {
            this._revealCallback = null;
            if (serial !== this._revealSerial || !this.node.activeInHierarchy) {
                return;
            }
            if (!box && index >= propNames.length) {
                return;
            }

            const propName = box ? box.TakeNextLootProp() : propNames[index++];
            if (!propName) {
                return;
            }
            const placeholder = this._searchPlaceholders.shift() ?? null;
            const propConfig = ZRSJZ_PROP_CONFIG.get(propName);
            if (!propConfig) {
                console.warn(`[ZRSJZ_GoodsPanel] 未找到道具配置: ${propName}`);
                this.ReleaseSearchPlaceholder(placeholder);
                if (box?.HasUnclaimedLoot() || index < propNames.length) {
                    this.ScheduleNextReveal(revealNext, 0.05);
                }
                return;
            }

            const count = propConfig.PropType === "弹药" ? propConfig.MaxCount : 1;
            const propID = ZRSJZ_GameData.Instance.AddPropByName(propName, count);
            const propData = ZRSJZ_GameData.Instance.PropData[propID];
            propData.SourceBoxID = goods.BoxID;
            propData.IsSearchLocked = true;
            const placeholderGrid = this.GetPlaceholderGrid(placeholder);
            this.ClearSearchReservation(placeholder);
            if (placeholderGrid) {
                while (goods.Grids.length < placeholderGrid.y + propData.Height) {
                    goods.Grids.push(goods.GetEmptyRow());
                }
            }
            const usePlaceholderGrid = placeholderGrid
                && goods.CanPlace(
                    placeholderGrid.x,
                    placeholderGrid.y,
                    propData.Width,
                    propData.Height,
                );
            ZRSJZ_GameData.Instance.MovePropToInventory(
                propID,
                ZRSJZ_INVENTORY.物资,
                1,
                usePlaceholderGrid ? placeholderGrid.x : -1,
                usePlaceholderGrid ? placeholderGrid.y : -1,
            );
            ZRSJZ_GameData.SaveData();

            const showProp = usePlaceholderGrid
                ? goods.OccupyGrid(
                    propID,
                    placeholderGrid.x,
                    placeholderGrid.y,
                    propData.Width,
                    propData.Height,
                ).then(() => goods.ShowPropItem())
                : goods.ShowPropItem();

            showProp
                .then(async () => {
                    this.RefreshGoodsContentSize(goods.node);
                    // ShowPropItem 扩容时会在末尾新建空白格子，需把尚未搜索的
                    // 占位图重新提到最上层，避免被这些空白格子覆盖。
                    this.BringSearchPlaceholdersToFront();
                    const propNode = goods.node.children.find(child =>
                        child.getComponent(ZRSJZ_PropGrid)?.PropID === propID
                    );
                    if (propNode) {
                        const propGrid = propNode.getComponent(ZRSJZ_PropGrid);
                        propGrid.SetSearchLocked(true);
                        await this.PlaySearchEffect(
                            propNode,
                            propName,
                            interval,
                            placeholder,
                        );
                        propGrid.SetSearchLocked(false);
                        ZRSJZ_GameData.SaveData();
                    } else {
                        ZRSJZ_GameData.Instance.PropData[propID].IsSearchLocked = false;
                        ZRSJZ_GameData.SaveData();
                        this.ReleaseSearchPlaceholder(placeholder);
                    }
                })
                .catch(error => {
                    const propData = ZRSJZ_GameData.Instance.PropData[propID];
                    if (propData) {
                        propData.IsSearchLocked = false;
                        ZRSJZ_GameData.SaveData();
                    }
                    console.error(`[ZRSJZ_GoodsPanel] 显示搜索道具失败: ${propName}`, error);
                })
                .finally(() => {
                    if (
                        serial === this._revealSerial
                        && this.node.activeInHierarchy
                        && (box?.HasUnclaimedLoot() || index < propNames.length)
                    ) {
                        this.ScheduleNextReveal(revealNext, 0.05);
                    }
                });
        };

        this.ScheduleNextReveal(revealNext, 0.05);
    }

    /** 使用占位图预先确定的格子，避免前方物资取走后新物资自动向前补位。 */
    private GetPlaceholderGrid(placeholder: Node): { x: number, y: number } | null {
        if (!placeholder?.isValid) return null;

        const step = ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL;
        return {
            x: Math.round(placeholder.position.x / step),
            y: Math.round(-placeholder.position.y / step),
        };
    }

    private ScheduleNextReveal(callback: () => void, interval: number): void {
        this._revealCallback = callback;
        this.scheduleOnce(callback, interval);
    }

    private CancelReveal(): void {
        this._revealSerial++;
        this.ClearSearchPlaceholders();
        if (this._revealCallback) {
            this.unschedule(this._revealCallback);
            this._revealCallback = null;
        }
    }

    private async ShowGoods(box: ZRSJZ_Box): Promise<ZRSJZ_BoxInventory> {
        let inventory: ZRSJZ_BoxInventory;
        if (box) {
            inventory = await box.GetBoxInventory();
        } else {
            this._arrayGoodsInventory?.Dispose();
            this._arrayGoodsInventory = await ZRSJZ_BoxInventory.Create(
                `GoodsPanel_Array_${++this._arrayInventorySerial}`,
            );
            inventory = this._arrayGoodsInventory;
        }

        if (
            this._activeGoodsInventory
            && this._activeGoodsInventory !== inventory
            && this._activeGoodsInventory.node?.isValid
        ) {
            this._activeGoodsInventory.node.active = false;
        }
        this._activeGoodsInventory = inventory;

        const goods = inventory.node;
        goods.parent = this.GoodsContent;
        goods.setPosition(0, 0, 0);
        goods.active = true;
        await inventory.ShowPropItem();

        const transform = goods.getComponent(UITransform);
        const contentTransform = this.GoodsContent.getComponent(UITransform);
        if (transform && contentTransform) {
            transform.width = contentTransform.width;
            this.RefreshGoodsContentSize(goods);
        }
        return inventory;
    }

    private RefreshGoodsContentSize(goods: Node): void {
        const goodsTransform = goods?.getComponent(UITransform);
        const contentTransform = this.GoodsContent?.getComponent(UITransform);
        if (goodsTransform && contentTransform) {
            contentTransform.height = Math.max(866, goodsTransform.height);
        }
    }

    private async PlaySearchEffect(
        propNode: Node,
        propName: string,
        duration: number,
        placeholder: Node = null,
    ): Promise<void> {
        const propOpacity = propNode.getComponent(UIOpacity)
            ?? propNode.addComponent(UIOpacity);
        propOpacity.opacity = 0;
        let effectNode: Node = null;

        try {
            effectNode = await ZRSJZ_PoolManager.Instance.GetNode(
                "Prefabs/Effect/SearchPropEffect",
            );
            if (!effectNode || !propNode?.isValid) {
                propOpacity.opacity = 255;
                return;
            }

            effectNode.parent = propNode.parent;
            effectNode.setPosition(propNode.position);
            effectNode.active = true;
            this.BringSearchPlaceholdersToFront();
            effectNode.setSiblingIndex(effectNode.parent.children.length - 1);
            this.ReleaseSearchPlaceholder(placeholder);
            placeholder = null;
            const effect = effectNode.getComponent(ZRSJZ_SearchPropEffect);
            if (!effect) {
                propOpacity.opacity = 255;
                return;
            }
            await effect.Play(propNode, propName, duration);
        } catch (error) {
            if (propNode?.isValid) {
                propOpacity.opacity = 255;
            }
            throw error;
        } finally {
            this.ReleaseSearchPlaceholder(placeholder);
            if (effectNode?.isValid) {
                ZRSJZ_PoolManager.Instance.PutNode(effectNode);
            }
        }
    }

    /**
     * 按库存相同的从左到右、从上到下规则，预先摆放尚未揭示的开箱图片。
     * 占位节点会同时在 Grids 中写入临时标记，使未搜索和正在搜索的位置不可放置。
     */
    private async ShowSearchPlaceholders(
        goods: ZRSJZ_BoxInventory,
        propNames: readonly string[],
        serial: number,
    ): Promise<void> {
        this.ClearSearchPlaceholders();
        const grids = goods.Grids.map(row => row.slice());
        const colCount = goods.InventoryConfig.Col;
        const step = ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL;
        const emptyRow = (): string[] => Array(colCount).fill("");
        const reservations: Array<(ZRSJZ_SearchReservation & { propName: string }) | null> = [];
        const clearPlannedReservations = (): void => {
            for (const reservation of reservations) {
                if (reservation) this.ClearSearchReservationData(reservation);
            }
        };

        for (let index = 0; index < propNames.length; index++) {
            if (serial !== this._revealSerial || !this.node.activeInHierarchy) {
                clearPlannedReservations();
                return;
            }

            const propName = propNames[index];
            const gridType = ZRSJZ_PROP_CONFIG.get(propName)?.GridType;
            if (!gridType) {
                reservations.push(null);
                continue;
            }
            const [height, width] = gridType.split("_").map(Number);
            let gridX = -1;
            let gridY = -1;

            while (gridY < 0) {
                for (let y = 0; y < grids.length && gridY < 0; y++) {
                    for (let x = 0; x <= colCount - width; x++) {
                        let canPlace = true;
                        for (let row = y; row < y + height && canPlace; row++) {
                            if (!grids[row]) {
                                canPlace = false;
                                break;
                            }
                            for (let col = x; col < x + width; col++) {
                                if (grids[row][col] !== "") {
                                    canPlace = false;
                                    break;
                                }
                            }
                        }
                        if (canPlace) {
                            gridX = x;
                            gridY = y;
                            break;
                        }
                    }
                }
                if (gridY < 0) {
                    grids.push(emptyRow());
                }
            }

            while (grids.length < gridY + height + 3) {
                grids.push(emptyRow());
            }
            while (goods.Grids.length < grids.length) {
                goods.Grids.push(goods.GetEmptyRow());
            }
            const token = `__search_locked_${serial}_${index}`;
            for (let row = gridY; row < gridY + height; row++) {
                for (let col = gridX; col < gridX + width; col++) {
                    grids[row][col] = token;
                    goods.Grids[row][col] = token;
                }
            }

            reservations.push({
                goods,
                token,
                gridX,
                gridY,
                width,
                height,
                propName,
            });
        }

        for (const reservation of reservations) {
            if (!reservation) {
                this._searchPlaceholders.push(null);
                continue;
            }

            const placeholder = await ZRSJZ_PoolManager.Instance.GetNode(
                "Prefabs/Effect/SearchPropEffect",
            );
            if (
                !placeholder
                || serial !== this._revealSerial
                || !goods.node?.isValid
            ) {
                this.ReleaseSearchPlaceholder(placeholder);
                this.ClearSearchPlaceholders();
                clearPlannedReservations();
                return;
            }

            placeholder.parent = goods.node;
            placeholder.setPosition(
                reservation.gridX * step,
                -reservation.gridY * step,
                0,
            );
            placeholder.active = true;
            this._searchReservations.set(placeholder, reservation);
            await placeholder
                .getComponent(ZRSJZ_SearchPropEffect)
                ?.ShowPlaceholder(reservation.propName);
            if (serial !== this._revealSerial) {
                this.ReleaseSearchPlaceholder(placeholder);
                this.ClearSearchPlaceholders();
                clearPlannedReservations();
                return;
            }
            this._searchPlaceholders.push(placeholder);
            placeholder.setSiblingIndex(placeholder.parent.children.length - 1);
        }

        const goodsTransform = goods.node.getComponent(UITransform);
        if (goodsTransform) {
            goodsTransform.height = Math.max(goodsTransform.height, grids.length * step);
            this.RefreshGoodsContentSize(goods.node);
        }
    }

    private ClearSearchPlaceholders(): void {
        const placeholders = this._searchPlaceholders.splice(0);
        placeholders.forEach(node => this.ReleaseSearchPlaceholder(node));

        for (const [node] of Array.from(this._searchReservations.entries())) {
            this.ReleaseSearchPlaceholder(node);
        }
    }

    private BringSearchPlaceholdersToFront(): void {
        for (const placeholder of this._searchPlaceholders) {
            if (placeholder?.isValid && placeholder.parent) {
                placeholder.setSiblingIndex(placeholder.parent.children.length - 1);
            }
        }
    }

    private ReleaseSearchPlaceholder(node: Node): void {
        this.ClearSearchReservation(node);
        if (node?.isValid) {
            ZRSJZ_PoolManager.Instance.PutNode(node);
        }
    }

    private ClearSearchReservation(node: Node): void {
        if (!node) return;
        const reservation = this._searchReservations.get(node);
        if (!reservation) return;

        this._searchReservations.delete(node);
        this.ClearSearchReservationData(reservation);
    }

    private ClearSearchReservationData(reservation: ZRSJZ_SearchReservation): void {
        const { goods, token, gridX, gridY, width, height } = reservation;
        for (let row = gridY; row < gridY + height; row++) {
            for (let col = gridX; col < gridX + width; col++) {
                if (goods.Grids[row]?.[col] === token) {
                    goods.Grids[row][col] = "";
                }
            }
        }
    }

    /**
     * 兼容旧版物资弹窗：预制体没有“物资”区域时，在中间空白位置创建。
     * 后续若在预制体中手动添加 Panel/物资/View/Content，会优先使用预制体节点。
     */
    private EnsureGoodsContent(): Node {
        const existing = find("Panel/物资/View/Content", this.node);
        if (existing) {
            this.GoodsScrollView = find("Panel/物资", this.node)?.getComponent(ScrollView);
            return existing;
        }

        const panel = find("Panel", this.node);
        const goodsRoot = new Node("物资");
        goodsRoot.layer = this.node.layer;
        panel.addChild(goodsRoot);
        goodsRoot.setPosition(270, 0, 0);
        const rootTransform = goodsRoot.addComponent(UITransform);
        rootTransform.setContentSize(562, 941);

        const title = new Node("Tip");
        title.layer = this.node.layer;
        goodsRoot.addChild(title);
        title.setPosition(0, 442, 0);
        title.addComponent(UITransform).setContentSize(200, 60);
        const titleLabel = title.addComponent(Label);
        titleLabel.string = "物资";
        titleLabel.fontSize = 40;
        titleLabel.lineHeight = 54;

        const view = new Node("View");
        view.layer = this.node.layer;
        goodsRoot.addChild(view);
        view.setPosition(0, -30, 0);
        const viewTransform = view.addComponent(UITransform);
        viewTransform.setContentSize(552, 866);
        view.addComponent(Mask);

        const content = new Node("Content");
        content.layer = this.node.layer;
        view.addChild(content);
        content.setPosition(-276, 433, 0);
        const contentTransform = content.addComponent(UITransform);
        contentTransform.setAnchorPoint(0, 1);
        const goodsColumns = ZRSJZ_INVENTORY_CONFIG.get(ZRSJZ_INVENTORY.物资).Col;
        contentTransform.setContentSize(
            goodsColumns * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL),
            866,
        );

        this.GoodsScrollView = goodsRoot.addComponent(ScrollView);
        this.GoodsScrollView.content = content;
        this.GoodsScrollView.horizontal = goodsColumns > 4;
        this.GoodsScrollView.vertical = true;
        return content;
    }
}
