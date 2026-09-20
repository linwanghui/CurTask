import { ZRSJZ_GameData } from '../ZRSJZ_GameData';

/** 常驻战备冲刺。积分只由已领取任务推导，阶段奖励不扣积分。 */
export class ZRSJZ_ActivityService {
    public static readonly Tasks = [
        { value: 1000000, points: 10 }, { value: 3000000, points: 15 },
        { value: 5000000, points: 20 }, { value: 10000000, points: 25 },
        { value: 20000000, points: 30 }, { value: 50000000, points: 40 },
        { value: 100000000, points: 60 },
    ];
    public static readonly Rewards = [
        { points: 20, PropName: '金条', Count: 1 },
        { points: 40, PropName: '宠物碎片', Count: 20 },
        { points: 70, PropName: '英雄碎片', Count: 20 },
        { points: 100, PropName: '坦克', Count: 1 },
        { points: 140, PropName: '英雄碎片', Count: 50 },
        { points: 200, PropName: '裂海鲨', Count: 1 },
    ];
    private static granting = false;
    public static get Value(): number { return ZRSJZ_GameData.Instance.ActivityExtractionValue; }
    public static get Points(): number {
        return this.Tasks.reduce((sum, task, i) => sum + (this.TaskClaimed(i) ? task.points : 0), 0);
    }
    public static RecordExtraction(value: number): void {
        if (!Number.isFinite(value) || value <= 0) return;
        ZRSJZ_GameData.Instance.ActivityExtractionValue = Math.min(Number.MAX_SAFE_INTEGER, this.Value + Math.floor(value));
        ZRSJZ_GameData.SaveData();
    }
    public static TaskClaimed(i: number): boolean { return ZRSJZ_GameData.Instance.ActivityTaskClaimed.includes(i); }
    public static RewardClaimed(i: number): boolean { return ZRSJZ_GameData.Instance.ActivityRewardClaimed.includes(i); }
    public static CanClaimTask(i: number): boolean {
        return !!this.Tasks[i] && !this.TaskClaimed(i) && this.Value >= this.Tasks[i].value;
    }
    public static CanClaimReward(i: number): boolean {
        return !!this.Rewards[i] && !this.RewardClaimed(i) && this.Points >= this.Rewards[i].points;
    }
    public static HasClaimable(): boolean {
        return this.Tasks.some((_, i) => this.CanClaimTask(i)) || this.Rewards.some((_, i) => this.CanClaimReward(i));
    }
    public static ClaimTask(i: number): boolean {
        if (!this.CanClaimTask(i)) return false;
        ZRSJZ_GameData.Instance.ActivityTaskClaimed.push(i);
        ZRSJZ_GameData.SaveData();
        return true;
    }
    /** 发放使用现有仓库/碎片/溢出邮件流程；全局锁避免重复点击跨面板发奖。 */
    public static async ClaimReward(i: number, grant: (award: { PropName: string; Count: number }) => Promise<void>): Promise<boolean> {
        if (this.granting || !this.CanClaimReward(i)) return false;
        this.granting = true;
        const data = ZRSJZ_GameData.Instance;
        data.ActivityRewardClaimed.push(i);
        try {
            await grant(this.Rewards[i]);
            ZRSJZ_GameData.SaveData();
            return true;
        } catch (error) {
            data.ActivityRewardClaimed = data.ActivityRewardClaimed.filter(id => id !== i);
            ZRSJZ_GameData.SaveData();
            throw error;
        } finally { this.granting = false; }
    }
}
