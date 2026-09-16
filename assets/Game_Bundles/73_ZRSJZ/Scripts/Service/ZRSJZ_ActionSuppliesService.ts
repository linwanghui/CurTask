import { ZRSJZ_GameData } from '../ZRSJZ_GameData';

/** 主包只维护补给状态，弹窗资源由 DLC 提供。 */
export class ZRSJZ_ActionSuppliesService {
    public static readonly Cooldown = 5 * 60 * 60 * 1000;
    public static Claiming = false;

    public static MarkFailureReturn(): void {
        ZRSJZ_GameData.Instance.SupplyFailurePending = true;
        ZRSJZ_GameData.SaveData();
    }

    public static Refresh(hasDLC: boolean, now = Date.now(), random = Math.random): boolean {
        if (!hasDLC) return false;
        const data = ZRSJZ_GameData.Instance;
        let changed = false;
        let failureOffer = false;
        if (data.SupplyFailurePending) {
            data.SupplyFailurePending = false;
            // 每次失败只抽取一次；关闭面板、定时刷新不能反复抽取。
            failureOffer = random() < 0.5;
            changed = true;
        }
        if (data.SupplyOffer < 0 && !this.Claiming &&
            (failureOffer || data.SupplyLastClaimTime === 0 || now - data.SupplyLastClaimTime >= this.Cooldown)) {
            data.SupplyOffer = random() < 0.5 ? 0 : 1;
            changed = true;
        }
        if (changed) ZRSJZ_GameData.SaveData();
        return data.SupplyOffer >= 0;
    }

    public static GetAwards(): { PropName: string; Count: number }[] {
        const offer = ZRSJZ_GameData.Instance.SupplyOffer;
        if (offer < 0) return [];
        const names = offer === 0
            ? ['一级头', '二级甲', '一级包', 'CN8-突击步枪', '1级子弹', '2级子弹']
            : ['二级头', '一级甲', '二级包', 'DX9-冲锋枪', '1级子弹', '2级子弹'];
        return names.map((PropName, i) => ({ PropName, Count: i >= 4 ? 60 : 1 }));
    }

    public static CompleteClaim(now = Date.now()): void {
        const data = ZRSJZ_GameData.Instance;
        data.SupplyLastClaimTime = now;
        data.SupplyOffer = -1;
        data.SupplyFailurePending = false;
        ZRSJZ_GameData.SaveData();
    }
}
