import { _decorator, Component, find, Label, Node, tween, Tween, UITransform } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_TutorialPanel')
export class ZRSJZ_TutorialPanel extends ZRSJZ_Panel {
    public static IsTipShowing: boolean = false;

    MaskNode: Node = null;
    TipNode: Node = null;
    TipLabel: Label = null;
    TipMaskNode: Node = null;
    TipMaskLabel: Label = null;
    NextTipNode: Node = null;

    protected onLoad(): void {
        this.MaskNode = find("Panel/Mask", this.node);
        this.TipNode = find("Panel/Tip", this.node);
        this.TipLabel = find("Panel/Tip/Tip/Tip", this.node).getComponent(Label);
        this.TipMaskNode = find("Panel/MaskTip", this.node);
        this.TipMaskLabel = find("Panel/MaskTip/Tip/Tip", this.node).getComponent(Label);
        this.NextTipNode = find("Panel/NextTip", this.node);
    }

    Show(type: string, target: Node, tip?: string, nextTargets?: Node[], nextTips?: string[]): void {
        this.node.active = true;
        this.MaskNode.active = false;
        this.TipNode.active = false;
        if (type == "Mask") {
            this.TrackTarget(target);
        } else if (type == "Tip") {
            this.ShowTip(target, tip);
        } else if (type == "MaskTip") {
            this.NextTipNode.active = true;
            this.TipMaskNode.active = true;
            this.ShowMaskTip([target, ...nextTargets], [tip, ...nextTips]);
        }
    }

    TrackTarget(target: Node) {
        this.scheduleOnce(() => {
            const uitransform: UITransform = this.MaskNode.getComponent(UITransform);
            uitransform.setContentSize(target.getComponent(UITransform).contentSize);
        }, 0.1)
        Tween.stopAllByTarget(this.MaskNode);
        this.MaskNode.active = true;
        tween(this.MaskNode)
            .to(0.5, { worldPosition: target.worldPosition.clone() })
            .call(() => {
                target.once(Node.EventType.TOUCH_END, () => {
                    this.MaskNode.active = false;
                    ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.新手引导弹窗);
                    ZRSJZ_Game.Instance.GamePaused = false;
                })
            })
            .start();
    }

    ShowTip(target: Node, tip: string) {
        this.TipNode.setWorldPosition(target.worldPosition.clone());
        this.TipLabel.string = tip;
        this.TipNode.active = true;
        target.once(Node.EventType.TOUCH_START, () => {
            this.TipNode.active = false;
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.新手引导弹窗);
            ZRSJZ_TutorialPanel.IsTipShowing = false;
        })
    }

    ShowMaskTip(targets: Node[], tips: string[]) {
        if (targets.length > 0) {
            this.TrackTarget_MaskTip(targets.shift(), tips.shift(), () => {
                if (targets.length == 0) {
                    this.NextTipNode.active = false;
                    this.TipMaskNode.active = false;
                    ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.新手引导弹窗);
                } else {
                    this.ShowMaskTip([...targets], [...tips]);
                }
            })
        } else {
            this.NextTipNode.active = false;
            this.TipMaskNode.active = false;
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.新手引导弹窗);
        }
    }

    TrackTarget_MaskTip(target: Node, tip: string, cb: Function) {
        const uitransform: UITransform = this.TipMaskNode.getComponent(UITransform);
        uitransform.setContentSize(target.getComponent(UITransform).contentSize.width + 10, target.getComponent(UITransform).contentSize.height + 10);
        Tween.stopAllByTarget(this.TipMaskNode);
        this.TipMaskLabel.string = tip;
        tween(this.TipMaskNode)
            .to(0.3, { worldPosition: target.worldPosition.clone() })
            .call(() => {
                find("Mask/Mask", this.TipMaskNode).once(Node.EventType.TOUCH_END, () => {
                    cb && cb()
                })
            })
            .start();
    }

}


