import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_SkinItem')
export class ZRSJZ_SkinItem extends Component {

    Checked: Node = null;
    Icon: Sprite = null;
    QualityFrame: Sprite = null;
    NameLabel: Label = null;
    Button: Button = null;
    SkinName: string = "";

    private _isInit: boolean = false;
    private _loadVersion: number = 0;

    async Init(skinName: string, qualityFrame: SpriteFrame = null): Promise<void> {
        const version = ++this._loadVersion;
        if (!this._isInit) {
            this._isInit = true;
            this.Checked = this.node.getChildByName("Checked");
            this.Icon = this.node.getChildByName("SkinIcon").getComponent(Sprite);
            this.QualityFrame = this.getComponent(Sprite);
            this.NameLabel = this.node.getChildByName("Tips")?.getComponent(Label);
            this.Button = this.getComponent(Button);
        }
        this.SkinName = skinName;
        if (this.QualityFrame && qualityFrame) this.QualityFrame.spriteFrame = qualityFrame;
        // if (this.NameLabel) this.NameLabel.string = skinName;
        try {
            ZRSJZ_UIManager.Instance.GetHeroSkinIconUI(skinName).then((iconSpriteFrame: SpriteFrame) => {
                if (version === this._loadVersion && this.SkinName === skinName) {
                    this.Icon.spriteFrame = iconSpriteFrame;
                }
            });
        } catch (error) {
            console.error(`角色皮肤头像加载失败: ${skinName}`, error);
        }
    }
}


