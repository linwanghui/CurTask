import { ZRSJZ_FragmentService } from './ZRSJZ_FragmentService';
import { ZRSJZ_ActivityService } from './ZRSJZ_ActivityService';
import { ZRSJZ_BattlePassService } from './ZRSJZ_BattlePassService';

/** 主页宠物免费碎片与活动待领奖励提醒。 */
import { ZRSJZ_AchievementService } from './ZRSJZ_AchievementService';

/** 主页入口的可领取奖励提醒。 */
export class ZRSJZ_MainReminderService {
    public static GetReminders(dlcReady: boolean): Record<string, boolean> {
        return {
            宠物: dlcReady && ZRSJZ_FragmentService.GetRemaining() > 0,
            活动: dlcReady && ZRSJZ_ActivityService.HasClaimable(),
            成就: dlcReady && ZRSJZ_AchievementService.HasClaimableRewards(),
            战令: dlcReady && ZRSJZ_BattlePassService.HasClaimable(),
        };
    }
}
