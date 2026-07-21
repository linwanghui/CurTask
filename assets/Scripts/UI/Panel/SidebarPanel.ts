import { _decorator, Component, Node, Event, Vec3, JsonAsset, tween, RichText, Tween, UITransform, v3 } from 'cc';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import Banner, { Company } from '../../Banner';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { Constant } from '../../Framework/Const/Constant';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import PrefsManager from '../../Framework/Managers/PrefsManager';
import { PanelBase } from '../../Framework/UI/PanelBase';


const { ccclass, property } = _decorator;

@ccclass('SidebarPanel')
export default class SidebarPanel extends PanelBase {
    Panel: Node = null;
    SidebarButton: Node = null;
    protected onLoad(): void {
        this.Panel = NodeUtil.GetNode("Panel", this.node);
        this.SidebarButton = NodeUtil.GetNode("SidebarButton", this.node);
    }

    Show() {
        super.Show();
        tween(this.Panel).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    OnButtonClick(event: Event) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);

        switch (event.target.name) {
            case "SidebarButton":
                if (SidebarPanel.GetIsGotAward()) {
                    UIManager.ShowTip(`已经领取过奖励`);
                    return;
                }
                Banner.Instance.NavigateToScene(() => {
                    SidebarPanel.SetIsGotAward(true);
                    //侧边栏奖励：
                    //暂无奖励
                    UIManager.HidePanel(Panel.SidebarPanel);
                    UIManager.ShowTip(`奖励发放成功`);
                });
                break;
            case "Mask":
            case "CloseButton":
                UIManager.HidePanel(Panel.SidebarPanel);
                break;

        }
    }

    public static GetIsGotAward(): boolean {
        let nowdate = new Date();
        return PrefsManager.GetBool(`IsGotAward_${nowdate.getFullYear()}${nowdate.getMonth()}${nowdate.getDate()}`, false);
    }

    public static SetIsGotAward(isGotAward: boolean) {
        let nowdate = new Date();
        PrefsManager.SetBool(`IsGotAward_${nowdate.getFullYear()}${nowdate.getMonth()}${nowdate.getDate()}`, isGotAward);
    }
}
