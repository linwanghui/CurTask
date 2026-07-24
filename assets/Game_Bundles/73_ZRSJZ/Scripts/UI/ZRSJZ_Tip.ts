import { _decorator, Component, Label, Node, tween, Tween, UIOpacity, v3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Tip')
export class ZRSJZ_Tip extends Component {

    UIOpacity: UIOpacity = null;
    Text: Label = null;

    private _isInit: boolean = false;

    Show(tip: string) {
        if (!this._isInit) {
            this.UIOpacity = this.getComponent(UIOpacity);
            this.Text = this.node.getChildByName("Text").getComponent(Label);
            this._isInit = true;
        }

        this.Text.string = tip;
        Tween.stopAllByTarget(this.node);
        Tween.stopAllByTarget(this.UIOpacity);
        this.node.setPosition(0, 100, 0);
        this.UIOpacity.opacity = 0;
        tween(this.node)
            .by(0.2, { y: 200 }, { easing: `backOut` })
            .delay(1)
            .by(0.3, { y: 200 })
            .call(() => {
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
            .start();
        tween(this.UIOpacity)
            .to(0.2, { opacity: 255 })
            .delay(1)
            .to(0.3, { opacity: 0 })
            .start();
    }
}


