import { ZRSJZ_FragmentService } from './ZRSJZ_FragmentService';

/** 主页新增提醒仅保留宠物每日免费碎片领取机会。 */
export class ZRSJZ_MainReminderService {
    public static GetReminders(dlcReady: boolean): Record<string, boolean> {
        return { 宠物: dlcReady && ZRSJZ_FragmentService.GetRemaining() > 0 };
    }
}

