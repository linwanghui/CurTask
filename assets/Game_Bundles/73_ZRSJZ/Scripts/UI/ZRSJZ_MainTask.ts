import { _decorator, Component, Label, Node } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_TaskService } from '../Service/ZRSJZ_TaskService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MainTask')
export class ZRSJZ_MainTask extends Component {

    TaskNameLabel: Label = null;
    Checked: Node = null;
    GetState: Node = null;
    CompleteState: Node = null;
    UnderwayState: Node = null;
    TipNode: Node = null;

    TaksName: string = "";

    private _isInit: boolean = false;

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW, this.Show, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_CHECK, this.Check, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW, this.Show, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_CHECK, this.Check, this);
    }

    Init(taskName: string) {
        if (!this._isInit) {
            this._isInit = true;
            this.TaskNameLabel = this.node.getChildByName("TaskName").getComponent(Label);
            this.Checked = this.node.getChildByName("Checked");
            this.GetState = this.node.getChildByName("可领取");
            this.CompleteState = this.node.getChildByName("已完成");
            this.UnderwayState = this.node.getChildByName("进行中");
            this.TipNode = this.node.getChildByName("红点");
            this.node.on(Node.EventType.TOUCH_END, this.Click, this);
        }
        this.TaksName = taskName;
        this.TaskNameLabel.string = taskName;
        this.Show();
    }

    Show() {
        this.GetState.active = this.TaksName === ZRSJZ_GameData.Instance.NewMainTask;
        this.CompleteState.active = ZRSJZ_GameData.Instance.MainTaskComplete.includes(this.TaksName);
        this.UnderwayState.active = ZRSJZ_GameData.Instance.CurMainTask?.TaskName === this.TaksName;
        this.TipNode.active = ZRSJZ_TaskService.ShouldShowTaskReminder(this.TaksName);
    }

    Check(name: string) {
        this.Checked.active = this.TaksName === name;
    }

    Click() {
        if (this.Checked.active) return;
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_CHECK, this.TaksName);
    }
}


