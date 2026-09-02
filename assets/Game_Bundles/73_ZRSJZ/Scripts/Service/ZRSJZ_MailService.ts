import { ZRSJZ_MAIL_TYPE, ZRSJZ_MailConfig, ZRSJZ_MailPropAward } from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_Tools } from "../ZRSJZ_Tools";
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";

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
            if (days >= 30) {
                delete data.MailData[mailID];
                hasExpired = true;
            }
        }
        if (hasExpired) this.NotifyMailChanged();
    }

    //添加邮箱
    public static AddMail(
        mailType: ZRSJZ_MAIL_TYPE,
        propAwards: ReadonlyArray<string | Readonly<ZRSJZ_MailPropAward>>,
    ): string {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData) return "";
        const normalizedAwards = propAwards
            .map(award => this.NormalizeAward(award))
            .filter((award): award is ZRSJZ_MailPropAward => award !== null);
        if (normalizedAwards.length <= 0) return "";
        const mailConfig: ZRSJZ_MailConfig = {
            Type: mailType,
            Time: ZRSJZ_Tools.GetDate(),
            PropAwards: normalizedAwards,
        }
        const mailID = this.getMailID();
        if (!mailID) return "";
        data.MailData[mailID] = mailConfig;
        this.NotifyMailChanged();
        return mailID;
    }

    //领取邮箱中的奖励
    public static ClaimMail(mailID: string, ...props: string[]): void {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData || !data.MailData[mailID] || props.length <= 0) return;
        const mailConfig = data.MailData[mailID];
        if (!mailConfig || !mailConfig.PropAwards || mailConfig.PropAwards.length <= 0) return;
        for (const propName of props) {
            const index = mailConfig.PropAwards.findIndex(award =>
                this.NormalizeAward(award)?.PropName === propName
            );
            if (index >= 0) mailConfig.PropAwards.splice(index, 1);
        }
        this.NotifyMailChanged();
    }

    //获取邮箱中的奖励
    public static GetMailProps(mailID: string): ZRSJZ_MailPropAward[] {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData || !data.MailData[mailID]) return [];
        return data.MailData[mailID].PropAwards
            .map(award => this.NormalizeAward(award))
            .filter((award): award is ZRSJZ_MailPropAward => award !== null);
    }

    /** 邮件按自增 ID 排序；旧存档中的异常 key 排在最前，新邮件始终位于末尾。 */
    public static GetMailIDs(): string[] {
        const mailData = ZRSJZ_GameData.Instance?.MailData;
        if (!mailData) return [];
        return Object.keys(mailData).sort((a, b) => {
            const idA = this.GetMailIDNumber(a);
            const idB = this.GetMailIDNumber(b);
            if (idA !== idB) return idA - idB;
            return a.localeCompare(b);
        });
    }

    /** 当前仍有附件未领取的邮件数量。 */
    public static GetUnclaimedMailCount(): number {
        return this.GetMailIDs().reduce(
            (count, mailID) => count + (this.GetMailProps(mailID).length > 0 ? 1 : 0),
            0,
        );
    }

    /** 用实际未领取成功的附件覆盖邮件内容。 */
    public static SetMailProps(
        mailID: string,
        propAwards: ReadonlyArray<Readonly<ZRSJZ_MailPropAward>>,
    ): void {
        const data = ZRSJZ_GameData.Instance;
        const mailConfig = data?.MailData?.[mailID];
        if (!mailConfig) return;
        mailConfig.PropAwards = propAwards
            .map(award => this.NormalizeAward(award))
            .filter((award): award is ZRSJZ_MailPropAward => award !== null);
        this.NotifyMailChanged();
    }

    //删除邮箱
    public static DeleteMail(mailID: string): void {
        const data = ZRSJZ_GameData.Instance;
        if (!data || !data.MailData || !data.MailData[mailID]) return;
        delete data.MailData[mailID];
        this.NotifyMailChanged();
    }

    /** 删除附件已经全部领取的邮件，只保存一次存档。 */
    public static DeleteClaimedMails(): number {
        const data = ZRSJZ_GameData.Instance;
        if (!data?.MailData) return 0;
        let deleteCount = 0;
        for (const mailID of Object.keys(data.MailData)) {
            if (this.GetMailProps(mailID).length > 0) continue;
            delete data.MailData[mailID];
            deleteCount++;
        }
        if (deleteCount > 0) this.NotifyMailChanged();
        return deleteCount;
    }

    private static getMailID(): string {
        const data = ZRSJZ_GameData.Instance;
        if (!data) return "";
        const greatestSavedID = Object.keys(data.MailData ?? {}).reduce(
            (greatestID, mailID) => Math.max(greatestID, this.GetMailIDNumber(mailID)),
            0,
        );
        data.MailID = Math.max(0, Number(data.MailID) || 0, greatestSavedID) + 1;
        let mailID = `${ZRSJZ_MailService.MAIL_ID_KEY}_${data.MailID}`;
        while (data.MailData?.[mailID]) {
            data.MailID++;
            mailID = `${ZRSJZ_MailService.MAIL_ID_KEY}_${data.MailID}`;
        }
        return mailID;
    }

    private static GetMailIDNumber(mailID: string): number {
        const match = new RegExp(`^${this.MAIL_ID_KEY}_(\\d+)$`).exec(mailID ?? "");
        return match ? Number(match[1]) || 0 : -1;
    }

    private static NotifyMailChanged(): void {
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_MAIL_CHANGE);
    }

    private static NormalizeAward(
        award: string | Readonly<ZRSJZ_MailPropAward>,
    ): ZRSJZ_MailPropAward | null {
        if (typeof award === "string") {
            return award ? { PropName: award, Count: 1 } : null;
        }
        const propName = award?.PropName;
        const count = Math.max(0, Math.floor(Number(award?.Count) || 0));
        return propName && count > 0 ? { PropName: propName, Count: count } : null;
    }
}


