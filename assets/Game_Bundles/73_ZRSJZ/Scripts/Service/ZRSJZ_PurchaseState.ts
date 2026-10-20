import type { ZRSJZ_GameData } from '../ZRSJZ_GameData';

export const ZRSJZ_INFINITE_GOLD_DISPLAY = 999999999999;

/** 保留可枚举的 Gold 存档字段，统一拦截服务和界面中的直接加减款。 */
export function BindPurchaseGold(data: ZRSJZ_GameData): void {
    let balance = data.Gold;
    Object.defineProperty(data, 'Gold', {
        enumerable: true,
        configurable: true,
        get: () => data.InfiniteGold === true ? ZRSJZ_INFINITE_GOLD_DISPLAY : balance,
        set: (value: number) => { if (data.InfiniteGold !== true) balance = value; },
    });
}

/** 至尊权益随购买记录永久生效，不影响没有购买的存档。 */
export function HasSupremeAccess(data: Pick<ZRSJZ_GameData, 'PurchasedGifts'>): boolean {
    return data.PurchasedGifts?.['至尊礼包'] === true;
}
