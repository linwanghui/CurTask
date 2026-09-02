import { ZRSJZ_MAIL_TYPE, ZRSJZ_MailConfig } from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_Tools } from "../ZRSJZ_Tools";

export class ZRSJZ_MailService {
    private static readonly MAIL_ID_KEY = "ZRSJZ_MailID";
    //检查邮件是否过期
    public static CheckExpired() {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData) return;
        let hasExpired = false;
        for (const mailID in data.MailData) {
            const mailConfig = data.MailData[mailID];
            if (!mailConfig || !mailConfig.Time) continue;
            const days = ZRSJZ_Tools.GetDaysSince(mailConfig.Time);
            if (days >= 31) {
                delete data.MailData[mailID];
                hasExpired = true;
            }
        }
        if (hasExpired) ZRSJZ_GameData.SaveData();
    }

    //添加邮箱
    public static AddMail(mailType: ZRSJZ_MAIL_TYPE, propAwards: string[]): void {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData) return;
        const mailConfig: ZRSJZ_MailConfig = {
            Type: mailType,
            Time: ZRSJZ_Tools.GetDate(),
            PropAwards: [...propAwards],
        }
        data.MailData[this.getMailID()] = mailConfig;
        ZRSJZ_GameData.SaveData();
    }

    //领取邮箱中的奖励
    public static ClaimMail(mailID: string, ...props: string[]): void {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData || !data.MailData[mailID] || props.length <= 0) return;
        const mailConfig = data.MailData[mailID];
        if (!mailConfig || !mailConfig.PropAwards || mailConfig.PropAwards.length <= 0) return;
        for (const prop of props) {
            if (mailConfig.PropAwards.includes(prop)) {
                mailConfig.PropAwards.splice(mailConfig.PropAwards.indexOf(prop), 1);
            }
        }
        ZRSJZ_GameData.SaveData();
    }

    //获取邮箱中的奖励
    public static GetMailProps(mailID: string): string[] {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData || !data.MailData[mailID]) return [];
        return [...data.MailData[mailID].PropAwards];
    }

    //删除邮箱
    public static DeleteMail(mailID: string): void {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData || !data.MailData[mailID]) return;
        delete data.MailData[mailID];
        ZRSJZ_GameData.SaveData();
    }

    private static getMailID(): string {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailID) return "";
        ++data.MailID;
        return `${ZRSJZ_MailService.MAIL_ID_KEY}_${data.MailID}`;
    }
}


