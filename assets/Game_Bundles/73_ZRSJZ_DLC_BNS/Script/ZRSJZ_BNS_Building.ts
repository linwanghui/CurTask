import { _decorator, Component, Label, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_GameData } from '../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_BNS_BuildingName, ZRSJZ_BNS_Constant } from './ZRSJZ_BNS_Constant';
import { ZRSJZ_BNS_EventManager, ZRSJZ_BNS_MyEvent } from './ZRSJZ_BNS_EventManager';
import { ZRSJZ_BNS_Incident } from './ZRSJZ_BNS_Incident';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_Building')
export class ZRSJZ_BNS_Building extends Component {
    private _buildingName: ZRSJZ_BNS_BuildingName = null;
    private _sprite: Sprite = null;

    protected onLoad(): void {
        this._buildingName = ZRSJZ_BNS_Constant.GetBuildingName(this.node.name);
        this._sprite = this.getComponent(Sprite);
        ZRSJZ_BNS_EventManager.On(ZRSJZ_BNS_MyEvent.建筑等级改变, this.OnBuildingLevelChanged, this);
    }

    protected start(): void {
        this.RefreshAppearance();
        this.schedule(this.ProduceResource, 1);
    }

    private OnBuildingLevelChanged(buildingName: ZRSJZ_BNS_BuildingName): void {
        if (buildingName !== this._buildingName) return;
        this.RefreshAppearance();
    }

    private async RefreshAppearance(): Promise<void> {
        if (!this._buildingName || !this._sprite) return;

        const level = ZRSJZ_GameData.Instance.GetBNSBuildingLevel(this._buildingName);
        const signNode = this.node.getChildByName("牌子");
        const infoNode = this.node.getChildByName("信息框");
        const levelLabel = infoNode
            ?.getChildByName("等级")
            ?.getComponent(Label);

        this._sprite.enabled = level > 0;
        if (signNode) signNode.active = level <= 0;
        if (infoNode) infoNode.active = level > 0;
        if (levelLabel) levelLabel.string = `Lv.${level}`;
        this.RefreshIncomeBox(level);

        if (level <= 0) return;

        const spriteName = ZRSJZ_BNS_Constant.GetBuildingSpriteName(this._buildingName, level);
        const spriteFrame = await ZRSJZ_BNS_Incident.LoadDLCSprite(`Sprites/建筑物/${spriteName}`) as SpriteFrame;
        if (spriteFrame && this.node?.isValid) {
            this._sprite.spriteFrame = spriteFrame;
        }
    }

    private RefreshIncomeBox(level: number): void {
        if (!this._buildingName) return;

        const incomeBox = this.node.getChildByPath("信息框/收益框");
        if (!incomeBox) return;

        const config = ZRSJZ_BNS_Constant.建筑配置[this._buildingName];
        const income = config?.outputResourceName
            ? ZRSJZ_BNS_Constant.GetBuildingEffectValue(this._buildingName, level)
            : 0;

        incomeBox.active = !!config?.outputResourceName && level > 0 && income > 0;

        const incomeLabel = incomeBox
            .getChildByName("收益")
            ?.getComponent(Label);
        if (incomeLabel) {
            incomeLabel.string = `+${income}/s`;
        }
    }

    private ProduceResource(): void {
        if (!this._buildingName) return;

        const config = ZRSJZ_BNS_Constant.建筑配置[this._buildingName];
        if (!config?.outputResourceName) return;

        const level = ZRSJZ_GameData.Instance.GetBNSBuildingLevel(this._buildingName);
        if (level <= 0) return;

        const income = ZRSJZ_BNS_Constant.GetBuildingEffectValue(this._buildingName, level);
        if (income <= 0) return;

        ZRSJZ_GameData.Instance.ChangeBNSProperty(config.outputResourceName, income);
    }

}


