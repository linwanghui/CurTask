import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";
import { ZRSJZ_MAIN_TASK_CONFIG } from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_GradeService } from "./ZRSJZ_GradeService";
import { ZRSJZ_SIDE_TASK_CONFIG, ZRSJZ_SIDE_TASK_LINES, ZRSJZ_TaskObjective } from '../ZRSJZ_TaskLines';
import { ZRSJZ_InventoryService } from './ZRSJZ_InventoryService';

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
    public static GetTaskAward(taskID?: string): boolean {
        if (taskID && ZRSJZ_SIDE_TASK_CONFIG.has(taskID)) {
            if (this.GetTaskState(taskID) !== 2) return false;
            const line = ZRSJZ_SIDE_TASK_LINES.find(line => line.Tasks.some(task => task.ID === taskID));
            const progress = ZRSJZ_GameData.Instance.TaskLines[line.ID];
            progress.index++;
            progress.accepted = false;
            progress.count = 0;
            // 扩容接口一次保存进度与行数；先推进进度，防止重复点击或事件重入重复发奖。
            ZRSJZ_InventoryService.AddInventoryRow(line.Warehouse, ZRSJZ_SIDE_TASK_CONFIG.get(taskID).TaskAwards[0].TaskAwardCount);
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW);
            return true;
        }
        const data = ZRSJZ_GameData.Instance;
        if (!data.CurMainTask || (taskID && data.CurMainTask.TaskName !== taskID)
            || !this.IsTaskReadyToClaim(data.CurMainTask.TaskName)) return false;
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
        return true;
    }

    //领取任务
    public static GetNewTask(taskID?: string) {
        if (taskID && ZRSJZ_SIDE_TASK_CONFIG.has(taskID)) {
            if (this.GetTaskState(taskID) !== 0) return;
            const line = ZRSJZ_SIDE_TASK_LINES.find(line => line.Tasks.some(task => task.ID === taskID));
            const progress = ZRSJZ_GameData.Instance.TaskLines[line.ID];
            progress.accepted = true;
            progress.count = 0;
            ZRSJZ_GameData.SaveData();
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW);
            return;
        }
        const data = ZRSJZ_GameData.Instance;
        if (data.CurMainTask || (taskID && taskID !== data.NewMainTask)) return;
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
        const line = ZRSJZ_SIDE_TASK_LINES.find(line => line.Tasks.some(task => task.ID === taskName));
        if (line) {
            const progress = data.TaskLines[line.ID];
            const index = line.Tasks.findIndex(task => task.ID === taskName);
            if (index < progress.index) return 3;
            if (index > progress.index) return -1;
            if (!progress.accepted) return 0;
            return progress.count >= line.Tasks[index].Objective.count ? 2 : 1;
        }
        if (data.MainTaskComplete.includes(taskName)) {
            return 3;
        } else if (data.CurMainTask && data.CurMainTask.TaskName == taskName) {
            if (data.CurMainTask.CurCount >= ZRSJZ_MAIN_TASK_CONFIG.get(taskName).TaskTargets[0].TaskTargetCount) {
                return 2;
            } else {
                return 1;
            }
        } else {
            return data.NewMainTask === taskName ? 0 : -1;
        }
    }

    /** 当前是否存在需要玩家处理的主线任务。 */
    public static HasMainTaskReminder(): boolean {
        const data = ZRSJZ_GameData.Instance;
        const hasTaskToAccept = !!data.NewMainTask && ZRSJZ_MAIN_TASK_CONFIG.has(data.NewMainTask);
        return hasTaskToAccept || this.IsTaskReadyToClaim(data.CurMainTask?.TaskName)
            || ZRSJZ_SIDE_TASK_LINES.some(line => {
                const task = line.Tasks[data.TaskLines[line.ID]?.index ?? 0];
                return task && this.ShouldShowTaskReminder(task.ID);
            });
    }

    /** 指定任务条目是否需要显示红点。 */
    public static ShouldShowTaskReminder(taskName: string): boolean {
        const data = ZRSJZ_GameData.Instance;
        const state = this.GetTaskState(taskName);
        return state === 0 || state === 2;
    }

    public static GetConfig(taskID: string) {
        return ZRSJZ_SIDE_TASK_CONFIG.get(taskID) ?? ZRSJZ_MAIN_TASK_CONFIG.get(taskID);
    }

    public static GetProgress(taskID: string): number {
        const line = ZRSJZ_SIDE_TASK_LINES.find(line => line.Tasks.some(task => task.ID === taskID));
        if (this.GetTaskState(taskID) === 3) return this.GetConfig(taskID).TaskTargets[0].TaskTargetCount;
        if (line) return line.Tasks[ZRSJZ_GameData.Instance.TaskLines[line.ID].index]?.ID === taskID
            ? ZRSJZ_GameData.Instance.TaskLines[line.ID].count : 0;
        return ZRSJZ_GameData.Instance.CurMainTask?.TaskName === taskID
            ? ZRSJZ_GameData.Instance.CurMainTask.CurCount : 0;
    }

    private static Advance(match: (objective: ZRSJZ_TaskObjective) => number): void {
        let changed = false;
        const data = ZRSJZ_GameData.Instance;
        ZRSJZ_SIDE_TASK_LINES.forEach(line => {
            const progress = data.TaskLines[line.ID];
            const task = line.Tasks[progress?.index];
            if (!progress?.accepted || !task || progress.count >= task.Objective.count) return;
            const increment = match(task.Objective);
            if (!Number.isFinite(increment) || increment <= 0) return;
            progress.count = Math.min(task.Objective.count, progress.count + increment);
            changed = true;
        });
        if (!changed) return;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW);
    }

    public static RecordKills(guns: readonly string[], count: number = 1): void {
        this.Advance(o => o.kind === 'kills' || (o.kind === 'armedKills' && guns.includes(o.item)) ? count : 0);
    }

    public static RecordBoss(map: string): void {
        this.Advance(o => o.kind === 'boss' && o.map === map ? 1 : 0);
    }

    public static RecordExtraction(propIDs: readonly string[]): void {
        const props = Array.from(new Set(propIDs)).map(id => ZRSJZ_GameData.Instance.PropData[id])
            .filter(prop => prop && prop.CurCount > 0);
        const value = props.reduce((sum, prop) => sum + prop.UnitPrice * prop.CurCount, 0);
        this.Advance(o => {
            if (o.kind === 'extractValue') return value >= o.value ? 1 : 0;
            if (o.kind === 'extractItem') return props.reduce((sum, prop) => sum + (prop.Name === o.item ? prop.CurCount : 0), 0);
            return 0;
        });
    }

    public static RecordForge(itemName: string): void {
        this.Advance(o => o.kind === 'forge' && o.item === itemName ? 1 : 0);
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
