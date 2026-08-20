import { ZRSJZ_BNSDataService } from "../../../73_ZRSJZ/Scripts/Service/ZRSJZ_BNSDataService";
import { _decorator, Color, EventTouch, find, Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_BNS_BuildingName, ZRSJZ_BNS_Constant } from '../ZRSJZ_BNS_Constant';
import { ZRSJZ_BNS_Incident } from '../ZRSJZ_BNS_Incident';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_UpLevelPanel')
export class ZRSJZ_BNS_UpLevelPanel extends ZRSJZ_Panel {
    private _buildingName: ZRSJZ_BNS_BuildingName = null;
    private readonly _normalColor: Color = new Color(0, 0, 0, 255);
    private readonly _lackColor: Color = new Color(255, 80, 80, 255);

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "关闭":
            case "取消按钮":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.避难所_升级界面);
                break;
            case "升级":
            case "升级按钮":
                this.UpLevelClick();
                break;
        }

    }

    public Show(buildingName: ZRSJZ_BNS_BuildingName): void {
        this._buildingName = ZRSJZ_BNS_Constant.GetBuildingName(buildingName);
        this.RefreshDerivedProperties();
        this.InitPanel();
        super.Show(() => { });
    }

    UpLevelClick() {
        if (!this._buildingName) return;

        const level = ZRSJZ_BNSDataService.GetBNSBuildingLevel(this._buildingName);
        const nextLevel = level + 1;
        const cost = ZRSJZ_BNS_Constant.GetBuildingUpgradeCost(this._buildingName, nextLevel);

        if (!this.IsCostEnough(cost)) {
            ZRSJZ_UIManager.Instance.ShowTip("资源不足");
            this.InitPanel();
            return;
        }

        if (!this.IsPowerEnoughAfterUpgrade(nextLevel)) {
            ZRSJZ_UIManager.Instance.ShowTip("电力不足");
            this.InitPanel();
            return;
        }

        ZRSJZ_BNSDataService.ChangeBNSProperty("木材", -cost.木材);
        ZRSJZ_BNSDataService.ChangeBNSProperty("矿石", -cost.矿石);
        ZRSJZ_BNSDataService.ChangeBNSProperty("宝石", -cost.宝石);
        ZRSJZ_BNSDataService.SetBNSBuildingLevel(this._buildingName, nextLevel);
        this.RefreshDerivedProperties();
        this.InitPanel();
    }

    private async InitPanel(): Promise<void> {
        if (!this._buildingName) return;

        const level = ZRSJZ_BNSDataService.GetBNSBuildingLevel(this._buildingName);
        const nextLevel = level + 1;
        const config = ZRSJZ_BNS_Constant.建筑配置[this._buildingName];
        const cost = ZRSJZ_BNS_Constant.GetBuildingUpgradeCost(this._buildingName, nextLevel);

        this.SetLabel("Panel/升级弹板/名字", this._buildingName);
        this.SetLabel("Panel/升级弹板/等级底/等级", `Lv.${level}`);
        this.SetLabel("Panel/升级弹板/升级效果/效果文本", config.effectName);
        this.SetLabel("Panel/升级弹板/升级效果/升级效果当前数值", ZRSJZ_BNS_Constant.GetBuildingEffectValue(this._buildingName, level).toString());
        this.SetLabel("Panel/升级弹板/升级效果/升级效果升级增加数值", `+${config.effectValuePerLevel}`);
        this.SetLabel("Panel/升级弹板/升级效果/功耗当前数值", ZRSJZ_BNS_Constant.GetBuildingPowerCost(this._buildingName, level).toString());
        this.SetLabel("Panel/升级弹板/升级效果/功耗升级增加数值", `+${config.powerCostPerLevel}`);
        this.SetLabel("Panel/升级弹板/升级效果/实力当前数值", ZRSJZ_BNS_Constant.GetBuildingProsperity(this._buildingName, level).toString());
        this.SetLabel("Panel/升级弹板/升级效果/实力升级增加数值", `+${config.prosperityPerLevel}`);
        this.SetCondition("木头", "木材", cost.木材);
        this.SetCondition("石头", "矿石", cost.矿石);
        this.SetCondition("宝石", "宝石", cost.宝石);

        const sprite = find("Panel/升级弹板/图", this.node)?.getComponent(Sprite);
        if (sprite) {
            const spriteName = ZRSJZ_BNS_Constant.GetBuildingSpriteName(this._buildingName, level);
            const spriteFrame = await ZRSJZ_BNS_Incident.LoadDLCSprite(`Sprites/建筑物/${spriteName}`) as SpriteFrame;
            if (spriteFrame && this.node?.isValid) {
                sprite.spriteFrame = spriteFrame;
                this.ResizeBuildingImage(sprite.node, spriteFrame);
            }
        }
    }

    private SetCondition(prefixName: string, resourceName: "木材" | "矿石" | "宝石", cost: number): void {
        const count = ZRSJZ_BNSDataService.GetBNSProperty(resourceName);
        const isEnough = count >= cost;
        const conditionNode = find(`Panel/升级弹板/升级条件/${prefixName}是否满足条件`, this.node);
        const label = find(`Panel/升级弹板/升级条件/${prefixName}条件文本`, this.node)?.getComponent(Label);

        if (conditionNode) conditionNode.active = !isEnough;
        if (label) {
            label.string = `${count}/${cost}`;
            label.color = isEnough ? this._normalColor : this._lackColor;
        }
    }

    private SetLabel(path: string, value: string): void {
        const label = find(path, this.node)?.getComponent(Label);
        if (label) label.string = value;
    }

    private ResizeBuildingImage(imageNode: Node, spriteFrame: SpriteFrame): void {
        const transform = imageNode.getComponent(UITransform);
        if (!transform) return;

        const spriteFrameAny = spriteFrame as any;
        const size = spriteFrameAny.originalSize || spriteFrameAny.rect || { width: transform.width, height: transform.height };
        const maxWidth = 270;
        const maxHeight = 191;
        const scale = Math.min(maxWidth / size.width, maxHeight / size.height);

        transform.setContentSize(size.width, size.height);
        imageNode.setScale(scale, scale, 1);
    }

    private IsCostEnough(cost: { 木材: number, 矿石: number, 宝石: number }): boolean {
        return ZRSJZ_BNSDataService.GetBNSProperty("木材") >= cost.木材
            && ZRSJZ_BNSDataService.GetBNSProperty("矿石") >= cost.矿石
            && ZRSJZ_BNSDataService.GetBNSProperty("宝石") >= cost.宝石;
    }

    private IsPowerEnoughAfterUpgrade(nextLevel: number): boolean {
        const powerState = this.GetPowerState(this._buildingName, nextLevel);
        return powerState.totalPower >= powerState.usedPower;
    }

    private RefreshDerivedProperties(): void {
        const powerState = this.GetPowerState();
        ZRSJZ_BNSDataService.SetBNSProperty("电力", Math.max(0, powerState.totalPower - powerState.usedPower));
        ZRSJZ_BNSDataService.SetBNSProperty("繁荣度", this.GetTotalProsperity());
    }

    private GetPowerState(upgradeBuildingName: ZRSJZ_BNS_BuildingName = null, upgradeLevel: number = 0): { totalPower: number, usedPower: number } {
        let totalPower = 0;
        let usedPower = 0;

        for (const buildingName in ZRSJZ_BNS_Constant.建筑配置) {
            const bnsBuildingName = buildingName as ZRSJZ_BNS_BuildingName;
            const level = upgradeBuildingName === bnsBuildingName
                ? upgradeLevel
                : ZRSJZ_BNSDataService.GetBNSBuildingLevel(bnsBuildingName);

            if (bnsBuildingName === "发电厂") {
                totalPower += ZRSJZ_BNS_Constant.GetBuildingEffectValue(bnsBuildingName, level);
            }
            usedPower += ZRSJZ_BNS_Constant.GetBuildingPowerCost(bnsBuildingName, level);
        }

        return { totalPower, usedPower };
    }

    private GetTotalProsperity(): number {
        let prosperity = 0;
        for (const buildingName in ZRSJZ_BNS_Constant.建筑配置) {
            const bnsBuildingName = buildingName as ZRSJZ_BNS_BuildingName;
            prosperity += ZRSJZ_BNS_Constant.GetBuildingProsperity(
                bnsBuildingName,
                ZRSJZ_BNSDataService.GetBNSBuildingLevel(bnsBuildingName)
            );
        }

        return prosperity;
    }
}

