import { _decorator, Component, Node, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PropSF')
export class ZRSJZ_PropSF extends Component {

    PropID: string = "";
    GridSprite: Sprite = null;
    BottomSprite: Sprite = null;
    IconSprite: Sprite = null;

    private _isInit: boolean = false;

    Init(propID: string, gridSprite: SpriteFrame, iconSprite: SpriteFrame) {
        if (!this._isInit) {
            this._isInit = true;
            this.GridSprite = this.getComponent(Sprite);
            this.IconSprite = this.node.getChildByName("Icon").getComponent(Sprite);
            this.BottomSprite = this.node.getChildByName("Bottom").getComponent(Sprite);
        }
        this.PropID = propID;
        this.GridSprite.spriteFrame = gridSprite;
        this.BottomSprite.spriteFrame = gridSprite;
        this.IconSprite.spriteFrame = iconSprite;
    }
}


