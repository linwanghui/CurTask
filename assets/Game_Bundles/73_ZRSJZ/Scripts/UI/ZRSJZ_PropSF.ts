import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PropSF')
export class ZRSJZ_PropSF extends Component {

    PropID: string = "";
    GridSprite: Sprite = null;
    BottomSprite: Sprite = null;
    IconSprite: Sprite = null;

    private _isInit: boolean = false;

    Init(propID: string, gridSprite: SpriteFrame, iconSprite: SpriteFrame, isRotate: boolean = false) {
        if (!this._isInit) {
            this._isInit = true;
            this.GridSprite = this.getComponent(Sprite);
            this.IconSprite = this.node.getChildByName("Icon").getComponent(Sprite);
            this.BottomSprite = this.node.getChildByName("Bottom").getComponent(Sprite);
        }
        this.PropID = propID;
        this.node.setRotationFromEuler(0, 0, 0);
        this.GridSprite.spriteFrame = gridSprite;
        this.BottomSprite.spriteFrame = gridSprite;
        this.IconSprite.spriteFrame = iconSprite;

        this.SetOrientation(isRotate);
    }

    public SetOrientation(isRotate: boolean): void {
        const logicalCenter = this.GetPlacementWorldCenter();
        this.GridSprite.sizeMode = Sprite.SizeMode.RAW;
        this.BottomSprite.sizeMode = Sprite.SizeMode.RAW;
        this.IconSprite.node.setRotationFromEuler(0, 0, 0);

        const transform = this.getComponent(UITransform);
        this.BottomSprite.node.setPosition(transform.width / 2, -transform.height / 2);
        this.IconSprite.node.setPosition(transform.width / 2, -transform.height / 2);
        this.node.setRotationFromEuler(0, 0, isRotate ? -90 : 0);

        // 切换方向时保持道具中心点不动，落点始终以中心作为判断锚点。
        const rotatedCenter = this.GetPlacementWorldCenter();
        this.node.setWorldPosition(
            this.node.worldPosition.x + logicalCenter.x - rotatedCenter.x,
            this.node.worldPosition.y + logicalCenter.y - rotatedCenter.y,
            this.node.worldPosition.z,
        );
    }

    /** 返回道具占格区域的中心点，供拖动落点检测使用。 */
    public GetPlacementWorldCenter(): Vec3 {
        const transform = this.getComponent(UITransform);
        return transform.convertToWorldSpaceAR(v3(
            transform.width / 2,
            -transform.height / 2,
            0,
        ));
    }
}


