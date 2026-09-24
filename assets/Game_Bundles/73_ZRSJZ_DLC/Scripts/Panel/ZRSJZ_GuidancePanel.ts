import { _decorator, BlockInputEvents, EventTouch, find, isValid, Label, Layout, Node, Tween, tween, UITransform, Vec3, Widget } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_Guidance } from '../ZRSJZ_Guidance';

const { ccclass } = _decorator;

export interface ZRSJZ_GuidanceRequest {
    steps: ZRSJZ_Guidance[];
    owner: Node;
    feature: string;
}

@ccclass('ZRSJZ_GuidancePanel')
export class ZRSJZ_GuidancePanel extends ZRSJZ_Panel {
    private _steps: ZRSJZ_Guidance[] = [];
    private _owner: Node = null;
    private _index = 0;
    private _moving = false;
    private _mask: Node = null;
    private _tip: Node = null;

    public Show(request: ZRSJZ_GuidanceRequest): void {
        this.Panel = find('Panel', this.node);
        this._mask = find('Panel/MaskTip/Mask', this.node);
        this._tip = find('Panel/Tip', this.node);
        this.StopMovement();
        this._steps = request?.steps?.filter(step => isValid(step, true) && step.IsConfigured) ?? [];
        this._owner = request?.owner;
        this._index = 0;
        const data = ZRSJZ_GameData.Instance;
        if (!this._steps.length || !isValid(this._owner, true) || !this._owner.activeInHierarchy
            || !ZRSJZ_UIManager.Instance.IsCurrentPanel(this._owner)
            || !request.feature || data.StartedFeatureGuides?.[request.feature]) {
            this.Close();
            return;
        }
        // 全屏引导不使用普通弹窗的缩放入场动画。
        Tween.stopAllByTarget(this.Panel);
        this.Panel.setScale(Vec3.ONE);
        this.node.active = true;
        this.node.getComponent(Widget)?.updateAlignment();
        this.Panel.getComponent(Widget)?.updateAlignment();
        const maskWidget = this._mask.getComponent(Widget);
        if (maskWidget) maskWidget.enabled = false;
        this._mask.getComponent(UITransform).setAnchorPoint(0.5, 0.5);
        if (!this.node.getComponent(BlockInputEvents)) this.node.addComponent(BlockInputEvents);
        this.node.off(Node.EventType.TOUCH_END, this.OnNext, this, true);
        this.node.on(Node.EventType.TOUCH_END, this.OnNext, this, true);
        if (!data.StartedFeatureGuides) data.StartedFeatureGuides = {};
        data.StartedFeatureGuides[request.feature] = true;
        ZRSJZ_GameData.SaveData();
        this.ShowStep();
    }

    private ShowStep(): void {
        const step = this._steps[this._index];
        if (!isValid(step, true) || !step.IsConfigured) { this.Close(); return; }
        const bounds = step.GetMaskBounds(this._mask.parent.getComponent(UITransform));
        const tipPosition = step.GetTipPosition(this._tip.parent.getComponent(UITransform));
        const label = find('Tip', this._tip).getComponent(Label);
        label.string = step.TipLabel.string;
        label.updateRenderData(true);
        this._tip.getComponent(Layout)?.updateLayout();
        this.StopMovement();
        this._moving = true;
        tween(this._mask).to(0.3, { position: bounds.position }, { easing: 'sineInOut' }).start();
        tween(this._mask.getComponent(UITransform))
            .to(0.3, { width: bounds.width, height: bounds.height }, { easing: 'sineInOut' }).start();
        tween(this._tip).to(0.3, { position: tipPosition }, { easing: 'sineInOut' })
            .call(() => { this._moving = false; }).start();
    }

    private OnNext(event: EventTouch): void {
        event.propagationStopped = true;
        if (!ZRSJZ_UIManager.Instance.IsCurrentPanel(this._owner)) { this.Close(); return; }
        // 防止移动期间连点跳过尚未看清的提示。
        if (this._moving) return;
        if (++this._index >= this._steps.length) this.Close();
        else this.ShowStep();
    }

    protected update(): void {
        if (!ZRSJZ_UIManager.Instance.IsCurrentPanel(this._owner)) this.Close();
    }

    private StopMovement(): void {
        if (isValid(this._mask, true)) {
            Tween.stopAllByTarget(this._mask);
            Tween.stopAllByTarget(this._mask.getComponent(UITransform));
        }
        if (isValid(this._tip, true)) Tween.stopAllByTarget(this._tip);
        this._moving = false;
    }

    private Close(): void {
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.界面引导弹窗);
    }

    public Hide(): void {
        this.node.active = false;
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_END, this.OnNext, this, true);
        this.StopMovement();
        this._steps = [];
        this._owner = null;
    }
}
