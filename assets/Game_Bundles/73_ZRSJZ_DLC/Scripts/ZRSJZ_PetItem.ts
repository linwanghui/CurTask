import { _decorator, Component, Label, Node, Sprite } from 'cc';
import { ZRSJZ_PET_CONFIG } from '../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_Tools } from '../../73_ZRSJZ/Scripts/ZRSJZ_Tools';
import { ZRSJZ_PetService } from '../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
import { ZRSJZ_GameData } from '../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_PetItem')
export class ZRSJZ_PetItem extends Component {
    private _petName: string = "";
    private _onSelect: (petName: string) => void = null;

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_END, this.Click, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_END, this.Click, this);
    }

    Init(petName: string, onSelect: (petName: string) => void = null): void {
        if (!ZRSJZ_PET_CONFIG.has(petName)) return;
        this._petName = petName;
        this._onSelect = onSelect;
        const icon = this.node.getChildByName("Icon").getComponent(Sprite);
        icon.spriteFrame = null;
        ZRSJZ_Tools.LoadSpriteByBundle("73_ZRSJZ_DLC", "Sprites/宠物/PetIcon/" + petName)
            .then(sf => {
                if (this.isValid && icon.isValid && this._petName === petName) icon.spriteFrame = sf;
            })
            .catch(error => console.warn(`[ZRSJZ_PetItem] ${petName}图标加载失败`, error));
        this.node.getChildByName("PetName").getComponent(Label).string = petName;
        this.Refresh("");
    }

    Refresh(selectedPet: string): void {
        const owned = ZRSJZ_PetService.CheckPet(this._petName);
        this.node.getChildByName("Grade").getComponent(Label).string = `lv.${ZRSJZ_PetService.GetPetGrade(this._petName)}`;
        this.node.getChildByName("BattleState").active = owned && ZRSJZ_GameData.Instance.CurPet === this._petName;
        this.node.getChildByName("LockState").active = !owned;
        this.Check(selectedPet);
    }

    Click(): void {
        this._onSelect?.(this._petName);
    }

    Check(petName: string): void {
        this.node.getChildByName("Checked").active = this._petName === petName;
    }
}
