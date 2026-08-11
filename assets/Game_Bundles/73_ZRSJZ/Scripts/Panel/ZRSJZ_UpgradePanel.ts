import { _decorator, Button, Color, EventTouch, find, Label, Node, Sprite, Vec3 } from 'cc';
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

type ZRSJZ_UpgradeFacilityDisplayName = "射击训练" | "科技研究" | "体能锻炼";

/** 界面使用新名称，配置和存档继续使用旧键，避免已有玩家的升级数据丢失。 */
const ZRSJZ_FACILITY_DISPLAY_NAME: Readonly<Record<
    ZRSJZ_UpgradeFacilityName,
    ZRSJZ_UpgradeFacilityDisplayName
>> = {
    "靶场": "射击训练",
    "研究所": "科技研究",
    "健身": "体能锻炼",
};

const ZRSJZ_FACILITY_NAME_BY_DISPLAY: Readonly<Record<
    ZRSJZ_UpgradeFacilityDisplayName,
    ZRSJZ_UpgradeFacilityName
>> = {
    "射击训练": "靶场",
    "科技研究": "研究所",
    "体能锻炼": "健身",
};

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
    private _checked: Node = null;
    private _checkedOffset: Vec3 = new Vec3();
    private _facilityButtons: Map<ZRSJZ_UpgradeFacilityDisplayName, Node> = new Map();

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
        const descPath = "Panel/Desc";
        this._title = find(`${descPath}/PropName`, this.node).getComponent(Label);
        this._attributeName = find(`${descPath}/Tip2`, this.node).getComponent(Label);
        this._currentLevel = find(`${descPath}/当前等级`, this.node).getComponent(Label);
        this._nextLevel = find(`${descPath}/下一等级`, this.node).getComponent(Label);
        this._currentBonus = find(`${descPath}/当前提升`, this.node).getComponent(Label);
        this._nextBonus = find(`${descPath}/下一等级提升`, this.node).getComponent(Label);
        this._price = find(`${descPath}/Buttons/升级/PropPrice/Price`, this.node).getComponent(Label);
        this._upgradeButton = find(`${descPath}/Buttons/升级`, this.node).getComponent(Button);
        this._checked = find("Panel/Checked", this.node);

        for (let index = 1; index <= 2; index++) {
            this._materialGrids.push(find(`${descPath}/道具${index}格子`, this.node).getComponent(Sprite));
            this._materialIcons.push(find(`${descPath}/道具${index}Icon`, this.node).getComponent(Sprite));
            this._materialNames.push(find(`${descPath}/道具${index}名字`, this.node).getComponent(Label));
            this._materialCounts.push(find(`${descPath}/道具${index}数量`, this.node).getComponent(Label));
        }

        this.BindButtons();
    }

    Show(...args: any[]): void {
        this._facilityName = this.ResolveFacilityName(args[0]);
        // args[0] 是设施名称，不能传给 Panel.Show 当作回调执行。
        super.Show();
        this.RefreshChecked();
        this.RefreshView();
    }

    public async OnButtonClick(event: EventTouch): Promise<void> {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.强化界面);
                break;
            case "射击训练":
                this.SelectFacility("射击训练");
                break;
            case "体能锻炼":
                this.SelectFacility("体能锻炼");
                break;
            case "科技研究":
                this.SelectFacility("科技研究");
                break;
            case "升级":
                await this.Upgrade();
                break;
        }
    }

    /** 新弹窗按钮不依赖编辑器 ClickEvent，脚本加载后统一绑定。 */
    private BindButtons(): void {
        const closeButton = find("Panel/返回/Close", this.node).getComponent(Button);
        closeButton.clickEvents.length = 0;
        closeButton.node.on(Button.EventType.CLICK, () => {
            ZRSJZ_AudioManager.Instance.PlaySound("点击");
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.强化界面);
        }, this);

        const displayNames = Object.keys(ZRSJZ_FACILITY_NAME_BY_DISPLAY) as ZRSJZ_UpgradeFacilityDisplayName[];
        for (const displayName of displayNames) {
            const buttonNode = find(`Panel/${displayName}`, this.node);
            const button = buttonNode.getComponent(Button);
            button.clickEvents.length = 0;
            buttonNode.on(Button.EventType.CLICK, () => {
                ZRSJZ_AudioManager.Instance.PlaySound("点击");
                this.SelectFacility(displayName);
            }, this);
            this._facilityButtons.set(displayName, buttonNode);
        }

        const firingRangeButton = this._facilityButtons.get("射击训练");
        if (this._checked && firingRangeButton) {
            Vec3.subtract(this._checkedOffset, this._checked.position, firingRangeButton.position);
        }

        this._upgradeButton.clickEvents.length = 0;
        this._upgradeButton.node.on(Button.EventType.CLICK, async () => {
            ZRSJZ_AudioManager.Instance.PlaySound("点击");
            await this.Upgrade();
        }, this);
    }

    private SelectFacility(displayName: ZRSJZ_UpgradeFacilityDisplayName): void {
        const facilityName = ZRSJZ_FACILITY_NAME_BY_DISPLAY[displayName];
        if (!facilityName || facilityName === this._facilityName) {
            this.RefreshChecked();
            return;
        }
        this._facilityName = facilityName;
        this.RefreshChecked();
        this.RefreshView();
    }

    private RefreshChecked(): void {
        const displayName = ZRSJZ_FACILITY_DISPLAY_NAME[this._facilityName];
        const buttonNode = this._facilityButtons.get(displayName);
        if (!this._checked || !buttonNode) return;

        this._checked.setPosition(buttonNode.position.clone().add(this._checkedOffset));
    }

    private ResolveFacilityName(name: string): ZRSJZ_UpgradeFacilityName {
        if (name in ZRSJZ_FACILITY_DISPLAY_NAME) {
            return name as ZRSJZ_UpgradeFacilityName;
        }
        return ZRSJZ_FACILITY_NAME_BY_DISPLAY[name as ZRSJZ_UpgradeFacilityDisplayName] ?? "靶场";
    }

    private async Upgrade(): Promise<void> {
        if (this._isUpgrading) return;

        const currentLevel = ZRSJZ_GameData.Instance.GetFacilityLevel(this._facilityName);
        const config = this.GetNextLevelConfig(currentLevel);
        if (!config) {
            await ZRSJZ_UIManager.Instance.ShowTip(
                `${ZRSJZ_FACILITY_DISPLAY_NAME[this._facilityName]}已达到最高等级`,
            );
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

        this._title.string = ZRSJZ_FACILITY_DISPLAY_NAME[this._facilityName];
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
            console.warn(`[ZRSJZ_UpgradePanel] 未找到升级物资配置: ${material.PropName}`);
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
