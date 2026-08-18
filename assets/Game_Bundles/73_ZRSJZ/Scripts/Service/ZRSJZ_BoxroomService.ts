import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_FacilityService } from "./ZRSJZ_FacilityService";

/** 收藏室属性和盲盒统计业务。 */
export class ZRSJZ_BoxroomService {
    public static GetBoxroomPropLevel(propName: string): number {
        return Math.max(0, Math.min(3, Math.floor(ZRSJZ_GameData.Instance.BoxroomPropLevel?.[propName] ?? 0)));
    }

    public static SetBoxroomPropLevel(propName: string, level: number): void {
        if (!propName || !Number.isFinite(level)) return;
        const data = ZRSJZ_GameData.Instance;
        const newLevel = Math.max(0, Math.min(3, Math.floor(level)));
        if (!data.BoxroomPropLevel) data.BoxroomPropLevel = {};
        if (this.GetBoxroomPropLevel(propName) === newLevel) return;
        if (newLevel === 0) delete data.BoxroomPropLevel[propName];
        else data.BoxroomPropLevel[propName] = newLevel;
        ZRSJZ_GameData.SaveData();
    }

    public static SetBoxroomAttributeBonusBasisPoints(bonusBasisPoints: { [attributeName: string]: number }): void {
        const safeBonus: { [attributeName: string]: number } = {};
        for (const attributeName in bonusBasisPoints) {
            const value = bonusBasisPoints[attributeName];
            safeBonus[attributeName] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
        }
        const data = ZRSJZ_GameData.Instance;
        if (JSON.stringify(data.BoxroomAttributeBonusBasisPoint ?? {}) === JSON.stringify(safeBonus)) return;
        data.BoxroomAttributeBonusBasisPoint = safeBonus;
        ZRSJZ_GameData.SaveData();
    }

    public static GetBoxroomAttributeBonusRate(attributeName: string): number {
        const basisPoint = ZRSJZ_GameData.Instance.BoxroomAttributeBonusBasisPoint?.[attributeName] ?? 0;
        return Math.max(0, Math.floor(basisPoint)) / 10000;
    }

    public static GetBoxroomAttributeIncrease(attributeName: string, baseValue: number): number {
        return Number.isFinite(baseValue) ? baseValue * this.GetBoxroomAttributeBonusRate(attributeName) : 0;
    }

    public static GetTotalGunDamageBonusRate(): number {
        return ZRSJZ_FacilityService.GetFiringRangeAttackBonusRate()
            + this.GetBoxroomAttributeBonusRate("枪械伤害");
    }

    public static GetTotalMeleeDamageBonusRate(): number {
        return ZRSJZ_FacilityService.GetFiringRangeAttackBonusRate()
            + this.GetBoxroomAttributeBonusRate("近战伤害");
    }

    public static RecordMysteryBoxOpen(cost: number, value: number, redCount: number): void {
        const data = ZRSJZ_GameData.Instance;
        data.MysteryBoxTotalCost = Math.max(0, Math.floor((data.MysteryBoxTotalCost ?? 0) + Math.max(0, cost)));
        data.MysteryBoxTotalValue = Math.max(0, Math.floor((data.MysteryBoxTotalValue ?? 0) + Math.max(0, value)));
        data.MysteryBoxOpenCount = Math.max(0, Math.floor((data.MysteryBoxOpenCount ?? 0) + 1));
        data.MysteryBoxRedCount = Math.max(0, Math.floor((data.MysteryBoxRedCount ?? 0) + Math.max(0, redCount)));
        ZRSJZ_GameData.SaveData();
    }
}
