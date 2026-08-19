import { _decorator, Component, Node, Vec3 } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY } from '../ZRSJZ_Constant';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Weaponry')
export class ZRSJZ_Weaponry extends Component {

    Gun: Node = null;
    Helmet: Node = null;
    BodyArmor: Node = null;
    Backpack: Node = null;
    Dagger: Node = null;

    protected onLoad(): void {
        this.Gun = this.node.getChildByName("枪");
        this.Helmet = this.node.getChildByName("头盔");
        this.BodyArmor = this.node.getChildByName("防弹衣");
        this.Backpack = this.node.getChildByName("背包");
        this.Dagger = this.node.getChildByName("刀");
    }

    protected onEnable(): void {
        this.Show();
    }


    async Show() {
        const playerIndex = ZRSJZ_InventoryService.GetActivePlayerIndex();
        const gun = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_枪);
        await gun.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_枪, playerIndex);
        gun.active = true;
        gun.parent = this.Gun;
        gun.setPosition(Vec3.ZERO);

        const helmet = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_头盔);
        await helmet.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_头盔, playerIndex);
        helmet.active = true;
        helmet.parent = this.Helmet;
        helmet.setPosition(Vec3.ZERO);

        const bodyArmor = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_防弹衣);
        await bodyArmor.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_防弹衣, playerIndex);
        bodyArmor.active = true;
        bodyArmor.parent = this.BodyArmor;
        bodyArmor.setPosition(Vec3.ZERO);

        const backpack = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_背包);
        await backpack.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_背包, playerIndex);
        backpack.active = true;
        backpack.parent = this.Backpack;
        backpack.setPosition(Vec3.ZERO);

        const dagger = await ZRSJZ_UIManager.Instance.GetInventory(ZRSJZ_INVENTORY.武器_刀);
        await dagger.getComponent(ZRSJZ_Inventory).ShowForPlayer(ZRSJZ_INVENTORY.武器_刀, playerIndex);
        dagger.active = true;
        dagger.parent = this.Dagger;
        dagger.setPosition(Vec3.ZERO);
    }

}


