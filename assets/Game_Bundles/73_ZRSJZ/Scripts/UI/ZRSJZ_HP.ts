import { _decorator, Component, Label, Node, Sprite, tween, Tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_HP')
export class ZRSJZ_HP extends Component {

    HPSprite: Sprite = null;
    HPLabel: Label = null;

    CountHP: number = 0;

    private _isInit: boolean = false;

    Init(hp: number) {
        if (!this._isInit) {
            this._isInit = true;
            this.HPSprite = this.node.getChildByName("进度").getComponent(Sprite);
            this.HPLabel = this.node.getChildByName("Num").getComponent(Label);
        }

        this.CountHP = hp;
        Tween.stopAllByTarget(this.HPSprite);
        this.HPSprite.fillRange = 1;
    }

    Show(curHP: number) {
        Tween.stopAllByTarget(this.HPSprite);
        tween(this.HPSprite)
            .to(0.3, { fillRange: curHP / this.CountHP })
            .start();
        this.HPLabel.string = `${curHP} / ${this.CountHP}`
    }

}


