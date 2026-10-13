import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_FISHING_BAITS, ZRSJZ_INVENTORY, ZRSJZ_PropData } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
export class ZRSJZ_FishingBaitService {
    private static IsBackpack(p: ZRSJZ_PropData, player: number): boolean {
        return p.CurInventory === ZRSJZ_INVENTORY.背包 && (p.OwnerPlayerIndex ?? 0) === player;
    }
    private static IsWarehouse(p: ZRSJZ_PropData): boolean {
        return [ZRSJZ_INVENTORY.仓库_全部, ZRSJZ_INVENTORY.仓库_物品, ZRSJZ_INVENTORY.仓库_装备,
            ZRSJZ_INVENTORY.仓库_武器, ZRSJZ_INVENTORY.仓库_弹药].includes(p.CurInventory);
    }
    static Count(name: string, player: number): number {
        return Object.values(ZRSJZ_GameData.Instance.PropData).reduce((sum,p) => sum +
            (p.Name === name && (this.IsBackpack(p, player) || this.IsWarehouse(p))
                ? Math.max(0,p.CurCount) : 0),0);
    }
    static Consume(name: string, player: number): boolean {
        if (!name) return true;
        if (!ZRSJZ_FISHING_BAITS.some(b => b.name === name)) return false;
        const data = ZRSJZ_GameData.Instance;
        const candidates = Object.keys(data.PropData).filter(id => {
            const p = data.PropData[id]; return p.Name === name && p.CurCount > 0;
        });
        // Consume the active player's backpack first; shared warehouses are the fallback.
        // Never consume another player's carried bait.
        const id = candidates.find(id => this.IsBackpack(data.PropData[id], player))
            ?? candidates.find(id => this.IsWarehouse(data.PropData[id]));
        if (!id) return false;
        if (--data.PropData[id].CurCount === 0) delete data.PropData[id];
        ZRSJZ_GameData.SaveData();
        if (!data.PropData[id]) ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP,id);
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE); return true;
    }
}
