import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";
import { ZRSJZ_MAIN_TASK_CONFIG } from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_GradeService } from "./ZRSJZ_GradeService";

export class ZRSJZ_TaskService {

    //完成任务---增加次数
    public static CompleteTask(taskName: string, count: number = 1) {
        const data = ZRSJZ_GameData.Instance;
        if (data.CurMainTask == null || data.CurMainTask.TaskTargetName != taskName) return;
        const wasReadyToClaim = this.IsTaskReadyToClaim(data.CurMainTask.TaskName);
        data.CurMainTask.CurCount += count;
        if (!wasReadyToClaim && this.IsTaskReadyToClaim(data.CurMainTask.TaskName)) {
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW);
        }
        ZRSJZ_GameData.SaveData();
    }

    //领取任务奖励
    public static GetTaskAward() {
        const data = ZRSJZ_GameData.Instance;
        if (!data.CurMainTask) return;
        const taskName = data.CurMainTask.TaskName;
        this.GetTaskExperienceAward(taskName);
        data.MainTaskComplete.push(taskName);
        const curIndex: number = Array.from(ZRSJZ_MAIN_TASK_CONFIG.keys()).indexOf(taskName);
        if (curIndex + 1 < Array.from(ZRSJZ_MAIN_TASK_CONFIG.keys()).length) {
            data.NewMainTask = Array.from(ZRSJZ_MAIN_TASK_CONFIG.keys())[curIndex + 1];
            // 新任务发布时立即固定经验，之后玩家等级和当前经验变化都不会改写奖励。
            this.GetTaskExperienceAward(data.NewMainTask);
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_ADD, data.NewMainTask);
        }
        data.CurMainTask = null;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW);
        ZRSJZ_GameData.SaveData();
    }

    //领取任务
    public static GetNewTask() {
        const data = ZRSJZ_GameData.Instance;
        if (!data.NewMainTask || !ZRSJZ_MAIN_TASK_CONFIG.has(data.NewMainTask)) return;
        const task = ZRSJZ_MAIN_TASK_CONFIG.get(data.NewMainTask);
        // 兼容没有发布快照的旧存档；一旦生成后只读取，不再重新计算。
        this.GetTaskExperienceAward(task.TaskName);
        data.CurMainTask = {
            TaskName: task.TaskName,
            TaskTargetName: task.TaskTargets[0].TaskTargetName,
            CurCount: 0
        }
        data.NewMainTask = "";
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW);
        ZRSJZ_GameData.SaveData();
    }

    /** 获取任务发布时的经验奖励；只有旧存档缺少快照时才会补建一次。 */
    public static GetTaskExperienceAward(taskName: string): number {
        const data = ZRSJZ_GameData.Instance;
        data.MainTaskExperienceAwards ??= {};
        const savedAward = data.MainTaskExperienceAwards[taskName];
        if (typeof savedAward === "number" && Number.isFinite(savedAward)) {
            return Math.max(0, Math.floor(savedAward));
        }

        const configuredAward = ZRSJZ_MAIN_TASK_CONFIG.get(taskName)?.TaskAwards.find(
            award => award.TaskAwardName === "经验",
        )?.TaskAwardCount ?? 0;
        // 已完成的旧任务无法还原当时的动态值，沿用配置值；当前/新任务在此刻固定。
        const experienceAward = Math.max(0, Math.floor(
            data.MainTaskComplete.includes(taskName)
                ? configuredAward
                : ZRSJZ_GradeService.GetExperienceToNextLevel(),
        ));
        data.MainTaskExperienceAwards[taskName] = experienceAward;
        ZRSJZ_GameData.SaveData();
        return experienceAward;
    }

    /**
     * 
     * @param taskName 任务名字
     * 
     * return 任务状态 0:未领取任务 1:未完成任务 2:完成任务未领取奖励 3:任务已领取奖励
     */
    public static GetTaskState(taskName: string) {
        const data = ZRSJZ_GameData.Instance;
        if (data.MainTaskComplete.includes(taskName)) {
            return 3;
        } else if (data.CurMainTask && data.CurMainTask.TaskName == taskName) {
            if (data.CurMainTask.CurCount >= ZRSJZ_MAIN_TASK_CONFIG.get(taskName).TaskTargets[0].TaskTargetCount) {
                return 2;
            } else {
                return 1;
            }
        } else {
            return 0;
        }
    }

    /** 当前是否存在需要玩家处理的主线任务。 */
    public static HasMainTaskReminder(): boolean {
        const data = ZRSJZ_GameData.Instance;
        const hasTaskToAccept = !!data.NewMainTask && ZRSJZ_MAIN_TASK_CONFIG.has(data.NewMainTask);
        return hasTaskToAccept || this.IsTaskReadyToClaim(data.CurMainTask?.TaskName);
    }

    /** 指定任务条目是否需要显示红点。 */
    public static ShouldShowTaskReminder(taskName: string): boolean {
        const data = ZRSJZ_GameData.Instance;
        return data.NewMainTask === taskName || this.IsTaskReadyToClaim(taskName);
    }

    private static IsTaskReadyToClaim(taskName: string): boolean {
        if (!taskName) return false;
        const data = ZRSJZ_GameData.Instance;
        const taskConfig = ZRSJZ_MAIN_TASK_CONFIG.get(taskName);
        return !!taskConfig
            && data.CurMainTask?.TaskName === taskName
            && data.CurMainTask.CurCount >= taskConfig.TaskTargets[0].TaskTargetCount;
    }

}


