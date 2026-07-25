import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

export type ZRSJZ_BNS_ResourceName = "木材" | "矿石" | "食物" | "宝石" | "电力" | "繁荣度";
export type ZRSJZ_BNS_GatherConfig = {
    propertyName: ZRSJZ_BNS_ResourceName,
    minCount: number,
    maxCount: number,
    aniName: string,
};
export type ZRSJZ_BNS_BuildingName =
    "主基地" | "仓库" | "伐木场" | "医疗部" | "发电厂" | "矿场" | "科研所" | "防御塔" | "果园";
export type ZRSJZ_BNS_BuildingConfig = {
    effectName: string,
    effectValuePerLevel: number,
    powerCostPerLevel: number,
    prosperityPerLevel: number,
    costBase: { 木材: number, 矿石: number, 宝石: number },
    outputResourceName?: "木材" | "矿石" | "食物",
};

@ccclass('ZRSJZ_BNS_Constant')
export class ZRSJZ_BNS_Constant {

    public static 砍树动画: string = "gj_dao3";
    public static 挖矿动画: string = "gj_dao3";
    public static 采集动画: string = "gj_dao3";

    public static 采集配置: { [nodeName: string]: ZRSJZ_BNS_GatherConfig } = {
        "桦树": { propertyName: "木材", minCount: 100, maxCount: 200, aniName: ZRSJZ_BNS_Constant.砍树动画 },
        "松树": { propertyName: "木材", minCount: 100, maxCount: 200, aniName: ZRSJZ_BNS_Constant.砍树动画 },
        "铁矿": { propertyName: "矿石", minCount: 80, maxCount: 140, aniName: ZRSJZ_BNS_Constant.挖矿动画 },
        "金矿": { propertyName: "矿石", minCount: 150, maxCount: 250, aniName: ZRSJZ_BNS_Constant.挖矿动画 },
        "钻石矿": { propertyName: "宝石", minCount: 5, maxCount: 15, aniName: ZRSJZ_BNS_Constant.挖矿动画 },
        "果丛": { propertyName: "食物", minCount: 60, maxCount: 120, aniName: ZRSJZ_BNS_Constant.采集动画 },
    };

    public static 建筑配置: { [buildingName in ZRSJZ_BNS_BuildingName]: ZRSJZ_BNS_BuildingConfig } = {
        "主基地": { effectName: "繁荣度:", effectValuePerLevel: 20, powerCostPerLevel: 0, prosperityPerLevel: 20, costBase: { 木材: 120, 矿石: 80, 宝石: 0 } },
        "仓库": { effectName: "仓库扩容:", effectValuePerLevel: 10, powerCostPerLevel: 1, prosperityPerLevel: 5, costBase: { 木材: 100, 矿石: 60, 宝石: 0 } },
        "伐木场": { effectName: "木材每秒收益:", effectValuePerLevel: 1, powerCostPerLevel: 1, prosperityPerLevel: 5, costBase: { 木材: 80, 矿石: 40, 宝石: 0 }, outputResourceName: "木材" },
        "医疗部": { effectName: "每秒回血:", effectValuePerLevel: 1, powerCostPerLevel: 2, prosperityPerLevel: 8, costBase: { 木材: 120, 矿石: 80, 宝石: 0 } },
        "发电厂": { effectName: "电量:", effectValuePerLevel: 10, powerCostPerLevel: 0, prosperityPerLevel: 6, costBase: { 木材: 100, 矿石: 100, 宝石: 0 } },
        "矿场": { effectName: "矿石每秒收益:", effectValuePerLevel: 1, powerCostPerLevel: 2, prosperityPerLevel: 5, costBase: { 木材: 90, 矿石: 70, 宝石: 0 }, outputResourceName: "矿石" },
        "科研所": { effectName: "解锁科技等级:", effectValuePerLevel: 1, powerCostPerLevel: 3, prosperityPerLevel: 10, costBase: { 木材: 150, 矿石: 120, 宝石: 1 } },
        "防御塔": { effectName: "避难所防御:", effectValuePerLevel: 10, powerCostPerLevel: 2, prosperityPerLevel: 8, costBase: { 木材: 120, 矿石: 140, 宝石: 0 } },
        "果园": { effectName: "食物每秒收益:", effectValuePerLevel: 1, powerCostPerLevel: 1, prosperityPerLevel: 5, costBase: { 木材: 80, 矿石: 30, 宝石: 0 }, outputResourceName: "食物" },
    };

    public static 建筑外观2等级: number = 5;
    public static 建筑外观3等级: number = 10;

    public static GetBuildingUpgradeCost(buildingName: ZRSJZ_BNS_BuildingName, nextLevel: number): { 木材: number, 矿石: number, 宝石: number } {
        const costBase = ZRSJZ_BNS_Constant.建筑配置[buildingName].costBase;
        return {
            木材: costBase.木材 * nextLevel,
            矿石: costBase.矿石 * nextLevel,
            宝石: costBase.宝石 * nextLevel,
        };
    }

    public static GetBuildingEffectValue(buildingName: ZRSJZ_BNS_BuildingName, level: number): number {
        return ZRSJZ_BNS_Constant.建筑配置[buildingName].effectValuePerLevel * level;
    }

    public static GetBuildingPowerCost(buildingName: ZRSJZ_BNS_BuildingName, level: number): number {
        return ZRSJZ_BNS_Constant.建筑配置[buildingName].powerCostPerLevel * level;
    }

    public static GetBuildingProsperity(buildingName: ZRSJZ_BNS_BuildingName, level: number): number {
        return ZRSJZ_BNS_Constant.建筑配置[buildingName].prosperityPerLevel * level;
    }

    public static GetBuildingSpriteName(buildingName: ZRSJZ_BNS_BuildingName, level: number): string {
        if (level >= ZRSJZ_BNS_Constant.建筑外观3等级) {
            return `${buildingName}3`;
        }
        if (level >= ZRSJZ_BNS_Constant.建筑外观2等级) {
            return `${buildingName}2`;
        }
        return buildingName;
    }

    public static GetBuildingName(name: string): ZRSJZ_BNS_BuildingName | null {
        const buildingName = name === "研究所" ? "科研所" : name;
        return buildingName in ZRSJZ_BNS_Constant.建筑配置
            ? buildingName as ZRSJZ_BNS_BuildingName
            : null;
    }

}
