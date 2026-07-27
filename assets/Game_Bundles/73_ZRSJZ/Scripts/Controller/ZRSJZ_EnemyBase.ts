import { _decorator, Component, Node, RigidBody2D, Vec2, Vec3 } from 'cc';
import { ZRSJZ_ENEMY_CONFIG, ZRSJZ_EnemyConfig } from '../ZRSJZ_Constant';
import { ZRSJZ_EnemySkeleton } from './ZRSJZ_EnemySkeleton';
import { ZRSJZ_HP } from '../UI/ZRSJZ_HP';

const { ccclass, property } = _decorator;

export enum ZRSJZ_ENEMY_STATE {
    PATROL,
    CHASE,
    MOVING_ATTACK,
    ATTACK,
    DEAD,
}

/**
 * 敌人通用基类。
 *
 * 子类通常只需要覆写 FindTarget 和 OnAttack；如需特殊 AI，也可以直接覆写
 * Patrol、Chase、Attack、Die 四个行为接口。
 */
@ccclass('ZRSJZ_EnemyBase')
export abstract class ZRSJZ_EnemyBase extends Component {
    @property({ tooltip: '敌人配置名；留空时使用当前节点名' })
    EnemyName: string = '';

    Target: Node = null;
    HP: ZRSJZ_HP = null;

    protected RigidBody: RigidBody2D = null;
    protected EnemySkeleton: ZRSJZ_EnemySkeleton = null;
    protected EnemyConfig: Readonly<ZRSJZ_EnemyConfig> = null;

    protected AttackX: number = 0;
    protected AttackY: number = 0;

    private _state: ZRSJZ_ENEMY_STATE = ZRSJZ_ENEMY_STATE.PATROL;
    private _health: number = 0;
    private _patrolCenter: Vec3 = new Vec3();
    private _patrolTarget: Vec3 = new Vec3();
    private _worldPosition: Vec3 = new Vec3();
    private _moveVelocity: Vec2 = new Vec2();
    private _patrolWaitRemaining: number = 0;
    private _targetSearchRemaining: number = 0;
    private _attackCooldown: number = 0;
    private _animationName: string = '';
    private _aniIndex: number = 0;

    public get State(): ZRSJZ_ENEMY_STATE {
        return this._state;
    }

    public get Health(): number {
        return this._health;
    }

    public get IsDead(): boolean {
        return this._state === ZRSJZ_ENEMY_STATE.DEAD;
    }

    protected onLoad(): void {
        const enemyName = this.EnemyName.trim() || this.node.name;
        this.EnemyConfig = ZRSJZ_ENEMY_CONFIG.get(enemyName);
        if (!this.EnemyConfig) {
            console.error(`[ZRSJZ_EnemyBase] 未找到敌人配置: ${enemyName}`);
            this.enabled = false;
            return;
        }

        this.HP = this.getComponentInChildren(ZRSJZ_HP);
        this.RigidBody = this.getComponent(RigidBody2D);
        this.EnemySkeleton = this.getComponentInChildren(ZRSJZ_EnemySkeleton);
        this._health = Math.max(1, this.EnemyConfig.MaxHealth);
    }

    protected start(): void {
        this._patrolCenter.set(this.node.worldPosition);
        this.SelectNextPatrolPoint();
        this.TryFindTarget();
        this.PlayAnimation(this.EnemyConfig.IdleAnimation);
        this.HP.Init(this._health);

        this.EnemySkeleton.Skeleton.setEventListener((trackEntry, event) => {
            if (typeof event !== "number") console.error(event.data.name);

            if (typeof event !== "number" && (event.data.name === "kq" || event.data.name === "gj_jjq")) {
                this.OnAttack();
            } else if (typeof event !== "number" && event.data.name === "dao") {
                this.OnAttack();
            } else if (typeof event !== "number" && event.data.name === "hui") {
                this.OnAttack();
            }
        });
    }

    protected update(dt: number): void {
        if (this.IsDead) {
            return;
        }

        this._attackCooldown = Math.max(0, this._attackCooldown - dt);
        this.RefreshTarget(dt);

        if (!this.IsTargetAvailable()) {
            this.ChangeState(ZRSJZ_ENEMY_STATE.PATROL);
            this.Patrol(dt);
            return;
        }

        const distance = Vec3.distance(this.node.worldPosition, this.Target.worldPosition);
        const detectionRange = Math.max(0, this.EnemyConfig.DetectionRange);
        const loseRange = Math.max(detectionRange, this.EnemyConfig.LoseRange);
        const movingAttackRange = Math.max(0, this.EnemyConfig.MovingAttackRange);
        const standingAttackRange = Math.min(
            movingAttackRange,
            Math.max(0, this.EnemyConfig.StandingAttackRange),
        );

        if (distance > loseRange) {
            this.Target = null;
            this.ChangeState(ZRSJZ_ENEMY_STATE.PATROL);
            this.Patrol(dt);
        } else if (distance <= standingAttackRange) {
            this.ChangeState(ZRSJZ_ENEMY_STATE.ATTACK);
            this.Attack(dt);
        } else if (distance <= movingAttackRange) {
            this.ChangeState(ZRSJZ_ENEMY_STATE.MOVING_ATTACK);
            this.MovingAttack(dt);
        } else if (this._state !== ZRSJZ_ENEMY_STATE.PATROL || distance <= detectionRange) {
            this.ChangeState(ZRSJZ_ENEMY_STATE.CHASE);
            this.Chase(dt);
        } else {
            this.Patrol(dt);
        }
    }

