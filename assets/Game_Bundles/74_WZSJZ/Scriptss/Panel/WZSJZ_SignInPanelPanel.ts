import { _decorator, EventTouch, Node } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_GameData } from '../WZSJZ_GameData';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';

const { ccclass } = _decorator;

/** 七日签到界面；文件名保留旧名以维持原meta UUID和预制体挂载。 */
@ccclass('WZSJZ_SignInPanel')
export class WZSJZ_SignInPanel extends PanelBase {
    Show(): void {
        super.Show(this.node.getChildByName("Panel"));
        this.RefreshDays();
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "关闭":
                WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.SignInPanel);
                break;
            case "签到领取":
                this.ClaimTodayReward();
                break;
        }
    }

    private ClaimTodayReward(): void {
        const result = WZSJZ_GameData.Instance.ClaimSignInReward();
        if (!result.Success) {
            WZSJZ_UIManager.Instance.ShowText("今日奖励已领取");
            this.RefreshDays();
            return;
        }
        const rewardName = result.RewardType === "diamond" ? "钻石" : "体力";
        WZSJZ_AudioManager.Play('奖励获得', 0.82);
        WZSJZ_UIManager.Instance.ShowText(
            `签到成功：${rewardName} +${result.Amount}`,
        );
        this.RefreshDays();
    }

    private RefreshDays(): void {
        const signInFrame = this.node.getChildByPath("Panel/框/签到框");
        if (!signInFrame) {
            console.error("[WZSJZ] SignInPanel缺少Panel/框/签到框节点。");
            return;
        }
        const snapshot = WZSJZ_GameData.Instance.GetSignInSnapshot();
        for (let index = 0; index < WZSJZ_Constant.SignIn.Rewards.length; index++) {
            const dayNode = signInFrame.getChildByName(`day${index + 1}`);
            if (!dayNode) continue;
            const claimed = snapshot.ClaimedDays[index];
            const isToday = index === snapshot.TodayIndex;
            this.SetActive(dayNode.getChildByName("待签到卡"), !isToday);
            this.SetActive(dayNode.getChildByName("已领取"), claimed);
            this.SetActive(
                dayNode.getChildByName("今日领取"),
                isToday && snapshot.CanClaimToday && !claimed,
            );
            this.SetActive(
                dayNode.getChildByName("签到领取"),
                !claimed && !(isToday && snapshot.CanClaimToday),
            );
        }
        this.SetActive(
            signInFrame.getChildByName("签到领取"),
            snapshot.CanClaimToday,
        );
    }

    private SetActive(node: Node, active: boolean): void {
        if (node) node.active = active;
    }
}
