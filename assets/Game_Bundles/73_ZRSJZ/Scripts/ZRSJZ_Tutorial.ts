import { _decorator, Component, Node, tween, Tween, UITransform } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_AMMO_MAX_COUNT, ZRSJZ_INVENTORY, ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_Game } from './ZRSJZ_Game';
import { ZRSJZ_TutorialPanel } from './Panel/ZRSJZ_TutorialPanel';
import { ZRSJZ_GameData } from './ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Tutorial')
export class ZRSJZ_Tutorial extends Component {

    @property(Node)
    TutorialNodes: Node[] = [];

    TipFlag: boolean[] = [false, false, false];
    PropID: string = "";
    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL, this.Tutorial, this);
    }

    Tutorial(index: number, target?: Node, propID?: string) {
        if (index == 1) {
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "Mask", this.TutorialNodes[0], "搜索物资");
            ZRSJZ_Game.Instance.GamePaused = true;
        } else if (index == 2 && !this.TipFlag[0]) {
            this.TipFlag[0] = true;
            this.PropID = propID;
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "Tip", target, "双击或者拖动拾取");
        } else if (index == 3 && !this.TipFlag[1] && propID == this.PropID) {
            ZRSJZ_TutorialPanel.IsTipShowing = true;
            this.TipFlag[1] = true;
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "Tip", target, "双击或者拖动装备武器");
        } else if (index == 4 && !this.TipFlag[2]) {
            this.TipFlag[2] = true;
            this.TutorialNodes[4].active = true;
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "MaskTip", this.TutorialNodes[1], "背包里面可以切换装备", [
                this.TutorialNodes[3]], ["可以通过切换来更换当前武器"]);
        } else if (index == 5) {
            ZRSJZ_GameData.Instance.IsTutorial = true;
            ZRSJZ_GameData.Instance.CurMap = "五号小镇_机密行动";
        } else if (index == 6 && !this.TipFlag[3]) {
            this.TipFlag[3] = true
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "Mask", this.TutorialNodes[2], "使用治疗恢复状态");
            ZRSJZ_Game.Instance.GamePaused = true;
        }
    }

}


