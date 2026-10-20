import { ZRSJZ_SupremeService } from './ZRSJZ_SupremeService';
import { ZRSJZ_FragmentService, ZRSJZ_FragmentKind } from './ZRSJZ_FragmentService';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_INVENTORY, ZRSJZ_INVENTORY_CONFIG, ZRSJZ_PAYMENT_TEST_PRICE_ENABLED, ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_PET_CONFIG, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryService } from './ZRSJZ_InventoryService';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';

/** 碎片购买：10抖币或1元，每单25片，不占用免费广告次数。 */
export const ZRSJZ_FRAGMENT_PRODUCT = { yuan: 1, count: 25 };

export const ZRSJZ_GOLD_PRODUCTS: Record<string, { yuan: number; gold: number }> = {
    '1元': { yuan: 1, gold: 3000000 }, '2元': { yuan: 2, gold: 7000000 },
    '3元': { yuan: 3, gold: 12000000 }, '5元': { yuan: 5, gold: 20000000 },
};
export const ZRSJZ_GIFT_PRODUCTS: Record<string, number> = {
    '1元礼包': 1, '新手礼包': 2, '豪华礼包': 8, '至尊礼包': 99,
};

/** 全局支付锁，商品快照和订单去重不依赖弹窗是否仍存在。 */
export class ZRSJZ_PurchaseService {
    private static busy = false;
    public static get IsPaying(): boolean { return this.busy; }
    public static HasGift(name: string): boolean { return ZRSJZ_GameData.Instance.PurchasedGifts[name] === true; }

    public static BuyGold(name: string, done: (message: string, rewarded: boolean) => void): boolean {
        const product = ZRSJZ_GOLD_PRODUCTS[name];
        return product ? this.Pay('钞票' + name, product.yuan, () => {
            ZRSJZ_GameData.Instance.Gold += product.gold;
        }, done) : false;
    }

    public static BuyFragments(kind: ZRSJZ_FragmentKind, done: (message: string, rewarded: boolean) => void): boolean {
        if (!ZRSJZ_FragmentService.IsFragment(kind)) {
            done('碎片类型无效', false); return false;
        }
        return this.Pay(kind + '购买', ZRSJZ_FRAGMENT_PRODUCT.yuan, () => {
            if (!ZRSJZ_FragmentService.Credit(kind, ZRSJZ_FRAGMENT_PRODUCT.count, false)) {
                throw Error('碎片余额无效，无法发放奖励');
            }
        }, done);
    }

    /** 角色和皮肤直购金额；按钮文案与下单共用此映射。 */
    public static GetSkinPaymentYuan(fragmentPrice: number): number {
        return fragmentPrice === 20 ? 1 : fragmentPrice === 50 ? 2 : 0;
    }

    public static BuySkin(role: string, skin: string, done: (message: string, rewarded: boolean) => void): boolean {
        const data = ZRSJZ_GameData.Instance;
        const config = ZRSJZ_SKIN_CONFIG.get(skin);
        if (!ZRSJZ_ROLE_CONFIG.get(role)?.Skin.includes(skin) || !config) {
            done('角色或皮肤无效', false); return false;
        }
        if (data.HaveSkin.includes(skin)) { done('已经解锁，无法重复购买', false); return false; }
        if (config.UnlockType !== '英雄碎片') {
            done(config.UnlockType === '签到解锁' ? '该皮肤只能签到获得' : '该皮肤只能通过战令获得', false);
            return false;
        }
        if (skin !== role && !data.HaveRole.includes(role)) {
            done('请先解锁该角色', false); return false;
        }
        const yuan = this.GetSkinPaymentYuan(config.UnlockPrice);
        if (yuan <= 0) { done('解锁价格配置无效', false); return false; }
        // role、skin在发起支付时固定，成功回调不读取当前界面的选中项。
        return this.Pay('解锁' + skin, yuan, () => {
            const current = ZRSJZ_GameData.Instance;
            if (!current.HaveSkin.includes(skin)) current.HaveSkin.push(skin);
            if (skin === role && !current.HaveRole.includes(role)) current.HaveRole.push(role);
        }, done);
    }

