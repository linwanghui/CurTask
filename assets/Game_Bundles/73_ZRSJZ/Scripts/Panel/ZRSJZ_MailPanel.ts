import { _decorator, EventTouch, find, instantiate, Label, Layout, Node, Prefab, ScrollView, Sprite, SpriteFrame, v2 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_MailItem } from '../UI/ZRSJZ_MailItem';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_MAIL_DESC, ZRSJZ_MailPropAward, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_MailService } from '../Service/ZRSJZ_MailService';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MailPanel')
export class ZRSJZ_MailPanel extends ZRSJZ_Panel {

    @property(Prefab)
    MailItemPrefab: Prefab = null;

    @property(SpriteFrame)
    MailIconSFs: SpriteFrame[] = [];

    MailItemContent: Node = null;
    MailScrollView: ScrollView = null;
    MailDescNode: Node = null;
    MailIcon: Sprite = null;
    MailType: Label = null;
    LoadTime: Label = null;
    Deadline: Label = null;
    MailDesc: Label = null;
    PropContent: Node = null;
    PartialClaimChecked: Node = null;
    ClaimBtn: Node = null;
    PartialClaimBtn: Node = null;
    CheckMask: Node = null;
    ClaimAllBtn: Node = null;
    DeleteReadBtn: Node = null;
    NullMail: Node = null;


    private _curMailID: string = "";
    private _isPartialClaim: boolean = false;
    private _isClaiming: boolean = false;
    private _showPropVersion: number = 0;
    private readonly _selectedAwardKeys = new Set<string>();
    private readonly _awardByKey = new Map<string, ZRSJZ_MailPropAward>();

    protected onLoad(): void {
        this.MailItemContent = find("Panel/MailItems/view/content", this.node);
        this.MailScrollView = find("Panel/MailItems", this.node)?.getComponent(ScrollView) ?? null;
        this.MailDescNode = find("Panel/MailDesc", this.node);
        this.MailIcon = find("Panel/MailDesc/MailIcon", this.node).getComponent(Sprite);
        this.MailType = find("Panel/MailDesc/MailType", this.node).getComponent(Label);
        this.LoadTime = find("Panel/MailDesc/LoadTime", this.node).getComponent(Label);
        this.Deadline = find("Panel/MailDesc/Deadline", this.node).getComponent(Label);
        this.MailDesc = find("Panel/MailDesc/MailDesc", this.node).getComponent(Label);
        this.PropContent = find("Panel/MailDesc/PropContent/View/Content", this.node);
        this.PartialClaimChecked = find("Panel/MailDesc/部分领取/对勾", this.node);
        this.ClaimBtn = find("Panel/MailDesc/领取", this.node);
        this.PartialClaimBtn = find("Panel/MailDesc/部分领取", this.node);
        this.CheckMask = find("Panel/MailDesc/CheckMask", this.node);
        this.ClaimAllBtn = find("Panel/全部领取", this.node);
        this.DeleteReadBtn = find("Panel/删除已读", this.node);
        this.NullMail = find("Panel/空邮件", this.node);
        this.CheckMask.active = false;
        this.PartialClaimChecked.active = false;
    }

    protected onEnable(): void {
        this.ClaimBtn?.on(Node.EventType.TOUCH_END, this.OnClaimClick, this);
        this.PartialClaimBtn?.on(Node.EventType.TOUCH_END, this.OnPartialClaimClick, this);
        this.CheckMask?.getChildByName("Mask")
            ?.on(Node.EventType.TOUCH_END, this.OnCancelPartialClaim, this);
        this.ClaimAllBtn?.on(Node.EventType.TOUCH_END, this.OnClaimAllClick, this);
        this.DeleteReadBtn?.on(Node.EventType.TOUCH_END, this.OnDeleteReadClick, this);
        ZRSJZ_EventManager.OnPersist(
            ZRSJZ_MyEvent.ZRSJZ_MAIL_GET_PROP_ADD,
            this.OnAwardSelectionChanged,
            this,
        );
    }

    protected onDisable(): void {
        this.ClaimBtn?.off(Node.EventType.TOUCH_END, this.OnClaimClick, this);
        this.PartialClaimBtn?.off(Node.EventType.TOUCH_END, this.OnPartialClaimClick, this);
        this.CheckMask?.getChildByName("Mask")
            ?.off(Node.EventType.TOUCH_END, this.OnCancelPartialClaim, this);
        this.ClaimAllBtn?.off(Node.EventType.TOUCH_END, this.OnClaimAllClick, this);
        this.DeleteReadBtn?.off(Node.EventType.TOUCH_END, this.OnDeleteReadClick, this);
        ZRSJZ_EventManager.OffPersist(
            ZRSJZ_MyEvent.ZRSJZ_MAIL_GET_PROP_ADD,
            this.OnAwardSelectionChanged,
            this,
        );
        this.ExitPartialClaim();
    }

