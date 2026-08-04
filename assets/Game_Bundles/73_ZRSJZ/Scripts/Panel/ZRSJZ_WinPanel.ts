import { _decorator, Component, EventTouch, find, Label, Node, sp, tween, Tween, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_WinPanel')
export class ZRSJZ_WinPanel extends ZRSJZ_Panel {

    Earnings: Label = null;
    Evacuate: Label = null;
    BattleTime: Label = null;
    KillCount: Label = null;
    Skeleton: sp.Skeleton = null;
    Point: Node = null;
    Mask: Node = null;

    protected onLoad(): void {
        this.Earnings = find("Panel/收益/Earnings", this.node).getComponent(Label);
        this.Evacuate = find("Panel/Desc/撤离方式/Count", this.node).getComponent(Label);
        this.BattleTime = find("Panel/Desc/对局时间/Count", this.node).getComponent(Label);
        this.KillCount = find("Panel/Desc/击杀人数/Count", this.node).getComponent(Label);
        this.Skeleton = find("Panel/WinSkeleton", this.node).getComponent(sp.Skeleton);
        this.Point = find("Panel/WinPoint", this.node);
        this.Mask = find("Panel/Mask", this.node);
    }

    Show(...args: any[]) {
        super.Show();
        this.Mask.active = true;
        this.Evacuate.string = args[0];
        this.BattleTime.string = args[1];
        this.KillCount.string = args[2];
        this.ShowAllProp(args[3]);
        Tween.stopAllByTarget(this.Skeleton.node);
        this.Skeleton.node.setPosition(Vec3.ZERO);
        this.Skeleton.node.setScale(2, 2, 1);
        this.Skeleton.setAnimation(0, "shengli", false);
        this.Skeleton.setCompleteListener(() => {
            this.Skeleton.setAnimation(0, "daiji", true);
            this.Mask.active = false;
            tween(this.Skeleton.node)
                .to(0.3, { worldPosition: this.Point.worldPosition.clone() }, { easing: 'circIn' })
                .start();
            tween(this.Skeleton.node)
                .to(0.3, { scale: Vec3.ONE }, { easing: 'circIn' })
                .start();
        });
    }

    ShowAllProp(propID: string[]) {

    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.胜利弹窗);
                break;
        }
    }


}


