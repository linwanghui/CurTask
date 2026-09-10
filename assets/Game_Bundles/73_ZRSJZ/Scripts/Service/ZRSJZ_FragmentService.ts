import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';

/** 账号共享碎片；按设备本地自然日重置免费领取次数。 */
export class ZRSJZ_FragmentService {
    public static readonly DailyLimit = 3;
    public static readonly RewardCount = 10;

    public static GetCount(): number {
        const count = ZRSJZ_GameData.Instance.PetFragments;
        return Number.isSafeInteger(count) && count >= 0 ? count : 0;
    }

    public static GetRemaining(): number {
        const data = ZRSJZ_GameData.Instance;
        const now = new Date();
        const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        if (data.PetFragmentClaimDate !== date) {
            data.PetFragmentClaimDate = date;
            data.PetFragmentClaimCount = 0;
            ZRSJZ_GameData.SaveData();
        }
        const claimed = Number.isSafeInteger(data.PetFragmentClaimCount) && data.PetFragmentClaimCount >= 0
            ? data.PetFragmentClaimCount : 0;
        return Math.max(0, this.DailyLimit - claimed);
    }

    /** 每次广告创建独立回调，平台重复通知不会重复发奖；失败/中途关闭不调用。 */
    public static CreateVideoReward(count: number = ZRSJZ_FragmentService.RewardCount): () => string {
        let rewarded = false;
        return () => {
            if (rewarded) return '本次奖励已领取';
            rewarded = true;
            if (this.GetRemaining() <= 0 && count == ZRSJZ_FragmentService.RewardCount) return '今日免费次数已用完';
            const data = ZRSJZ_GameData.Instance;
            data.PetFragments = this.GetCount() + count;
            data.PetFragmentClaimCount = this.DailyLimit - this.GetRemaining() + 1;
            ZRSJZ_GameData.SaveData();
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
            return '';
        };
    }
}
