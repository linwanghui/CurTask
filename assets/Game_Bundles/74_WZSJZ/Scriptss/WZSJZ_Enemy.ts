import { _decorator, Component, sp, UITransform, Vec3 } from 'cc';
import { WZSJZ_Constant, WZSJZ_EnemyConfig } from './WZSJZ_Constant';
import { WZSJZ_Wall } from './WZSJZ_Wall';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_Enemy')
export class WZSJZ_Enemy extends Component {
    private _wall: WZSJZ_Wall = null;
    private _config: WZSJZ_EnemyConfig = null;
    private _skeleton: sp.Skeleton = null;
    private _currentAnimation: string = "";
    private _attackTimer: number = 0;
    private _currentHealth: number = 1;
    private _isDead: boolean = false;
    private _hitReactionTimer: number = 0;
    private _recycleCallback: ((enemy: WZSJZ_Enemy) => void) | null = null;

    public get IsAlive(): boolean {
        return !this._isDead && this._currentHealth > 0;
    }

    public Initialize(
        wall: WZSJZ_Wall,
        recycleCallback: (enemy: WZSJZ_Enemy) => void,
    ): boolean {
        this.unscheduleAllCallbacks();
        this._wall = wall;
        this._recycleCallback = recycleCallback;
        this._config = WZSJZ_Constant.GetEnemyConfig(this.node.name);
        this._skeleton = this.getComponentInChildren(sp.Skeleton);
        if (!this._config || !this._wall) {
            console.error(`[WZSJZ] ${this.node.name} 缺少敌人数值配置或城墙目标。`);
            return false;
        }
        this.node.active = true;
        this._currentHealth = this._config.MaxHealth;
        this._isDead = false;
        this._attackTimer = 0;
        this._hitReactionTimer = 0;
        this._currentAnimation = "";
        this.PlayAnimation(this._config.MoveAnimation);
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._config || !this.IsAlive || !this._wall?.IsAlive) {
            return;
        }

        // 受击动画期间暂停当前行为；连续受击会重新播放并刷新硬直时间。
        if (this._hitReactionTimer > 0) {
            this._hitReactionTimer = Math.max(0, this._hitReactionTimer - deltaTime);
            return;
        }

        const current = this.node.worldPosition;
        const wallFrontX = this._wall.GetFrontWorldX(current.x);
        const side = current.x >= this._wall.node.worldPosition.x ? 1 : -1;
        const attackDistance = Math.max(0, this._config.AttackRange);
        const desiredVisualFrontX = wallFrontX
            + side * (attackDistance + this._config.AttackPositionOffset);
        // 敌人根节点通常位于脚下中央；用图像朝墙一侧的边缘反推根节点停止点。
        const visualFrontOffset = this.GetVisualFrontWorldX(side) - current.x;
        const attackPositionX = desiredVisualFrontX - visualFrontOffset;
        const distanceToAttackPosition = Math.abs(current.x - attackPositionX);
        const tolerance = WZSJZ_Constant.EnemyCombat.AttackPositionTolerance;
        if (distanceToAttackPosition > tolerance) {
            this.PlayAnimation(this._config.MoveAnimation);
            const maxMove = this._config.MoveSpeed * deltaTime;
            const moveX = Math.min(maxMove, distanceToAttackPosition);
            const direction = attackPositionX < current.x ? -1 : 1;
            this.node.setWorldPosition(current.x + direction * moveX, current.y, current.z);
            this._attackTimer = 0;
            return;
        }

        this.PlayAnimation(this._config.AttackAnimation);
        this._attackTimer -= deltaTime;
        if (this._attackTimer <= 0) {
            this._wall.TakeDamage(this._config.AttackDamage);
            this._attackTimer = this._config.AttackInterval;
        }
    }

    /** 返回本次伤害是否刚好击杀，供经验、掉落等系统订阅结果。 */
    public TakeDamage(damage: number): boolean {
        if (!this.IsAlive || damage <= 0) {
            return false;
        }
        this._currentHealth = Math.max(0, this._currentHealth - damage);
        if (this._currentHealth > 0) {
            this._hitReactionTimer = this._config.HitDuration;
            this.PlayAnimation(this._config.HitAnimation, false, true);
            return false;
        }
        this._isDead = true;
        this._hitReactionTimer = 0;
        this.PlayAnimation(this._config.DeathAnimation, false);
        this.scheduleOnce(() => this._recycleCallback?.(this), this._config.DeathDuration);
        return true;
    }

    public ApplyKnockback(direction: Vec3, distance: number): void {
        if (!this.IsAlive || distance <= 0) {
            return;
        }
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (length <= 0.0001) {
            return;
        }
        const current = this.node.worldPosition;
        this.node.setWorldPosition(
            current.x + direction.x / length * distance,
            current.y + direction.y / length * distance,
            current.z,
        );
    }

    public GetAimWorldPosition(): { x: number; y: number; z: number } {
        const position = this.node.worldPosition;
        return {
            x: position.x,
            y: position.y + WZSJZ_Constant.GunBullet.AimHeight,
            z: position.z,
        };
    }

    private GetVisualFrontWorldX(side: number): number {
        const visualTransform = this.node.getChildByName("动画")?.getComponent(UITransform)
            || this.node.children
                .map((child) => child.getComponent(UITransform))
                .find((transform) => !!transform && transform.contentSize.width > 1);
        if (!visualTransform) {
            return this.node.worldPosition.x;
        }
        const bounds = visualTransform.getBoundingBoxToWorld();
        return side >= 0 ? bounds.xMin : bounds.xMax;
    }

    private PlayAnimation(
        animationName: string,
        loop: boolean = true,
        restart: boolean = false,
    ): void {
        if (!animationName
            || (!restart && animationName === this._currentAnimation)
            || !this._skeleton) {
            return;
        }
        this._currentAnimation = animationName;
        this._skeleton.setAnimation(0, animationName, loop);
    }
}
