import {
    GetFacilityBonusValue as GetConfiguredFacilityBonusValue,
    GetFiringRangeAttackBonusPercent,
    ZRSJZ_FACILITY_UPGRADE_CONFIG,
    ZRSJZ_UpgradeFacilityName,
} from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";

/** 基地设施等级及其属性加成计算。 */
export class ZRSJZ_FacilityService {
    public static GetFiringRangeLevel(): number {
        return this.GetFacilityLevel("靶场");
    }

    public static SetFiringRangeLevel(level: number): void {
        this.SetFacilityLevel("靶场", level);
    }

    public static GetFacilityLevel(facilityName: ZRSJZ_UpgradeFacilityName): number {
        const data = ZRSJZ_GameData.Instance;
        const maxLevel = ZRSJZ_FACILITY_UPGRADE_CONFIG[facilityName].Levels.length;
        const savedLevel = data.FacilityLevel?.[facilityName]
            ?? (facilityName === "靶场" ? data.FiringRangeLevel : 0)
            ?? 0;
        return Math.max(0, Math.min(maxLevel, Math.floor(savedLevel)));
    }

    public static SetFacilityLevel(facilityName: ZRSJZ_UpgradeFacilityName, level: number): void {
        if (!Number.isFinite(level)) return;
        const data = ZRSJZ_GameData.Instance;
        const newLevel = Math.max(0, Math.min(
            ZRSJZ_FACILITY_UPGRADE_CONFIG[facilityName].Levels.length,
            Math.floor(level),
        ));
        if (this.GetFacilityLevel(facilityName) === newLevel) return;
        if (!data.FacilityLevel) data.FacilityLevel = {};
        data.FacilityLevel[facilityName] = newLevel;
        if (facilityName === "靶场") data.FiringRangeLevel = newLevel;
        ZRSJZ_GameData.SaveData();
    }

    public static GetFacilityBonusValue(facilityName: ZRSJZ_UpgradeFacilityName): number {
        return GetConfiguredFacilityBonusValue(facilityName, this.GetFacilityLevel(facilityName));
    }

    public static GetFiringRangeAttackBonusRate(): number {
        return GetFiringRangeAttackBonusPercent(this.GetFiringRangeLevel()) / 100;
    }

    public static GetResearchMaxHPBonus(): number {
        return this.GetFacilityBonusValue("研究所");
    }

    public static GetGymMoveSpeedBonusRate(): number {
        return this.GetFacilityBonusValue("健身") / 100;
    }
}
