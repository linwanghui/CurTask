import { _decorator, Component, isValid, Label, Sprite, UITransform } from 'cc';
import { ZRSJZ_GameData } from '../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BoxroomBox')
export class ZRSJZ_BoxroomBox extends Component {
    private _propName: string = "";

    public async Init(propName: string, width: number, height: number): Promise<void> {
        this._propName = propName;
        this.Resize(width, height);

        const nameLabel = this.node.getChildByName("名字")?.getComponent(Label);
        if (nameLabel) nameLabel.string = propName;

        this.RefreshLevel();

        const spriteFrame = await ZRSJZ_UIManager.Instance.GetPropUI(propName);
        if (!spriteFrame || !isValid(this.node) || this._propName !== propName) return;

        const iconNode = this.node.getChildByName("图像");
        const iconSprite = iconNode?.getComponent(Sprite);
        const iconTransform = iconNode?.getComponent(UITransform);
        if (!iconNode || !iconSprite || !iconTransform) return;

        iconSprite.spriteFrame = spriteFrame;
        const sourceSize = spriteFrame.originalSize;
        const maxWidth = Math.max(1, width - 24);
        const maxHeight = Math.max(1, height - 24);
        const sourceWidth = Math.max(1, sourceSize.width);
        const sourceHeight = Math.max(1, sourceSize.height);
        const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight) * 0.85;
        iconTransform.setContentSize(sourceWidth * scale, sourceHeight * scale);
    }

    public RefreshLevel(): void {
        const level = ZRSJZ_GameData.Instance.GetBoxroomPropLevel(this._propName);
        const iconSprite = this.node.getChildByName("图像")?.getComponent(Sprite);
        if (iconSprite) iconSprite.grayscale = level <= 0;

        const levelNode = this.node.getChildByName("等级");
        for (let index = 1; index <= 3; index++) {
            const light = levelNode?.getChildByName(index.toString())?.getChildByName("点亮");
            if (light) light.active = index <= level;
        }
    }

    private Resize(width: number, height: number): void {
        this.node.getComponent(UITransform)?.setContentSize(width, height);

        const levelNode = this.node.getChildByName("等级");
        if (levelNode) {
            levelNode.setPosition(-width * 0.5 + 67, height * 0.5 - 30);
        }

        const nameNode = this.node.getChildByName("名字");
        if (nameNode) {
            nameNode.setPosition(0, -height * 0.5 + 33);
            nameNode.getComponent(UITransform)?.setContentSize(Math.max(1, width - 24), 30);
        }
    }
}

