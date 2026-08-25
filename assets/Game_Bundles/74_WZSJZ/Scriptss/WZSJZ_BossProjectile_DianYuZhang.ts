import { _decorator, Component, sp } from 'cc';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass } = _decorator;

/** 典狱长刀光：固定从右向左飞行，抵达城墙前沿时结算一次伤害。 */
@ccclass('WZSJZ_BossProjectile_DianYuZhang')
export class WZSJZ_BossProjectile_DianYuZhang extends Component {
    private _wall: WZSJZ_Wall = null;
    private _damage: number = 0;
    private _speed: number = 0;
    private _maxDistance: number = 0;
    private _hitDistance: number = 0;
    private _travelledDistance: number = 0;
    private _isRunning: boolean = false;
    private _movementCompleted: boolean = false;
    private _animationCompleted: boolean = false;
    private _skeleton: sp.Skeleton = null;
    private _onRecycle: ((projectile: WZSJZ_BossProjectile_DianYuZhang) => void) = null;

    public Initialize(
        wall: WZSJZ_Wall,
        damage: number,
        speed: number,
        maxDistance: number,
        hitDistance: number,
        animationName: string,
        onRecycle: (projectile: WZSJZ_BossProjectile_DianYuZhang) => void,
    ): boolean {
        if (!wall?.IsAlive || damage < 0 || speed <= 0 || maxDistance <= 0) {
            return false;
        }
        this._wall = wall;
        this._damage = damage;
        this._speed = speed;
        this._maxDistance = maxDistance;
        this._hitDistance = Math.max(0, hitDistance);
        this._travelledDistance = 0;
        this._isRunning = true;
        this._movementCompleted = false;
        this._animationCompleted = false;
        this._onRecycle = onRecycle;
        this.node.active = true;
        this._skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        if (this._skeleton) {
            this._skeleton.clearTracks();
            this._skeleton.setCompleteListener(() => {
                if (!this._isRunning) return;
                this._animationCompleted = true;
                this.TryRecycleAfterCompleted();
            });
            // 特效只播放一次；回收由动画完成回调和移动结算共同决定。
            this._skeleton.setAnimation(0, animationName || "animation", false);
        } else {
            // 资源意外缺少Spine时不永久占用对象池节点。
            this._animationCompleted = true;
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._isRunning) {
            return;
        }
        if (this._movementCompleted) {
            this.TryRecycleAfterCompleted();
            return;
        }
        if (!this._wall?.IsAlive) {
            this._movementCompleted = true;
            this.TryRecycleAfterCompleted();
            return;
        }
        const current = this.node.worldPosition;
        const wallFrontX = this._wall.GetFrontWorldX(current.x);
        const moveDistance = Math.min(
            this._speed * Math.max(0, deltaTime),
            this._maxDistance - this._travelledDistance,
        );
        const nextX = current.x - moveDistance;
        if (current.x <= wallFrontX + this._hitDistance
            || nextX <= wallFrontX + this._hitDistance) {
            this.node.setWorldPosition(wallFrontX + this._hitDistance, current.y, current.z);
            this._wall.TakeDamage(this._damage);
            this._movementCompleted = true;
            this.TryRecycleAfterCompleted();
            return;
        }
        this.node.setWorldPosition(nextX, current.y, current.z);
        this._travelledDistance += moveDistance;
        if (this._travelledDistance >= this._maxDistance) {
            this._movementCompleted = true;
            this.TryRecycleAfterCompleted();
        }
    }

    private TryRecycleAfterCompleted(): void {
        if (this._movementCompleted && this._animationCompleted) {
            this.Recycle();
        }
    }

    private Recycle(): void {
        if (!this._isRunning) return;
        this._isRunning = false;
        this._skeleton?.setCompleteListener(null);
        this._skeleton = null;
        this._wall = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    }

    protected onDisable(): void {
        this._isRunning = false;
    }
}
