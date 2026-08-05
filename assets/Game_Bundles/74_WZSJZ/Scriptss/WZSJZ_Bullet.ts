import {
    _decorator,
    Animation,
    CircleCollider2D,
    Component,
    Quat,
    RigidBody2D,
    Vec3,
} from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_Bullet')
export class WZSJZ_Bullet extends Component {
    private _target: WZSJZ_Enemy = null;
    private _damage: number = 0;
    private _speed: number = 0;
    private _hasHit: boolean = false;
    private _recycleCallback: ((bullet: WZSJZ_Bullet) => void) | null = null;
    private _hitCallback: ((position: Vec3, damage: number) => void) | null = null;
    private _hitDistance: number = WZSJZ_Constant.GunBullet.HitDistance;
    private _hitEffectDuration: number = WZSJZ_Constant.GunBullet.HitEffectDuration;
    private _continueOnTargetLost: boolean = false;
    private _lastAimPosition: Vec3 = new Vec3();
    private _lastDamageCenter: Vec3 = new Vec3();
    private _arcHeight: number = 0;
    private _arcElapsed: number = 0;
    private _arcDuration: number = 0;
    private _arcStartPosition: Vec3 = new Vec3();

    public Initialize(
        target: WZSJZ_Enemy,
        damage: number,
        speed: number,
        recycleCallback: (bullet: WZSJZ_Bullet) => void,
        hitCallback: ((position: Vec3, damage: number) => void) | null = null,
        hitDistance: number = WZSJZ_Constant.GunBullet.HitDistance,
        hitEffectDuration: number = WZSJZ_Constant.GunBullet.HitEffectDuration,
        continueOnTargetLost: boolean = false,
        arcHeight: number = 0,
    ): boolean {
        if (!target?.IsAlive || damage <= 0 || speed <= 0) {
            return false;
        }
        this.unscheduleAllCallbacks();
        this.node.active = true;
        this._target = target;
        this._damage = damage;
        this._speed = speed;
        this._hasHit = false;
        this._recycleCallback = recycleCallback;
        this._hitCallback = hitCallback;
        this._hitDistance = Math.max(1, hitDistance);
        this._hitEffectDuration = Math.max(0, hitEffectDuration);
        this._continueOnTargetLost = continueOnTargetLost;
        this._arcHeight = Math.max(0, arcHeight);
        this._arcElapsed = 0;
        this._arcStartPosition.set(this.node.worldPosition);
        const aimPosition = target.GetAimWorldPosition();
        this._lastAimPosition.set(aimPosition.x, aimPosition.y, aimPosition.z);
        this._lastDamageCenter.set(target.node.worldPosition);
        this._arcDuration = Math.max(
            0.01,
            Vec3.distance(this._arcStartPosition, this._lastAimPosition) / speed,
        );
        this.node.angle = 0;
        const rigidBody = this.getComponent(RigidBody2D);
        const collider = this.getComponent(CircleCollider2D);
        if (rigidBody) rigidBody.enabled = false;
        if (collider) collider.enabled = false;
        const bullet = this.node.getChildByName("子弹");
        const trail = this.node.getChildByName("拖尾");
        const effect = this.node.getChildByName("命中特效");
        if (bullet) bullet.active = true;
        if (trail) trail.active = true;
        if (effect) {
            effect.getComponent(Animation)?.stop();
            effect.active = false;
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (this._hasHit) {
            return;
        }
        if (this._target?.node?.isValid && this._target.IsAlive) {
            const aimPosition = this._target.GetAimWorldPosition();
            this._lastAimPosition.set(aimPosition.x, aimPosition.y, aimPosition.z);
            this._lastDamageCenter.set(this._target.node.worldPosition);
        } else if (!this._continueOnTargetLost) {
            this.Recycle();
            return;
        }

        const current = this.node.worldPosition;
        const target = this._lastAimPosition;
        if (this._arcHeight > 0) {
            this.UpdateArcMovement(current, target, deltaTime);
            return;
        }
        const deltaX = target.x - current.x;
        const deltaY = target.y - current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const moveDistance = this._speed * deltaTime;
        if (distance <= this._hitDistance || moveDistance >= distance) {
            this.HitTarget();
            return;
        }

        this.node.setWorldPosition(
            current.x + deltaX / distance * moveDistance,
            current.y + deltaY / distance * moveDistance,
            current.z,
        );
        this.node.angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    }

    private UpdateArcMovement(current: Vec3, target: Vec3, deltaTime: number): void {
        this._arcElapsed += deltaTime;
        const progress = Math.min(1, this._arcElapsed / this._arcDuration);
        const nextX = this._arcStartPosition.x
            + (target.x - this._arcStartPosition.x) * progress;
        const linearY = this._arcStartPosition.y
            + (target.y - this._arcStartPosition.y) * progress;
        const nextY = linearY + 4 * this._arcHeight * progress * (1 - progress);
        const deltaX = nextX - current.x;
        const deltaY = nextY - current.y;
        this.node.setWorldPosition(nextX, nextY, current.z);
        if (deltaX !== 0 || deltaY !== 0) {
            this.node.angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        }
        if (progress >= 1) {
            this.HitTarget();
        }
    }

    private HitTarget(): void {
        this._hasHit = true;
        if (this._hitCallback) {
            this._hitCallback(this._lastDamageCenter.clone(), this._damage);
        } else {
            this._target.TakeDamage(this._damage);
        }
        const bullet = this.node.getChildByName("子弹");
        const trail = this.node.getChildByName("拖尾");
        const effect = this.node.getChildByName("命中特效");
        if (bullet) bullet.active = false;
        if (trail) trail.active = false;
        if (effect) {
            effect.active = true;
            // 子弹飞行时根节点会旋转，命中特效始终保持世界旋转为0。
            effect.setWorldRotation(Quat.IDENTITY);
            effect.getComponent(Animation)?.play();
        }
        const effectAnimation = effect?.getComponent(Animation);
        const effectDuration = effectAnimation?.defaultClip?.duration
            || this._hitEffectDuration;
        this.scheduleOnce(
            () => this.Recycle(),
            effectDuration,
        );
    }

    private Recycle(): void {
        if (!this.node.isValid) {
            return;
        }
        this.unscheduleAllCallbacks();
        this._target = null;
        this._hitCallback = null;
        this._continueOnTargetLost = false;
        this._arcHeight = 0;
        this._recycleCallback?.(this);
    }
}
