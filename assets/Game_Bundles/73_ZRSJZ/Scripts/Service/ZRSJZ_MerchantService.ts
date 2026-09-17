import { ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_QUALITY } from '../ZRSJZ_Constant';

export interface ZRSJZ_MerchantGoods {
    Name: string;
    Count: number;
    Price: number;
    Sold: boolean;
    Buying: boolean;
}

/** 每次主页场景的一次性商人会话；打开/关闭弹窗不会生成新商品。 */
export class ZRSJZ_MerchantService {
    public static Visible = false;
    public static Goods: ZRSJZ_MerchantGoods[] = [];
    private static rolled = false;

    public static EnterHome(): void {
        this.Visible = false;
        this.Goods = [];
        this.rolled = false;
    }

    public static Refresh(hasDLC: boolean, random = Math.random): boolean {
        if (!hasDLC) return false;
        if (!this.rolled) {
            this.rolled = true;
            this.Visible = random() < 0.5;
            if (this.Visible) this.Goods = this.Generate(random);
        }
        return this.Visible;
    }

    private static Generate(random: () => number): ZRSJZ_MerchantGoods[] {
        const equipment = new Set(['枪', '头盔', '防弹衣', '背包', '刀']);
        const normalQuality = new Set([ZRSJZ_PROP_QUALITY.白色, ZRSJZ_PROP_QUALITY.绿色, ZRSJZ_PROP_QUALITY.蓝色]);
        const rareQuality = new Set([ZRSJZ_PROP_QUALITY.金色, ZRSJZ_PROP_QUALITY.红色]);
        const configs = Array.from(ZRSJZ_PROP_CONFIG.values()).filter(p => Number.isFinite(p.UnitPrice) && p.UnitPrice > 0);
        const normal = configs.filter(p => normalQuality.has(p.Quality) &&
            (equipment.has(p.PropType) || ['药品', '弹药', '物品'].includes(p.PropType)));
        const rare = configs.filter(p => equipment.has(p.PropType) && rareQuality.has(p.Quality));
        const result: ZRSJZ_MerchantGoods[] = [];
        const take = (pool: typeof configs) => {
            if (!pool.length) return;
            const item = pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0];
            if (pool !== normal) {
                const index = normal.findIndex(p => p.Name === item.Name);
                if (index >= 0) normal.splice(index, 1);
            }
            const count = item.PropType === '弹药' ? Math.min(60, item.MaxCount) : 1;
            result.push({ Name: item.Name, Count: count, Price: Math.max(1, Math.ceil(item.UnitPrice * count * 0.75)), Sold: false, Buying: false });
        };
        // 10% 的到访带来一件高级装备，普通商品同批不重复。
        if (random() < 0.1) take(rare);
        take(normal.filter(p => equipment.has(p.PropType)));
        take(normal.filter(p => equipment.has(p.PropType)));
        take(normal.filter(p => p.PropType === '弹药'));
        while (result.length < 8 && normal.length) take(normal);
        return result;
    }
}