    public Show(...args: any[]): void {
        super.Show(...args);
        this.InitMailItems();
    }

    InitMailItems() {
        this.ExitPartialClaim();
        for (const child of [...this.MailItemContent.children]) {
            child.removeFromParent();
            child.destroy();
        }
        const mailIDs = ZRSJZ_MailService.GetMailIDs();
        const hasMail = mailIDs.length > 0;
        this.ClaimAllBtn.active = hasMail;
        this.DeleteReadBtn.active = hasMail;
        this.NullMail.active = !hasMail;
        for (const mailID of mailIDs) {
            const mailitem = instantiate(this.MailItemPrefab);
            mailitem.parent = this.MailItemContent;
            mailitem.getComponent(ZRSJZ_MailItem).Init(
                mailID,
                selectedMailID => this.CheckMail(selectedMailID),
            );
        }
        if (hasMail) {
            // 打开邮件界面时默认展示最后生成的一封邮件。
            this.CheckMail(mailIDs[mailIDs.length - 1]);

            const layout = this.MailItemContent.getComponent(Layout);
            layout?.updateLayout(true);

            this.scheduleOnce(() => {
                layout?.updateLayout(true);

                this.scheduleOnce(() => {
                    if (!this.node.activeInHierarchy) return;

                    this.MailScrollView?.stopAutoScroll();
                    this.MailScrollView?.scrollToTop(0);
                }, 0);
            }, 0);
        } else {
            this._curMailID = "";
            this.MailDescNode.active = false;
        }
    }

    CheckMail(mailID: string) {
        if (this._isClaiming) return;
        this.ExitPartialClaim();
        const hasMail = ZRSJZ_GameData.Instance.MailData.hasOwnProperty(mailID);
        this.MailDescNode.active = hasMail;
        this._curMailID = mailID;
        if (!hasMail) {
            console.error(`未找到邮件 ${mailID}`);
            return;
        }
        for (const child of this.MailItemContent.children) {
            const mailItem = child.getComponent(ZRSJZ_MailItem);
            mailItem?.SetChecked(mailItem.MailID === mailID);
        }
        const mail = ZRSJZ_GameData.Instance.MailData[mailID];
        this.MailIcon.spriteFrame = this.GetIcon(mail.Type);
        this.MailType.string = mail.Type;
        this.LoadTime.string = mail.Time;
        this.Deadline.string = `${Math.max(0, 30 - ZRSJZ_Tools.GetDaysSince(mail.Time))}天后过期`;
        this.MailDesc.string = ZRSJZ_MAIL_DESC.get(mail.Type) || "暂无邮件描述";
        this.ShowProp();
    }

    GetIcon(name: string): SpriteFrame {
        for (let i = 0; i < this.MailIconSFs.length; i++) {
            if (this.MailIconSFs[i].name == name) {
                return this.MailIconSFs[i];
            }
        }
        return null;
    }

