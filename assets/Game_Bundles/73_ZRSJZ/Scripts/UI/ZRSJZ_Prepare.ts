import { _decorator, Component, Node, ScrollView } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_Panel } from '../Panel/ZRSJZ_Panel';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Prepare')
export class ZRSJZ_Prepare extends Component {

    CardBag: Node = null;
    Ammo: Node = null;

    ScrollView: ScrollView = null;
    private _showVersion: number = 0;

    protected onLoad(): void {
        this.CardBag = this.node.getChildByPath("卡包");
        this.Ammo = this.node.getChildByPath("弹药");
        this.ScrollView = this.node.getChildByName("保险")?.getComponent(ScrollView);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    protected onDisable(): void {
        this._showVersion++;
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    async Show(
        isShowProtectorCase: boolean = false,
        playerIndex: number = ZRSJZ_InventoryService.GetActivePlayerIndex(),
        usePlayerInstance: boolean = false,
    ) {
        const showVersion = ++this._showVersion;
        const cardBag = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.卡包, playerIndex, usePlayerInstance);
        await cardBag.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.卡包, playerIndex);
        if (!this.CanApplyShow(showVersion)) return;
        cardBag.active = true;
        cardBag.parent = this.CardBag;

        const ammo = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.弹药, playerIndex, usePlayerInstance);
        await ammo.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.弹药, playerIndex);
        if (!this.CanApplyShow(showVersion)) return;
        ammo.active = true;
        ammo.parent = this.Ammo;

        if (isShowProtectorCase) {
            const protectorCase = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.保险箱, playerIndex, usePlayerInstance);
            await protectorCase.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.保险箱, playerIndex);
            if (!this.CanApplyShow(showVersion)) return;
            protectorCase.active = true;
            protectorCase.parent = this.node.getChildByPath("保险/Mask/安全箱");
        }
    }

    private CanApplyShow(showVersion: number): boolean {
        return showVersion === this._showVersion && this.node.activeInHierarchy;
    }

    PropMove(move: boolean) {
        const playerIndex = ZRSJZ_UIManager.DraggingPlayerIndex;
        if (playerIndex >= 0) {
            let current: Node = this.node;
            while (current) {
                const panel = current.getComponent(ZRSJZ_Panel);
                if (panel) {
                    if (panel.PlayerIndex >= 0 && panel.PlayerIndex !== playerIndex) return;
                    break;
                }
                current = current.parent;
            }
        }
        if (this.ScrollView) this.ScrollView.enabled = move;
    }

}


