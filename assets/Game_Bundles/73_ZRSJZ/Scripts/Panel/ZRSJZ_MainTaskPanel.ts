import { _decorator, Component, EventTouch, find, instantiate, Label, Node, Prefab } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_MainTask } from '../UI/ZRSJZ_MainTask';
import { ZRSJZ_MAIN_TASK_CONFIG, ZRSJZ_MainTaskAwardConfig, ZRSJZ_MainTaskConfig, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_TaskService } from '../Service/ZRSJZ_TaskService';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MainTaskPanel')
export class ZRSJZ_MainTaskPanel extends ZRSJZ_Panel {

    @property(Prefab)
    TaskPrefab: Prefab = null;

    TasksContent: Node = null;
    TaskName: Label = null;
    TaskDesc: Label = null;
    TaskTargetComplete: Node = null;
    TaskTargetDesc: Label = null;
    TaskAward: Node = null;
    GetAward: Node = null;
    GetTask: Node = null;
    Underway: Node = null;

    private _curTask: string = "";
    private _curTaskConfig: ZRSJZ_MainTaskConfig = null

    protected onLoad(): void {
        this.TasksContent = find("Panel/Tasks/View/Content", this.node);
        this.TaskName = find("Panel/TasksDesc/View/Content/TaskName/TaskName", this.node).getComponent(Label);
        this.TaskDesc = find("Panel/TasksDesc/View/Content/TaskDesc", this.node).getComponent(Label);
        this.TaskTargetComplete = find("Panel/TasksDesc/View/Content/TaskTarget/Complete", this.node);
        this.TaskTargetDesc = find("Panel/TasksDesc/View/Content/TaskTarget/TaskTargetDesc", this.node).getComponent(Label);
        this.TaskAward = find("Panel/TasksDesc/View/Content/TaskAward/View/Content", this.node);
        this.GetAward = find("Panel/TasksDesc/领取奖励", this.node);
        this.GetTask = find("Panel/TasksDesc/领取任务", this.node);
        this.Underway = find("Panel/TasksDesc/已接取任务", this.node);
    }

    protected start(): void {
        ZRSJZ_PoolManager.Instance.Preload("Prefabs/UI/TaskAward", 5);
        this.InitTask();
    }

    protected onEnable(): void {
        this.ShowTaskDesc(this._curTask);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_CHECK, this.ShowTaskDesc, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW, this.StateChange, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_ADD, this.AddTask, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_CHECK, this.ShowTaskDesc, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW, this.StateChange, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_ADD, this.AddTask, this);
    }

    InitTask() {
        ZRSJZ_GameData.Instance.MainTaskComplete.forEach(taskName => {
            this._curTask = taskName;
            const task: Node = instantiate(this.TaskPrefab);
            task.parent = this.TasksContent;
            task.getComponent(ZRSJZ_MainTask).Init(this._curTask);
        })
        if (ZRSJZ_GameData.Instance.CurMainTask) {
            this._curTask = ZRSJZ_GameData.Instance.CurMainTask.TaskName;
            const task: Node = instantiate(this.TaskPrefab);
            task.parent = this.TasksContent;
            task.getComponent(ZRSJZ_MainTask).Init(this._curTask);
        } else if (ZRSJZ_GameData.Instance.NewMainTask) {
            this._curTask = ZRSJZ_GameData.Instance.NewMainTask;
            const task: Node = instantiate(this.TaskPrefab);
            task.parent = this.TasksContent;
            task.getComponent(ZRSJZ_MainTask).Init(this._curTask);
        }
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_CHECK, this._curTask);
    }

    AddTask(taskName: string) {
        const task: Node = instantiate(this.TaskPrefab);
        task.parent = this.TasksContent;
        task.getComponent(ZRSJZ_MainTask).Init(taskName);
    }

    ShowTaskDesc(taskName: string) {
        if (!ZRSJZ_MAIN_TASK_CONFIG.has(taskName)) {
            console.error("没有任务：", taskName);
            return;
        }
        this._curTask = taskName;
        this._curTaskConfig = ZRSJZ_MAIN_TASK_CONFIG.get(taskName);
        this.TaskName.string = this._curTaskConfig.TaskName;
        this.TaskDesc.string = this._curTaskConfig.TaskDesc;
        const taskState = ZRSJZ_TaskService.GetTaskState(taskName);
        this.TaskTargetComplete.active = taskState == 2 || taskState == 3;
        const curCount = taskState == 0 ? 0 : taskState == 1 ? ZRSJZ_GameData.Instance.CurMainTask.CurCount : this._curTaskConfig.TaskTargets[0].TaskTargetCount;
        this.TaskTargetDesc.string = `${this._curTaskConfig.TaskTargets[0].TaskTargetName}(${curCount}/${this._curTaskConfig.TaskTargets[0].TaskTargetCount})`
        this.ShowAward(...this._curTaskConfig.TaskAwards);
        this.GetTask.active = taskState == 0;
        this.GetAward.active = taskState == 2;
        this.Underway.active = taskState == 1;
    }

    ShowAward(...args: ZRSJZ_MainTaskAwardConfig[]) {
        for (let i = this.TaskAward.children.length - 1; i >= 0; i--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.TaskAward.children[i]);
        }
        args.forEach(award => {
            ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/TaskAward").then(awardNode => {
                awardNode.parent = this.TaskAward;
                awardNode.active = true;
                awardNode.getComponent(ZRSJZ_TaskAward).Init(award.TaskAwardName, award.TaskAwardCount);
            })
        })
    }

    StateChange() {
        const taskState = ZRSJZ_TaskService.GetTaskState(this._curTask);
        this.GetTask.active = taskState == 0;
        this.GetAward.active = taskState == 2;
        this.Underway.active = taskState == 1;
    }

    OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.主线任务界面);
                break;
            case "领取任务":
                ZRSJZ_TaskService.GetNewTask();
                break;
            case "领取奖励":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, ...this._curTaskConfig.TaskAwards);
                ZRSJZ_TaskService.GetTaskAward();
                break;
        }
    }
}


