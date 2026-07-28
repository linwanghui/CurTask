import { _decorator, Component, instantiate, math, Node, tween, v3, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_CurrencyEffect')
export class ZRSJZ_CurrencyEffect extends Component {

    @property({ displayName: "数量" })
    Count: number = 10;

    @property({ displayName: "偏差" })
    Offset: number = 100;

    @property({ displayName: "间隔" })
    Interval: number = 0.2;

    @property({ displayName: "持续时间" })
    Duration: number = 0.5;

    Item: Node = null;

    private _isInit: boolean = false;
    Init() {
        this.Item = this.node.getChildByName("Item");
    }

    Show(targetPos: Vec3) {
        if (!this._isInit) {
            this._isInit = true;
            this.Init();
        }
        for (let i = 0; i < this.Count; i++) {
            this.scheduleOnce(() => {
                this.Ani(targetPos.clone(), i == this.Count - 1);
            }, i * this.Interval);
        }
    }

    Ani(targetPos: Vec3, isLast: boolean = false) {
        const targetNode = instantiate(this.Item);
        targetNode.parent = this.node;
        targetNode.setPosition(Vec3.ZERO);
        targetNode.setScale(Vec3.ONE);
        targetNode.active = true;
        tween(targetNode)
            .to(0.1, { position: v3(math.randomRange(-this.Offset, this.Offset), math.randomRange(-this.Offset, this.Offset)) })
            .to(this.Duration, { worldPosition: targetPos })
            .call(() => {
                targetNode.destroy();
                if (isLast) ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
            .start();
        tween(targetNode)
            .to(0.1, { scale: v3(2, 2, 2) })
            .to(this.Duration, { scale: v3(0.5, 0.5, 0.2) })
            .start();
    }

}


