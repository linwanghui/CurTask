import {
    _decorator,
    Animation,
    CircleCollider2D,
    Component,
    Node,
    Quat,
    RigidBody2D,
    Vec3,
} from 'cc';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
const { ccclass } = _decorator;

/** 地雷：定时存活、距离触发、播放爆炸后回到对象池。 */
@ccclass('WZSJZ_Mine')
export class WZSJZ_Mine extends Component {
    private _enemyArea: Node = null;
    private _damage: number = 0;
    private _triggerRadius: number = 0;
    private _explosionRadius: number = 0;
    private _remainingLifetime: number = 0;
    private _fallbackEffectDuration: number = 0;
    private _isExploding: boolean = false;
    private _damageCallback: ((center: Vec3, radius: number, damage: number) => void) | null = null;
    private _recycleCallback: ((mine: WZSJZ_Mine) => void) | null = null;

    /** 所属布雷单位离场时直接回收，不触发爆炸。 */
    public ForceRecycle(): void {
        this.Recycle();
    }

    public Initialize(
        enemyArea: Node,
        damage: number,
        triggerRadius: number,
        explosionRadius: number,
        lifetime: number,
        fallbackEffectDuration: number,
        damageCallback: (center: Vec3, radius: number, damage: number) => void,
        recycleCallback: (mine: WZSJZ_Mine) => void,
    ): boolean {
        if (!enemyArea || damage <= 0 || triggerRadius <= 0 || explosionRadius <= 0) {
            return false;
        }
        this.unscheduleAllCallbacks();
        this.node.active = true;
        this._enemyArea = enemyArea;
        this._damage = damage;
        this._triggerRadius = triggerRadius;
        this._explosionRadius = explosionRadius;
        this._remainingLifetime = Math.max(0.1, lifetime);
        this._fallbackEffectDuration = Math.max(0, fallbackEffectDuration);
        this._isExploding = false;
        this._damageCallback = damageCallback;
        this._recycleCallback = recycleCallback;

        const rigidBody = this.getComponent(RigidBody2D);
        const collider = this.getComponent(CircleCollider2D);
        if (rigidBody) rigidBody.enabled = false;
        if (collider) collider.enabled = false;
        const mineImage = this.node.getChildByName("地雷");
        const effect = this.node.getChildByName("命中特效");
        if (mineImage) mineImage.active = true;
        if (effect) {
            effect.getComponent(Animation)?.stop();
            effect.active = false;
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (this._isExploding) {
            return;
        }
        this._remainingLifetime -= deltaTime;
        if (this._remainingLifetime <= 0) {
            this.Recycle();
            return;
        }

        const center = this.node.worldPosition;
        const triggerRadiusSquared = this._triggerRadius * this._triggerRadius;
        for (const child of this._enemyArea?.children || []) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) {
                continue;
            }
            const position = enemy.node.worldPosition;
            const deltaX = position.x - center.x;
            const deltaY = position.y - center.y;
            if (deltaX * deltaX + deltaY * deltaY <= triggerRadiusSquared) {
                this.Explode();
                return;
            }
        }
    }

    private Explode(): void {
        this._isExploding = true;
        const center = this.node.worldPosition.clone();
        this._damageCallback?.(center, this._explosionRadius, this._damage);
        const mineImage = this.node.getChildByName("地雷");
        const effect = this.node.getChildByName("命中特效");
        if (mineImage) mineImage.active = false;
        if (effect) {
            effect.active = true;
            effect.setWorldRotation(Quat.IDENTITY);
        }
        const animation = effect?.getComponent(Animation);
        animation?.stop();
        animation?.play();
        const duration = animation?.defaultClip?.duration || this._fallbackEffectDuration;
        this.scheduleOnce(() => this.Recycle(), duration);
    }

    private Recycle(): void {
        if (!this.node.isValid) {
            return;
        }
        this.unscheduleAllCallbacks();
        this._enemyArea = null;
        this._damageCallback = null;
        this._recycleCallback?.(this);
    }
}
