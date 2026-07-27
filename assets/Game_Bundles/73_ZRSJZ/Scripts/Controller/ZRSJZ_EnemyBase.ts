import { _decorator, Component, Node, RigidBody2D, Vec2, Vec3 } from 'cc';
import {
    ZRSJZ_ANI,
    ZRSJZ_ENEMY_CONFIG,
    ZRSJZ_EnemyConfig,
    ZRSJZ_PATH_CONFIG,
    ZRSJZ_TIER,
} from '../ZRSJZ_Constant';
import { ZRSJZ_EnemySkeleton } from './ZRSJZ_EnemySkeleton';
import { ZRSJZ_HP } from '../UI/ZRSJZ_HP';
import { ZRSJZ_PathFinder } from './ZRSJZ_PathFinder';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';

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
    private _path: Vec3[] = [];
    private _pathIndex: number = 0;
    private _pathRepathRemaining: number = 0;
    private _pathTargetPosition: Vec3 = new Vec3();
    private _stuckCheckRemaining: number = 0;
    private _stuckTime: number = 0;
    private _lastStuckPosition: Vec3 = new Vec3();
    private _avoidanceSide: number = 1;

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
        this._lastStuckPosition.set(this.node.worldPosition);
        this._avoidanceSide = Math.random() < 0.5 ? -1 : 1;

        this.EnemySkeleton.Skeleton.setEventListener((trackEntry, event) => {
            if (typeof event !== "number" && event.data.name) {
                this.OnAttack(event.data.name);
            }
        });
    }

    protected update(dt: number): void {
        if (this.IsDead) {
            return;
        }

        this._attackCooldown = Math.max(0, this._attackCooldown - dt);
        this._pathRepathRemaining = Math.max(0, this._pathRepathRemaining - dt);
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
        const canAttackDirectly = this.HasDirectPath(this.Target.worldPosition);

        if (distance > loseRange) {
            this.Target = null;
            this.ClearNavigation();
            this.ChangeState(ZRSJZ_ENEMY_STATE.PATROL);
            this.Patrol(dt);
        } else if (canAttackDirectly && distance <= standingAttackRange) {
            this.ChangeState(ZRSJZ_ENEMY_STATE.ATTACK);
            this.Attack(dt);
        } else if (canAttackDirectly && distance <= movingAttackRange) {
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
        this.ClearNavigation();
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
        this.NavigateTo(
            target,
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
        this.NavigateTo(
            target,
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

        this.ClearNavigation();
        this.StopMoving();
        this.UpdateAimDirection(this.AttackX, this.AttackY, distance);
        this.PlayAnimation(
            this.EnemyConfig.StandingAttackAnimation[
            this._aniIndex % this.EnemyConfig.StandingAttackAnimation.length
            ],
            this.EnemyConfig.StandingAttackAnimation.length == 1,
            () => { this._aniIndex++ },
        );
        this.TryAttack();
    }

    BeHit(harm: number) {
        this._health -= harm;
        if (this._health <= 0) {
            this._health = 0;
            this.Die();
        }
        this.HP.Show(this._health);
    }

    /** 死亡行为接口。重复调用不会重复触发死亡逻辑。 */
    public Die(): void {
        if (this.IsDead) {
            return;
        }

        this._health = 0;
        this.ChangeState(ZRSJZ_ENEMY_STATE.DEAD);
        this.Target = null;
        this.ClearNavigation();
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
    protected abstract OnAttack(attack: string): void;

    /** 子类可覆写死亡表现，例如播放动画、掉落物品、回收节点。 */
    protected OnDeath(): void {
        this.PlayAnimation(ZRSJZ_ANI.SW, false, () => {
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
        })
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
            this.ClearNavigation();
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

    /**
     * 混合导航入口：路线畅通时直接移动，被地形阻挡或卡住时改为跟随 A* 路径。
     */
    private NavigateTo(
        targetPosition: Readonly<Vec3>,
        speed: number,
        dt: number,
        animationName: string,
        loop: boolean = true,
        cb: Function = null,
    ): void {
        if (!ZRSJZ_PATH_CONFIG.EnablePathFinding) {
            this.MoveToPosition(targetPosition, speed, dt, animationName, loop, cb);
            return;
        }

        const isStuck = this.CheckStuck(dt);
        const targetMoved = Vec3.squaredDistance(
            targetPosition,
            this._pathTargetPosition,
        ) >= ZRSJZ_PATH_CONFIG.TargetMoveDistance * ZRSJZ_PATH_CONFIG.TargetMoveDistance;

        // 已有路径时必须优先走完，不能因为一次射线误判就立刻清空路径。
        if (this._path.length > 0 && this._pathIndex < this._path.length) {
            if ((targetMoved || isStuck) && this._pathRepathRemaining <= 0) {
                this.BuildPath(targetPosition);
            }
            if (this._path.length > 0 && this._pathIndex < this._path.length) {
                this.FollowPath(speed, dt, animationName, loop, cb);
                return;
            }
        }

        if (this.HasDirectPath(targetPosition) && !isStuck) {
            this.MoveToPosition(targetPosition, speed, dt, animationName, loop, cb);
            return;
        }

        if ((this._path.length === 0 || targetMoved || isStuck)
            && this._pathRepathRemaining <= 0) {
            this.BuildPath(targetPosition);
        }

        if (this._path.length > 0) {
            this.FollowPath(speed, dt, animationName, loop, cb);
        } else {
            // A* 暂时失败时沿障碍边缘移动，同时等待下一次重新计算路径。
            this.MoveAroundObstacle(targetPosition, speed, dt, animationName, loop, cb);
        }
    }

    private MoveToPosition(
        targetPosition: Readonly<Vec3>,
        speed: number,
        dt: number,
        animationName: string,
        loop: boolean = true,
        cb: Function = null,
    ): void {
        const current = this.node.worldPosition;
        const offsetX = targetPosition.x - current.x;
        const offsetY = targetPosition.y - current.y;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        this.MoveTowards(offsetX, offsetY, distance, speed, dt, animationName, loop, cb);
    }

    private BuildPath(targetPosition: Readonly<Vec3>): void {
        this._pathRepathRemaining = Math.max(0, ZRSJZ_PATH_CONFIG.RepathInterval);
        this._pathTargetPosition.set(targetPosition);
        const newPath = ZRSJZ_PathFinder.FindPath(
            this.node.worldPosition,
            targetPosition,
            {
                GridSize: ZRSJZ_PATH_CONFIG.GridSize,
                AgentRadius: ZRSJZ_PATH_CONFIG.AgentRadius,
                AgentOffsetY: ZRSJZ_PATH_CONFIG.AgentOffsetY,
                RaycastRadiusScale: ZRSJZ_PATH_CONFIG.RaycastRadiusScale,
                ObstacleMask: ZRSJZ_TIER.地形,
                MaxSearchNodes: ZRSJZ_PATH_CONFIG.MaxSearchNodes,
            },
        );
        // 重算失败时保留尚未走完的旧路径，避免敌人立刻重新撞向墙壁。
        if (newPath.length > 0) {
            this._path = newPath;
            this._pathIndex = 0;
        } else if (this._pathIndex >= this._path.length) {
            this.ClearPath();
        }
        this._stuckTime = 0;
    }

    private FollowPath(
        speed: number,
        dt: number,
        animationName: string,
        loop: boolean,
        cb: Function,
    ): void {
        const arriveDistance = Math.max(0, ZRSJZ_PATH_CONFIG.WaypointDistance);
        while (this._pathIndex < this._path.length
            && Vec3.distance(this.node.worldPosition, this._path[this._pathIndex]) <= arriveDistance) {
            this._pathIndex++;
        }

        if (this._pathIndex >= this._path.length) {
            this.ClearPath();
            return;
        }

        this.MoveToPosition(
            this._path[this._pathIndex],
            speed,
            dt,
            animationName,
            loop,
            cb,
        );
    }

    private HasDirectPath(targetPosition: Readonly<Vec3>): boolean {
        if (!ZRSJZ_PATH_CONFIG.EnablePathFinding) {
            return true;
        }

        return ZRSJZ_PathFinder.HasDirectPath(
            this.node.worldPosition,
            targetPosition,
            ZRSJZ_TIER.地形,
            ZRSJZ_PATH_CONFIG.AgentRadius,
            ZRSJZ_PATH_CONFIG.AgentOffsetY,
            ZRSJZ_PATH_CONFIG.RaycastRadiusScale,
        );
    }

    /**
     * A* 暂时无法生成路径时的局部避障。
     * 优先沿上次选定的一侧绕行，避免每帧在障碍物两侧来回切换。
     */
    private MoveAroundObstacle(
        targetPosition: Readonly<Vec3>,
        speed: number,
        dt: number,
        animationName: string,
        loop: boolean,
        cb: Function,
    ): void {
        const current = this.node.worldPosition;
        const offsetX = targetPosition.x - current.x;
        const offsetY = targetPosition.y - current.y;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        if (distance <= 0) {
            this.StopMoving();
            return;
        }

        const directionX = offsetX / distance;
        const directionY = offsetY / distance;
        const step = Math.max(1, ZRSJZ_PATH_CONFIG.FallbackAvoidanceDistance);
        const angles = [
            this._avoidanceSide * Math.PI / 2,
            -this._avoidanceSide * Math.PI / 2,
            this._avoidanceSide * Math.PI * 3 / 4,
            -this._avoidanceSide * Math.PI * 3 / 4,
            Math.PI,
        ];

        for (let index = 0; index < angles.length; index++) {
            const angle = angles[index];
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const candidateDirectionX = directionX * cos - directionY * sin;
            const candidateDirectionY = directionX * sin + directionY * cos;
            const candidate = new Vec3(
                current.x + candidateDirectionX * step,
                current.y + candidateDirectionY * step,
                current.z,
            );
            if (!this.HasDirectPath(candidate)) {
                continue;
            }

            if (index === 1 || index === 3) {
                this._avoidanceSide *= -1;
            }
            this.MoveToPosition(candidate, speed, dt, animationName, loop, cb);
            return;
        }

        // 所有避障方向暂时都不可用时仍保持追击，避免敌人遇到玩家后原地不动。
        // 卡住检测会继续触发 A* 重算，路径生成后会立即切换为路径移动。
        this.MoveToPosition(targetPosition, speed, dt, animationName, loop, cb);
    }

    private CheckStuck(dt: number): boolean {
        this._stuckCheckRemaining -= dt;
        if (this._stuckCheckRemaining > 0) {
            return this._stuckTime >= ZRSJZ_PATH_CONFIG.StuckTime;
        }

        const checkInterval = Math.max(0.05, ZRSJZ_PATH_CONFIG.StuckCheckInterval);
        this._stuckCheckRemaining = checkInterval;
        const movedDistance = Vec3.distance(this.node.worldPosition, this._lastStuckPosition);
        this._lastStuckPosition.set(this.node.worldPosition);

        if (movedDistance < Math.max(0, ZRSJZ_PATH_CONFIG.StuckDistance)) {
            this._stuckTime += checkInterval;
        } else {
            this._stuckTime = 0;
        }
        return this._stuckTime >= Math.max(0, ZRSJZ_PATH_CONFIG.StuckTime);
    }

    private ClearPath(): void {
        this._path.length = 0;
        this._pathIndex = 0;
    }

    private ClearNavigation(): void {
        this.ClearPath();
        this._pathRepathRemaining = 0;
        this._stuckCheckRemaining = 0;
        this._stuckTime = 0;
        this._lastStuckPosition.set(this.node.worldPosition);
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
