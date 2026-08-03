import { _decorator, Component, Node, UITransform, Vec2 } from 'cc';
const { ccclass } = _decorator;

@ccclass('WZSJZ_Cell')
export class WZSJZ_Cell extends Component {
    /** 格子在所属区域中的下标（按从左到右、从上到下排列）。 */
    public Index: number = -1;
    /** formation：布阵区，preparation：备战框。 */
    public Zone: string = "";
    /** 普通交互仅允许已解锁格，道具锁格由管理器处理特殊合成。 */
    public IsUnlocked: boolean = false;
    /** 道具锁格可作为同级合成目标，成功后会解锁。 */
    public IsItemLocked: boolean = false;
    /** 物体不作为格子的子节点，只在这里保存占用关系。 */
    public Occupant: Node = null;
    private _itemLockNode: Node = null;

    public Init(index: number, zone: string, unlocked: boolean): void {
        this.Index = index;
        this.Zone = zone;
        this._itemLockNode = this.node.getChildByName("道具锁");
        this.SetUnlocked(unlocked);
    }

    public SetUnlocked(unlocked: boolean): void {
        this.IsUnlocked = unlocked;
        this.IsItemLocked = false;
        const lockNode = this.node.getChildByName("格子-锁");
        const itemLockNode = this._itemLockNode || this.node.getChildByName("道具锁");
        if (lockNode) {
            lockNode.active = !unlocked;
        }
        if (itemLockNode) {
            itemLockNode.active = false;
        }
    }

    public SetItemLocked(): void {
        this.IsUnlocked = false;
        this.IsItemLocked = true;
        const lockNode = this.node.getChildByName("格子-锁");
        const itemLockNode = this._itemLockNode || this.node.getChildByName("道具锁");
        if (lockNode) {
            lockNode.active = false;
        }
        if (itemLockNode) {
            itemLockNode.active = true;
        }
    }

    public MoveItemLockToLayer(layer: Node): void {
        if (!this._itemLockNode || !layer) {
            return;
        }
        this._itemLockNode.setParent(layer, true);
        this._itemLockNode.setSiblingIndex(layer.children.length - 1);
    }

    public IsEmpty(): boolean {
        return this.Occupant === null || !this.Occupant.isValid;
    }

    public ContainsUIPosition(position: Vec2): boolean {
        const transform = this.getComponent(UITransform);
        return !!transform && transform.getBoundingBoxToWorld().contains(position);
    }
}
