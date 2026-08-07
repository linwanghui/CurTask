import { _decorator, EventTouch, find, Label, Node, sp, tween, Tween, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_FailPanel')
export class ZRSJZ_FailPanel extends ZRSJZ_Panel {

    Evacuate: Label = null;
    BattleTime: Label = null;
    KillCount: Label = null;
    Skeleton: sp.Skeleton = null;
    Point: Node = null;
    Mask: Node = null;
    private _isReturning: boolean = false;

    protected onLoad(): void {
        this.Evacuate = find("Panel/Desc/撤离方式/Count", this.node).getComponent(Label);
        this.BattleTime = find("Panel/Desc/对局时间/Count", this.node).getComponent(Label);
        this.KillCount = find("Panel/Desc/击杀人数/Count", this.node).getComponent(Label);
        this.Skeleton = find("Panel/FailSkeleton", this.node).getComponent(sp.Skeleton);
        this.Point = find("Panel/FailPoint", this.node);
        this.Mask = find("Panel/Mask", this.node);
    }

    Show(...args: any[]) {
        super.Show();
        this._isReturning = false;
        this.Mask.active = true;
        this.Evacuate.string = args[0];
        this.BattleTime.string = args[1];
        this.KillCount.string = args[2];
        Tween.stopAllByTarget(this.Skeleton.node);
        this.Skeleton.node.setPosition(Vec3.ZERO);
        this.Skeleton.node.setScale(2, 2, 1);
        this.Skeleton.setAnimation(0, "shibai", false);
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

    public async OnButtonClick(event: EventTouch): Promise<void> {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
                if (this._isReturning) return;
                this._isReturning = true;
                await ZRSJZ_UIManager.Instance.FinishGameInventory(false);
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.加载界面, "ZRSJZ_Star");
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.失败弹窗);
                break;
        }
    }

}


