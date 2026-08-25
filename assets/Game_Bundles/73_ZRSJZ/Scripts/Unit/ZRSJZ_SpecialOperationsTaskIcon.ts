import { _decorator, CircleCollider2D, Component, Node, Prefab, RigidBody2D } from 'cc';
import { ZRSJZ_SpecialOperationTaskType } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_SpecialOperationsTaskIcon')
export class ZRSJZ_SpecialOperationsTaskIcon extends Component {
    @property({
        displayName: "TaskName",
        tooltip: "填写任务类别：高价值目标、坚守轰炸区、破壁行动、待定",
    })
    TaskName: string = "高价值目标";

    @property({
        type: Prefab,
        displayName: "HighValueTarget",
        tooltip: "高价值目标任务生成的敌人预制体；不配置时使用当前地图默认Boss",
    })
    HighValueTarget: Prefab = null;

    @property({
        type: Node,
        displayName: "HighValueTargetPoint",
        tooltip: "高价值目标的生成地点；不配置时在当前特别行动任务点附近生成",
    })
    HighValueTargetPoint: Node = null;

    private _checked: Node = null;
    private readonly _checkingPlayers = new Set<number>();

    protected onLoad(): void {
        this._checked = this.node.getChildByName("Checked");
        if (this._checked) this._checked.active = false;
        const rigidBody = this.getComponent(RigidBody2D);
        if (rigidBody) rigidBody.enabledContactListener = true;
        const collider = this.getComponent(CircleCollider2D);
        if (collider) collider.sensor = true;
    }

    public get IsAvailable(): boolean {
        return this.node?.isValid && this.node.activeInHierarchy;
    }

    /** 玩家进入任务点范围时显示选中框。 */
    public Check(playerIndex: number): void {
        this._checkingPlayers.add(playerIndex);
        this.RefreshChecked();
    }

    /** 玩家离开任务点范围时取消该玩家的选中状态。 */
    public CheckCancel(playerIndex: number): void {
        this._checkingPlayers.delete(playerIndex);
        this.RefreshChecked();
    }

    private RefreshChecked(): void {
        if (this._checked?.isValid) {
            this._checked.active = this.IsAvailable && this._checkingPlayers.size > 0;
        }
    }

    /** 接取当前特别行动后关闭场景里的接取点及其碰撞。 */
    public Deactivate(): void {
        this._checkingPlayers.clear();
        if (this._checked?.isValid) this._checked.active = false;
        if (this.node?.isValid) this.node.active = false;
    }

    public ResolveTaskType(
        fallback: ZRSJZ_SpecialOperationTaskType,
    ): ZRSJZ_SpecialOperationTaskType {
        if (this.TaskName === "高价值目标"
            || this.TaskName === "坚守轰炸区"
            || this.TaskName === "破壁行动"
            || this.TaskName === "待定") {
            return this.TaskName;
        }
        console.warn(`[ZRSJZ_SpecialOperationsTaskIcon] 未知TaskName: ${this.TaskName}，使用地图默认任务`);
        return fallback;
    }
}

