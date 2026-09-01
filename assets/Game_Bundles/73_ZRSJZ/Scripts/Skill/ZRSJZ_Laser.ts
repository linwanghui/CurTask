import { _decorator, ERaycast2DType, Node, PhysicsSystem2D, Vec2, Vec3 } from 'cc';
import { ZRSJZ_Skill } from './ZRSJZ_Skill';
import { ZRSJZ_TIER } from '../ZRSJZ_Constant';
import { ZRSJZ_EnemyBase } from '../Controller/ZRSJZ_EnemyBase';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Laser')
export class ZRSJZ_Laser extends ZRSJZ_Skill {

    SkillDamage: number = 15;

    Point1_0: Node = null;
    Point1_1: Node = null;
    Point2_0: Node = null;
    Point2_1: Node = null;

    private _followTarget: Node = null;
    private _worldPositionProvider: (() => Vec3) = null;
    private _directionProvider: (() => Vec2) = null;

    Init(): void {
        super.Init();
        this.Point1_0 = this.node.getChildByName("Point1_0");
        this.Point1_1 = this.node.getChildByName("Point1_1");
        this.Point2_0 = this.node.getChildByName("Point2_0");
        this.Point2_1 = this.node.getChildByName("Point2_1");
    }

    /** 保持在地图特效层，通过世界坐标每帧跟随目标，而不成为玩家子节点。 */
    public Follow(
        target: Node,
        worldPositionProvider: () => Vec3,
        directionProvider: () => Vec2,
    ): void {
        this._followTarget = target;
        this._worldPositionProvider = worldPositionProvider;
        this._directionProvider = directionProvider;
        this.SyncFollowTransform();
    }

    protected lateUpdate(): void {
        this.SyncFollowTransform();
    }

    protected onDisable(): void {
        this._followTarget = null;
        this._worldPositionProvider = null;
        this._directionProvider = null;
    }

    private SyncFollowTransform(): void {
        if (!this._followTarget?.isValid || !this._followTarget.activeInHierarchy) return;

        const worldPosition = this._worldPositionProvider?.();
        if (worldPosition) this.node.setWorldPosition(worldPosition);

        const direction = this._directionProvider?.();
        if (!direction || (direction.x === 0 && direction.y === 0)) return;
        const angle = Math.atan2(direction.y, direction.x) * 180 / Math.PI;
        this.node.setWorldRotationFromEuler(0, 0, angle);
    }

    Attack() {
        const results1 = PhysicsSystem2D.instance.raycast(new Vec2(this.Point1_0.worldPosition.x, this.Point1_0.worldPosition.y), new Vec2(this.Point1_1.worldPosition.x, this.Point1_1.worldPosition.y), ERaycast2DType.All, ZRSJZ_TIER.敌人,);
        const results2 = PhysicsSystem2D.instance.raycast(new Vec2(this.Point2_0.worldPosition.x, this.Point2_0.worldPosition.y), new Vec2(this.Point2_1.worldPosition.x, this.Point2_1.worldPosition.y), ERaycast2DType.All, ZRSJZ_TIER.敌人,);

        // 合并两条射线的结果，并以碰撞体为单位去重。
        const results = Array.from(
            new Map(
                [...results1, ...results2].map(result => [result.collider.node, result] as const),
            ).values(),
        );

        results.forEach(result => {
            result.collider.node.getComponent(ZRSJZ_EnemyBase)?.BeHit(this.Harm);
        })
    }

}

