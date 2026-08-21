import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";
import { ZRSJZ_MAIN_TASK_CONFIG } from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";

export class ZRSJZ_TaskService {

    //完成任务---增加次数
    public static CompleteTask(taskName: string, count: number = 1) {
        const data = ZRSJZ_GameData.Instance;
        if (data.CurMainTask.TaskTargetName != taskName) return;
        data.CurMainTask.CurCount += count;
        ZRSJZ_GameData.SaveData();
    }

    //领取任务奖励
    public static GetTaskAward() {
        const data = ZRSJZ_GameData.Instance;
        if (!data.CurMainTask) return;
        data.MainTaskComplete.push(data.CurMainTask.TaskName);
        const curIndex: number = Array.from(ZRSJZ_MAIN_TASK_CONFIG.keys()).indexOf(data.CurMainTask.TaskName);
        if (curIndex + 1 < Array.from(ZRSJZ_MAIN_TASK_CONFIG.keys()).length) {
            data.NewMainTask = Array.from(ZRSJZ_MAIN_TASK_CONFIG.keys())[curIndex + 1];
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
        data.CurMainTask = {
            TaskName: task.TaskName,
            TaskTargetName: task.TaskTargets[0].TaskTargetName,
            CurCount: 0
        }
        data.NewMainTask = "";
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW);
        ZRSJZ_GameData.SaveData();
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

}


