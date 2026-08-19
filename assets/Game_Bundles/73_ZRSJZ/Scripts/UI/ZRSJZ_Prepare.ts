import { _decorator, Component, Node, ScrollView } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Prepare')
export class ZRSJZ_Prepare extends Component {

    CardBag: Node = null;
    Ammo: Node = null;

    ScrollView: ScrollView = null;

    protected onLoad(): void {
        this.CardBag = this.node.getChildByPath("卡包");
        this.Ammo = this.node.getChildByPath("弹药");
        this.ScrollView = this.node.getChildByName("保险")?.getComponent(ScrollView);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    async Show(isShowProtectorCase: boolean = false) {
        const playerIndex = ZRSJZ_InventoryService.GetActivePlayerIndex();
        const cardBag = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.卡包);
        await cardBag.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.卡包, playerIndex);
        cardBag.active = true;
        cardBag.parent = this.CardBag;

        const ammo = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.弹药);
        await ammo.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.弹药, playerIndex);
        ammo.active = true;
        ammo.parent = this.Ammo;

        if (isShowProtectorCase) {
            const protectorCase = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.保险箱);
            await protectorCase.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.保险箱, playerIndex);
            protectorCase.active = true;
            protectorCase.parent = this.node.getChildByPath("保险/Mask/安全箱");
        }
    }

    PropMove(move: boolean) {
        if (this.ScrollView) this.ScrollView.enabled = move;
    }

}


