import { _decorator, EventTouch, Label, Node, Sprite } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_GameData } from '../WZSJZ_GameData';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';

const { ccclass } = _decorator;

/** 每日五档挂机宝箱界面，所有倒计时均使用真实时间戳。 */
@ccclass('WZSJZ_HookPanel')
export class WZSJZ_HookPanel extends PanelBase {
    private _nextRefreshTimestamp: number = 0;

    public Show(): void {
        super.Show(this.node.getChildByName("Panel"));
        this._nextRefreshTimestamp = 0;
        this.RefreshView(Date.now());
    }

    protected update(): void {
        if (!this.node.activeInHierarchy) return;
        const now = Date.now();
        if (now < this._nextRefreshTimestamp) return;
        this._nextRefreshTimestamp = now + 250;
        this.RefreshView(now);
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "关闭":
                WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.HookPanel);
                break;
            case "领奖":
                this.ClaimCurrentChest();
                break;
        }
    }

    private ClaimCurrentChest(): void {
        const now = Date.now();
        const before = WZSJZ_GameData.Instance.GetHookSnapshot(now);
        if (before.AllClaimed) {
            WZSJZ_UIManager.Instance.ShowText("今日挂机宝箱已全部领取");
            return;
        }
        if (!before.CanClaim) {
            WZSJZ_AudioManager.Play('操作失败', 0.6);
            WZSJZ_UIManager.Instance.ShowText(
                `还需等待${this.FormatTime(before.RemainingSeconds)}`,
            );
            return;
        }
        const result = WZSJZ_GameData.Instance.ClaimHookReward(now);
        if (!result.Success) return;
        WZSJZ_AudioManager.Play('奖励获得', 0.82);
        WZSJZ_UIManager.Instance.ShowText(`获得钻石 +${result.Amount}`);
        this.RefreshView(now);
    }

    private RefreshView(nowTimestamp: number): void {
        const snapshot = WZSJZ_GameData.Instance.GetHookSnapshot(nowTimestamp);
        const root = this.node.getChildByPath("Panel/弹版");
        if (!root) return;

        const chestImage = root.getChildByName("宝箱图");
        for (let level = 1; level <= WZSJZ_Constant.Hook.DiamondRewards.length; level++) {
            this.SetActive(
                chestImage?.getChildByName(`${level}级宝箱`),
                level === snapshot.CurrentLevel,
            );
        }

        const progressRoot = root.getChildByName("进度条");
        const progress = progressRoot?.getChildByName("挂机加载条")?.getComponent(Sprite);
        if (progress) {
            progress.type = Sprite.Type.FILLED;
            progress.fillType = Sprite.FillType.HORIZONTAL;
            progress.fillStart = 0;
            progress.fillRange = snapshot.Progress;
        }
        const timeLabel = progressRoot?.getChildByName("时间")?.getComponent(Label);
        if (timeLabel) {
            timeLabel.string = snapshot.AllClaimed
                ? "今日已全部领取"
                : snapshot.CanClaim
                    ? "可领取"
                    : this.FormatTime(snapshot.RemainingSeconds);
        }

        const receiveView = root.getChildByName("宝箱领取显示");
        for (let index = 0; index < WZSJZ_Constant.Hook.DiamondRewards.length; index++) {
            const item = receiveView?.getChildByName(`${index + 1}级宝箱`);
            this.SetActive(item?.getChildByName("已领取"), snapshot.Claimed[index]);
            this.SetActive(
                item?.getChildByName("提示红点"),
                !snapshot.Claimed[index]
                && index === snapshot.CurrentIndex
                && snapshot.CanClaim,
            );
        }
        const rewardLabel = receiveView
            ?.getChildByPath("奖励/Label")
            ?.getComponent(Label);
        if (rewardLabel) rewardLabel.string = `获得${snapshot.Reward}钻石`;

        const claimLabel = root.getChildByPath("领奖/Label")?.getComponent(Label);
        if (claimLabel) {
            claimLabel.string = snapshot.AllClaimed
                ? "今日已领完"
                : snapshot.CanClaim ? "领取" : "等待中";
        }
    }

    private FormatTime(totalSeconds: number): string {
        const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    private SetActive(node: Node, active: boolean): void {
        if (node) node.active = active;
    }
}
