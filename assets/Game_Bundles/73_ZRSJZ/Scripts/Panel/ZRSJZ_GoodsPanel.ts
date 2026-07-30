import {
    _decorator,
    EventTouch,
    find,
    Label,
    Mask,
    Node,
    ScrollView,
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
    ZRSJZ_PANEL,
    ZRSJZ_PROP_CONFIG,
} from '../ZRSJZ_Constant';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GoodsPanel')
export class ZRSJZ_GoodsPanel extends ZRSJZ_Panel {
    @property({ displayName: '每件物资搜索时间（秒）', min: 0.05 })
    SearchInterval: number = 0.5;

    Prepare: ZRSJZ_Prepare = null;
    BackpackContent: Node = null;
    GoodsContent: Node = null;
    public ScrollView: ScrollView = null;
    public GoodsScrollView: ScrollView = null;

    private _revealSerial: number = 0;
    private _revealCallback: () => void = null;

    protected onLoad(): void {
        this.Prepare = find("Panel/备战", this.node).getComponent(ZRSJZ_Prepare);
        this.BackpackContent = find("Panel/背包/View/Content", this.node);
        this.ScrollView = find("Panel/背包", this.node).getComponent(ScrollView);
        this.GoodsContent = this.EnsureGoodsContent();
    }

    protected onEnable(): void {
        this.Prepare.Show(true);
        this.ShowBackpack();
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    protected onDisable(): void {
        this.CancelReveal();
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    Show(...args: any[]): void {
        super.Show();

        const source = args[0];
        const box = source instanceof ZRSJZ_Box ? source : null;
        const props = Array.isArray(source)
            ? source.filter(propName => typeof propName === 'string')
            : [];
        box?.Open();
        const interval = typeof args[1] === 'number'
            ? Math.max(0.05, args[1])
            : Math.max(0.05, this.SearchInterval);
        this.StartReveal(props, interval, box);
    }

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.物资弹窗);
                break;
        }
    }

    PropMove(move: boolean) {
        this.ScrollView.enabled = move;
        if (this.GoodsScrollView) {
            this.GoodsScrollView.enabled = move;
        }
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
        if (propNames.length === 0 && !box?.HasUnclaimedLoot()) {
            return;
        }

        const serial = this._revealSerial;
        const goods = await this.ShowGoods();
        if (serial !== this._revealSerial || !this.node.activeInHierarchy || !goods) {
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
            if (!ZRSJZ_PROP_CONFIG.has(propName)) {
                console.warn(`[ZRSJZ_GoodsPanel] 未找到道具配置: ${propName}`);
                if (box?.HasUnclaimedLoot() || index < propNames.length) {
                    this.ScheduleNextReveal(revealNext, interval);
                }
                return;
            }

            const propID = ZRSJZ_GameData.Instance.AddPropByName(propName);
            ZRSJZ_GameData.Instance.MovePropToInventory(
                propID,
                ZRSJZ_INVENTORY.物资,
                1,
                -1,
                -1,
            );
            ZRSJZ_GameData.SaveData();

            goods.ShowPropItem()
                .then(() => {
                    this.RefreshGoodsContentSize(goods.node);
                })
                .catch(error => {
                    console.error(`[ZRSJZ_GoodsPanel] 显示搜索道具失败: ${propName}`, error);
                })
                .finally(() => {
                    if (
                        serial === this._revealSerial
                        && this.node.activeInHierarchy
                        && (box?.HasUnclaimedLoot() || index < propNames.length)
                    ) {
                        this.ScheduleNextReveal(revealNext, interval);
                    }
                });
        };

        this.ScheduleNextReveal(revealNext, interval);
    }

    private ScheduleNextReveal(callback: () => void, interval: number): void {
        this._revealCallback = callback;
        this.scheduleOnce(callback, interval);
    }

    private CancelReveal(): void {
        this._revealSerial++;
        if (this._revealCallback) {
            this.unschedule(this._revealCallback);
            this._revealCallback = null;
        }
    }

    private async ShowGoods(): Promise<ZRSJZ_Inventory> {
        const goods = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.物资);
        goods.parent = this.GoodsContent;
        goods.setPosition(0, 0, 0);
        goods.active = true;

        const inventory = goods.getComponent(ZRSJZ_Inventory);
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
        contentTransform.setContentSize(
            4 * (ZRSJZ_GRID_SIZE + ZRSJZ_GRID_INTERVAL),
            866,
        );

        this.GoodsScrollView = goodsRoot.addComponent(ScrollView);
        this.GoodsScrollView.content = content;
        this.GoodsScrollView.horizontal = false;
        this.GoodsScrollView.vertical = true;
        return content;
    }
}

