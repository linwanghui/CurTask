import { _decorator, instantiate } from 'cc';
import {
    ZRSJZ_INVENTORY,
    ZRSJZ_PropData,
} from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';

const { ccclass } = _decorator;

/**
 * 单个箱子专用库存。
 * InventoryType 仍使用“物资”，再通过 BoxID 隔离不同箱子的道具。
 */
@ccclass('ZRSJZ_BoxInventory')
export class ZRSJZ_BoxInventory extends ZRSJZ_Inventory {
    public BoxID: string = "";

    /** 物资仓库和背包一样，可以存放任意类型的道具。 */
    public IsAdaptive(_id: string): boolean {
        return true;
    }

    public static async Create(boxID: string): Promise<ZRSJZ_BoxInventory> {
        const prefab = await ZRSJZ_Tools.LoadPrefab("Prefabs/UI/Inventory/Inventory");
        const node = instantiate(prefab);
        node.active = false;
        node.name = `BoxInventory_${boxID}`;
        node.getComponent(ZRSJZ_Inventory)?.destroy();

        const inventory = node.addComponent(ZRSJZ_BoxInventory);
        await inventory.InitBox(boxID);
        ZRSJZ_UIManager.Instance.InventoryMap.set(inventory.InventoryMapKey, node);
        return inventory;
    }

    public get InventoryMapKey(): string {
        return `箱子物资_${this.BoxID}`;
    }

    public async InitBox(boxID: string): Promise<void> {
        this.BoxID = boxID;
        await this.Init(ZRSJZ_INVENTORY.物资);
    }

    public Dispose(): void {
        ZRSJZ_UIManager.Instance.InventoryMap.delete(this.InventoryMapKey);
        if (this.node?.isValid) {
            this.node.destroy();
        }
    }

    protected BelongsToInventory(
        propData: ZRSJZ_PropData,
        inventoryType: ZRSJZ_INVENTORY,
    ): boolean {
        return inventoryType === ZRSJZ_INVENTORY.物资
            && propData.CurInventory === ZRSJZ_INVENTORY.物资
            && propData.SourceBoxID === this.BoxID;
    }

    public async ChangeGrid(
        inventory: ZRSJZ_INVENTORY,
        id: string,
        gridX: number,
        gridY: number,
        width: number,
        height: number,
    ): Promise<boolean> {
        if (inventory !== ZRSJZ_INVENTORY.物资) {
            const propData = ZRSJZ_GameData.Instance.PropData[id];
            if (propData) {
                propData.SourceBoxID = this.BoxID;
            }
        }
        return super.ChangeGrid(inventory, id, gridX, gridY, width, height);
    }
}
