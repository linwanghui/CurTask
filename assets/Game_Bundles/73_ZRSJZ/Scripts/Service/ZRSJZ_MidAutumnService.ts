import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_QUALITY, ZRSJZ_INVENTORY, ZRSJZ_PropData, ZRSJZ_GridData } from '../ZRSJZ_Constant';
import { ZRSJZ_FragmentService } from './ZRSJZ_FragmentService';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';

export interface MidAutumnOffer { name: string; count: number; cost: number; sold: boolean; }
export interface MidAutumnState {
    cakes: number; date: string; videos: number; offers: MidAutumnOffer[];
    pending: { name: string; count: number; ids: string[] } | null;
}
export function CreateMidAutumnState(): MidAutumnState {
    return { cakes: 0, date: '', videos: 0, offers: [], pending: null };
}

/** 月饼仅为活动余额；制作、兑换的扣款与产物一次落盘。 */
export class ZRSJZ_MidAutumnService {
    public static readonly Materials = ['鸡蛋', '大米', '莲子', '油'];
    public static get State(): MidAutumnState { return ZRSJZ_GameData.Instance.MidAutumn; }
    public static Pool() {
        return Array.from(ZRSJZ_PROP_CONFIG.values()).filter(p =>
            p.Quality === ZRSJZ_PROP_QUALITY.红色 && p.PropType === '物品' && p.UnitPrice > 0);
    }
    public static Ensure(): void {
        ZRSJZ_GameData.Instance.MidAutumn ??= CreateMidAutumnState();
        if (!this.State.offers.length) { this.State.offers = this.Roll(); ZRSJZ_GameData.SaveData(); }
        // 从原始定价规则重算，旧商品同步降价；不对存档价格反复除以二。
        let changed = false;
        for (const offer of this.State.offers) {
            const cost = this.OfferCost(offer.name);
            if (offer.cost !== cost) { offer.cost = cost; changed = true; }
        }
        if (changed) ZRSJZ_GameData.SaveData();
    }
    public static OfferCost(name: string): number {
        const original = ZRSJZ_FragmentService.IsFragment(name) ? 5
            : Math.max(4, Math.ceil((ZRSJZ_PROP_CONFIG.get(name)?.UnitPrice ?? 0) / 100000));
        return Math.max(1, Math.ceil(original / 2));
    }
    private static Roll(): MidAutumnOffer[] {
        const pool = this.Pool().filter(prop => prop.Name !== '炫彩月饼');
        const offers: MidAutumnOffer[] = ['宠物碎片', '英雄碎片'].map(name => ({ name, count: 10, cost: this.OfferCost(name), sold: false }));
        offers.push({ name: '炫彩月饼', count: 1, cost: this.OfferCost('炫彩月饼'), sold: false });
        while (offers.length < 6 && pool.length) {
            const prop = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
            offers.push({ name: prop.Name, count: 1, cost: this.OfferCost(prop.Name), sold: false });
        }
        return offers;
    }
    public static Refresh(): string {
        if (this.State.pending) return '请先领取上次兑换的奖励';
        if (this.State.cakes < 1) return '月饼不足';
        const offers = this.Roll();
        this.State.cakes--; this.State.offers = offers; ZRSJZ_GameData.SaveData();
        return '';
    }
    private static IsWarehouse(inventory: ZRSJZ_INVENTORY): boolean {
        return [ZRSJZ_INVENTORY.仓库_全部, ZRSJZ_INVENTORY.仓库_物品,
            ZRSJZ_INVENTORY.仓库_武器, ZRSJZ_INVENTORY.仓库_装备, ZRSJZ_INVENTORY.仓库_弹药].includes(inventory);
    }
    public static Count(name: string): number {
        return Object.values(ZRSJZ_GameData.Instance.PropData).reduce((sum, p) =>
            p.Name === name && this.IsWarehouse(p.CurInventory) ? sum + Math.max(0, p.CurCount) : sum, 0);
    }
    public static CanCraft(): boolean {
        return this.Materials.every(name => this.Count(name) >= 1);
    }
    public static Craft(): string {
        const data = ZRSJZ_GameData.Instance;
        // 先校验整套材料，避免只扣了一部分；不消耗背包、安全箱或地图物资。
        const ids = this.Materials.map(name => Object.keys(data.PropData).find(id => {
            const p = data.PropData[id];
            return p.Name === name && p.CurCount >= 1 && this.IsWarehouse(p.CurInventory);
        }));
        if (ids.some(id => !id)) return '材料不足，需要鸡蛋、大米、莲子、油各1个';
        const removed: string[] = [];
        ids.forEach(id => { if (--data.PropData[id].CurCount === 0) { delete data.PropData[id]; removed.push(id); } });
        this.State.cakes++;
        ZRSJZ_GameData.SaveData();
        removed.forEach(id => ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, id));
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        return '';
    }
    public static Remaining(now = new Date()): number {
        const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        if (this.State.date !== date) {
            this.State.date = date; this.State.videos = 0; ZRSJZ_GameData.SaveData();
        }
        return Math.max(0, 3 - this.State.videos);
    }
    public static VideoReward(): () => boolean {
        let used = false;
        return () => {
            if (used || this.Remaining() <= 0) return false;
            used = true; this.State.videos++; this.State.cakes += 2;
            ZRSJZ_GameData.SaveData(); return true;
        };
    }
    public static BeginExchange(index: number): string {
        if (this.State.pending) return '请先领取上次兑换的奖励';
        const offer = this.State.offers[index];
        if (!offer || offer.sold) return '该商品已兑换，请刷新';
        if (this.State.cakes < offer.cost) return '月饼不足';
        const config = ZRSJZ_PROP_CONFIG.get(offer.name);
        if (!config) return '奖励配置不存在';
        const data = ZRSJZ_GameData.Instance;
        const ids: string[] = [];
        if (ZRSJZ_FragmentService.IsFragment(offer.name)) {
            if (!ZRSJZ_FragmentService.Credit(offer.name, offer.count, false)) return '碎片发放失败';
        } else {
            const prop = new ZRSJZ_PropData();
            prop.InstanceID = `ZRSJZ_PropID_${++data.PropID}`;
            prop.Name = config.Name; prop.PropType = config.PropType;
            prop.UnitPrice = config.UnitPrice; prop.MaxCount = config.MaxCount; prop.CurCount = offer.count;
            prop.CurInventory = ZRSJZ_INVENTORY.仓库_全部;
            prop.OwnerPlayerIndex = -1;
            [prop.Height, prop.Width] = config.GridType.split('_').map(Number);
            prop.GridData = [0, 1].map(() => { const g = new ZRSJZ_GridData(); g.IsRotate = false; g.GridX = -1; g.GridY = -1; return g; });
            data.PropData[prop.InstanceID] = prop; ids.push(prop.InstanceID);
        }
        this.State.cakes -= offer.cost; offer.sold = true;
        this.State.pending = { name: offer.name, count: offer.count, ids };
        ZRSJZ_GameData.SaveData();
        return '';
    }
    public static CompleteExchange(): void { this.State.pending = null; ZRSJZ_GameData.SaveData(); }
}
