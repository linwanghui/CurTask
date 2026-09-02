import { _decorator, Component, Label, Node, Tween, tween, UIOpacity, Vec3 } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';

const { ccclass } = _decorator;

/** 单个上漂伤害数字；节点生命周期由通用特效系统的对象池管理。 */
@ccclass('WZSJZ_DamageNumber')
export class WZSJZ_DamageNumber extends Component {
    private _label: Label = null;
    private _opacity: UIOpacity = null;
    private _baseScale: Vec3 = new Vec3(1, 1, 1);
    private _animation: Tween<Node> = null;
    private _recycleCallback: ((display: WZSJZ_DamageNumber) => void) = null;

    protected onLoad(): void {
        this._label = this.getComponent(Label) || this.getComponentInChildren(Label);
        this._opacity = this.getComponent(UIOpacity) || this.addComponent(UIOpacity);
        this._baseScale.set(this.node.scale);
    }

    public Show(
        damage: number,
        worldPosition: Vec3,
        recycleCallback: (display: WZSJZ_DamageNumber) => void,
    ): void {
        this.StopAnimation();
        this._recycleCallback = recycleCallback;
        if (!this._label) {
            this._label = this.getComponent(Label) || this.getComponentInChildren(Label);
        }
        if (!this._opacity) {
            this._opacity = this.getComponent(UIOpacity) || this.addComponent(UIOpacity);
        }
        if (this._label) {
            this._label.string = Math.max(0, Math.round(damage)).toString();
        }
        this._opacity.opacity = 255;
        this.node.setScale(this._baseScale);

        const config = WZSJZ_Constant.DamageNumber;
        const start = worldPosition.clone();
        start.x += (Math.random() * 2 - 1) * config.RandomOffsetX;
        start.y += (Math.random() * 2 - 1) * config.RandomOffsetY;
        this.node.setWorldPosition(start);

        const poppedScale = new Vec3(
            this._baseScale.x * config.PopScale,
            this._baseScale.y * config.PopScale,
            this._baseScale.z,
        );
        const endScale = new Vec3(
            this._baseScale.x * config.EndScale,
            this._baseScale.y * config.EndScale,
            this._baseScale.z,
        );
        this._animation = tween(this.node)
            .to(config.PopDuration, {
                scale: poppedScale,
                worldPosition: new Vec3(
                    start.x,
                    start.y + config.FirstRiseDistance,
                    start.z,
                ),
            }, { easing: 'quadOut' })
            .to(config.SettleDuration, {
                scale: this._baseScale.clone(),
                worldPosition: new Vec3(
                    start.x,
                    start.y + config.SecondRiseDistance,
                    start.z,
                ),
            }, { easing: 'quadInOut' })
            .to(config.FadeDuration, {
                scale: endScale,
                worldPosition: new Vec3(
                    start.x,
                    start.y + config.SecondRiseDistance + config.FinalRiseDistance,
                    start.z,
                ),
            }, {
                easing: 'quadOut',
                onUpdate: (_target, ratio) => {
                    if (this._opacity) {
                        this._opacity.opacity = Math.round(255 * (1 - ratio));
                    }
                },
            })
            .call(this.Recycle)
            .start();
    }

    private Recycle = (): void => {
        this._animation = null;
        const callback = this._recycleCallback;
        this._recycleCallback = null;
        callback?.(this);
    };

    private StopAnimation(): void {
        this._animation?.stop();
        this._animation = null;
        Tween.stopAllByTarget(this.node);
        if (this._opacity) this._opacity.opacity = 255;
        this.node.setScale(this._baseScale);
    }

    protected onDisable(): void {
        this.StopAnimation();
    }
}
