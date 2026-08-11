import { _decorator, Component, easing, find, Node, Tween, tween, UIOpacity, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Panel')
export class ZRSJZ_Panel extends Component {

    Panel: Node = null;

    Show(...args: any[]) {
        if (!this.Panel) this.Panel = find("Panel", this.node);
        Tween.stopAllByTarget(this.Panel);
        this.Panel.scale = v3(0, 0, 0);
        this.node.active = true;
        tween(this.Panel)
            .to(0.3, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
            .call(() => {
                if (args.length > 0) args[0]();
            })
            .start();
    }

    Hide(...args: any[]) {
        const Mask: Node | null = find("Panel/Mask", this.node);
        if (Mask) Mask.active = true;
        Tween.stopAllByTarget(this.Panel);
        tween(this.Panel)
            .to(0, { scale: v3(0, 0, 0) }, { easing: 'backOut' })
            .call(() => {
                if (args.length > 0) args[0]();
                this.node.active = false;
                if (Mask) Mask.active = false;
            })
            .start();
    }
}


