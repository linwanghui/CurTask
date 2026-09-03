import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { _decorator, EventTouch, find, Label, Layout, Node, ScrollView, Sprite, SpriteFrame, Widget } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_Prepare } from '../UI/ZRSJZ_Prepare';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BackpackPanel')
export class ZRSJZ_BackpackPanel extends ZRSJZ_Panel {
    private _playerIndex: number = 0;

    @property(SpriteFrame)
    DiscardSFs: SpriteFrame[] = [];

    Prepare: ZRSJZ_Prepare = null;
    BackpackContent: Node = null;
    public ScrollView: ScrollView = null;
    private _totalValue: Label = null;
    private _discardArea: Node = null;
    private _discardSprite: Sprite = null;
    private _isOrganizing: boolean = false;
    private _inventoryShowVersion: number = 0;
    private _freeExpansion: Node = null;

    protected onLoad(): void {
        this.Prepare = find("Panel/备战", this.node).getComponent(ZRSJZ_Prepare);
        this.BackpackContent = find("Panel/背包/View/Content", this.node);
        this.ScrollView = find("Panel/背包", this.node).getComponent(ScrollView);
        this._totalValue = find("Panel/武器装备/背包总价值/Count", this.node).getComponent(Label);
        this._discardArea = find("Panel/丢弃范围", this.node);
        this._discardSprite = find("Panel/丢弃范围", this.node).getComponent(Sprite);
        this.ResolveFreeExpansion();
    }


    protected onEnable(): void {
        this.Prepare.Show(true, this._playerIndex, true);
        this.ShowBackpack();
        this.RefreshTotalValue();
        ZRSJZ_UIManager.Instance.RegisterDiscardArea(this._discardArea, this.DiscardSFs, this._playerIndex);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshTotalValue, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_BACKPACK_EXPANDED, this.OnBackpackExpanded, this);
    }

    protected onDisable(): void {
        this._inventoryShowVersion++;
        if (this._discardArea) this._discardArea.active = false;
        ZRSJZ_UIManager.Instance.UnregisterDiscardArea(this._discardArea, this._playerIndex);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.RefreshTotalValue, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_BACKPACK_EXPANDED, this.OnBackpackExpanded, this);
    }

    Show(...args: any[]): void {
        this._playerIndex = this.PlayerIndex >= 0
            ? (this.PlayerIndex === 1 ? 1 : 0)
            : (args[0] === 1 ? 1 : 0);
        ZRSJZ_InventoryService.SetActivePlayerIndex(this._playerIndex);
        ZRSJZ_UIManager.Instance.DeactivatePlayerInventoryNodes(this._playerIndex);
        super.Show();
    }

    async OnButtonClick(event: EventTouch): Promise<void> {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePlayerPanel(
                    ZRSJZ_PANEL.背包弹窗,
                    this._playerIndex,
                );
                break;
            case "整理背包":
                await this.OrganizeBackpack();
                break;
            case "免费扩容":
                ZRSJZ_UIManager.Instance.ShowPlayerPanel(
                    ZRSJZ_PANEL.背包扩容弹窗,
                    this._playerIndex,
                    this._playerIndex,
                );
                break;
        }
    }

    private async OrganizeBackpack(): Promise<void> {
        if (this._isOrganizing) return;
        this._isOrganizing = true;
        try {
            const backpackNode = await ZRSJZ_UIManager.Instance.GetInventory(
                ZRSJZ_INVENTORY.背包,
                this._playerIndex,
                true,
            );
            const organized = await backpackNode?.getComponent(ZRSJZ_Inventory)?.AutoOrganize();
            if (!organized) {
                ZRSJZ_UIManager.Instance.ShowTip("背包整理失败");
            }
        } finally {
            this._isOrganizing = false;
        }
    }

    PropMove(move: boolean) {
        const playerIndex = ZRSJZ_UIManager.DraggingPlayerIndex;
        if (playerIndex >= 0 && playerIndex !== this._playerIndex) return;
        this.ScrollView.enabled = move;
    }

    private RefreshTotalValue() {
        const totalValue = ZRSJZ_InventoryService.GetInventoryTotalValue([
            ZRSJZ_INVENTORY.背包,
            ZRSJZ_INVENTORY.保险箱,
        ], this._playerIndex);
        this._totalValue.string = `${totalValue}`;
    }

    ShowBackpack() {
        const showVersion = ++this._inventoryShowVersion;
        const playerIndex = this._playerIndex;
        ZRSJZ_UIManager.Instance.GetInventory(
            ZRSJZ_INVENTORY.背包,
            playerIndex,
            true,
        ).then(async backpack => {
            await backpack.getComponent(ZRSJZ_Inventory).ShowForPlayer(
                ZRSJZ_INVENTORY.背包,
                playerIndex,
            );
            const inventory = backpack.getComponent(ZRSJZ_Inventory);
            if (
                showVersion !== this._inventoryShowVersion
                || !this.node.activeInHierarchy
                || inventory.PlayerViewIndex !== playerIndex
            ) return;
            backpack.parent = this.BackpackContent;
            backpack.setPosition(0, 0, 0);
            backpack.active = true;
            this.PlaceFreeExpansion();
        });
    }

    private PlaceFreeExpansion(): void {
        const freeExpansion = this.ResolveFreeExpansion();
        if (!freeExpansion) return;
        const isExpanded = ZRSJZ_InventoryService.IsBackpackExpanded(this._playerIndex);
        freeExpansion.active = !isExpanded;
        if (isExpanded) return;

        const widget = freeExpansion.getComponent(Widget);
        if (widget) widget.enabled = false;
        freeExpansion.parent = this.BackpackContent;
        freeExpansion.setPosition(280, 0, 0);
        freeExpansion.setSiblingIndex(this.BackpackContent.children.length - 1);
        this.BackpackContent.getComponent(Layout)?.updateLayout();
    }

    private OnBackpackExpanded(playerIndex: number): void {
        if (playerIndex !== this._playerIndex) return;
        const freeExpansion = this.ResolveFreeExpansion();
        if (freeExpansion) freeExpansion.active = false;
        this.BackpackContent?.getComponent(Layout)?.updateLayout();
    }

    /** 兼容免费扩容节点位于背包根节点或已经放入 Content 的两种预制体层级。 */
    private ResolveFreeExpansion(): Node | null {
        if (this._freeExpansion?.isValid) return this._freeExpansion;
        this._freeExpansion = find("免费扩容", this.BackpackContent)
            ?? find("Panel/背包/免费扩容", this.node);
        return this._freeExpansion;
    }

}


