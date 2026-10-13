import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_FISH_CATALOG, ZRSJZ_FISHING_BAITS, ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_QUALITY, ZRSJZ_INVENTORY, ZRSJZ_PropData, ZRSJZ_GridData } from '../ZRSJZ_Constant';
import { ZRSJZ_FragmentService } from './ZRSJZ_FragmentService';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
export interface FishingFestivalOffer { name: string; count: number; cost: number; sold: boolean; }
export interface FishingFestivalState { points: number; offers: FishingFestivalOffer[]; pending: { name: string; count: number; ids: string[] } | null; }

export class ZRSJZ_FishingFestivalService {
    static readonly RefreshCost = 5;
    static get State(): FishingFestivalState {
        return ZRSJZ_GameData.Instance.FishingFestival ??= { points: 0, offers: [], pending: null };
    }
    static Ensure(): void {
        if (!this.State.offers.length) { this.State.offers = this.Roll(); ZRSJZ_GameData.SaveData(); }
    }
    static IsWarehouse(p: ZRSJZ_PropData): boolean {
        return [ZRSJZ_INVENTORY.仓库_全部, ZRSJZ_INVENTORY.仓库_物品, ZRSJZ_INVENTORY.仓库_装备,
            ZRSJZ_INVENTORY.仓库_武器, ZRSJZ_INVENTORY.仓库_弹药].includes(p.CurInventory);
    }
    static Count(name: string): number {
        return Object.values(ZRSJZ_GameData.Instance.PropData).reduce((sum, p) => sum +
            (p.Name === name && this.IsWarehouse(p) ? Math.max(0, p.CurCount) : 0), 0);
    }
    static Submit(name: string): string {
        if (this.State.pending) return '请先领取上次奖励';
        const fish = ZRSJZ_FISH_CATALOG.find(f => f.name === name), data = ZRSJZ_GameData.Instance;
        if (!fish) return '该道具不是活动渔获';
        const id = Object.keys(data.PropData).find(id => data.PropData[id].Name === name
            && this.IsWarehouse(data.PropData[id]) && data.PropData[id].CurCount > 0);
        if (!id) return '仓库中没有这条鱼';
        if (--data.PropData[id].CurCount === 0) delete data.PropData[id];
        this.State.points += fish.points;
        ZRSJZ_GameData.SaveData();
        if (!data.PropData[id]) ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, id);
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        return '';
    }
    static Cost(name: string): number {
        const fish = ZRSJZ_FISH_CATALOG.find(f => f.name === name);
        if (fish) return fish.points * 3; // Cannot generate points by redeeming and resubmitting fish.
        if (ZRSJZ_FragmentService.IsFragment(name)) return 60;
        return Math.max(50, Math.ceil((ZRSJZ_PROP_CONFIG.get(name)?.UnitPrice ?? 0) / 5000));
    }
    private static Roll(): FishingFestivalOffer[] {
        const names = ['赤焰龙鱼', '星海幻鲲', '宠物碎片', '英雄碎片'];
        const pool = [...ZRSJZ_PROP_CONFIG.values()].filter(p => p.PropType === '物品'
            && p.Quality === ZRSJZ_PROP_QUALITY.红色 && p.UnitPrice > 0 && !names.includes(p.Name));
        while (names.length < 6 && pool.length) names.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].Name);
        return names.map(name => ({ name, count: ZRSJZ_FragmentService.IsFragment(name) ? 10 : 1, cost: this.Cost(name), sold: false }));
    }
    static Refresh(): string {
        this.Ensure();
        if (this.State.pending) return '请先领取上次兑换奖励';
        if (this.State.points < this.RefreshCost) return '积分不足';
        this.State.points -= this.RefreshCost; this.State.offers = this.Roll(); ZRSJZ_GameData.SaveData(); return '';
    }
    static BeginExchange(index: number): string {
        this.Ensure();
        const offer = this.State.offers[index], data = ZRSJZ_GameData.Instance;
        if (this.State.pending) return '请先领取上次兑换奖励';
        if (!offer || offer.sold) return '该奖励已兑换，请刷新';
        if (this.State.points < offer.cost) return '积分不足';
        const config = ZRSJZ_PROP_CONFIG.get(offer.name); if (!config) return '奖励配置不存在';
        const ids: string[] = [];
        if (ZRSJZ_FragmentService.IsFragment(offer.name)) {
            if (!ZRSJZ_FragmentService.Credit(offer.name, offer.count, false)) return '碎片发放失败';
        } else {
            const prop = new ZRSJZ_PropData();
            do { prop.InstanceID = `ZRSJZ_PropID_${++data.PropID}`; } while (data.PropData[prop.InstanceID]);
            Object.assign(prop, { Name: config.Name, PropType: config.PropType, UnitPrice: config.UnitPrice,
                MaxCount: config.MaxCount, CurCount: offer.count, CurInventory: ZRSJZ_INVENTORY.仓库_全部, OwnerPlayerIndex: -1 });
            [prop.Height, prop.Width] = config.GridType.split('_').map(Number);
            prop.GridData = [0, 1].map(() => Object.assign(new ZRSJZ_GridData(), { IsRotate: false, GridX: -1, GridY: -1 }));
            data.PropData[prop.InstanceID] = prop; ids.push(prop.InstanceID);
        }
        this.State.points -= offer.cost; offer.sold = true;
        this.State.pending = { name: offer.name, count: offer.count, ids }; ZRSJZ_GameData.SaveData(); return '';
    }
    static CompleteExchange(): void { this.State.pending = null; ZRSJZ_GameData.SaveData(); }
    static BuyBait(name: string): string {
        if (!ZRSJZ_FISHING_BAITS.some(b => b.name === name && name)) return '鱼饵配置不存在';
        // Reuse the durable reward transaction; points are never charged for purchased bait.
        const data = ZRSJZ_GameData.Instance, config = ZRSJZ_PROP_CONFIG.get(name);
        if (this.State.pending) return '请先领取上次奖励';
        const cost = config.UnitPrice * 5;
        if (data.Gold < cost) return '货币不足';
        const p = new ZRSJZ_PropData();
        do { p.InstanceID = `ZRSJZ_PropID_${++data.PropID}`; } while (data.PropData[p.InstanceID]);
        Object.assign(p, { Name: name, PropType: config.PropType, UnitPrice: config.UnitPrice, MaxCount: config.MaxCount,
            CurCount: 5, CurInventory: ZRSJZ_INVENTORY.仓库_全部, OwnerPlayerIndex: -1, Width: 1, Height: 1,
            GridData: [0,1].map(() => Object.assign(new ZRSJZ_GridData(), { IsRotate: false, GridX: -1, GridY: -1 })) });
        data.PropData[p.InstanceID] = p; data.Gold -= cost;
        this.State.pending = { name, count: 5, ids: [p.InstanceID] }; ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE); return '';
    }
}
