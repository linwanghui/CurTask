import { _decorator, Component, Node, sp, Vec3 } from 'cc';
import { WZSJZ_EnemyBulletPool } from './WZSJZ_EnemyBulletPool';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass } = _decorator;

type LaoTaiTankState = "inactive" | "entering" | "attacking" | "cooldown" | "dying";

/** 牢太战车：入场到目标点，射击三次，播放死亡动画后回池。 */
@ccclass('WZSJZ_Boss_LaoTaiTank')
export class WZSJZ_Boss_LaoTaiTank extends Component {
    private _wall: WZSJZ_Wall = null;
    private _projectileLayer: Node = null;
    private _target: Vec3 = new Vec3();
    private _moveSpeed: number = 0;
    private _arrivalDistance: number = 0;
    private _attackDamage: number = 0;
    private _attackInterval: number = 0;
    private _fireDelay: number = 0;
    private _attackAnimationDuration: number = 0;
    private _deathFallbackDuration: number = 0;
    private _maxAttackCount: number = 0;
    private _attackCount: number = 0;
    private _stateElapsed: number = 0;
    private _hasFired: boolean = false;
    private _state: LaoTaiTankState = "inactive";
    private _skeleton: sp.Skeleton = null;
    private _onRecycle: ((tank: WZSJZ_Boss_LaoTaiTank) => void) = null;
    private _enterAnimation: string = "chuchang";
    private _idleAnimation: string = "yidong";
    private _attackAnimation: string = "gongji";
    private _deathAnimation: string = "siwang";

    public Initialize(
        targetWorldPosition: Vec3,
        wall: WZSJZ_Wall,
        projectileLayer: Node,
        moveSpeed: number,
        arrivalDistance: number,
        attackDamage: number,
        attackInterval: number,
        fireDelay: number,
        attackAnimationDuration: number,
        maxAttackCount: number,
        enterAnimation: string,
        idleAnimation: string,
        attackAnimation: string,
        deathAnimation: string,
        deathFallbackDuration: number,
        onRecycle: (tank: WZSJZ_Boss_LaoTaiTank) => void,
    ): boolean {
        if (!wall?.IsAlive || !projectileLayer?.isValid || moveSpeed <= 0
            || maxAttackCount <= 0) return false;
        this.unscheduleAllCallbacks();
        this._wall = wall;
        this._projectileLayer = projectileLayer;
        this._target.set(targetWorldPosition);
        this._moveSpeed = moveSpeed;
        this._arrivalDistance = Math.max(1, arrivalDistance);
        this._attackDamage = Math.max(0, attackDamage);
        this._attackInterval = Math.max(0, attackInterval);
        this._fireDelay = Math.max(0, fireDelay);
        this._attackAnimationDuration = Math.max(this._fireDelay, attackAnimationDuration);
        this._maxAttackCount = maxAttackCount;
        this._deathFallbackDuration = Math.max(0, deathFallbackDuration);
        this._enterAnimation = enterAnimation || "chuchang";
        this._idleAnimation = idleAnimation || "yidong";
        this._attackAnimation = attackAnimation || "gongji";
        this._deathAnimation = deathAnimation || "siwang";
        this._attackCount = 0;
        this._stateElapsed = 0;
        this._hasFired = false;
        this._state = "entering";
        this._onRecycle = onRecycle;
        this.node.active = true;
        this._skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        if (this._skeleton) {
            this._skeleton.clearTracks();
            this._skeleton.setCompleteListener(() => {
                if (this._state === "dying") this.Recycle();
            });
            this._skeleton.setAnimation(0, this._enterAnimation, true);
        }
        void WZSJZ_EnemyBulletPool.Prepare();
        return true;
    }

    protected update(deltaTime: number): void {
        if (this._state === "inactive" || this._state === "dying") return;
        if (!this._wall?.IsAlive) {
            this.BeginDeath();
            return;
        }
        if (this._state === "entering") {
            this.UpdateEntering(deltaTime);
            return;
        }
        this._stateElapsed += Math.max(0, deltaTime);
        if (this._state === "cooldown") {
            if (this._stateElapsed >= this._attackInterval) this.BeginAttack();
            return;
        }
        if (this._state === "attacking") {
            if (!this._hasFired && this._stateElapsed >= this._fireDelay) {
                this._hasFired = true;
                this._attackCount++;
                void this.FireBullet();
            }
            if (this._stateElapsed >= this._attackAnimationDuration) {
                if (this._attackCount >= this._maxAttackCount) {
                    this.BeginDeath();
                } else {
                    this._state = "cooldown";
                    this._stateElapsed = 0;
                    this.PlayAnimation(this._idleAnimation, true);
                }
            }
        }
    }

    private UpdateEntering(deltaTime: number): void {
        const current = this.node.worldPosition;
        const dx = this._target.x - current.x;
        const dy = this._target.y - current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const moveDistance = this._moveSpeed * Math.max(0, deltaTime);
        if (distance <= this._arrivalDistance || moveDistance >= distance) {
            this.node.setWorldPosition(this._target);
            this.BeginAttack();
            return;
        }
        this.node.setWorldPosition(
            current.x + dx / distance * moveDistance,
            current.y + dy / distance * moveDistance,
            current.z,
        );
    }

    private BeginAttack(): void {
        this._state = "attacking";
        this._stateElapsed = 0;
        this._hasFired = false;
        this.PlayAnimation(this._attackAnimation, false);
    }

    private async FireBullet(): Promise<void> {
        if (!this._wall?.IsAlive || !this._projectileLayer?.isValid) return;
        const firePoint = this.node.getChildByName("发射点位") || this.node;
        await WZSJZ_EnemyBulletPool.Spawn(
            this._projectileLayer,
            firePoint.worldPosition.clone(),
            this._wall,
            this._attackDamage,
        );
    }

    private BeginDeath(): void {
        if (this._state === "dying" || this._state === "inactive") return;
        this._state = "dying";
        this._stateElapsed = 0;
        if (this._skeleton) {
            this._skeleton.setAnimation(0, this._deathAnimation, false);
        } else {
            this.scheduleOnce(this.Recycle, this._deathFallbackDuration);
        }
    }

    private PlayAnimation(name: string, loop: boolean): void {
        if (this._skeleton && name) this._skeleton.setAnimation(0, name, loop);
    }

    private Recycle = (): void => {
        if (this._state === "inactive") return;
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._skeleton = null;
        this._state = "inactive";
        this._wall = null;
        this._projectileLayer = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    };

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._state = "inactive";
    }
}
