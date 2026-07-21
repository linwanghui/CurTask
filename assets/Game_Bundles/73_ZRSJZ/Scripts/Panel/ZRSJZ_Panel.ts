import { _decorator, Component, easing, find, Node, Tween, tween, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Panel')
export class ZRSJZ_Panel extends Component {

    PanelUIOpacity: UIOpacity = null;

    Show(...args: any[]) {
        if (!this.PanelUIOpacity) this.PanelUIOpacity = find("Panel", this.node).getComponent(UIOpacity);
        Tween.stopAllByTarget(this.PanelUIOpacity);
        this.PanelUIOpacity.opacity = 0;
        this.node.active = true;
        tween(this.PanelUIOpacity)
            .to(0.3, { opacity: 255 }, { easing: 'circIn' })
            .call(() => {
                if (args.length > 0) args[0]();
            })
            .start();
    }

    Hide(...args: any[]) {
        Tween.stopAllByTarget(this.PanelUIOpacity);
        tween(this.PanelUIOpacity)
            .to(0.3, { opacity: 0 }, { easing: 'circOut' })
            .call(() => {
                if (args.length > 0) args[0]();
                this.node.active = false;
            })
            .start();
    }
}


