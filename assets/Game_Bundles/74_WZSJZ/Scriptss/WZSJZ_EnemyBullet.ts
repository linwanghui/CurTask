import {
    _decorator,
    Animation,
    Collider2D,
    Component,
    Quat,
    RigidBody2D,
    Vec2,
    Vec3,
} from 'cc';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass } = _decorator;

/** 敌对通用子弹：不做碰撞检测，直达锁定的城墙前沿后结算。 */
@ccclass('WZSJZ_EnemyBullet')
export class WZSJZ_EnemyBullet extends Component {
    private _wall: WZSJZ_Wall = null;
    private _damage: number = 0;
    private _speed: number = 0;
    private _hitDistance: number = 0;
    private _fallbackEffectDuration: number = 0;
    private _targetPosition: Vec3 = new Vec3();
    private _hasHit: boolean = false;
    private _onRecycle: ((bullet: WZSJZ_EnemyBullet) => void) = null;

    public Initialize(
        wall: WZSJZ_Wall,
        damage: number,
        speed: number,
        hitDistance: number,
        fallbackEffectDuration: number,
        onRecycle: (bullet: WZSJZ_EnemyBullet) => void,
    ): boolean {
        if (!wall?.IsAlive || damage < 0 || speed <= 0) return false;
        this.unscheduleAllCallbacks();
        this._wall = wall;
        this._damage = damage;
        this._speed = speed;
        this._hitDistance = Math.max(1, hitDistance);
        this._fallbackEffectDuration = Math.max(0, fallbackEffectDuration);
        this._hasHit = false;
        this._onRecycle = onRecycle;
        this.node.active = true;
        this.DisablePhysics();

        const current = this.node.worldPosition;
        this._targetPosition.set(wall.GetFrontWorldX(current.x), current.y, current.z);
        const bullet = this.node.getChildByName("子弹");
        const effect = this.node.getChildByName("命中特效");
        if (bullet) bullet.active = true;
        if (effect) {
            effect.getComponent(Animation)?.stop();
            effect.active = false;
        }
        this.node.angle = Math.atan2(
            this._targetPosition.y - current.y,
            this._targetPosition.x - current.x,
        ) * 180 / Math.PI;
        return true;
    }

    protected update(deltaTime: number): void {
        if (this._hasHit) return;
        if (!this._wall?.IsAlive) {
            this.Recycle();
            return;
        }
        const current = this.node.worldPosition;
        const dx = this._targetPosition.x - current.x;
        const dy = this._targetPosition.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const moveDistance = this._speed * Math.max(0, deltaTime);
        if (distance <= this._hitDistance || moveDistance >= distance) {
            this.HitWall();
            return;
        }
        this.node.setWorldPosition(
            current.x + dx / distance * moveDistance,
            current.y + dy / distance * moveDistance,
            current.z,
        );
    }

    private HitWall(): void {
        this._hasHit = true;
        this._wall?.TakeDamage(this._damage);
        const bullet = this.node.getChildByName("子弹");
        const effect = this.node.getChildByName("命中特效");
        if (bullet) bullet.active = false;
        if (effect) {
            effect.active = true;
            effect.setWorldRotation(Quat.IDENTITY);
            effect.getComponent(Animation)?.play();
        }
        const duration = effect?.getComponent(Animation)?.defaultClip?.duration
            || this._fallbackEffectDuration;
        this.scheduleOnce(this.Recycle, duration);
    }

    private Recycle = (): void => {
        if (!this.node?.isValid) return;
        this.unscheduleAllCallbacks();
        this.DisablePhysics();
        this._wall = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    };

    /** 结束战斗、Boss撤离或切场景时直接取消仍在飞行/播命中的子弹。 */
    public RecycleImmediately(): void {
        this.Recycle();
    }

    private DisablePhysics(): void {
        const rigidBody = this.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.linearVelocity = Vec2.ZERO;
            rigidBody.angularVelocity = 0;
            rigidBody.enabled = false;
        }
        for (const collider of this.getComponents(Collider2D)) {
            collider.enabled = false;
        }
    }
}
