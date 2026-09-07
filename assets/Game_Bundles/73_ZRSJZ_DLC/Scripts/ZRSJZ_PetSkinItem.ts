import { _decorator, Component, Label, Node, Sprite } from 'cc';
import { ZRSJZ_PET_SKIN_CONFIG } from '../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_Tools } from '../../73_ZRSJZ/Scripts/ZRSJZ_Tools';
import { ZRSJZ_PetService } from '../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_PetSkinItem')
export class ZRSJZ_PetSkinItem extends Component {
    private _petName: string = "";
    private _skinName: string = "";
    private _onSelect: (skinName: string) => void = null;

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_END, this.Click, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_END, this.Click, this);
    }

    Init(petName: string, skinName: string, onSelect: (skinName: string) => void = null): void {
        const config = ZRSJZ_PET_SKIN_CONFIG.get(skinName);
        if (!config) return;
        this._petName = petName;
        this._skinName = skinName;
        this._onSelect = onSelect;
        this.node.getChildByName("PetSkinName").getComponent(Label).string = config.PetSkinName;
        this.node.getChildByName("Addition").getComponent(Label).string = config.PetSkinAddition;
        this.LoadImage("Icon", "Skins/" + config.PetSkinName, skinName);
        this.LoadImage("Quality", "Qualitys/" + config.PetSkinQuality, skinName);
        this.LoadImage("", "Qualitys/" + config.PetSkinQuality + "皮肤框", skinName);
        this.Refresh("");
    }

    private LoadImage(nodeName: string, path: string, skinName: string): void {
        const sprite = (nodeName ? this.node.getChildByName(nodeName) : this.node).getComponent(Sprite);
        if (!sprite) return;
        if (!nodeName) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = null;
        ZRSJZ_Tools.LoadSpriteByBundle("73_ZRSJZ_DLC", "Sprites/宠物/皮肤/" + path)
            .catch(error => {
                if (!nodeName && path !== "Qualitys/普通皮肤框") {
                    // 尚未提供对应品质边框时，用普通皮肤框兜底。
                    return ZRSJZ_Tools.LoadSpriteByBundle("73_ZRSJZ_DLC", "Sprites/宠物/皮肤/Qualitys/普通皮肤框");
                }
                if (nodeName !== "Icon") throw error;
                // 皮肤立绘尚未提供时使用所属宠物图标，避免列表出现空白。
                return ZRSJZ_Tools.LoadSpriteByBundle("73_ZRSJZ_DLC", "Sprites/宠物/PetIcon/" + this._petName);
            })
            .then(sf => {
                if (!this.isValid || !sprite.isValid || this._skinName !== skinName) return;
                sprite.spriteFrame = sf;
            })
            .catch(error => console.warn(`[ZRSJZ_PetSkinItem] ${path}加载失败`, error));
    }

    Refresh(selectedSkin: string): void {
        this.node.getChildByName("Lock").active = !ZRSJZ_PetService.CheckPetSkin(this._petName, this._skinName);
        this.Check(selectedSkin);
    }

    Click(): void {
        this._onSelect?.(this._skinName);
    }

    Check(skinName: string): void {
        this.node.getChildByName("Checked").active = this._skinName === skinName;
    }
}
