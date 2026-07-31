import { _decorator, Component, math, Node, tween, Tween, v3, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_HarmEffect')
export class ZRSJZ_HarmEffect extends Component {

    Show(worldPos: Vec3, harm: number) {
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


