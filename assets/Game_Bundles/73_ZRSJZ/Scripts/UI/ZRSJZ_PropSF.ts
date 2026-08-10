import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PropSF')
export class ZRSJZ_PropSF extends Component {

    PropID: string = "";
    GridSprite: Sprite = null;
    BottomSprite: Sprite = null;
    IconSprite: Sprite = null;

    private _isInit: boolean = false;
    private _isRotate: boolean = false;

    Init(propID: string, gridSprite: SpriteFrame, iconSprite: SpriteFrame, isRotate: boolean = false) {
        if (!this._isInit) {
            this._isInit = true;
            this.GridSprite = this.getComponent(Sprite);
            this.IconSprite = this.node.getChildByName("Icon").getComponent(Sprite);
            this.BottomSprite = this.node.getChildByName("Bottom").getComponent(Sprite);
        }
        this.PropID = propID;
        this._isRotate = false;
        this.node.setRotationFromEuler(0, 0, 0);
        this.GridSprite.spriteFrame = gridSprite;
        this.BottomSprite.spriteFrame = gridSprite;
        this.IconSprite.spriteFrame = iconSprite;

        this.SetOrientation(isRotate);
    }

    public SetOrientation(isRotate: boolean): void {
        const logicalTopLeft = this.GetPlacementWorldPosition();
        this._isRotate = isRotate;
        this.GridSprite.sizeMode = Sprite.SizeMode.RAW;
        this.BottomSprite.sizeMode = Sprite.SizeMode.RAW;
        this.IconSprite.node.setRotationFromEuler(0, 0, 0);

        const transform = this.getComponent(UITransform);
        this.BottomSprite.node.setPosition(transform.width / 2, -transform.height / 2);
        this.IconSprite.node.setPosition(transform.width / 2, -transform.height / 2);
        this.node.setRotationFromEuler(0, 0, isRotate ? -90 : 0);

        // 切换方向时保持占格左上角不动，避免拖动预览在横竖切换时跳格。
        const rotatedTopLeft = this.GetPlacementWorldPosition();
        this.node.setWorldPosition(
            this.node.worldPosition.x + logicalTopLeft.x - rotatedTopLeft.x,
            this.node.worldPosition.y + logicalTopLeft.y - rotatedTopLeft.y,
            this.node.worldPosition.z,
        );
    }

    /** 整体旋转后返回占格区域的左上角，供拖动落点检测使用。 */
    public GetPlacementWorldPosition(): Vec3 {
        if (!this._isRotate) return this.node.worldPosition.clone();
        const transform = this.getComponent(UITransform);
        return transform.convertToWorldSpaceAR(v3(0, -transform.height, 0));
    }
}


