import { _decorator, Button, Color, EventTouch, find, Label, Node, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import {
    GetFacilityBonusValue,
    ZRSJZ_FACILITY_UPGRADE_CONFIG,
    ZRSJZ_FacilityLevelConfig,
    ZRSJZ_UpgradeMaterial,
    ZRSJZ_UpgradeFacilityName,
    ZRSJZ_PANEL,
    ZRSJZ_PROP_CONFIG,
} from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_UpgradePanel')
export class ZRSJZ_UpgradePanel extends ZRSJZ_Panel {

    private _title: Label = null;
    private _attributeName: Label = null;
    private _currentLevel: Label = null;
    private _nextLevel: Label = null;
    private _currentBonus: Label = null;
    private _nextBonus: Label = null;
    private _price: Label = null;
    private _upgradeButton: Button = null;

    private _materialGrids: Sprite[] = [];
    private _materialIcons: Sprite[] = [];
    private _materialNames: Label[] = [];
    private _materialCounts: Label[] = [];

    private _refreshVersion: number = 0;
    private _isUpgrading: boolean = false;
    private _facilityName: ZRSJZ_UpgradeFacilityName = "靶场";

    private static readonly ENOUGH_COLOR: Color = new Color(92, 255, 120, 255);
    private static readonly LACK_COLOR: Color = new Color(255, 100, 100, 255);
    private static readonly NORMAL_COLOR: Color = new Color(255, 255, 255, 255);

    protected onLoad(): void {
        this._title = find("Panel/PropName", this.node).getComponent(Label);
        this._attributeName = find("Panel/Tip2", this.node).getComponent(Label);
        this._currentLevel = find("Panel/当前等级", this.node).getComponent(Label);
        this._nextLevel = find("Panel/下一等级", this.node).getComponent(Label);
        this._currentBonus = find("Panel/当前提升", this.node).getComponent(Label);
        this._nextBonus = find("Panel/下一等级提升", this.node).getComponent(Label);
        this._price = find("Panel/Buttons/升级/PropPrice/Price", this.node).getComponent(Label);
        this._upgradeButton = find("Panel/Buttons/升级", this.node).getComponent(Button);

        for (let index = 1; index <= 2; index++) {
            this._materialGrids.push(find(`Panel/道具${index}格子`, this.node).getComponent(Sprite));
            this._materialIcons.push(find(`Panel/道具${index}Icon`, this.node).getComponent(Sprite));
            this._materialNames.push(find(`Panel/道具${index}名字`, this.node).getComponent(Label));
            this._materialCounts.push(find(`Panel/道具${index}数量`, this.node).getComponent(Label));
        }
    }

    Show(...args: any[]): void {
        const facilityName = args[0] as ZRSJZ_UpgradeFacilityName;
        this._facilityName = (["靶场", "研究所", "健身"] as ZRSJZ_UpgradeFacilityName[]).includes(facilityName)
            ? facilityName
            : "靶场";
        // args[0] 是设施名称，不能传给 Panel.Show 当作回调执行。
        super.Show();
        this.RefreshView();
    }

    public async OnButtonClick(event: EventTouch): Promise<void> {
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.升级弹窗);
                break;
            case "升级":
                await this.Upgrade();
                break;
        }
    }

    private async Upgrade(): Promise<void> {
        if (this._isUpgrading) return;

        const currentLevel = ZRSJZ_GameData.Instance.GetFacilityLevel(this._facilityName);
        const config = this.GetNextLevelConfig(currentLevel);
        if (!config) {
            await ZRSJZ_UIManager.Instance.ShowTip(`${this._facilityName}已达到最高等级`);
            return;
        }

        if (ZRSJZ_GameData.Instance.Gold < config.Gold) {
            await ZRSJZ_UIManager.Instance.ShowTip("金币不足");
            return;
        }

        const lackingMaterial = config.Materials.find(material =>
            ZRSJZ_GameData.Instance.GetPropCountByName(material.PropName) < material.Count
        );
        if (lackingMaterial) {
            await ZRSJZ_UIManager.Instance.ShowTip(`${lackingMaterial.PropName}数量不足`);
            return;
        }

        this._isUpgrading = true;
        try {
            ZRSJZ_GameData.Instance.ChangeGold(-config.Gold);
            for (const material of config.Materials) {
                ZRSJZ_GameData.Instance.ConsumeProp(material.PropName, material.Count);
            }
            ZRSJZ_GameData.Instance.SetFacilityLevel(this._facilityName, config.Level);
            ZRSJZ_AudioManager.Instance?.PlaySound("点击");
            await this.RefreshView();
        } finally {
            this._isUpgrading = false;
        }
    }

    private async RefreshView(): Promise<void> {
        const refreshVersion = ++this._refreshVersion;
        const facilityConfig = ZRSJZ_FACILITY_UPGRADE_CONFIG[this._facilityName];
        const currentLevel = ZRSJZ_GameData.Instance.GetFacilityLevel(this._facilityName);
        const nextConfig = this.GetNextLevelConfig(currentLevel);

        this._title.string = this._facilityName;
        this._attributeName.string = facilityConfig.AttributeName;
        this._currentLevel.string = `lv.${currentLevel}`;
        this._currentBonus.string = `+${GetFacilityBonusValue(this._facilityName, currentLevel)}${facilityConfig.ValueSuffix}`;

        if (!nextConfig) {
            this.ShowMaxLevel();
            return;
        }

        this._nextLevel.string = `lv.${nextConfig.Level}`;
        this._nextBonus.string = `+${nextConfig.BonusValue}${facilityConfig.ValueSuffix}`;
        this._price.string = `${nextConfig.Gold}`;
        this._price.color = ZRSJZ_GameData.Instance.Gold >= nextConfig.Gold
            ? ZRSJZ_UpgradePanel.ENOUGH_COLOR
            : ZRSJZ_UpgradePanel.LACK_COLOR;
        this._upgradeButton.interactable = true;

        await Promise.all(nextConfig.Materials.map((material, index) =>
            this.RefreshMaterial(index, material, refreshVersion)
        ));
    }

    private async RefreshMaterial(
        index: number,
        material: ZRSJZ_UpgradeMaterial,
        refreshVersion: number,
    ): Promise<void> {
        const propConfig = ZRSJZ_PROP_CONFIG.get(material.PropName);
        const grid = this._materialGrids[index];
        const icon = this._materialIcons[index];
        const nameLabel = this._materialNames[index];
        const countLabel = this._materialCounts[index];

        grid.node.active = true;
        icon.node.active = true;
        nameLabel.node.active = true;
        countLabel.node.active = true;
        nameLabel.string = material.PropName;

        const ownedCount = ZRSJZ_GameData.Instance.GetPropCountByName(material.PropName);
        countLabel.string = `${ownedCount}/${material.Count}`;
        countLabel.color = ownedCount >= material.Count
            ? ZRSJZ_UpgradePanel.ENOUGH_COLOR
            : ZRSJZ_UpgradePanel.LACK_COLOR;

        if (!propConfig) {
            console.warn(`[ZRSJZ_FiringRange] 未找到升级物资配置: ${material.PropName}`);
            grid.spriteFrame = null;
            icon.spriteFrame = null;
            return;
        }

        const [gridSpriteFrame, iconSpriteFrame] = await Promise.all([
            ZRSJZ_UIManager.Instance.GetPropGridUI(`${propConfig.Quality}1_1`),
            ZRSJZ_UIManager.Instance.GetPropUI(material.PropName),
        ]);
        if (refreshVersion !== this._refreshVersion || !this.node.active) return;

        grid.spriteFrame = gridSpriteFrame;
        icon.spriteFrame = iconSpriteFrame;
        ZRSJZ_Tools.ScaleNodeToFit(icon.node, 120, 120);
    }

    private ShowMaxLevel(): void {
        this._nextLevel.string = "已满级";
        this._nextBonus.string = "已满级";
        this._price.string = "MAX";
        this._price.color = ZRSJZ_UpgradePanel.NORMAL_COLOR;
        this._upgradeButton.interactable = false;

        for (let index = 0; index < 2; index++) {
            this._materialGrids[index].node.active = false;
            this._materialIcons[index].node.active = false;
            this._materialNames[index].node.active = false;
            this._materialCounts[index].node.active = false;
        }
    }

    private GetNextLevelConfig(currentLevel: number): ZRSJZ_FacilityLevelConfig | null {
        return ZRSJZ_FACILITY_UPGRADE_CONFIG[this._facilityName].Levels
            .find(config => config.Level === currentLevel + 1) ?? null;
    }


}