    protected onDisable(): void {
        this.StopMoving();
        if (this.EnemySkeleton) {
            this.EnemySkeleton.HasDirection = false;
        }
    }

    /** 巡逻行为接口。 */
    public Patrol(dt: number): void {
        if (this.EnemyConfig.PatrolRadius <= 0 || this.EnemyConfig.PatrolSpeed <= 0) {
            this.StopMoving();
            this.PlayAnimation(this.EnemyConfig.IdleAnimation);
            return;
        }

        if (this._patrolWaitRemaining > 0) {
            this._patrolWaitRemaining -= dt;
            this.StopMoving();
            this.PlayAnimation(this.EnemyConfig.IdleAnimation);
            if (this._patrolWaitRemaining <= 0) {
                this.SelectNextPatrolPoint();
            }
            return;
        }

        const current = this.node.worldPosition;
        const offsetX = this._patrolTarget.x - current.x;
        const offsetY = this._patrolTarget.y - current.y;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

        if (distance <= Math.max(0, this.EnemyConfig.PatrolArriveDistance)) {
            this.StopMoving();
            this.PlayAnimation(this.EnemyConfig.IdleAnimation);
            this._patrolWaitRemaining = Math.max(0, this.EnemyConfig.PatrolWaitTime);
            if (this._patrolWaitRemaining === 0) {
                this.SelectNextPatrolPoint();
            }
            return;
        }

        this.MoveTowards(
            offsetX,
            offsetY,
            distance,
            this.EnemyConfig.PatrolSpeed,
            dt,
            this.EnemyConfig.MoveAnimation,
        );
    }

    /** 追击行为接口。 */
    public Chase(dt: number): void {
        if (!this.IsTargetAvailable()) {
            return;
        }

        const current = this.node.worldPosition;
        const target = this.Target.worldPosition;
        const offsetX = target.x - current.x;
        const offsetY = target.y - current.y;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        this.UpdateAimDirection(offsetX, offsetY, distance);
        this.MoveTowards(
            offsetX,
            offsetY,
            distance,
            this.EnemyConfig.ChaseSpeed,
            dt,
            this.EnemyConfig.MoveAnimation,
        );
    }

    /** 进入移动攻击范围后，保持向目标移动并按攻击间隔发动攻击。 */
    public MovingAttack(dt: number): void {
        if (!this.IsTargetAvailable()) {
            return;
        }

        const current = this.node.worldPosition;
        const target = this.Target.worldPosition;
        this.AttackX = target.x - current.x;
        this.AttackY = target.y - current.y;
        const distance = Math.sqrt(this.AttackX * this.AttackX + this.AttackY * this.AttackY);

        this.UpdateAimDirection(this.AttackX, this.AttackY, distance);
        this.MoveTowards(
            this.AttackX,
            this.AttackY,
            distance,
            this.EnemyConfig.ChaseSpeed,
            dt,
            this.EnemyConfig.MovingAttackAnimation[this._aniIndex % this.EnemyConfig.MovingAttackAnimation.length],
            this.EnemyConfig.MovingAttackAnimation.length == 1,
            () => { this._aniIndex++ }
        );
        this.TryAttack();
    }

    /** 攻击行为接口。攻击频率由 AttackInterval 控制。 */
    public Attack(_dt: number): void {
        if (!this.IsTargetAvailable()) {
            return;
        }

        const current = this.node.worldPosition;
        const target = this.Target.worldPosition;
        this.AttackX = target.x - current.x;
        this.AttackY = target.y - current.y;
        const distance = Math.sqrt(this.AttackX * this.AttackX + this.AttackY * this.AttackY);

        this.StopMoving();
        this.UpdateAimDirection(this.AttackX, this.AttackY, distance);
        this.PlayAnimation(this.EnemyConfig.StandingAttackAnimation[this._aniIndex % this.EnemyConfig.MovingAttackAnimation.length], this.EnemyConfig.MovingAttackAnimation.length == 1, () => { this._aniIndex++ });
        this.TryAttack();
    }

