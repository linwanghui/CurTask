import { _decorator, EventTouch, find, Label, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { GetSpecialOperationConfig, ZRSJZ_PANEL, ZRSJZ_SPECIAL_OPERATION_CONFIG, ZRSJZ_SpecialOperationConfig } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_SpecialOperationsTaskIcon } from '../Unit/ZRSJZ_SpecialOperationsTaskIcon';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_SpecialOperationsPanel')
export class ZRSJZ_SpecialOperationsPanel extends ZRSJZ_Panel {

    TaskDesc: Label = null;
    TaskAwardCount: Label = null;
    Time: Label = null;
    TaskAwardContent: Node = null;
    private _mapKey: string = "";
    private _sourceTaskPoint: ZRSJZ_SpecialOperationsTaskIcon = null;
    private _requestPlayerIndex: number = 0;
    private _currentConfig: Readonly<ZRSJZ_SpecialOperationConfig> = null;
    private _refreshVersion: number = 0;

    protected onLoad(): void {
        this.TaskDesc = find("Panel/TaskDesc", this.node).getComponent(Label);
        // 预制体中钞票数量和概率奖励列表的节点都叫 TaskAward，不能用同一条 find 路径查找。
        this.TaskAwardCount = find("Panel/TaskAward", this.node).getComponent(Label);
        this.Time = find("Panel/Time", this.node).getComponent(Label);
        const panel = find("Panel", this.node);
        const propAwardRoot = panel.children.find(child =>
            child.name === "TaskAward" && !!child.getChildByName("View"),
        );
        this.TaskAwardContent = propAwardRoot?.getChildByName("View")?.getChildByName("Content") ?? null;
    }

    public Show(...args: any[]): void {
        super.Show();
        this._mapKey = typeof args[0] === "string" ? args[0] : ZRSJZ_GameData.Instance.CurMap;
        this._sourceTaskPoint = args[1] instanceof ZRSJZ_SpecialOperationsTaskIcon
            ? args[1]
            : null;
        this._requestPlayerIndex = Number(args[2]) === 1 ? 1 : 0;
        const baseConfig = ZRSJZ_SPECIAL_OPERATION_CONFIG.get(this._mapKey);
        const taskType = baseConfig
            ? this._sourceTaskPoint?.ResolveTaskType(baseConfig.TaskType)
            : undefined;
        const config = GetSpecialOperationConfig(this._mapKey, taskType);
        this._currentConfig = config ?? null;
        this.RefreshTask(config);
    }

    private async RefreshTask(config: Readonly<ZRSJZ_SpecialOperationConfig> | undefined): Promise<void> {
        const refreshVersion = ++this._refreshVersion;
        this.ClearPropAwards();

        if (!config) {
            this.TaskDesc.string = "当前地图暂无特别行动任务";
            this.TaskAwardCount.string = "0";
            if (this.Time) this.Time.string = "0s";
            return;
        }

        // 原预制体描述区域较矮，使用两行内可完整显示的字号，避免覆盖下方奖励标题。

        this.TaskDesc.string = `${config.TaskDesc}`;
        this.TaskAwardCount.string = config.GoldReward.toLocaleString();
        if (this.Time) this.Time.string = `${config.TimeLimitSeconds}s`;

        if (!this.TaskAwardContent) {
            console.warn("[ZRSJZ_SpecialOperationsPanel] 未找到概率奖励 Content 节点");
            return;
        }
        for (const award of config.PropAwards) {
            const awardNode = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/TaskAward");
            if (!awardNode) continue;
            if (refreshVersion !== this._refreshVersion || !this.node.isValid) {
                ZRSJZ_PoolManager.Instance.PutNode(awardNode);
                continue;
            }
            awardNode.parent = this.TaskAwardContent;
            awardNode.active = true;
            const awardUI = awardNode.getComponent(ZRSJZ_TaskAward);
            awardUI.Init(award.PropName, award.Count);
            // TaskAward 原本的数量区域用于显示该物资的独立掉落概率。
            awardUI.Count.string = `${Math.round(award.Probability * 100)}%`;
        }
    }

    private ClearPropAwards(): void {
        if (!this.TaskAwardContent) return;
        for (const child of [...this.TaskAwardContent.children]) {
            ZRSJZ_PoolManager.Instance.PutNode(child);
        }
    }

    OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                this.ClosePanel();
                break;
            case "领取任务":
                if (this._currentConfig?.TaskType === "待定") {
                    void ZRSJZ_UIManager.Instance.ShowTip("该任务暂未开放");
                    return;
                }
                if (ZRSJZ_Game.Instance?.IsSpecialOperationInProgress()) {
                    void ZRSJZ_UIManager.Instance.ShowTip("任务正在进行中");
                    return;
                }
                if (!ZRSJZ_Game.Instance?.AcceptSpecialOperation(
                    this._mapKey,
                    this._sourceTaskPoint,
                    this._requestPlayerIndex,
                )) {
                    return;
                }
                this.ClosePanel();
                break;
        }
    }

    private ClosePanel(): void {
        if (this.PlayerIndex >= 0) {
            ZRSJZ_UIManager.Instance.HidePlayerPanel(
                ZRSJZ_PANEL.特别行动弹窗,
                this.PlayerIndex,
            );
        } else {
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.特别行动弹窗);
        }
    }


}
