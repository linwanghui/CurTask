import { _decorator, Component, Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ShopItem')
export class ZRSJZ_ShopItem extends Component {

    Sprite: Sprite = null;
    IconSprite: Sprite = null;
    NameLabel: Label = null;
    PriceLabel: Label = null;
    Chekcked: Node = null;

    private _init: boolean = false;
    async Init(shopName: string) {
        if (!this._init) {
            this._init = true;
            this.Sprite = this.node.getComponent(Sprite);
            this.IconSprite = this.node.getChildByName("Icon").getComponent(Sprite);
            this.NameLabel = this.node.getChildByName("Name").getComponent(Label);
            this.PriceLabel = this.node.getChildByName("Price").getComponent(Label);
            this.Chekcked = this.node.getChildByName("Checked");
        }
        this.Chekcked.active = false;
        const shopData = ZRSJZ_PROP_CONFIG.get(shopName);
        this.NameLabel.string = shopName;
        this.PriceLabel.string = `${Math.floor(shopData.UnitPrice)}`;
        this.Sprite.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropGridUI(`${shopData.Quality}1_2`);
        this.IconSprite.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropUI(shopName);
        this.ScaleNodeToFit(this.IconSprite.node);
    }

    private ScaleNodeToFit(targetNode: Node): void {
        if (!targetNode) {
            return;
        }

        const parentUITransform = this.getComponent(UITransform);
        const targetUITransform = targetNode.getComponent(UITransform);
        if (!parentUITransform || !targetUITransform) {
            return;
        }

        const parentWidth = parentUITransform.width - 20;
        const parentHeight = parentUITransform.height - 20;
        const targetWidth = targetUITransform.width;
        const targetHeight = targetUITransform.height;

        if (parentWidth <= 0 || parentHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
            return;
        }

        const scaleX = parentWidth / targetWidth;
        const scaleY = parentHeight / targetHeight;
        const scale = Math.floor(Math.min(scaleX, scaleY) * 100);

        targetNode.setScale(scale / 100, scale / 100, 1);
    }
}


