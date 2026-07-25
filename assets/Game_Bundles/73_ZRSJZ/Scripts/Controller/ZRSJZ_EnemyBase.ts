import { _decorator, Component, Node, RigidBody2D, Vec2, Vec3 } from 'cc';
import { ZRSJZ_ANI } from '../ZRSJZ_Constant';
import { ZRSJZ_EnemySkeleton } from './ZRSJZ_EnemySkeleton';

const { ccclass, property } = _decorator;

export enum ZRSJZ_ENEMY_STATE {
    PATROL,
    CHASE,
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
    @property({ tooltip: '最大生命值' })
    MaxHealth: number = 100;

    @property({ tooltip: '目标进入该距离后开始追击' })
    DetectionRange: number = 800;

    @property({ tooltip: '追击中目标超过该距离后返回巡逻' })
    LoseRange: number = 1200;

    @property({ tooltip: '以出生点为中心的巡逻半径' })
    PatrolRadius: number = 500;

    @property({ tooltip: '巡逻移动速度' })
    PatrolSpeed: number = 120;

    @property({ tooltip: '追击移动速度' })
    ChaseSpeed: number = 220;

    @property({ tooltip: '到达巡逻点后的停留时间' })
    PatrolWaitTime: number = 1;

    @property({ tooltip: '判定到达巡逻点的距离' })
    PatrolArriveDistance: number = 20;

    @property({ tooltip: '目标进入该距离后开始攻击' })
    AttackRange: number = 300;

    @property({ tooltip: '两次攻击之间的冷却时间' })
    AttackInterval: number = 1;

    @property({ tooltip: '待机动画名' })
    IdleAnimation: string = ZRSJZ_ANI.Idle_Q;
    @property({ tooltip: '移动动画名' })
    MoveAnimation: string = ZRSJZ_ANI.Walk_Q;
    @property({ tooltip: '攻击动画名' })
    AttackAnimation: string = ZRSJZ_ANI.Attack_Idle_Q;

    Target: Node = null;

    protected RigidBody: RigidBody2D = null;
    protected EnemySkeleton: ZRSJZ_EnemySkeleton = null;

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
        this.RigidBody = this.getComponent(RigidBody2D);
        this.EnemySkeleton = this.getComponentInChildren(ZRSJZ_EnemySkeleton);
        this._health = Math.max(1, this.MaxHealth);
    }

    protected start(): void {
        this._patrolCenter.set(this.node.worldPosition);
        this.SelectNextPatrolPoint();
        this.TryFindTarget();
        this.PlayAnimation(this.IdleAnimation);
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
        const detectionRange = Math.max(0, this.DetectionRange);
        const loseRange = Math.max(detectionRange, this.LoseRange);
        const attackRange = Math.max(0, this.AttackRange);

        if (distance > loseRange) {
            this.Target = null;
            this.ChangeState(ZRSJZ_ENEMY_STATE.PATROL);
            this.Patrol(dt);
        } else if (distance <= attackRange) {
            this.ChangeState(ZRSJZ_ENEMY_STATE.ATTACK);
            this.Attack(dt);
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
        if (this.PatrolRadius <= 0 || this.PatrolSpeed <= 0) {
            this.StopMoving();
            this.PlayAnimation(this.IdleAnimation);
            return;
        }

        if (this._patrolWaitRemaining > 0) {
            this._patrolWaitRemaining -= dt;
            this.StopMoving();
            this.PlayAnimation(this.IdleAnimation);
            if (this._patrolWaitRemaining <= 0) {
                this.SelectNextPatrolPoint();
            }
            return;
        }

        const current = this.node.worldPosition;
        const offsetX = this._patrolTarget.x - current.x;
        const offsetY = this._patrolTarget.y - current.y;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

        if (distance <= Math.max(0, this.PatrolArriveDistance)) {
            this.StopMoving();
            this.PlayAnimation(this.IdleAnimation);
            this._patrolWaitRemaining = Math.max(0, this.PatrolWaitTime);
            if (this._patrolWaitRemaining === 0) {
                this.SelectNextPatrolPoint();
            }
            return;
        }

        this.MoveTowards(offsetX, offsetY, distance, this.PatrolSpeed, dt);
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
        this.MoveTowards(offsetX, offsetY, distance, this.ChaseSpeed, dt);
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
        this.PlayAnimation(this.AttackAnimation);

        if (this._attackCooldown <= 0) {
            this._attackCooldown = Math.max(0, this.AttackInterval);
            this.OnAttack();
        }
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

    protected PlayAnimation(animationName: string): void {
        if (!animationName || animationName === this._animationName || !this.EnemySkeleton?.Skeleton) {
            return;
        }

        this._animationName = animationName;
        this.EnemySkeleton.PlayAni(animationName);
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
    ): void {
        if (distance <= 0 || speed <= 0) {
            this.StopMoving();
            this.PlayAnimation(this.IdleAnimation);
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
        this.PlayAnimation(this.MoveAnimation);
    }

    private StopMoving(): void {
        this._moveVelocity.set(0, 0);
        if (this.RigidBody) {
            this.RigidBody.linearVelocity = this._moveVelocity;
        }
    }

    private UpdateAimDirection(offsetX: number, offsetY: number, distance: number): void {
        if (!this.EnemySkeleton || distance <= 0) {
            return;
        }

        this.EnemySkeleton.AttackX = offsetX / distance;
        this.EnemySkeleton.AttackY = offsetY / distance;
        this.EnemySkeleton.HasDirection = true;
    }

    private SelectNextPatrolPoint(): void {
        const radius = Math.max(0, this.PatrolRadius);
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * radius;
        this._patrolTarget.set(
            this._patrolCenter.x + Math.cos(angle) * distance,
            this._patrolCenter.y + Math.sin(angle) * distance,
            this._patrolCenter.z,
        );
    }
}
