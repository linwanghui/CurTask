import {
    _decorator,
    Animation,
    CircleCollider2D,
    Component,
    RigidBody2D,
    Vec2,
    Vec3,
} from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass, property } = _decorator;

@ccclass('WZSJZ_BossBullet_LaoSai')
export class WZSJZ_BossBullet_LaoSai extends Component {
    private _wall: WZSJZ_Wall = null;
    private _damage: number = 0;
    private _speed: number = 0;
    private _recycle: ((bullet: WZSJZ_BossBullet_LaoSai) => void) | null = null;
    private _targetPosition: Vec3 = new Vec3();
    private _hasHit: boolean = false;

    public Initialize(
        wall: WZSJZ_Wall,
        damage: number,
        speed: number,
        recycle: (bullet: WZSJZ_BossBullet_LaoSai) => void,
    ): boolean {
        if (!wall?.IsAlive || damage <= 0 || speed <= 0) {
            return false;
        }
        this.unscheduleAllCallbacks();
        this._wall = wall;
        this._damage = damage;
        this._speed = speed;
        this._recycle = recycle;
        this._hasHit = false;
        this.DisablePhysics();
        const current = this.node.worldPosition;
        // 发射瞬间锁定朝向城墙的正前方，飞行途中不追踪、不转向。
        this._targetPosition.set(wall.GetFrontWorldX(current.x), current.y, current.z);
        const bullet = this.node.getChildByName("子弹");
        if (bullet) bullet.active = true;
        const effect = this.node.getChildByName("命中特效");
        if (effect) {
            effect.getComponent(Animation)?.stop();
            effect.active = false;
        }
        const dx = this._targetPosition.x - current.x;
        const dy = this._targetPosition.y - current.y;
        this.node.angle = Math.atan2(dy, dx) * 180 / Math.PI;
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
        const move = this._speed * deltaTime;
        if (distance <= WZSJZ_Constant.BossLaoSai.ArrowHitDistance || move >= distance) {
            this.HitWall();
            return;
        }
        this.node.setWorldPosition(current.x + dx / distance * move, current.y + dy / distance * move, current.z);
    }

    private HitWall(): void {
        this._hasHit = true;
        this._wall.TakeDamage(this._damage);
        // 墙体命中不保留碰撞或命中特效，立即隐藏并返回对象池。
        this.Recycle();
    }

    private Recycle(): void {
        this.unscheduleAllCallbacks();
        this.DisablePhysics();
        this.node.active = false;
        this._wall = null;
        const recycle = this._recycle;
        this._recycle = null;
        recycle?.(this);
    }

    private DisablePhysics(): void {
        const rigidBody = this.getComponent(RigidBody2D);
        const collider = this.getComponent(CircleCollider2D);
        if (rigidBody) {
            rigidBody.linearVelocity = Vec2.ZERO;
            rigidBody.angularVelocity = 0;
            rigidBody.enabled = false;
        }
        if (collider) {
            collider.enabled = false;
        }
    }

}
