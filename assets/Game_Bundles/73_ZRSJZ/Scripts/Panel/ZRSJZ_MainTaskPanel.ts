import { _decorator, EventTouch, find, instantiate, Label, Layout, Node, Prefab, UITransform } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_MainTask } from '../UI/ZRSJZ_MainTask';
import { ZRSJZ_MAIN_TASK_CONFIG, ZRSJZ_MainTaskAwardConfig, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_TaskService } from '../Service/ZRSJZ_TaskService';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_SIDE_TASK_CONFIG, ZRSJZ_SIDE_TASK_LINES } from '../ZRSJZ_TaskLines';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MainTaskPanel')
export class ZRSJZ_MainTaskPanel extends ZRSJZ_Panel {
    @property(Prefab) TaskPrefab: Prefab = null;
    private _content: Node;
    private _taskName: Label;
    private _taskDesc: Label;
    private _target: Label;
    private _complete: Node;
    private _awards: Node;
    private _accept: Node;
    private _claim: Node;
    private _status: Node;
    private _go: Node;
    private _selected = '';
    private _expanded = new Set<string>(['main']);
    private _awardVersion = 0;
    private _awardTask = '';
    private _claiming = false;

    protected onLoad(): void {
        this._content = find('Panel/Tasks/View/Content', this.node);
        const detail = find('Panel/TasksDesc/View/Content', this.node);
        this._taskName = find('TaskName/TaskName', detail).getComponent(Label);
        this._taskDesc = find('TaskDesc', detail).getComponent(Label);
        this._target = find('TaskTarget/TaskTargetDesc', detail).getComponent(Label);
        this._complete = find('TaskTarget/Complete', detail);
        this._awards = find('TaskAward/View/Content', detail);
        this._accept = find('Panel/TasksDesc/领取任务', this.node);
        this._claim = find('Panel/TasksDesc/领取奖励', this.node);
        this._status = find('Panel/TasksDesc/已接取任务', this.node);
        this._go = find('Panel/TasksDesc/前往', this.node);
        for (const id of ['main', ...ZRSJZ_SIDE_TASK_LINES.map(line => line.ID)]) {
            const group = this._content.getChildByName('Line_' + id);
            group.getChildByName('Header').on(Node.EventType.TOUCH_END, () => {
                ZRSJZ_AudioManager.Instance.PlaySound('点击');
                if (this._expanded.has(id)) this._expanded.delete(id);
                else {
                    this._expanded.add(id);
                    const tasks = this.GetLineTasks(id);
                    this._selected = tasks.find(task => [0, 1, 2].includes(ZRSJZ_TaskService.GetTaskState(task)))
                        ?? tasks[tasks.length - 1] ?? this._selected;
                }
                this.Refresh();
            }, this);
        }
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_CHECK, this.SelectTask, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW, this.Refresh, this);
        const data = ZRSJZ_GameData.Instance;
        if (!ZRSJZ_TaskService.GetConfig(this._selected)) {
            this._selected = data.CurMainTask?.TaskName || data.NewMainTask
                || data.MainTaskComplete[data.MainTaskComplete.length - 1] || '初入禁区';
        }
        this._awardTask = '';
        this.Refresh();
    }

    protected onDisable(): void {
        this._awardVersion++;
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_CHECK, this.SelectTask, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW, this.Refresh, this);
    }

    private GetLineTasks(id: string): string[] {
        return id === 'main' ? Array.from(ZRSJZ_MAIN_TASK_CONFIG.keys())
            : ZRSJZ_SIDE_TASK_LINES.find(line => line.ID === id).Tasks.map(task => task.ID);
    }

    private Refresh(): void {
        if (!this._content) return;
        for (const id of ['main', ...ZRSJZ_SIDE_TASK_LINES.map(line => line.ID)]) {
            const group = this._content.getChildByName('Line_' + id);
            const body = group.getChildByName('Body');
            body.children.slice().forEach(child => { child.removeFromParent(); child.destroy(); });
            const expanded = this._expanded.has(id);
            const header = group.getChildByName('Header');
            header.getChildByName('展开底').active = expanded;
            header.getChildByName('收起底').active = !expanded;
            const tasks = this.GetLineTasks(id);
            const completed = tasks.filter(task => ZRSJZ_TaskService.GetTaskState(task) === 3).length;
            const name = id === 'main' ? '禁区征途 · 主线' : ZRSJZ_SIDE_TASK_LINES.find(line => line.ID === id).Name;
            header.getChildByName('Name').getComponent(Label).string = `${name}  ${completed}/${tasks.length}`;
            if (id === 'main') {
                header.getChildByName('Name').getComponent(Label).string += ZRSJZ_GameData.Instance.MainTaskComplete.includes('北境终局')
                    ? '\n安全箱3×3 · 已解锁' : '\n通关奖励：安全箱3×3';
            }
            header.getChildByName('红点').active = tasks.some(task => ZRSJZ_TaskService.ShouldShowTaskReminder(task));
            // 已完成和已开放的任务常驻列表，后续任务在上一关领奖后出现。
            const visible = expanded ? tasks.filter(task => ZRSJZ_TaskService.GetTaskState(task) !== -1) : [];
            body.active = expanded;
            visible.forEach((taskID, index) => {
                const row = instantiate(this.TaskPrefab);
                row.parent = body;
                row.active = true;
                row.setPosition(0, -60 - index * 128);
                const item = row.getComponent(ZRSJZ_MainTask);
                item.Init(taskID);
                item.Check(this._selected);
            });
            body.getComponent(UITransform).height = visible.length * 128;
            group.getComponent(UITransform).height = 104 + visible.length * 128;
        }
        this._content.getComponent(Layout)?.updateLayout();
        this.RefreshDetail();
    }

    private SelectTask(taskID: string): void {
        this._selected = taskID;
        this.RefreshDetail();
    }

    private RefreshDetail(): void {
        if (this._go) this._go.active = this.GetNavigationPanel() !== null;
        const config = ZRSJZ_TaskService.GetConfig(this._selected);
        if (!config) return;
        const state = ZRSJZ_TaskService.GetTaskState(this._selected);
        this._taskName.string = config.TaskName;
        this._taskDesc.string = config.TaskDesc;
        const target = config.TaskTargets[0];
        this._target.string = `${target.TaskTargetName} (${Math.min(target.TaskTargetCount, ZRSJZ_TaskService.GetProgress(this._selected))}/${target.TaskTargetCount})`;
        this._complete.active = state === 2 || state === 3;
        this._accept.active = state === 0;
        this._claim.active = state === 2;
        this._status.active = state === 1 || state === 3 || state === -1;
        this._status.getChildByName('Tip').getComponent(Label).string = state === 3 ? '奖励已领取' : state === -1 ? '完成前置任务后解锁' : '任务进行中';
        if (this._awardTask !== this._selected) {
            this._awardTask = this._selected;
            this.ShowAwards(this.ResolveAwards(this._selected));
        }
    }

    private ResolveAwards(taskID: string): ZRSJZ_MainTaskAwardConfig[] {
        return ZRSJZ_TaskService.GetConfig(taskID).TaskAwards.map(award => ({
            ...award,
            TaskAwardCount: award.TaskAwardName === '经验'
                ? ZRSJZ_TaskService.GetTaskExperienceAward(taskID) : award.TaskAwardCount,
        }));
    }

    /** 仅已接取且尚未完成的任务提供快捷入口。 */
    private GetNavigationPanel(): ZRSJZ_PANEL | null {
        if (ZRSJZ_TaskService.GetTaskState(this._selected) !== 1) return null;
        const sideTask = ZRSJZ_SIDE_TASK_CONFIG.get(this._selected);
        if (sideTask) {
            switch (sideTask.Objective.kind) {
                case 'forge': return ZRSJZ_PANEL.锻造界面;
                case 'kills':
                case 'armedKills':
                case 'extractItem':
                case 'extractValue':
                case 'boss': return ZRSJZ_PANEL.选关界面;
                default: return null;
            }
        }
        const target = ZRSJZ_TaskService.GetConfig(this._selected)?.TaskTargets[0]?.TaskTargetName ?? '';
        if (/在商[城店]购买/.test(target)) return ZRSJZ_PANEL.商店界面;
        if (/^出售/.test(target)) return ZRSJZ_PANEL.仓库界面;
        if (/^强化/.test(target)) return ZRSJZ_PANEL.强化界面;
        if (/^击杀\[|^打败\[|^进入\[.*\]并成功撤离/.test(target)) return ZRSJZ_PANEL.选关界面;
        return null;
    }

    private ShowAwards(awards: ZRSJZ_MainTaskAwardConfig[]): void {
        const version = ++this._awardVersion;
        this._awards.children.slice().forEach(child => ZRSJZ_PoolManager.Instance.PutNode(child));
        awards.forEach((award, index) => {
            ZRSJZ_PoolManager.Instance.GetNode('Prefabs/UI/TaskAward').then(node => {
                if (!this.node?.isValid || !this.node.activeInHierarchy || version !== this._awardVersion) {
                    ZRSJZ_PoolManager.Instance.PutNode(node);
                    return;
                }
                node.parent = this._awards;
                node.setSiblingIndex(index);
                node.active = true;
                node.getComponent(ZRSJZ_TaskAward).Init(award.TaskAwardName, award.TaskAwardCount);
            }).catch(error => console.error('[任务] 奖励展示加载失败', error));
        });
    }

    OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        switch (event.getCurrentTarget().name) {
            case '关闭': ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.主线任务界面); break;
            case '领取任务': ZRSJZ_TaskService.GetNewTask(this._selected); break;
            case '前往': {
                const destination = this.GetNavigationPanel();
                if (!destination || ZRSJZ_UIManager.Dragging) return;
                // 使用预制体已有的按钮事件，不重复绑定触摸回调。
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.主线任务界面, () => {
                    ZRSJZ_UIManager.Instance.ShowPanel(destination);
                });
                break;
            }
            case '领取奖励': {
                if (this._claiming || ZRSJZ_TaskService.GetTaskState(this._selected) !== 2) return;
                this._claiming = true;
                try {
                    const taskID = this._selected;
                    const awards = this.ResolveAwards(taskID);
                    if (!ZRSJZ_TaskService.GetTaskAward(taskID)) return;
                    if (ZRSJZ_SIDE_TASK_CONFIG.has(taskID)) {
                        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, { Awards: awards, DisplayOnly: true });
                    } else {
                        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, ...awards);
                    }
                } finally { this._claiming = false; }
                break;
            }
        }
    }
}