    /** 死亡行为接口。重复调用不会重复触发死亡逻辑。 */
    public Die(): void {
        if (this.IsDead) {
            return;
        }

        this._health = 0;
        this.ChangeState(ZRSJZ_ENEMY_STATE.DEAD);
        this.Target = null;
        this.StopMoving();
        if (this.EnemySkeleton) {
            this.EnemySkeleton.HasDirection = false;
        }
        this.OnDeath();
    }

    /** 统一受伤入口，生命值降至 0 时自动调用 Die。 */
    public TakeDamage(damage: number): void {
        if (this.IsDead || damage <= 0) {
            return;
        }

        this._health = Math.max(0, this._health - damage);
        if (this._health === 0) {
            this.Die();
        }
    }

    /** 子类返回要追踪的目标。 */
    protected abstract FindTarget(): Node;

    /** 子类在这里实现真正的攻击，例如生成子弹或造成近战伤害。 */
    protected abstract OnAttack(): void;

    /** 子类可覆写死亡表现，例如播放动画、掉落物品、回收节点。 */
    protected OnDeath(): void {
        this.node.active = false;
    }

    protected PlayAnimation(animationName: string, loop: boolean = true, cb: Function = null): void {
        if (!animationName || animationName === this._animationName || !this.EnemySkeleton?.Skeleton) {
            return;
        }

        this._animationName = animationName;
        this.EnemySkeleton.PlayAni(animationName, loop, cb);
    }

    private ChangeState(state: ZRSJZ_ENEMY_STATE): void {
        if (this._state === state || this.IsDead) {
            return;
        }

        this._state = state;
        if (state === ZRSJZ_ENEMY_STATE.PATROL) {
            this._patrolWaitRemaining = 0;
            if (this.EnemySkeleton) {
                this.EnemySkeleton.HasDirection = false;
            }
            this.SelectNextPatrolPoint();
        }
    }

    private RefreshTarget(dt: number): void {
        if (this.IsTargetAvailable()) {
            return;
        }

        this.Target = null;
        this._targetSearchRemaining -= dt;
        if (this._targetSearchRemaining <= 0) {
            this._targetSearchRemaining = 0.25;
            this.TryFindTarget();
        }
    }

    private TryFindTarget(): void {
        if (!this.IsTargetAvailable()) {
            this.Target = this.FindTarget();
        }
    }

    private IsTargetAvailable(): boolean {
        return !!this.Target && this.Target.isValid && this.Target.activeInHierarchy;
    }

    private MoveTowards(
        offsetX: number,
        offsetY: number,
        distance: number,
        speed: number,
        dt: number,
        animationName: string,
        loop: boolean = true,
        cb: Function = null
    ): void {
        if (distance <= 0 || speed <= 0) {
            this.StopMoving();
            this.PlayAnimation(this.EnemyConfig.IdleAnimation);
            return;
        }

        const directionX = offsetX / distance;
        const directionY = offsetY / distance;
        this._moveVelocity.set(directionX * speed * dt, directionY * speed * dt);

        if (this.RigidBody && this.RigidBody.enabledInHierarchy) {
            this.RigidBody.linearVelocity = this._moveVelocity;
        } else {
            this._worldPosition.set(this.node.worldPosition);
            this._worldPosition.x += this._moveVelocity.x * dt;
            this._worldPosition.y += this._moveVelocity.y * dt;
            this.node.setWorldPosition(this._worldPosition);
        }

        if (this.EnemySkeleton && directionX !== 0) {
            this.EnemySkeleton.SetPlayerDir(directionX > 0 ? 1 : -1);
        }
        this.PlayAnimation(animationName, loop, cb);
    }

    private StopMoving(): void {
        this._moveVelocity.set(0, 0);
        if (this.RigidBody) {
            this.RigidBody.linearVelocity = this._moveVelocity;
        }
    }

    private UpdateAimDirection(offsetX: number, offsetY: number, distance: number): void {
        if (!this.EnemySkeleton || distance <= 0 || this.EnemyConfig.WeaponName == "战术匕首") {
            return;
        }

        this.EnemySkeleton.AttackX = offsetX / distance;
        this.EnemySkeleton.AttackY = offsetY / distance;
        this.EnemySkeleton.HasDirection = true;
    }

    private SelectNextPatrolPoint(): void {
        const radius = Math.max(0, this.EnemyConfig.PatrolRadius);
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * radius;
        this._patrolTarget.set(
            this._patrolCenter.x + Math.cos(angle) * distance,
            this._patrolCenter.y + Math.sin(angle) * distance,
            this._patrolCenter.z,
        );
    }

    private TryAttack(): void {
        if (this._attackCooldown > 0) {
            return;
        }

        this._attackCooldown = Math.max(0, this.EnemyConfig.AttackInterval);
        // this.OnAttack();
    }
}
