import { sys } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AccountService } from './ZRSJZ_AccountService';
import { ZRSJZ_InventoryService } from './ZRSJZ_InventoryService';
import { GetForgeRecipe, ZRSJZ_ForgeRecipe } from '../ZRSJZ_ForgeConstant';

export type ZRSJZ_ForgeTask = {
    itemName: string,
    startedAt: number,
    finishAt: number,
};

export type ZRSJZ_ForgeActionResult = {
    success: boolean,
    message: string,
};

export class ZRSJZ_ForgeService {
    private static readonly STORAGE_KEY = 'ZRSJZ_ForgeTask_v1';

    public static GetTask(): ZRSJZ_ForgeTask | null {
        const json = sys.localStorage.getItem(this.STORAGE_KEY);
        if (!json) return null;
        try {
            const task = JSON.parse(json) as ZRSJZ_ForgeTask;
            if (
                !task
                || typeof task.itemName !== 'string'
                || !Number.isFinite(task.startedAt)
                || !Number.isFinite(task.finishAt)
                || task.finishAt <= task.startedAt
                || !GetForgeRecipe(task.itemName)
            ) {
                this.ClearTask();
                return null;
            }
            return task;
        } catch (error) {
            console.warn('[ZRSJZ_ForgeService] 锻造记录损坏，已清理', error);
            this.ClearTask();
            return null;
        }
    }

    public static IsReady(task: ZRSJZ_ForgeTask = this.GetTask()): boolean {
        return !!task && Date.now() >= task.finishAt;
    }

    public static GetRemainingMilliseconds(task: ZRSJZ_ForgeTask = this.GetTask()): number {
        return task ? Math.max(0, task.finishAt - Date.now()) : 0;
    }

    public static GetProgress(task: ZRSJZ_ForgeTask = this.GetTask()): number {
        if (!task) return 0;
        const duration = Math.max(1, task.finishAt - task.startedAt);
        return Math.max(0, Math.min(1, (Date.now() - task.startedAt) / duration));
    }

    public static ValidateStart(recipe: ZRSJZ_ForgeRecipe): ZRSJZ_ForgeActionResult {
        if (!recipe) return { success: false, message: '锻造配方不存在' };
        if (this.GetTask()) return { success: false, message: '已有装备正在锻造' };
        if (ZRSJZ_GameData.Instance.Gold < recipe.goldCost) {
            return { success: false, message: '所需货币不足' };
        }
        for (const material of recipe.materials) {
            if (ZRSJZ_InventoryService.GetPropCountByName(material.name) < material.count) {
                return { success: false, message: material.name + '不足' };
            }
        }
        return { success: true, message: '' };
    }

    public static Start(recipe: ZRSJZ_ForgeRecipe): ZRSJZ_ForgeActionResult {
        const validation = this.ValidateStart(recipe);
        if (!validation.success) return validation;
        for (const material of recipe.materials) {
            if (!ZRSJZ_InventoryService.ConsumeProp(material.name, material.count)) {
                console.error('[ZRSJZ_ForgeService] 扣除锻造材料失败', material);
                return { success: false, message: '材料扣除失败' };
            }
        }
        ZRSJZ_AccountService.ChangeGold(-recipe.goldCost);
        const startedAt = Date.now();
        const task: ZRSJZ_ForgeTask = {
            itemName: recipe.itemName,
            startedAt,
            finishAt: startedAt + recipe.durationHours * 60 * 60 * 1000,
        };
        sys.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(task));
        return { success: true, message: '开始锻造' };
    }

    public static Claim(): ZRSJZ_ForgeActionResult {
        const task = this.GetTask();
        if (!task) return { success: false, message: '当前没有锻造任务' };
        if (!this.IsReady(task)) return { success: false, message: '锻造尚未完成' };
        const recipe = GetForgeRecipe(task.itemName);
        if (!recipe) {
            this.ClearTask();
            return { success: false, message: '锻造配方已失效' };
        }
        const propID = ZRSJZ_InventoryService.AddPropByName(recipe.itemName, 1);
        if (!propID) return { success: false, message: '装备发放失败' };
        this.ClearTask();
        return { success: true, message: '已领取' + recipe.itemName };
    }

    private static ClearTask(): void {
        sys.localStorage.removeItem(this.STORAGE_KEY);
    }
}