    ShowProp() {
        const showVersion = ++this._showPropVersion;
        this._selectedAwardKeys.clear();
        this._awardByKey.clear();
        for (let i = this.PropContent.children.length - 1; i >= 0; i--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.PropContent.children[i]);
        }
        const props = ZRSJZ_MailService.GetMailProps(this._curMailID);
        this.PartialClaimBtn.active = props.length > 0;
        this.ClaimBtn.active = props.length > 0;
        if (props.length <= 0) return;
        for (let i = 0; i < props.length; i++) {
            const selectionKey = `${this._curMailID}:${i}`;
            this._awardByKey.set(selectionKey, props[i]);
            this.LoadProp(props[i], selectionKey, showVersion);
        }
    }

    LoadProp(award: ZRSJZ_MailPropAward, selectionKey: string, showVersion: number) {
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/TaskAward").then(prop => {
            if (showVersion !== this._showPropVersion || !this.node.isValid) {
                ZRSJZ_PoolManager.Instance.PutNode(prop);
                return;
            }
            prop.parent = this.PropContent;
            prop.active = true;
            const awardUI = prop.getComponent(ZRSJZ_TaskAward);
            awardUI?.Init(
                award.PropName,
                award.Count,
                selectionKey,
            );
            awardUI?.GetShow(this._isPartialClaim);
        })
    }

    OnButtonClick(event: EventTouch): void {
        if (this._isClaiming) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Close":
                this.ExitPartialClaim();
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.邮件界面);
                break;
        }
    }

    private OnPartialClaimClick(): void {
        if (this._isClaiming || this._isPartialClaim || this._awardByKey.size <= 0) return;
        ZRSJZ_AudioManager.Instance?.PlaySound("点击");
        this._isPartialClaim = true;
        this._selectedAwardKeys.clear();
        // CheckMask 的全屏 Mask 带有 BlockInputEvents。放到 MailDesc 子节点底层，
        // 让奖励格和“领取”按钮仍可点击，同时点击空白区域仍会取消挑选。
        this.CheckMask.setSiblingIndex(0);
        this.CheckMask.active = true;
        this.PartialClaimChecked.active = true;
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_MAIL_GET_PROP, true);
    }

    private OnCancelPartialClaim(): void {
        if (this._isClaiming || !this._isPartialClaim) return;
        ZRSJZ_AudioManager.Instance?.PlaySound("点击");
        this.ExitPartialClaim();
    }

    private ExitPartialClaim(): void {
        this._isPartialClaim = false;
        this._selectedAwardKeys.clear();
        if (this.CheckMask?.isValid) this.CheckMask.active = false;
        if (this.PartialClaimChecked?.isValid) this.PartialClaimChecked.active = false;
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_MAIL_GET_PROP, false);
    }

    private OnAwardSelectionChanged(selectionKey: string, selected: boolean): void {
        if (!this._isPartialClaim || !this._awardByKey.has(selectionKey)) return;
        if (selected) this._selectedAwardKeys.add(selectionKey);
        else this._selectedAwardKeys.delete(selectionKey);
    }

    private async OnClaimClick(): Promise<void> {
        if (this._isClaiming || !this._curMailID) return;
        const currentAwards = ZRSJZ_MailService.GetMailProps(this._curMailID);
        if (currentAwards.length <= 0) return;

        const selectedEntries = Array.from(this._awardByKey.entries())
            .filter(([selectionKey]) =>
                !this._isPartialClaim || this._selectedAwardKeys.has(selectionKey)
            );
        if (selectedEntries.length <= 0) {
            ZRSJZ_UIManager.Instance.ShowTip("请先选择需要领取的道具");
            return;
        }

        ZRSJZ_AudioManager.Instance?.PlaySound("点击");
        const isPartialClaim = this._isPartialClaim;
        this._isClaiming = true;
        try {
            const claimAwards = selectedEntries.map(([, award]) => award);
            const selectedKeys = new Set(selectedEntries.map(([selectionKey]) => selectionKey));
            const claimCount = claimAwards.reduce((sum, award) => sum + award.Count, 0);
            const result = await ZRSJZ_UIManager.Instance.ReceiveMailPropAwards(claimAwards);
            const failedAwards = this.MergeFailedAwards(
                result.MailAwards,
                result.InvalidAwards,
            );
            const receivedAwards = this.SubtractAwards(claimAwards, failedAwards);
            const failedCount = failedAwards.reduce((sum, award) => sum + award.Count, 0);

            const remainingAwards = isPartialClaim
                ? Array.from(this._awardByKey.entries())
                    .filter(([selectionKey]) => !selectedKeys.has(selectionKey))
                    .map(([, award]) => award)
                    .concat(failedAwards)
                : failedAwards;
            ZRSJZ_MailService.SetMailProps(this._curMailID, remainingAwards);
            this.ExitPartialClaim();
            this.RefreshCurrentMail();

            const receivedCount = claimCount - failedCount;
            if (receivedCount <= 0) {
                ZRSJZ_UIManager.Instance.ShowTip("仓库空间不足，所选道具仍保留在邮件中");
            } else if (failedCount > 0) {
                ZRSJZ_UIManager.Instance.ShowTip("已领取可存放的道具，剩余道具继续保留在邮件中");
            } else {
                ZRSJZ_UIManager.Instance.ShowTip("邮件道具领取成功");
            }
            this.ShowReceivedAwards(receivedAwards);
        } finally {
            this._isClaiming = false;
        }
    }

    /** 遍历所有未领完邮件；每封邮件只移除实际成功进入仓库的附件。 */
    private async OnClaimAllClick(): Promise<void> {
        if (this._isClaiming) return;
        const mailIDs = ZRSJZ_MailService.GetMailIDs()
            .filter(mailID => ZRSJZ_MailService.GetMailProps(mailID).length > 0);
        if (mailIDs.length <= 0) {
            ZRSJZ_UIManager.Instance.ShowTip("当前没有可领取的邮件道具");
            return;
        }

        ZRSJZ_AudioManager.Instance?.PlaySound("点击");
        this.ExitPartialClaim();
        this._isClaiming = true;
        let receivedCount = 0;
        let failedCount = 0;
        const receivedAwards: ZRSJZ_MailPropAward[] = [];
        try {
            for (const mailID of mailIDs) {
                const awards = ZRSJZ_MailService.GetMailProps(mailID);
                const awardCount = awards.reduce((sum, award) => sum + award.Count, 0);
                const result = await ZRSJZ_UIManager.Instance.ReceiveMailPropAwards(awards);
                const failedAwards = this.MergeFailedAwards(
                    result.MailAwards,
                    result.InvalidAwards,
                );
                const currentFailedCount = failedAwards.reduce(
                    (sum, award) => sum + award.Count,
                    0,
                );
                receivedCount += awardCount - currentFailedCount;
                failedCount += currentFailedCount;
                receivedAwards.push(...this.SubtractAwards(awards, failedAwards));
                ZRSJZ_MailService.SetMailProps(mailID, failedAwards);
            }
            this.RefreshCurrentMail();
        } finally {
            this._isClaiming = false;
        }

        if (receivedCount <= 0) {
            ZRSJZ_UIManager.Instance.ShowTip("仓库空间不足，邮件道具均未领取");
        } else if (failedCount > 0) {
            ZRSJZ_UIManager.Instance.ShowTip("已领取可存放的邮件道具，其余仍保留在原邮件中");
        } else {
            ZRSJZ_UIManager.Instance.ShowTip("全部邮件道具领取成功");
        }
        this.ShowReceivedAwards(this.MergeAwards(receivedAwards));
    }

    private async OnDeleteReadClick(): Promise<void> {
        if (this._isClaiming) return;
        ZRSJZ_AudioManager.Instance?.PlaySound("点击");
        this.ExitPartialClaim();
        const deleteCount = ZRSJZ_MailService.DeleteClaimedMails();
        this.InitMailItems();
        ZRSJZ_UIManager.Instance.ShowTip(
            deleteCount > 0
                ? `已删除${deleteCount}封已领取邮件`
                : "没有可以删除的已领取邮件",
        );
    }

    /** 配置缺失的附件同样视为领取失败，必须继续保留，避免存档奖励丢失。 */
    private MergeFailedAwards(
        mailAwards: ReadonlyArray<Readonly<ZRSJZ_MailPropAward>>,
        invalidAwards: ReadonlyArray<{ PropName: string, Count: number }>,
    ): ZRSJZ_MailPropAward[] {
        return this.MergeAwards([...mailAwards, ...invalidAwards]);
    }

    private MergeAwards(
        awards: ReadonlyArray<{ PropName: string, Count: number }>,
    ): ZRSJZ_MailPropAward[] {
        const countByName = new Map<string, number>();
        for (const award of awards) {
            if (!award?.PropName || award.Count <= 0) continue;
            countByName.set(
                award.PropName,
                (countByName.get(award.PropName) ?? 0) + award.Count,
            );
        }
        return Array.from(countByName.entries())
            .map(([PropName, Count]) => ({ PropName, Count }));
    }

    private SubtractAwards(
        requestedAwards: ReadonlyArray<Readonly<ZRSJZ_MailPropAward>>,
        failedAwards: ReadonlyArray<Readonly<ZRSJZ_MailPropAward>>,
    ): ZRSJZ_MailPropAward[] {
        const requested = new Map(
            this.MergeAwards(requestedAwards)
                .map(award => [award.PropName, award.Count] as const),
        );
        for (const failedAward of failedAwards) {
            requested.set(
                failedAward.PropName,
                Math.max(0, (requested.get(failedAward.PropName) ?? 0) - failedAward.Count),
            );
        }
        return Array.from(requested.entries())
            .filter(([, Count]) => Count > 0)
            .map(([PropName, Count]) => ({ PropName, Count }));
    }

    private ShowReceivedAwards(awards: ReadonlyArray<Readonly<ZRSJZ_MailPropAward>>): void {
        if (awards.length <= 0) return;
        ZRSJZ_UIManager.Instance.ShowPanel(
            ZRSJZ_PANEL.获取奖励弹窗,
            {
                DisplayOnly: true,
                Awards: awards.map(award => ({
                    TaskAwardName: award.PropName,
                    TaskAwardCount: award.Count,
                })),
            },
        );
    }

    private RefreshCurrentMail(): void {
        for (const child of this.MailItemContent.children) {
            child.getComponent(ZRSJZ_MailItem)?.ShowState();
        }
        this.ShowProp();
    }

}
