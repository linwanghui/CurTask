import { _decorator, Component, Tween, tween, Vec3, Node } from 'cc';

export class PanelBase extends Component {
    tweenTarget: Node = null;

    //*** 基类第一个参数默认为需要做初始动画的 Node */
    Show(...args: any[]): void {
        this.node.active = true;
        this.tweenTarget = args.length > 0 ? args[0] : this.node;

        if (this.tweenTarget) {
            Tween.stopAllByTarget(this.tweenTarget);
            this.tweenTarget.scale = Vec3.ZERO;
            tween(this.tweenTarget).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
        }
    }

    Hide(endCb: Function = null): void {
        if (this.tweenTarget) {
            Tween.stopAllByTarget(this.tweenTarget);
            tween(this.tweenTarget).to(0.3, { scale: Vec3.ZERO }, { easing: 'backIn' }).call(() => {
                this.node.active = false;
                endCb && endCb();
            }).start();
        } else {
            endCb && endCb();
            this.node.active = false;
        }

    }

    Refresh(): void { }
}
