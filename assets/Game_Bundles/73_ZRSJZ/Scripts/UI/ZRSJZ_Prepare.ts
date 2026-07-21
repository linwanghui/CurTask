import { _decorator, Component, Node, ScrollView } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Prepare')
export class ZRSJZ_Prepare extends Component {

    CardBag: Node = null;
    Ammo: Node = null;
    ProtectorCaseTitle: Node = null;
    ProtectorCase: Node = null;

    ScrollView: ScrollView = null;

    protected onLoad(): void {
        this.CardBag = this.node.getChildByPath("Mask/Content/卡包");
        this.Ammo = this.node.getChildByPath("Mask/Content/弹药");
        this.ProtectorCaseTitle = this.node.getChildByPath("Mask/Content/安全箱title");
        this.ProtectorCase = this.node.getChildByPath("Mask/Content/安全箱");
        this.ScrollView = this.getComponent(ScrollView);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PROP_MOVE, this.PropMove, this);
    }

    protected start(): void {
        this.Show();
    }

    async Show(isShowProtectorCase: boolean = false) {
        const cardBag = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.卡包);
        cardBag.active = true;
        cardBag.parent = this.CardBag;

        const ammo = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.弹药);
        ammo.active = true;
        ammo.parent = this.Ammo;

        this.ProtectorCaseTitle.active = isShowProtectorCase;
        this.ProtectorCase.active = isShowProtectorCase;
        if (isShowProtectorCase) {
            const protectorCase = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.保险箱);
            protectorCase.active = true;
            protectorCase.parent = this.ProtectorCase;
        }
    }

    PropMove(move: boolean) {
        this.ScrollView.enabled = move;
    }

}


