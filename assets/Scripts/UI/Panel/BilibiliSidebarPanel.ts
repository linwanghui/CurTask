import { _decorator, Component, Node, Event, Vec3, JsonAsset, tween, RichText, Tween, UITransform, v3 } from 'cc';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import Banner, { Company } from '../../Banner';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import PrefsManager from '../../Framework/Managers/PrefsManager';
import { PanelBase } from '../../Framework/UI/PanelBase';
import { GameManager } from '../../GameManager';

const { ccclass, property } = _decorator;

@ccclass('BilibiliSidebarPanel')
export default class BilibiliSidebarPanel extends PanelBase {
    Panel: Node = null;
    SidebarButton: Node = null;
    GetRewardButton: Node = null;

    protected onLoad(): void {
        this.Panel = NodeUtil.GetNode("Panel", this.node);
        this.SidebarButton = NodeUtil.GetNode("SidebarButton", this.node);
        this.GetRewardButton = NodeUtil.GetNode("GetRewardButton", this.node);
    }

    Show() {
        super.Show();
        tween(this.Panel).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        this.GetRewardButton.active = Banner.Instance.IsBilibiliSiderBarEnter();
    }

    OnButtonClick(event: Event) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);

        switch (event.target.name) {
            case "GetRewardButton":
                if (BilibiliSidebarPanel.IsGotTodayAward) {
                    UIManager.ShowTip(`今天的奖励已经领取过了`);
                    return;
                }

                let rewardCount = 99999;
                GameManager.RewardItemCount += rewardCount;
                UIManager.ShowTip(`奖励道具已发放：+${rewardCount}`);
                BilibiliSidebarPanel.IsGotTodayAward = true;
                break;
            case "SidebarButton":
                Banner.Instance.BilibiliNavigateToScene(() => {
                    this.GetRewardButton.active = true;
                });
                break;
            case "Mask":
            case "CloseButton":
                UIManager.HidePanel(Panel.BilibiliSidebarPanel);
                break;

        }
    }

    public static get IsGotTodayAward(): boolean {
        let nowdate = new Date();
        return PrefsManager.GetBool(`IsGotAward_${nowdate.getFullYear()}${nowdate.getMonth()}${nowdate.getDate()}`, false);
    }

    public static set IsGotTodayAward(isGotAward: boolean) {
        let nowdate = new Date();
        PrefsManager.SetBool(`IsGotAward_${nowdate.getFullYear()}${nowdate.getMonth()}${nowdate.getDate()}`, isGotAward);
    }
}
