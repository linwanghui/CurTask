import { _decorator, Component, Label, Node, Sprite, tween, Tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_HP')
export class ZRSJZ_HP extends Component {

    HPSprite: Sprite = null;
    private _delayedSprite: Sprite = null;
    private _targetFill = -1;
    HPLabel: Label = null;

    CountHP: number = 0;

    private _isInit: boolean = false;

    Init(hp: number) {
        if (!this._isInit) {
            this._isInit = true;
            this.HPSprite = this.node.getChildByName("进度").getComponent(Sprite);
            this._delayedSprite = this.node.getChildByName("进度0")?.getComponent(Sprite) ?? null;
            this.HPLabel = this.node.getChildByName("Num").getComponent(Label);
        }

        this.CountHP = hp;
        this.node.active = hp > 0;
        Tween.stopAllByTarget(this.HPSprite);
        this.HPSprite.fillRange = 1;
        this._targetFill = 1;
        if (this._delayedSprite) {
            Tween.stopAllByTarget(this._delayedSprite);
            this._delayedSprite.fillRange = 1;
        }
    }

    Show(curHP: number) {
        this.node.active = curHP > 0;
        Tween.stopAllByTarget(this.HPSprite);
        const fill = this.CountHP > 0 ? Math.max(0, Math.min(1, curHP / this.CountHP)) : 0;
        this.HPSprite.fillRange = fill;
        if (this._delayedSprite && fill !== this._targetFill) {
            Tween.stopAllByTarget(this._delayedSprite);
            if (this.node.activeInHierarchy) {
                tween(this._delayedSprite).to(0.7, { fillRange: fill }).start();
            } else {
                this._delayedSprite.fillRange = fill;
            }
        }
        this._targetFill = fill;
        this.HPLabel.string = `${Math.max(0, curHP)} / ${this.CountHP}`;
    }

    protected onDisable(): void {
        if (this.HPSprite) Tween.stopAllByTarget(this.HPSprite);
        if (this._delayedSprite) {
            Tween.stopAllByTarget(this._delayedSprite);
            this._delayedSprite.fillRange = this.HPSprite?.fillRange ?? 0;
        }
    }

}
