import { ZRSJZ_FragmentService } from './ZRSJZ_FragmentService';
import { ZRSJZ_AchievementService } from './ZRSJZ_AchievementService';

/** 主页入口的可领取奖励提醒。 */
export class ZRSJZ_MainReminderService {
    public static GetReminders(dlcReady: boolean): Record<string, boolean> {
        return {
            宠物: dlcReady && ZRSJZ_FragmentService.GetRemaining() > 0,
            成就: dlcReady && ZRSJZ_AchievementService.HasClaimableRewards(),
        };
    }
}

