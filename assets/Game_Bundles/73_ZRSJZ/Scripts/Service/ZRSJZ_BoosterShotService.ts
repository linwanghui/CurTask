import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";
import { ZRSJZ_BOOSTER_SHOT_CONFIG } from "../ZRSJZ_Constant";

export class ZRSJZ_BoosterShotService {
    public static AddBoosterShot(boosterShot: string): boolean {
        if (!ZRSJZ_BOOSTER_SHOT_CONFIG.has(boosterShot)) return false;
        const data = ZRSJZ_GameData.Instance;
        data.BoosterShotData ??= {};
        data.BoosterShotData[boosterShot] = this.GetBoosterShotCount(boosterShot) + 1;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_BOOSTER_SHOT_REFRESH);
        return true;
    }

    /** 消耗一支增强针并设为当前使用项。 */
    public static UseBoosterShot(boosterShot: string): boolean {
        const data = ZRSJZ_GameData.Instance;
        if (
            !ZRSJZ_BOOSTER_SHOT_CONFIG.has(boosterShot)
            || this.GetBoosterShotCount(boosterShot) <= 0
            || this.GetCurBoosterShot() === boosterShot
        ) return false;
        data.BoosterShotData[boosterShot]--;
        data.CurBoosterShot = boosterShot;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_BOOSTER_SHOT_REFRESH);
        return true;
    }

    public static GetBoosterShotCount(boosterShot: string) {
        const data = ZRSJZ_GameData.Instance;
        if (!data.BoosterShotData || !data.BoosterShotData.hasOwnProperty(boosterShot)) return 0;
        return Math.max(0, Math.floor(Number(data.BoosterShotData[boosterShot]) || 0));
    }

    public static GetCurBoosterShot() {
        const boosterShot = ZRSJZ_GameData.Instance.CurBoosterShot;
        return ZRSJZ_BOOSTER_SHOT_CONFIG.has(boosterShot) ? boosterShot : "";
    }

    /** 获取配置中的原始增益值，例如生命针为 50、攻击针为 15。 */
    public static GetBoosterValue(type: string): number {
        if (this.GetCurBoosterShot() !== type) return 0;
        return Math.max(0, Number(ZRSJZ_BOOSTER_SHOT_CONFIG.get(type)?.Count) || 0);
    }

    /** 获取百分比类增强针的小数增益，例如 15% 返回 0.15。 */
    public static GetBooster(type: string): number {
        return this.GetBoosterValue(type) * 0.01;
    }

    /** 爆率针将原本的红色概率乘以 1.5，并把结果限制在 0~1。 */
    public static GetBoostedRedProbability(baseProbability: number): number {
        const probability = Math.max(0, Math.min(1, Number(baseProbability) || 0));
        return Math.min(1, probability * (1 + this.GetBooster("爆率针")));
    }

    /**
     * 调整相对权重，使归一化后的红色实际概率精确获得爆率针加成。
     * 例如原概率为 0.1，使用爆率针后会变为 0.15，而不只是简单放大红色权重。
     */
    public static ApplyRedProbabilityToWeights(weights: readonly number[], redIndex: number): number[] {
        const result = weights.map(weight => Math.max(0, Number(weight) || 0));
        if (redIndex < 0 || redIndex >= result.length || this.GetBooster("爆率针") <= 0) return result;

        const totalWeight = result.reduce((sum, weight) => sum + weight, 0);
        const redWeight = result[redIndex];
        const nonRedWeight = totalWeight - redWeight;
        if (totalWeight <= 0 || redWeight <= 0 || nonRedWeight <= 0) return result;

        const boostedProbability = this.GetBoostedRedProbability(redWeight / totalWeight);
        result[redIndex] = boostedProbability >= 1
            ? Number.MAX_SAFE_INTEGER
            : nonRedWeight * boostedProbability / (1 - boostedProbability);
        return result;
    }

    /** 当前增强针只作用一局；离开战斗场景时清除，不返还已消耗的针。 */
    public static ClearCurrentBoosterShot(): boolean {
        const data = ZRSJZ_GameData.Instance;
        if (!data.CurBoosterShot) return false;
        data.CurBoosterShot = "";
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_BOOSTER_SHOT_REFRESH);
        return true;
    }

}

