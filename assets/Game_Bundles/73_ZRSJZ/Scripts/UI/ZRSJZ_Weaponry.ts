import { _decorator, Component, Node, Vec3 } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY } from '../ZRSJZ_Constant';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Panel } from '../Panel/ZRSJZ_Panel';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Weaponry')
export class ZRSJZ_Weaponry extends Component {

    Gun: Node = null;
    Helmet: Node = null;
    BodyArmor: Node = null;
    Backpack: Node = null;
    Dagger: Node = null;
    private _showVersion: number = 0;

    protected onLoad(): void {
        this.Gun = this.node.getChildByName("枪");
        this.Helmet = this.node.getChildByName("头盔");
        this.BodyArmor = this.node.getChildByName("防弹衣");
        this.Backpack = this.node.getChildByName("背包");
        this.Dagger = this.node.getChildByName("刀");
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(
            ZRSJZ_MyEvent.ZRSJZ_LOADOUT_PLAYER_CHANGE,
            this.OnLoadoutPlayerChange,
            this,
        );
        void this.Show(this.ResolvePlayerIndex());
    }

    protected onDisable(): void {
        this._showVersion++;
        ZRSJZ_EventManager.Off(
            ZRSJZ_MyEvent.ZRSJZ_LOADOUT_PLAYER_CHANGE,
            this.OnLoadoutPlayerChange,
            this,
        );
    }

    private OnLoadoutPlayerChange(playerIndex: number): void {
        const ownerPlayerIndex = this.GetOwnerPanel()?.PlayerIndex ?? -1;
        void this.Show(ownerPlayerIndex >= 0 ? ownerPlayerIndex : (playerIndex === 1 ? 1 : 0));
    }

    async Show(playerIndex: number = ZRSJZ_InventoryService.GetActivePlayerIndex()) {
        const showVersion = ++this._showVersion;
        const usePlayerInstance = (this.GetOwnerPanel()?.PlayerIndex ?? -1) >= 0;
        const gun = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_枪, playerIndex, usePlayerInstance);
        await gun.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_枪, playerIndex);
        if (!this.CanApplyShow(showVersion, playerIndex)) return;
        gun.active = true;
        gun.parent = this.Gun;
        gun.setPosition(Vec3.ZERO);

        const helmet = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_头盔, playerIndex, usePlayerInstance);
        await helmet.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_头盔, playerIndex);
        if (!this.CanApplyShow(showVersion, playerIndex)) return;
        helmet.active = true;
        helmet.parent = this.Helmet;
        helmet.setPosition(Vec3.ZERO);

        const bodyArmor = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_防弹衣, playerIndex, usePlayerInstance);
        await bodyArmor.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_防弹衣, playerIndex);
        if (!this.CanApplyShow(showVersion, playerIndex)) return;
        bodyArmor.active = true;
        bodyArmor.parent = this.BodyArmor;
        bodyArmor.setPosition(Vec3.ZERO);

        const backpack = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_背包, playerIndex, usePlayerInstance);
        await backpack.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_背包, playerIndex);
        if (!this.CanApplyShow(showVersion, playerIndex)) return;
        backpack.active = true;
        backpack.parent = this.Backpack;
        backpack.setPosition(Vec3.ZERO);

        const dagger = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_刀, playerIndex, usePlayerInstance);
        await dagger.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_刀, playerIndex);
        if (!this.CanApplyShow(showVersion, playerIndex)) return;
        dagger.active = true;
        dagger.parent = this.Dagger;
        dagger.setPosition(Vec3.ZERO);
    }

    private CanApplyShow(showVersion: number, playerIndex: number): boolean {
        if (showVersion !== this._showVersion || !this.node.activeInHierarchy) return false;
        const ownerPlayerIndex = this.GetOwnerPanel()?.PlayerIndex ?? -1;
        return ownerPlayerIndex < 0 || ownerPlayerIndex === (playerIndex === 1 ? 1 : 0);
    }

    private ResolvePlayerIndex(): number {
        const panel = this.GetOwnerPanel();
        return panel?.PlayerIndex >= 0
            ? panel.PlayerIndex
            : ZRSJZ_InventoryService.GetActivePlayerIndex();
    }

    private GetOwnerPanel(): ZRSJZ_Panel {
        let current: Node = this.node;
        while (current) {
            const panel = current.getComponent(ZRSJZ_Panel);
            if (panel) return panel;
            current = current.parent;
        }
        return null;
    }

}


