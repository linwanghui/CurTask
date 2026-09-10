import { _decorator, Collider2D, Color, Component, Node, RigidBody2D, tween, Tween, v3, Vec2, Vec3 } from 'cc';
import {
    ZRSJZ_ANI,
    ZRSJZ_BoxConfig,
    ZRSJZ_ENEMY_CONFIG,
    ZRSJZ_EnemyConfig,
    ZRSJZ_MAP_CONFIG,
    ZRSJZ_PATH_CONFIG,
    ZRSJZ_TIER,
} from '../ZRSJZ_Constant';
import { ZRSJZ_EnemySkeleton } from './ZRSJZ_EnemySkeleton';
import { ZRSJZ_HP } from '../UI/ZRSJZ_HP';
import { ZRSJZ_PathFinder } from './ZRSJZ_PathFinder';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_HarmEffect } from '../Effect/ZRSJZ_HarmEffect';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_TaskService } from '../Service/ZRSJZ_TaskService';
import { ZRSJZ_KillTipPanel } from '../Panel/ZRSJZ_KillTipPanel';
import { ZRSJZ_OnlineService as Online } from '../Service/ZRSJZ_OnlineService';
import { ZRSJZ_OnlineCombat as Coop } from '../Service/ZRSJZ_OnlineCombat';

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
    public OnlineID = '';
    public static OnlineEnemies = new Map<string, ZRSJZ_EnemyBase>();
    private static onlineSerial = 0;
    private onlineStarted = false;
    private onlinePosition: Vec3 = null;
    private soloState: any = null;
    private soloTaken = false;
    public OnlineSuppressed = false;
    /** 原副本就地接管，不能重新 Init 血量、掉落或击杀计数。 */
    public TakeOverLocally(state: any): void {
        if (this.soloTaken) return;
        if (!this.onlineStarted) { this.soloState = state; return; }
        this.soloTaken = true;
        this.soloState = null;
        this.ApplyOnlineState(state);
        if (this.IsDead) return;
        this.Target = null;
        this.onlinePosition = null;
        this._state = ZRSJZ_ENEMY_STATE.PATROL;
        this._patrolCenter.set(this.node.worldPosition);
        this.ClearNavigation();
        this._targetSearchRemaining = 0;
        this._animationName = '';
        if (this.EnemySkeleton?.Skeleton) {
            this.EnemySkeleton.Skeleton.paused = false;
            this.EnemySkeleton.Skeleton.setCompleteListener(null);
        }
        this.SelectNextPatrolPoint();
        if (this.EnemyConfig) this.PlayAnimation(this.EnemyConfig.IdleAnimation);
    }
    /** 开场一个快照都未收到时，恢复本地图原生敌人作为兜底。 */
    public RestoreSuppressedEnemy(): void {
        if (!this.OnlineSuppressed) return;
        this.OnlineSuppressed = false;
        this._state = ZRSJZ_ENEMY_STATE.PATROL;
        this.node.active = true;
    }
    public GetOnlineState(): any {
        const skeleton = this.EnemySkeleton?.Skeleton;
        const pos = this.node.worldPosition;
        return { id: this.OnlineID, name: this.EnemyName.trim() || this.node.name,
            x: pos.x, y: pos.y, sx: this.node.scale.x, sy: this.node.scale.y,
            fx: this.EnemySkeleton?.node.scale.x || 1, fy: this.EnemySkeleton?.node.scale.y || 1,
            animation: skeleton?.getCurrent(0)?.animation?.name || '', hp: this._health,
            dead: this.IsDead, ax: this.EnemySkeleton?.AttackX || 0, ay: this.EnemySkeleton?.AttackY || 0,
            aim: this.EnemySkeleton?.HasDirection || false, stun: this.IsPetStunned };
    }
    public ApplyOnlineState(state: any): void {
        if (!this.onlineStarted || this.IsDead) return;
        this.StopMoving();
        const target = new Vec3(state.x, state.y, 0);
        if (!this.onlinePosition || state.dead || Vec3.distance(this.node.worldPosition, target) > 1200) this.node.setWorldPosition(target);
        this.onlinePosition = target;
        this.node.setScale(state.sx, state.sy, 1);
        this._health = state.hp;
        this.HP?.Show(this._health);
        if (state.dead) { this.Die(); return; }
        const visual = this.EnemySkeleton;
        if (!visual) return;
        visual.node.setScale(state.fx, state.fy, 1);
        visual.AttackX = state.ax; visual.AttackY = state.ay; visual.HasDirection = state.aim;
        const skeleton = visual.Skeleton;
        skeleton.paused = !!state.stun;
        if (state.animation && skeleton.skeletonData?.getRuntimeData()?.findAnimation(state.animation)
            && skeleton.getCurrent(0)?.animation?.name !== state.animation) {
            skeleton.setAnimation(0, state.animation, true);
        }
    }
    @property({ tooltip: '敌人配置名；留空时使用当前节点名' })
    EnemyName: string = '';

    Other: Node = null;
    Target: Node = null;
    HP: ZRSJZ_HP = null;
    private _taskMarker: Node = null;
    private _taskMarkerOrigin: Vec3 = null;
    private _taskMarkerTween: Tween<Node> = null;

    /** 仅由局内击杀任务的目标生成流程开启；普通小怪默认隐藏。 */
    public SetTaskTargetMarker(visible: boolean): void {
        this._taskMarkerTween?.stop();
        this._taskMarkerTween = null;
        if (!this._taskMarker?.isValid) {
            this._taskMarker = this.node.getChildByName('红点');
            this._taskMarkerOrigin = this._taskMarker?.position.clone() ?? null;
        }
        if (!this._taskMarker || !this._taskMarkerOrigin) return;
        this._taskMarker.setPosition(this._taskMarkerOrigin);
        this._taskMarker.active = visible && !this.IsDead;
        if (!this._taskMarker.active) return;
        const upper = this._taskMarkerOrigin.clone().add3f(0, 25, 0);
        this._taskMarkerTween = tween(this._taskMarker)
            .to(0.6, { position: upper }, { easing: 'sineInOut' })
            .to(0.6, { position: this._taskMarkerOrigin.clone() }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    protected RigidBody: RigidBody2D = null;
    protected Colliders: Collider2D[] = [];
    protected EnemySkeleton: ZRSJZ_EnemySkeleton = null;
    protected EnemyConfig: Readonly<ZRSJZ_EnemyConfig> = null;
    protected AttackDamage: number = 10;
    protected DropBoxConfig: Readonly<ZRSJZ_BoxConfig> = null;
    protected MapProp: readonly (readonly string[])[] = [];

    protected AttackX: number = 0;
    protected AttackY: number = 0;

    private _state: ZRSJZ_ENEMY_STATE = ZRSJZ_ENEMY_STATE.PATROL;
    private _health: number = 0;
    private _petStunRemaining = 0;
    private readonly _petStunSources = new Map<object, number>();
    public get IsPetStunned(): boolean { return this._petStunRemaining > 0 || this._petStunSources.size > 0; }

    public ApplyPetStun(duration: number, source?: object): void {
        if (Coop.Replica) { if (this.OnlineID) Online.Combat({ kind: 'stun', id: this.OnlineID, duration }); return; }
        if (this.IsDead || duration <= 0) return;
        if (source) this._petStunSources.set(source, Math.max(this._petStunSources.get(source) ?? 0, duration));
        else this._petStunRemaining = Math.max(this._petStunRemaining, duration);
        this.StopMoving();
        if (this.EnemySkeleton?.Skeleton) this.EnemySkeleton.Skeleton.paused = true;
    }

    public ApplyPetPull(center: Vec3, distance: number): void {
        if (Coop.Replica) { if (this.OnlineID) Online.Combat({ kind: 'pull', id: this.OnlineID, x: center.x, y: center.y, distance }); return; }
        if (this.IsDead || distance <= 0 || !this.HasDirectPath(center)) return;
        const pos = this.node.worldPosition.clone();
        const length = Vec3.distance(pos, center);
        if (length > 1) {
            Vec3.lerp(pos, pos, center, Math.min(1, distance / length));
            this.node.setWorldPosition(pos);
            this.ClearNavigation();
        }
    }
    public ClearPetStun(source: object): void {
        this._petStunSources.delete(source);
        if (!this.IsPetStunned && this.EnemySkeleton?.Skeleton) this.EnemySkeleton.Skeleton.paused = false;
    }
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
    private _curScale: number = 0.5;

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
        this.SetTaskTargetMarker(false);
        this.Other = this.node.getChildByName("Other");
        const enemyName = this.EnemyName.trim() || this.node.name;
        this.EnemyConfig = this.ResolveEnemyConfig(enemyName);
        if (!this.EnemyConfig) {
            console.error(`[ZRSJZ_EnemyBase] 未找到敌人配置: ${enemyName}`);
            this.enabled = false;
            return;
        }
        this.ApplyMapConfig(enemyName);

        this.HP = this.getComponentInChildren(ZRSJZ_HP);
        this.RigidBody = this.getComponent(RigidBody2D);
        this.EnemySkeleton = this.getComponentInChildren(ZRSJZ_EnemySkeleton);
        this._health = Math.max(1, this.EnemyConfig.MaxHealth);
        this.Colliders = this.getComponents(Collider2D);
        if (Online.Battle || Coop.SuppressNative) {
            if ((Coop.Replica || Coop.SuppressNative) && !this.OnlineID) {
                // 部分旧自动瞄准只检查 IsDead，隐藏的地图原生敌人不能成为幽灵目标。
                this._state = ZRSJZ_ENEMY_STATE.DEAD;
                this.OnlineSuppressed = true;
                this.node.active = false;
                return;
            }
            if (!this.OnlineID) this.OnlineID = 'e' + (++ZRSJZ_EnemyBase.onlineSerial);
            ZRSJZ_EnemyBase.OnlineEnemies.set(this.OnlineID, this);
        }
    }

    protected start(): void {
        this.onlineStarted = true;
        this._patrolCenter.set(this.node.worldPosition);
        this.SelectNextPatrolPoint();
        this.TryFindTarget();
        this.PlayAnimation(this.EnemyConfig.IdleAnimation);
        this.HP.Init(this._health);
        this._lastStuckPosition.set(this.node.worldPosition);
        this._avoidanceSide = Math.random() < 0.5 ? -1 : 1;
        this._curScale = this.node.scale.x;

        this.EnemySkeleton.Skeleton.setEventListener((trackEntry, event) => {
            if (typeof event !== "number" && event.data.name) {
                this.OnAnimationEvent(event.data.name);
            }
        });
        if (this.soloState) this.TakeOverLocally(this.soloState);
    }

    protected update(dt: number): void {
        if (Coop.Stopped) { this.StopMoving(); return; }
        if (Coop.Replica) {
            this.StopMoving();
            if (!this.IsDead && this.onlinePosition) this.node.setWorldPosition(Vec3.lerp(new Vec3(), this.node.worldPosition, this.onlinePosition, Math.min(1, dt * 15)));
            return;
        }
        if (ZRSJZ_Game.Instance.GamePaused && !Online.Battle) {
            this.RigidBody.linearVelocity = Vec2.ZERO;
            return;
        }
        if (this.IsDead) {
            return;
        }

        if (this.IsPetStunned) {
            this._petStunRemaining = Math.max(0, this._petStunRemaining - dt);
            for (const [source, remaining] of this._petStunSources) {
                if (remaining <= dt) this._petStunSources.delete(source);
                else this._petStunSources.set(source, remaining - dt);
            }
            this.StopMoving();
            if (this.EnemySkeleton?.Skeleton) this.EnemySkeleton.Skeleton.paused = this.IsPetStunned;
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
        this.SetTaskTargetMarker(false);
        this._petStunRemaining = 0;
        this._petStunSources.clear();
        if (this.EnemySkeleton?.Skeleton) this.EnemySkeleton.Skeleton.paused = false;
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

        this.NavigateTo(
            this._patrolTarget,
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
        if (this.IsDead || !Number.isFinite(harm) || harm <= 0 || Coop.Stopped) return;
        if (Coop.Replica) { if (this.OnlineID) Online.Combat({ kind: 'hit', id: this.OnlineID, harm }); return; }
        const harmRequestGame = ZRSJZ_Game.Instance;
        const harmWorldPosition = this.node.worldPosition.clone();
        this._health -= harm;
        if (this._health <= 0) {
            this._health = 0;
            this.Die();
        } else {
            ZRSJZ_AudioManager.Instance.PlaySound("受击");
            this.beHitEffect();
        }
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/HarmEffect").then((effect: Node) => {
            if (!effect?.isValid) return;
            const effectParent = harmRequestGame?.CurMap?.BulletParent;
            const harmEffect = effect.getComponent(ZRSJZ_HarmEffect);
            if (ZRSJZ_Game.Instance !== harmRequestGame
                || !harmRequestGame?.isValid
                || !harmRequestGame.node?.isValid
                || !harmRequestGame.node.activeInHierarchy
                || !effectParent?.isValid
                || !harmEffect) {
                ZRSJZ_PoolManager.Instance.PutNode(effect);
                return;
            }
            effect.parent = effectParent;
            effect.active = true;
            harmEffect.Show(harmWorldPosition, harm);
        }).catch(error => console.error("[ZRSJZ_EnemyBase] 受伤特效创建失败", error))
        this.HP.Show(this._health);
    }

    /** 死亡行为接口。重复调用不会重复触发死亡逻辑。 */
    public Die(): void {
        if (this.IsDead) {
            return;
        }

        this._health = 0;
        this.SetTaskTargetMarker(false);
        this.ChangeState(ZRSJZ_ENEMY_STATE.DEAD);
        if (Online.Battle && Online.BattleHost) {
            const state = this.GetOnlineState();
            Online.CombatStates.set(this.OnlineID, state);
            Online.Combat({ kind: 'states', states: [state] });
        }
        ZRSJZ_Game.Instance?.RecordKill(1, this.node);
        this.Target = null;
        this.ClearNavigation();
        this.StopMoving();
        if (this.EnemySkeleton) {
            this.EnemySkeleton.HasDirection = false;
        }
        this.OnDeath();
        ZRSJZ_AudioManager.Instance.PlaySound("击杀");
        ZRSJZ_KillTipPanel.NotifyKill();
        ZRSJZ_TaskService.CompleteTask(`击杀[${ZRSJZ_GameData.Instance.CurMap}]中的敌人`, 1);
        this.Colliders.forEach(collider => collider.enabled = false);
    }

    /**
     * 安全恢复生命值并刷新血条。
     * 返回本次实际恢复的生命值，且不会超过配置中的最大生命值。
     */
    protected RecoverHealth(amount: number): number {
        if (this.IsDead || amount <= 0) {
            return 0;
        }

        const oldHealth = this._health;
        this._health = Math.min(this.EnemyConfig.MaxHealth, this._health + amount);
        const recovered = this._health - oldHealth;
        if (recovered > 0) {
            this.HP?.Show(this._health);
        }
        return recovered;
    }

    /** 子类返回要追踪的目标。 */
    protected abstract FindTarget(): Node;

    /** 子类在这里实现真正的攻击，例如生成子弹或造成近战伤害。 */
    protected abstract OnAttack(attack: string): void;

    /** 子类可拦截 Spine 动画事件；默认将事件交给普通攻击处理。 */
    protected OnAnimationEvent(eventName: string): void {
        if (Coop.Replica || Coop.Stopped) return;
        if (this.IsDead || this.IsPetStunned || (ZRSJZ_Game.Instance?.GamePaused && !Online.Battle) || ZRSJZ_Game.Instance?.IsGameFinished) return;
        this.OnAttack(eventName);
    }

    /** 子类可覆写配置来源，例如 Boss 从 ZRSJZ_BOSS_CONFIG 中读取。 */
    protected ResolveEnemyConfig(enemyName: string): Readonly<ZRSJZ_EnemyConfig> {
        return ZRSJZ_ENEMY_CONFIG.get(enemyName);
    }

    /** 使用当前地图配置覆盖普通敌人的血量、伤害、行动节奏和掉落箱。 */
    protected ApplyMapConfig(enemyName: string): void {
        const mapName = ZRSJZ_GameData.Instance.CurMap;
        const mapConfig = ZRSJZ_MAP_CONFIG.get(mapName);
        const enemyConfig = mapConfig?.MapEnemy.get(enemyName);
        if (!mapConfig || !enemyConfig) {
            console.warn(`[ZRSJZ_EnemyBase] 地图 ${mapName} 未配置敌人: ${enemyName}`);
            return;
        }

        this.EnemyConfig = {
            ...this.EnemyConfig,
            MaxHealth: Math.max(1, enemyConfig.HP),
            PatrolSpeed: this.EnemyConfig.PatrolSpeed * enemyConfig.SpeedMultiplier,
            ChaseSpeed: this.EnemyConfig.ChaseSpeed * enemyConfig.SpeedMultiplier,
            AttackInterval: this.EnemyConfig.AttackInterval * enemyConfig.AttackIntervalMultiplier,
        };
        this.AttackDamage = Math.max(0, enemyConfig.Harm);
        this.DropBoxConfig = enemyConfig.Box;
        this.MapProp = mapConfig.MapProp;
    }

    /** 子类可覆写死亡表现，例如播放动画、掉落物品、回收节点。 */
    protected OnDeath(): void {
        const deathPosition = this.node.worldPosition.clone();
        const dropParent = this.node.parent;
        ZRSJZ_Game.Instance.CreateDieEffect(deathPosition, () => {
            this.SpawnDropBox(deathPosition, dropParent);
        });

        this.PlayAnimation(ZRSJZ_ANI.SW, false, () => {
            ZRSJZ_PoolManager.Instance.PutNode(this.node);
        })
    }

    /** 按地图配置生成箱子，并把数量、品质概率和地图物品池传入箱子。 */
    protected async SpawnDropBox(worldPos: Vec3, parent: Node, guaranteeGold: boolean = false): Promise<void> {
        const config = this.DropBoxConfig;
        const mapProp = this.MapProp;
        const requestGame = ZRSJZ_Game.Instance;
        if (!config?.BoxName) {
            return;
        }

        let node: Node = null;
        try {
            node = await ZRSJZ_PoolManager.Instance.GetNode(
                `Prefabs/Unit/箱子/${config.BoxName}`,
            );
        } catch (error) {
            console.error(`[ZRSJZ_EnemyBase] 加载掉落箱失败: ${config.BoxName}`, error);
            return;
        }
        if (!node) {
            return;
        }

        if (ZRSJZ_Game.Instance !== requestGame
            || !requestGame?.isValid
            || !requestGame.node?.isValid
            || !requestGame.node.activeInHierarchy) {
            ZRSJZ_PoolManager.Instance.PutNode(node);
            return;
        }

        const box = node.getComponent(ZRSJZ_Box);
        if (!box) {
            console.error(`[ZRSJZ_EnemyBase] 箱子预制体缺少 ZRSJZ_Box: ${config.BoxName}`);
            ZRSJZ_PoolManager.Instance.PutNode(node);
            return;
        }

        node.active = false;
        const dropParent = parent?.isValid ? parent : requestGame.CurMap?.Unit;
        if (!dropParent?.isValid) {
            ZRSJZ_PoolManager.Instance.PutNode(node);
            return;
        }
        node.parent = dropParent;
        box.Configure(config, mapProp, guaranteeGold);
        node.active = true;
        box.Show(worldPos);
    }

    protected PlayAnimation(animationName: string, loop: boolean = true, cb: Function = null): void {
        if (!animationName || animationName === this._animationName || !this.EnemySkeleton?.Skeleton) {
            return;
        }

        this._animationName = animationName;
        this.EnemySkeleton.PlayAni(animationName, loop, cb);
    }

    /** 强制从头播放动画，即使该动画与当前记录的动画名称相同。 */
    protected RestartAnimation(animationName: string, loop: boolean = true, cb: Function = null): void {
        this._animationName = '';
        this.PlayAnimation(animationName, loop, cb);
    }

    private ChangeState(state: ZRSJZ_ENEMY_STATE): void {
        if (this._state === state || this.IsDead) {
            return;
        }

        const previousState = this._state;
        this._state = state;
        if (state === ZRSJZ_ENEMY_STATE.PATROL) {
            // 从追击或攻击状态脱离战斗时，以当前位置作为新的巡逻中心，
            // 避免敌人重新返回出生点附近。
            if (previousState !== ZRSJZ_ENEMY_STATE.PATROL) {
                this._patrolCenter.set(this.node.worldPosition);
            }

            this.ClearNavigation();
            this._patrolWaitRemaining = 0;
            if (this.EnemySkeleton) {
                this.EnemySkeleton.HasDirection = false;
            }
            this.SelectNextPatrolPoint();
        }
    }

    private RefreshTarget(dt: number): void {
        if (Online.Battle && Online.BattleHost) {
            this._targetSearchRemaining -= dt;
            if (this._targetSearchRemaining <= 0) {
                this._targetSearchRemaining = 0.25;
                this.Target = Coop.ChooseTarget(this.node.worldPosition, this.FindTarget());
            }
            return;
        }
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
            this.Target = Coop.ChooseTarget(this.node.worldPosition, this.FindTarget());
        } else if (this.Target && !this.Target.getComponent(ZRSJZ_Player)?.IsDead && Vec3.distance(this.node.worldPosition, this.Target.worldPosition) > 300) {
            this.Target = Coop.ChooseTarget(this.node.worldPosition, this.FindTarget());
        }
    }

    protected IsTargetAvailable(): boolean {
        if (this.Target === Coop.Peer && Online.PeerPose?.dead) return false;
        return !!this.Target && this.Target.isValid && this.Target.activeInHierarchy && !this.Target.getComponent(ZRSJZ_Player)?.IsDead;
    }

    /**
     * 混合导航入口：路线畅通时直接移动，被地形阻挡或卡住时改为跟随 A* 路径。
     */
    protected NavigateTo(
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

    protected ClearNavigation(): void {
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

    protected StopMoving(): void {
        this._moveVelocity.set(0, 0);
        if (this.RigidBody) {
            this.RigidBody.linearVelocity = this._moveVelocity;
        }
    }

    protected UpdateAimDirection(offsetX: number, offsetY: number, distance: number): void {
        if (!this.EnemySkeleton || distance <= 0 || this.EnemyConfig.WeaponName == "战术匕首") {
            return;
        }

        this.EnemySkeleton.AttackX = offsetX / distance;
        this.EnemySkeleton.AttackY = offsetY / distance;
        this.EnemySkeleton.HasDirection = true;
    }

    private SelectNextPatrolPoint(): void {
        const radius = Math.max(0, this.EnemyConfig.PatrolRadius);
        const candidate = new Vec3();

        // 随机点可能生成在墙内或墙后，优先选择当前位置能够直接到达的巡逻点。
        for (let attempt = 0; attempt < 16; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * radius;
            candidate.set(
                this._patrolCenter.x + Math.cos(angle) * distance,
                this._patrolCenter.y + Math.sin(angle) * distance,
                this._patrolCenter.z,
            );
            if (this.HasDirectPath(candidate)) {
                this._patrolTarget.set(candidate);
                return;
            }
        }

        // 周围暂时没有合适位置时留在原地，等待下一轮重新选择。
        this._patrolTarget.set(this.node.worldPosition);
    }

    private TryAttack(): void {
        if (this._attackCooldown > 0) {
            return;
        }

        this._attackCooldown = Math.max(0, this.EnemyConfig.AttackInterval);
        // this.OnAttack();
    }

    private beHitEffect() {
        this.unschedule(this.changeColor);
        this.EnemySkeleton.Skeleton.color = new Color(255, 0, 0, 255);
        this.scheduleOnce(this.changeColor, 0.04);
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.02, { scale: v3(this._curScale + 0.03, this._curScale + 0.03, 1) }, { easing: 'linear' })
            .to(0.02, { scale: v3(this._curScale, this._curScale, 1) }, { easing: 'linear' })
            .start();
    }

    private changeColor() {
        this.EnemySkeleton.Skeleton.color = new Color(255, 255, 255, 255);
    }
}
