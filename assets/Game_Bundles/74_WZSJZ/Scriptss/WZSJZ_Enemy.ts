import { _decorator, Component, Node, sp, UITransform, Vec3 } from 'cc';
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
    private _tremorTimer: number = 0;
    private _recycleCallback: ((enemy: WZSJZ_Enemy) => void) | null = null;

    public get IsAlive(): boolean {
        return !this._isDead && this._currentHealth > 0;
    }

    public get CurrentHealth(): number {
        return this._currentHealth;
    }

    public get MaxHealth(): number {
        return this._config?.MaxHealth || 1;
    }

    protected get Wall(): WZSJZ_Wall {
        return this._wall;
    }

    protected get EnemyConfig(): WZSJZ_EnemyConfig {
        return this._config;
    }

    public Initialize(
        wall: WZSJZ_Wall,
        recycleCallback: (enemy: WZSJZ_Enemy) => void,
        enemyProjectileLayer: Node = null,
        healthBarLayer: Node = null,
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
        this._tremorTimer = 0;
        if (this._skeleton) {
            this._skeleton.timeScale = 1;
        }
        this._currentAnimation = "";
        this.PlayAnimation(this._config.MoveAnimation);
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._config || !this.IsAlive || !this._wall?.IsAlive) {
            return;
        }
        this.UpdateEnemyState(deltaTime);

        if (this._tremorTimer > 0) {
            this._tremorTimer = Math.max(0, this._tremorTimer - deltaTime);
            if (this._tremorTimer <= 0 && this._skeleton) {
                this._skeleton.timeScale = 1;
            }
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

        this.UpdateAttack(deltaTime);
    }

    /** 子类可只替换抵达攻击位置后的行为，移动、受击和死亡仍复用基类。 */
    protected UpdateAttack(deltaTime: number): void {
        this.PlayAnimation(this._config.AttackAnimation);
        this._attackTimer -= deltaTime;
        if (this._attackTimer <= 0) {
            this._wall.TakeDamage(this._config.AttackDamage);
            this._attackTimer = this._config.AttackInterval;
        }
    }

    /** 子类可更新韧性、护盾等独立于移动和攻击的状态。 */
    protected UpdateEnemyState(deltaTime: number): void {
    }

    /** 声波震颤期间冻结表现，并由update统一暂停移动、攻击和攻击计时。 */
    public ApplyTremor(duration: number): void {
        if (!this.IsAlive || duration <= 0) {
            return;
        }
        const wasTremoring = this._tremorTimer > 0;
        this._tremorTimer = Math.max(this._tremorTimer, duration);
        if (!wasTremoring) {
            this._hitReactionTimer = 0;
            this.PlayAnimation(this._config.MoveAnimation, true, true);
            this.OnTremorStarted();
        }
        if (this._skeleton) {
            this._skeleton.timeScale = 0;
        }
    }

    /** Boss等拥有独立攻击状态机的敌人可在这里取消正在蓄力的攻击。 */
    protected OnTremorStarted(): void {
    }

    /** 返回本次伤害是否刚好击杀，供经验、掉落等系统订阅结果。 */
    public TakeDamage(damage: number): boolean {
        if (!this.IsAlive || damage <= 0) {
            return false;
        }
        this._currentHealth = Math.max(0, this._currentHealth - damage);
        if (this._currentHealth > 0) {
            // Boss会在这里同步扣除韧性；即使正在震颤也不能跳过该数值结算。
            const shouldEnterHitReaction = this.ShouldEnterHitReaction(damage);
            // 震颤优先级高于普通受击，不用受击动画打断冻结表现。
            if (this._tremorTimer > 0) {
                return false;
            }
            if (shouldEnterHitReaction) {
                this._hitReactionTimer = this._config.HitDuration;
                this.PlayAnimation(this._config.HitAnimation, false, true);
            }
            return false;
        }
        this._isDead = true;
        this._hitReactionTimer = 0;
        this._tremorTimer = 0;
        if (this._skeleton) {
            this._skeleton.timeScale = 1;
        }
        this.PlayAnimation(this._config.DeathAnimation, false);
        this.scheduleOnce(() => this._recycleCallback?.(this), this._config.DeathDuration);
        return true;
    }

    /** 普通敌人每次受伤都硬直；Boss 可覆盖为韧性清空时才硬直。 */
    protected ShouldEnterHitReaction(damage: number): boolean {
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

    protected PlayAnimation(
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