    public static BuyGift(name: string, done: (message: string, rewarded: boolean) => void): boolean {
        const yuan = ZRSJZ_GIFT_PRODUCTS[name];
        if (!yuan) return false;
        if (this.HasGift(name)) { done('该礼包已购买，无法重复购买', false); return false; }
        if (name === '新手礼包' && !ZRSJZ_PROP_CONFIG.has('枪蓝图')) {
            done('枪蓝图配置未加载，请稍后再试', false); return false;
        }
        return this.Pay(name, yuan, () => {
            if (this.HasGift(name)) return;
            const data = ZRSJZ_GameData.Instance;
            switch (name) {
                case '1元礼包': data.PermanentBackpackRows += 4; break;
                case '新手礼包':
                    if (!ZRSJZ_InventoryService.AddPropByName('枪蓝图', 1, false)) throw Error('枪蓝图发放失败');
                    data.PetFragments += 20; data.HeroFragments += 20; data.Gold += 2000000;
                    break;
                case '豪华礼包':
                    data.HaveRole = Array.from(new Set([...data.HaveRole, ...ZRSJZ_ROLE_CONFIG.keys()]));
                    data.HaveSkin = Array.from(new Set([...data.HaveSkin, ...ZRSJZ_SKIN_CONFIG.keys()]));
                    for (const [pet, config] of ZRSJZ_PET_CONFIG) {
                        const owned = data.PetData[pet];
                        data.PetData[pet] = owned
                            ? { ...owned, Skins: Array.from(new Set([...owned.Skins, ...config.PetSkins])) }
                            : { Skins: [...config.PetSkins], Level: 0 };
                    }
                    data.Gold += 5000000;
                    break;
                case '至尊礼包':
                    data.PurchasedGifts[name] = true;
                    ZRSJZ_SupremeService.Apply(data);
                    break;
            }
            data.PurchasedGifts[name] = true;
        }, done);
    }

    private static Pay(name: string, yuan: number, grant: () => void,
        done: (message: string, rewarded: boolean) => void): boolean {
        if (this.busy) { done('正在支付，请勿重复点击', false); return false; }
        this.busy = true;
        const order = 'ZRSJZ_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        let settled = false;
        const finish = (message: string, rewarded: boolean) => {
            if (settled) return;
            settled = true; this.busy = false;
            done(message, rewarded);
        };
        const orderAmount = ZRSJZ_PAYMENT_TEST_PRICE_ENABLED ? 10 : Math.round(yuan * 100);
        const diamondAmount = ZRSJZ_PAYMENT_TEST_PRICE_ENABLED ? 1 : yuan * 10;
        try {
            Banner.Instance.TT_unifiedPayment({
                diamondAmount, goodName: name, orderAmount,
                customId: order, extraInfo: { game: '73_ZRSJZ', product: name },
                onSuccess: () => {
                    if (settled) return;
                    const data = ZRSJZ_GameData.Instance;
                    if (data.PaymentOrders.includes(order)) { finish('本订单奖励已到账', false); return; }
                    const before = JSON.parse(JSON.stringify(data));
                    try {
                        grant();
                        data.PaymentOrders.push(order);
                        // 奖励、礼包所有权与订单记录一起保存，避免部分发奖后重复领取。
                        ZRSJZ_GameData.SaveData();
                    } catch (error) {
                        data.InfiniteGold = false;
                        Object.assign(data, before);
                        console.error('[ZRSJZ_PurchaseService] 已支付订单保存失败', order, error);
                        finish('支付成功，但奖励保存失败，请保留订单号：' + order, false);
                        return;
                    }
                    // 扩容已和订单一起保存，再通知已初始化（包括暂时隐藏）的仓库追加格子。
                    for (const [inventory, rows] of Object.entries(data.InventoryRow)) {
                        const type = inventory as ZRSJZ_INVENTORY;
                        const previousRows = before.InventoryRow?.[inventory]
                            ?? ZRSJZ_INVENTORY_CONFIG.get(type)?.Row ?? rows;
                        if (rows > previousRows) {
                            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_ADD_ROW, type, rows - previousRows);
                        }
                    }
                    ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
                    ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
                    ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
                    finish('购买成功，奖励已到账', true);
                },
                onFail: (res: any) => finish(/cancel|取消/i.test(res?.errMsg ?? '')
                    ? '已取消支付' : '支付失败：' + (res?.errMsg ?? '请稍后重试'), false),
                onComplete: () => { if (!settled) finish('支付未完成，未发放奖励', false); },
            });
        } catch (error) {
            if (!settled) finish('无法发起支付，请稍后重试', false);
            console.error('[ZRSJZ_PurchaseService]', error);
        }
        return true;
    }
}
