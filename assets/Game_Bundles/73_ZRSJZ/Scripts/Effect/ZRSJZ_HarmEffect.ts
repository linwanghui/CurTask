import { _decorator, Component, Label, math, Node, tween, Tween, v3, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_HarmEffect')
export class ZRSJZ_HarmEffect extends Component {

    Harm: Label = null;

    private _isInit: boolean = false;

    Show(worldPos: Vec3, harm: number) {
        if (!this._isInit) {
            this._isInit = true;
            this.Harm = this.node.getChildByName("Harm").getComponent(Label);
        }
        this.Harm.string = `${harm}`;
        Tween.stopAllByTarget(this.node);
        this.node.setWorldPosition(v3(worldPos.x + math.randomRangeInt(-50, 50), worldPos.y + math.randomRangeInt(200, 300), worldPos.z));
        tween(this.node)
            .by(0.3, { y: math.randomRangeInt(50, 200) }, { easing: 'backOut' })
            .call(() => {
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
            .start();
    }
}


