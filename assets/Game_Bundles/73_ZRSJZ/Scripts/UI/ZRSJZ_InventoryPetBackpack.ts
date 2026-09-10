import { _decorator } from 'cc';
import { ZRSJZ_Inventory } from './ZRSJZ_Inventory';
import { ZRSJZ_INVENTORY } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass } = _decorator;

/** 宠物独立库存；行优先解锁，锁格不参与放置或旋转。 */
@ccclass('ZRSJZ_InventoryPetBackpack')
export class ZRSJZ_InventoryPetBackpack extends ZRSJZ_Inventory {
    private _slotCount = -1;

    IsAdaptive(_id: string): boolean { return true; }

    protected GetInventoryConfig(_type: ZRSJZ_INVENTORY) {
        this._slotCount = this.GetSlotCount(this.PlayerViewIndex);
        return { Row: 2, Col: 2, IsDilatation: false };
    }

    private GetSlotCount(playerIndex: number): number {
        return Math.max(0, Math.min(4, ZRSJZ_InventoryService.GetPetBackpackSlots(playerIndex)));
    }

    public async ShowForPlayer(type: ZRSJZ_INVENTORY, playerIndex: number): Promise<void> {
        if (this._slotCount !== this.GetSlotCount(playerIndex)) {
            while (this._isShowingPropItem) await new Promise<void>(resolve => setTimeout(resolve, 0));
            await this.Init(type, playerIndex);
        } else {
            await super.ShowForPlayer(type, playerIndex);
        }
    }

    CanPlace(x: number, y: number, width: number, height: number, normalID = '跳过'): boolean {
        if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 2 || y + height > 2) return false;
        for (let row = y; row < y + height; row++) {
            for (let col = x; col < x + width; col++) {
                if (row * 2 + col >= this._slotCount) return false;
            }
        }
        return super.CanPlace(x, y, width, height, normalID);
    }

    async CreateEmptyGrid(x: number, y: number): Promise<void> {
        if (y * 2 + x < this._slotCount) await super.CreateEmptyGrid(x, y);
    }
}
