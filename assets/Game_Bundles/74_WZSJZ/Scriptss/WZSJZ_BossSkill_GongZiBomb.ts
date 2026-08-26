import { _decorator, Component, Quat, sp, Vec3 } from 'cc';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass } = _decorator;

/** 公子炸弹：抛物线飞向城墙，落地播放爆炸，动画结束时结算伤害并回池。 */
@ccclass('WZSJZ_BossSkill_GongZiBomb')
export class WZSJZ_BossSkill_GongZiBomb extends Component {
    private _wall: WZSJZ_Wall = null;
    private _damage: number = 0;
    private _duration: number = 0;
    private _elapsed: number = 0;
    private _arcHeight: number = 0;
    private _spinSpeed: number = 0;
    private _fallbackExplosionDuration: number = 0;
    private _explosionAnimation: string = "animation";
    private _damageDelay: number = 0;
    private _start: Vec3 = new Vec3();
    private _target: Vec3 = new Vec3();
    private _isFlying: boolean = false;
    private _isExploding: boolean = false;
    private _damageApplied: boolean = false;
    private _animationCompleted: boolean = false;
    private _explosionSkeleton: sp.Skeleton = null;
    private _onRecycle: ((bomb: WZSJZ_BossSkill_GongZiBomb) => void) = null;

    public Initialize(
        wall: WZSJZ_Wall,
        damage: number,
        speed: number,
        arcHeight: number,
        spinSpeed: number,
        targetOffsetY: number,
        explosionAnimation: string,
        damageDelay: number,
        fallbackExplosionDuration: number,
        onRecycle: (bomb: WZSJZ_BossSkill_GongZiBomb) => void,
    ): boolean {
        if (!wall?.IsAlive || damage < 0 || speed <= 0) return false;
        this.unscheduleAllCallbacks();
        this._explosionSkeleton?.setCompleteListener(null);
        this._wall = wall;
        this._damage = damage;
        this._arcHeight = Math.max(0, arcHeight);
        this._spinSpeed = spinSpeed;
        this._fallbackExplosionDuration = Math.max(0, fallbackExplosionDuration);
        this._explosionAnimation = explosionAnimation || "animation";
        this._damageDelay = Math.max(0, damageDelay);
        this._elapsed = 0;
        this._isFlying = true;
        this._isExploding = false;
        this._damageApplied = false;
        this._animationCompleted = false;
        this._onRecycle = onRecycle;
        this.node.active = true;
        this.node.angle = 0;
        this._start.set(this.node.worldPosition);
        this._target.set(
            wall.GetFrontWorldX(this._start.x),
            wall.node.worldPosition.y + targetOffsetY,
            this._start.z,
        );
        this._duration = Math.max(0.05, Vec3.distance(this._start, this._target) / speed);

        const image = this.GetImageNode();
        const explosion = this.GetExplosionNode();
        if (image) image.active = true;
        if (explosion) explosion.active = false;
        this._explosionSkeleton = explosion?.getComponent(sp.Skeleton)
            || explosion?.getComponentInChildren(sp.Skeleton)
            || null;
        if (this._explosionSkeleton) {
            this._explosionSkeleton.clearTracks();
            this._explosionSkeleton.setCompleteListener(() => {
                if (!this._isExploding) return;
                this._animationCompleted = true;
                this.TryFinishExplosion();
            });
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._isFlying) return;
        if (!this._wall?.IsAlive) {
            this.Recycle();
            return;
        }
        this._elapsed = Math.min(this._duration, this._elapsed + Math.max(0, deltaTime));
        const progress = Math.min(1, this._elapsed / this._duration);
        const x = this._start.x + (this._target.x - this._start.x) * progress;
        const linearY = this._start.y + (this._target.y - this._start.y) * progress;
        const y = linearY + 4 * this._arcHeight * progress * (1 - progress);
        this.node.setWorldPosition(x, y, this._start.z);
        this.node.angle += this._spinSpeed * deltaTime;
        if (progress >= 1) this.BeginExplosion();
    }

    private BeginExplosion(): void {
        if (!this._isFlying) return;
        this._isFlying = false;
        this._isExploding = true;
        this.node.angle = 0;
        const image = this.GetImageNode();
        const explosion = this.GetExplosionNode();
        if (image) image.active = false;
        if (explosion) {
            explosion.active = true;
            explosion.setWorldRotation(Quat.IDENTITY);
        }
        if (this._explosionSkeleton) {
            this._explosionSkeleton.setAnimation(
                0,
                this._explosionAnimation,
                false,
            );
        } else {
            this.scheduleOnce(this.MarkExplosionAnimationCompleted, this._fallbackExplosionDuration);
        }
        this.scheduleOnce(this.ApplyExplosionDamage, this._damageDelay);
    }

    private ApplyExplosionDamage = (): void => {
        if (!this._isExploding || this._damageApplied) return;
        this._damageApplied = true;
        this._wall?.TakeDamage(this._damage);
        this.TryFinishExplosion();
    };

    private MarkExplosionAnimationCompleted = (): void => {
        if (!this._isExploding) return;
        this._animationCompleted = true;
        this.TryFinishExplosion();
    };

    private TryFinishExplosion(): void {
        if (!this._isExploding || !this._damageApplied || !this._animationCompleted) return;
        this._isExploding = false;
        this.Recycle();
    }

    private Recycle(): void {
        this.unscheduleAllCallbacks();
        this._explosionSkeleton?.setCompleteListener(null);
        this._explosionSkeleton = null;
        this._isFlying = false;
        this._isExploding = false;
        this._wall = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    }

    private GetImageNode() {
        return this.node.getChildByName("图片") || this.node.getChildByName("图");
    }

    private GetExplosionNode() {
        return this.node.getChildByName("动画") || this.node.getChildByName("爆炸动画");
    }

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
        this._explosionSkeleton?.setCompleteListener(null);
        this._isFlying = false;
        this._isExploding = false;
    }
}
