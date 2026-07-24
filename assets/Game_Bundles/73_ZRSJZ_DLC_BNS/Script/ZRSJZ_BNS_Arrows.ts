import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_Arrows')
export class ZRSJZ_BNS_Arrows extends Component {
    @property({ tooltip: '玩家距离目标小于该距离时，自动关闭指引' })
    private arriveDistance: number = 200;

    private target: Node = null;

    /**
     * 设置需要指引的建筑。即使“指向”节点当前未激活，也可以直接调用。
     */
    public SetTarget(target: Node, arriveDistance: number = 200): void {
        if (!target || !target.isValid) {
            this.CancelTarget();
            return;
        }

        this.target = target;
        this.arriveDistance = Math.max(0, arriveDistance);
        this.node.active = true;
        this.RefreshDirection();
    }

    public CancelTarget(): void {
        this.target = null;
        this.node.active = false;
    }

    protected update(): void {
        this.RefreshDirection();
    }

    private RefreshDirection(): void {
        if (!this.target || !this.target.isValid || !this.node.parent) {
            this.CancelTarget();
            return;
        }

        const playerPosition = this.node.parent.worldPosition;
        const targetPosition = this.target.worldPosition;
        const directionX = targetPosition.x - playerPosition.x;
        const directionY = targetPosition.y - playerPosition.y;
        const distanceSqr = directionX * directionX + directionY * directionY;

        if (distanceSqr <= this.arriveDistance * this.arriveDistance) {
            this.CancelTarget();
            return;
        }

        // “指向”图片默认朝上，因此世界方向角需要减去 90 度。
        const angle = Math.atan2(directionY, directionX) * 180 / Math.PI - 90;
        this.node.setRotationFromEuler(0, 0, angle);
    }
}


