import { ZRSJZ_BNSDataService } from "../../73_ZRSJZ/Scripts/Service/ZRSJZ_BNSDataService";
import { _decorator, Camera, Component, find, instantiate, Label, Node, Prefab, UITransform, Vec3 } from 'cc';
import { ZRSJZ_GameData } from '../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_BNS_EventManager, ZRSJZ_BNS_MyEvent } from './ZRSJZ_BNS_EventManager';
import { ZRSJZ_BNS_BuildingName, ZRSJZ_BNS_Constant, ZRSJZ_BNS_ResourceName } from './ZRSJZ_BNS_Constant';
import { ZRSJZ_BNS_Incident } from './ZRSJZ_BNS_Incident';
import { ZRSJZ_BNS_ResourceEffect } from './ZRSJZ_BNS_ResourceEffect';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_ResourcePanel')
export class ZRSJZ_BNS_ResourcePanel extends Component {
    private readonly resourceNames = ['木材', '矿石', '食物', '宝石', '电力', '繁荣度'] as const;

    protected onLoad(): void {
        ZRSJZ_BNS_EventManager.BindGameDataEvent();
        ZRSJZ_BNS_EventManager.On(
            ZRSJZ_BNS_MyEvent.资源数量改变,
            this.Refresh,
            this
        );
        ZRSJZ_BNS_EventManager.On(
            ZRSJZ_BNS_MyEvent.播放资源特效,
            this.PlayResourceEffect,
            this
        );
        ZRSJZ_BNS_EventManager.On(
            ZRSJZ_BNS_MyEvent.建筑等级改变,
            this.RefreshDerivedProperties,
            this
        );
        this.RefreshDerivedProperties();
        this.Refresh();
    }

    private Refresh(): void {
        for (const resourceName of this.resourceNames) {
            const countLabel = this.node
                .getChildByName(resourceName)
                ?.getChildByName('数量')
                ?.getComponent(Label);

            if (countLabel) {
                countLabel.string =
                    ZRSJZ_BNSDataService.GetBNSProperty(resourceName).toString();
            }
        }
    }

    private async PlayResourceEffect(
        resourceName: ZRSJZ_BNS_ResourceName,
        resourceNode: Node,
        onComplete: Function = null,
    ): Promise<void> {
        if (!resourceNode || !resourceNode.isValid) {
            onComplete?.();
            return;
        }

        const targetNode = this.node
            .getChildByName(resourceName)
            ?.getChildByName(`${resourceName}资源`);

        if (!targetNode) {
            onComplete?.();
            return;
        }

        const prefab = await ZRSJZ_BNS_Incident.Loadprefab("Prefabs/资源特效") as Prefab;
        if (!prefab) {
            onComplete?.();
            return;
        }

        const startPosition = this.GetEffectLocalPosition(resourceNode);
        const targetPosition = this.GetEffectLocalPosition(targetNode, true);
        const effectNode = instantiate(prefab);
        effectNode.parent = this.node;

        const effect = effectNode.getComponent(ZRSJZ_BNS_ResourceEffect);
        if (!effect) {
            effectNode.destroy();
            onComplete?.();
            return;
        }

        effect.Play(resourceName, startPosition, targetPosition, onComplete);
    }

    private GetEffectLocalPosition(targetNode: Node, isUiNode: boolean = false): Vec3 {
        const panelTransform = this.node.getComponent(UITransform);
        if (!panelTransform) return Vec3.ZERO;

        if (isUiNode) {
            return panelTransform.convertToNodeSpaceAR(targetNode.worldPosition);
        }

        const worldCamera = find("Canvas/Camera")?.getComponent(Camera);
        if (!worldCamera) {
            return panelTransform.convertToNodeSpaceAR(targetNode.worldPosition);
        }

        return worldCamera.convertToUINode(targetNode.worldPosition, this.node);
    }

    private RefreshDerivedProperties(): void {
        let totalPower = 0;
        let usedPower = 0;
        let prosperity = 0;

        for (const buildingName in ZRSJZ_BNS_Constant.建筑配置) {
            const bnsBuildingName = buildingName as ZRSJZ_BNS_BuildingName;
            const level = ZRSJZ_BNSDataService.GetBNSBuildingLevel(bnsBuildingName);

            if (bnsBuildingName === "发电厂") {
                totalPower += ZRSJZ_BNS_Constant.GetBuildingEffectValue(bnsBuildingName, level);
            }

            usedPower += ZRSJZ_BNS_Constant.GetBuildingPowerCost(bnsBuildingName, level);
            prosperity += ZRSJZ_BNS_Constant.GetBuildingProsperity(bnsBuildingName, level);
        }

        ZRSJZ_BNSDataService.SetBNSProperty("电力", Math.max(0, totalPower - usedPower));
        ZRSJZ_BNSDataService.SetBNSProperty("繁荣度", prosperity);
    }
}
