import { _decorator, Component, Node, UITransform, Vec2 } from 'cc';
const { ccclass } = _decorator;

@ccclass('WZSJZ_Cell')
export class WZSJZ_Cell extends Component {
    /** 格子在所属区域中的下标（按从左到右、从上到下排列）。 */
    public Index: number = -1;
    /** formation：布阵区，preparation：备战框。 */
    public Zone: string = "";
    /** 锁定格不能购买、放置或合成。 */
    public IsUnlocked: boolean = false;
    /** 物体不作为格子的子节点，只在这里保存占用关系。 */
    public Occupant: Node = null;

    public Init(index: number, zone: string, unlocked: boolean): void {
        this.Index = index;
        this.Zone = zone;
        this.SetUnlocked(unlocked);
    }

    public SetUnlocked(unlocked: boolean): void {
        this.IsUnlocked = unlocked;
        const lockNode = this.node.getChildByName("格子-锁");
        if (lockNode) {
            lockNode.active = !unlocked;
        }
    }

    public IsEmpty(): boolean {
        return this.Occupant === null || !this.Occupant.isValid;
    }

    public ContainsUIPosition(position: Vec2): boolean {
        const transform = this.getComponent(UITransform);
        return !!transform && transform.getBoundingBoxToWorld().contains(position);
    }
}
