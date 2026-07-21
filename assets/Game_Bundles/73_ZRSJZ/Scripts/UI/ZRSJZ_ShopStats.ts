import { _decorator, Component, find, Label, Node, Sprite, tween, Tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ShopStats')
export class ZRSJZ_ShopStats extends Component {

    Plan: Sprite = null;
    Desc: Label = null;

    Init() {
        this.Plan = find("进度", this.node).getComponent(Sprite);
        this.Desc = find("Desc", this.node).getComponent(Label);
    }

    Show(desc: number, max: number) {
        Tween.stopAllByTarget(this.Plan);
        this.node.active = true;
        tween(this.Plan)
            .to(0.3, { fillRange: desc / max }, { easing: 'backOut' })
            .start();
        this.Desc.string = `${desc}${this.node.name == "减伤" || this.node.name == "增伤" ? "%" : ""}`;
    }

    Hide() {
        this.node.active = false;
    }

}


