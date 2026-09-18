import { ZRSJZ_GameData } from '../ZRSJZ_GameData';

export class ZRSJZ_NoticeService {
    private static DateKey(now: Date): string {
        return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    }

    public static ShouldShow(hasDLC: boolean, now = new Date()): boolean {
        return hasDLC && ZRSJZ_GameData.Instance.IsTutorial
            && ZRSJZ_GameData.Instance.NoticeClosedDate !== this.DateKey(now);
    }

    /** 仅手动关闭按钮调用；切换场景、系统隐藏面板都不算已读。 */
    public static CloseForToday(now = new Date()): void {
        ZRSJZ_GameData.Instance.NoticeClosedDate = this.DateKey(now);
        ZRSJZ_GameData.SaveData();
    }
}
