import { _decorator, Component, Label, math, Node, tween, Tween, v3, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_HarmEffect')
export class ZRSJZ_HarmEffect extends Component {

    Harm: Label = null;

    private _isInit: boolean = false;
    private _baseScale: Vec3 = null;

    Show(worldPos: Vec3, harm: number) {
        if (!this._isInit) {
            this._isInit = true;
            this.Harm = this.node.getChildByName("Harm").getComponent(Label);
            this._baseScale = this.node.scale.clone();
        }
        // 仅飘字向下取整，实际伤害与扣血仍保留原有精度。
        this.Harm.string = `${Math.floor(harm)}`;
        Tween.stopAllByTarget(this.node);
        this.node.setScale(this._baseScale);
        this.node.setWorldPosition(v3(worldPos.x + math.randomRangeInt(-50, 50), worldPos.y + math.randomRangeInt(200, 300), worldPos.z));
        tween(this.node)
            .parallel(
                // 总时长由 0.3 秒延长至 0.45 秒，保留原来的上浮距离。
                tween().by(0.45, { y: math.randomRangeInt(50, 200) }, { easing: 'backOut' }),
                tween()
                    .to(0.12, { scale: v3(this._baseScale.x * 2, this._baseScale.y * 2, this._baseScale.z) }, { easing: 'quadOut' })
                    .to(0.3, { scale: this._baseScale.clone() }, { easing: 'quadInOut' })
                    .delay(0.03),
            )
            .call(() => {
                this.node.setScale(this._baseScale);
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
            .start();
    }

    protected onDisable(): void {
        Tween.stopAllByTarget(this.node);
        if (this._baseScale) this.node.setScale(this._baseScale);
    }
}
