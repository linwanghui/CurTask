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
        this._onRecycle = onRecycle;
        this.node.active = true;
        const skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        if (skeleton) {
            skeleton.clearTracks();
            skeleton.setAnimation(0, animationName || "animation", true);
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._isRunning || !this._wall?.IsAlive) {
            this.Recycle();
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
            this.Recycle();
            return;
        }
        this.node.setWorldPosition(nextX, current.y, current.z);
        this._travelledDistance += moveDistance;
        if (this._travelledDistance >= this._maxDistance) {
            this.Recycle();
        }
    }

    private Recycle(): void {
        if (!this._isRunning) return;
        this._isRunning = false;
        this._wall = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    }

    protected onDisable(): void {
        this._isRunning = false;
    }
}
