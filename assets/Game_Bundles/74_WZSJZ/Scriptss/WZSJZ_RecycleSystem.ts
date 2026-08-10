import { _decorator, Component, Node, UITransform, Vec2 } from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_EconomySystem } from './WZSJZ_EconomySystem';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';

const { ccclass } = _decorator;

/** 负责回收区交互与提示显示，GameManager 只转发拖拽结果。 */
@ccclass('WZSJZ_RecycleSystem')
export class WZSJZ_RecycleSystem extends Component {
    private _recycleNode: Node = null;
    private _guideNode: Node = null;
    private _economySystem: WZSJZ_EconomySystem = null;

    protected onLoad(): void {
        // 与管理器处于同一节点，用局部事件广播拖拽物变化。
        this.node.on(WZSJZ_EventManager.拖拽物变化, this.OnDraggingItemChanged, this);
    }

    public Configure(recycleNode: Node, economySystem: WZSJZ_EconomySystem): void {
        this._recycleNode = recycleNode;
        this._economySystem = economySystem;
        this._guideNode = recycleNode?.getChildByName("回收指引") || null;
        this.SetGuideVisible(false);
        this._recycleNode?.on(Node.EventType.TOUCH_END, this.OnRecycleClicked, this);
    }

    public TryRecycle(
        gameNode: WZSJZ_GameNode,
        sourceCell: WZSJZ_Cell,
        uiPosition: Vec2,
    ): boolean {
        if (!this.CanRecycle(gameNode)) {
            return false;
        }
        const transform = this._recycleNode?.getComponent(UITransform);
        if (!transform?.getBoundingBoxToWorld().contains(uiPosition)) {
            return false;
        }

        const materialName = gameNode.Name;
        const reward = WZSJZ_Constant.GetRecycleReward(materialName, gameNode.Level);
        sourceCell.Occupant = null;
        gameNode.CurrentCell = null;
        gameNode.node.destroy();
        this._economySystem?.AddResources(reward.Money, reward.Food);
        WZSJZ_UIManager.Instance.ShowText(this.GetRecycleText(materialName, reward));
        return true;
    }

    private OnDraggingItemChanged(gameNode: WZSJZ_GameNode | null): void {
        this.SetGuideVisible(this.CanRecycle(gameNode));
    }

    private CanRecycle(gameNode: WZSJZ_GameNode | null): boolean {
        return !!gameNode?.CurrentCell && gameNode.CurrentCell.Zone !== "wall";
    }

    private SetGuideVisible(visible: boolean): void {
        if (this._guideNode?.isValid) {
            this._guideNode.active = visible;
        }
    }

    private OnRecycleClicked(): void {
        WZSJZ_UIManager.Instance.ShowText("将物品拖入此处回收");
    }

    private GetRecycleText(
        materialName: string,
        reward: { Money: number; Food: number },
    ): string {
        const rewards: string[] = [];
        if (reward.Money > 0) rewards.push(`钞票 ${reward.Money}`);
        if (reward.Food > 0) rewards.push(`食物 ${reward.Food}`);
        return rewards.length > 0
            ? `已回收${materialName}，获得${rewards.join("、")}`
            : `已回收${materialName}`;
    }
}
