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
        this.node.active = hp > 0;
        Tween.stopAllByTarget(this.HPSprite);
        this.HPSprite.fillRange = 1;
    }

    Show(curHP: number) {
        this.node.active = curHP > 0;
        Tween.stopAllByTarget(this.HPSprite);
        if (curHP <= 0) {
            this.HPSprite.fillRange = 0;
            this.HPLabel.string = `0 / ${this.CountHP}`;
            return;
        }
        tween(this.HPSprite)
            .to(0.3, { fillRange: this.CountHP > 0 ? Math.min(1, curHP / this.CountHP) : 0 })
            .start();
        this.HPLabel.string = `${curHP} / ${this.CountHP}`
    }

}


