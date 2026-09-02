import { _decorator, Color, Component, Node, sp, UITransform, Vec3 } from 'cc';
import { WZSJZ_Constant, WZSJZ_EnemyConfig } from './WZSJZ_Constant';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_CommonEffectSystem } from './WZSJZ_CommonEffectSystem';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
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
    private _blindTimer: number = 0;
    private _knockbackDirection: Vec3 = new Vec3(1, 0, 0);
    private _knockbackDistance: number = 0;
    private _knockbackMovedDistance: number = 0;
    private _knockbackElapsed: number = 0;
    private _knockbackDuration: number = 0;
    private _recycleCallback: ((enemy: WZSJZ_Enemy) => void) | null = null;
    private _runtimeStatMultiplier: number = 1;
    private _spawnWorldPosition: Vec3 = new Vec3();
    private _isRetreating: boolean = false;
    private _hasEscaped: boolean = false;
    private _hitFeedbackNode: Node = null;
    private _hitFeedbackPlaying: boolean = false;
    private _hitFeedbackElapsed: number = 0;
    private _hitFeedbackBaseScale: Vec3 = new Vec3(1, 1, 1);
    private _hitFeedbackBaseColor: Color = new Color(Color.WHITE);

    public get IsAlive(): boolean {
        return !this._isDead && this._currentHealth > 0;
    }

    public get CurrentHealth(): number {
        return this._currentHealth;
    }

    public get MaxHealth(): number {
        return this._config?.MaxHealth || 1;
    }

    public get RuntimeStatMultiplier(): number {
        return this._runtimeStatMultiplier;
    }

    public get IsRetreating(): boolean {
        return this._isRetreating;
    }

    public get HasEscaped(): boolean {
        return this._hasEscaped;
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
        statMultiplier: number = 1,
    ): boolean {
        this.unscheduleAllCallbacks();
        this.ResetHitFeedback();
        this._wall = wall;
        this._recycleCallback = recycleCallback;
        const baseConfig = WZSJZ_Constant.GetEnemyConfig(this.node.name);
        this._runtimeStatMultiplier = Math.max(0.01, statMultiplier || 1);
        this._config = baseConfig ? {
            ...baseConfig,
            MaxHealth: baseConfig.MaxHealth * this._runtimeStatMultiplier,
            MoveSpeed: baseConfig.MoveSpeed * this._runtimeStatMultiplier,
            AttackRange: baseConfig.AttackRange * this._runtimeStatMultiplier,
            AttackInterval: baseConfig.AttackInterval / this._runtimeStatMultiplier,
        } : null;
        this._skeleton = this.getComponentInChildren(sp.Skeleton);
        this._hitFeedbackNode = this._skeleton?.node
            || this.node.getChildByName("动画")
            || this.node;
        this._hitFeedbackBaseScale.set(this._hitFeedbackNode.scale);
        if (this._skeleton) {
            this._hitFeedbackBaseColor.set(this._skeleton.color);
        }
        if (!this._config || !this._wall) {
            console.error(`[WZSJZ] ${this.node.name} 缺少敌人数值配置或城墙目标。`);
            return false;
        }
        this.node.active = true;
        this.ClearAttachedStatusEffects();
        this._currentHealth = this._config.MaxHealth;
        this._isDead = false;
        this._attackTimer = 0;
        this._hitReactionTimer = 0;
        this._tremorTimer = 0;
        this._blindTimer = 0;
        this._spawnWorldPosition.set(this.node.worldPosition);
        this._isRetreating = false;
        this._hasEscaped = false;
        this.ClearKnockback();
        if (this._skeleton) {
            this._skeleton.timeScale = 1;
        }
        this._currentAnimation = "";
        this.PlayAnimation(this._config.MoveAnimation);
        return true;
    }

    protected update(deltaTime: number): void {
        // 不再把 Tween 挂到 Spine 图像节点上，避免受击缩放与角色动画节点的
        // 其他 Tween/状态切换互相覆盖。死亡动画期间也继续完成本次红闪。
        this.UpdateHitFeedback(deltaTime);
        if (!this._config || !this.IsAlive) {
            return;
        }
        if (this._blindTimer > 0) {
            this._blindTimer = Math.max(0, this._blindTimer - deltaTime);
        }
        this.UpdateEnemyState(deltaTime);
        const isKnockingBack = this.UpdateKnockback(deltaTime);

        if (this._tremorTimer > 0) {
            this._tremorTimer = Math.max(0, this._tremorTimer - deltaTime);
            if (this._tremorTimer <= 0 && this._skeleton) {
                this._skeleton.timeScale = 1;
            }
            return;
        }

        // 击退期间不允许自身移动或攻击，避免前进速度抵消击退表现。
        if (isKnockingBack) {
            return;
        }

        // 受击动画期间暂停当前行为；连续受击会重新播放并刷新硬直时间。
        if (this._hitReactionTimer > 0) {
            this._hitReactionTimer = Math.max(0, this._hitReactionTimer - deltaTime);
            return;
        }

        if (this._isRetreating) {
            this.UpdateRetreat(deltaTime);
            return;
        }

        if (!this._wall?.IsAlive) return;

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
            this._wall.TakeDamage(this.GetOutgoingAttackDamage(this._config.AttackDamage));
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
            // 普通敌人眩晕时切回移动姿势；Boss 则保留当前攻击/技能轨道，
            // 只暂停播放和状态计时，韧性恢复后才能从原进度继续。
            if (!this.ShouldPreserveAnimationOnTremor()) {
                this.PlayAnimation(this._config.MoveAnimation, true, true);
                this.OnTremorStarted();
            }
        }
        if (this._skeleton) {
            this._skeleton.timeScale = 0;
        }
    }

    /** 统一眩晕入口；Boss可先消耗韧性并拒绝本次控制。 */
    public ApplyStun(duration: number, tenacityDamage: number = 0): boolean {
        if (!this.IsAlive || duration <= 0 || !this.CanApplyStun(tenacityDamage)) {
            return false;
        }
        this.ApplyTremor(duration);
        const stunAnchor = this.GetStatusEffectAnchor("眩晕点位");
        WZSJZ_CommonEffectSystem.Instance?.PlayAttached(
            WZSJZ_Constant.CommonEffect.Stun.EffectName,
            stunAnchor,
            duration,
            true,
        );
        return true;
    }

    /** 致盲不影响移动与攻击动画，只在最终命中结算时把伤害变为0。 */
    public ApplyBlind(duration: number): boolean {
        if (!this.IsAlive || duration <= 0) {
            return false;
        }
        // 多次命中只刷新剩余时间，不叠加层数或生成重复特效。
        this._blindTimer = duration;
        const blindAnchor = this.GetStatusEffectAnchor("致盲点位");
        WZSJZ_CommonEffectSystem.Instance?.PlayAttached(
            WZSJZ_Constant.ElectromagneticBlind.BlindEffectName,
            blindAnchor,
            duration,
            true,
        );
        return true;
    }

    public GetOutgoingAttackDamage(baseDamage: number): number {
        return this._blindTimer > 0
            ? 0
            : Math.max(0, baseDamage * this._runtimeStatMultiplier);
    }

    /** 攻击/技能间隔随属性倍率缩短，供Boss专属状态机复用。 */
    protected ScaleDuration(baseDuration: number): number {
        return Math.max(0, baseDuration) / this._runtimeStatMultiplier;
    }

    /** 优先读取当前 Spine 资源的真实动画时长，常量仅作为资源尚未就绪时的兜底。 */
    protected GetAnimationDuration(animationName: string, fallbackDuration: number): number {
        const duration = this._skeleton?.findAnimation(animationName)?.duration;
        return duration && duration > 0
            ? duration
            : Math.max(0, fallbackDuration);
    }

    /** 供 Boss 在普通受击时保护当前非循环动作，避免同帧被待机轨道覆盖。 */
    protected GetCurrentAnimationPlayback(): {
        Name: string;
        TrackTime: number;
        Duration: number;
        Loop: boolean;
    } | null {
        const entry = this._skeleton?.getCurrent(0);
        const animation = entry?.animation;
        if (!entry || !animation?.name) return null;
        return {
            Name: animation.name,
            TrackTime: Math.max(0, entry.trackTime || 0),
            Duration: Math.max(0, animation.duration || entry.animationEnd || 0),
            Loop: !!entry.loop,
        };
    }

    /** 仅用于校正一次伤害结算期间被意外替换的 Spine 轨道。 */
    protected RestoreAnimationPlayback(
        animationName: string,
        loop: boolean,
        trackTime: number,
    ): void {
        if (!this._skeleton || !animationName) return;
        this._currentAnimation = animationName;
        const entry = this._skeleton.setAnimation(0, animationName, loop);
        if (entry) {
            entry.trackTime = Math.max(0, trackTime);
        }
    }

    protected CanApplyStun(tenacityDamage: number): boolean {
        return true;
    }

    /** Boss 可覆盖为 true，让破韧暂停而不是取消当前攻击/技能动画。 */
    protected ShouldPreserveAnimationOnTremor(): boolean {
        return false;
    }

    /** 韧性恢复等强制解控场景使用，同时恢复Spine和清除眩晕标志。 */
    protected ClearTremorState(): void {
        this._tremorTimer = 0;
        if (this._skeleton) {
            this._skeleton.timeScale = 1;
        }
        WZSJZ_CommonEffectSystem.Instance?.StopAttached(
            WZSJZ_Constant.CommonEffect.Stun.EffectName,
            this.GetStatusEffectAnchor("眩晕点位"),
        );
    }

    /** Boss 韧性未破时调用，清除异常残留的暂停倍率，但不切换当前动画。 */
    protected EnsureAnimationPlayback(): void {
        if (this._tremorTimer <= 0 && this._skeleton) {
            this._skeleton.timeScale = 1;
        }
    }

    /** Boss等拥有独立攻击状态机的敌人可在这里取消正在蓄力的攻击。 */
    protected OnTremorStarted(): void {
    }

    /** 返回本次伤害是否刚好击杀，供经验、掉落等系统订阅结果。 */
    public TakeDamage(damage: number, allowHitReaction: boolean = true): boolean {
        if (!this.IsAlive || damage <= 0) {
            return false;
        }
        this.PlayHitFeedback();
        const previousHealth = this._currentHealth;
        this._currentHealth = Math.max(0, this._currentHealth - damage);
        const aimPosition = this.GetAimWorldPosition();
        WZSJZ_CommonEffectSystem.Instance?.PlayDamageNumber(
            previousHealth - this._currentHealth,
            new Vec3(aimPosition.x, aimPosition.y, aimPosition.z),
        );
        if (this._currentHealth > 0) {
            this.PlayDamageAudio(false);
            // Boss会在这里同步扣除韧性；即使正在震颤也不能跳过该数值结算。
            const shouldEnterHitReaction = allowHitReaction
                && this.ShouldEnterHitReaction(damage);
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
        this.PlayDamageAudio(true);
        this._hitReactionTimer = 0;
        this._tremorTimer = 0;
        this._blindTimer = 0;
        this.ClearAttachedStatusEffects();
        this.ClearKnockback();
        if (this._skeleton) {
            this._skeleton.timeScale = 1;
        }
        this.PlayAnimation(this._config.DeathAnimation, false);
        WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.敌人死亡, this);
        this.scheduleOnce(() => this._recycleCallback?.(this), this._config.DeathDuration);
        return true;
    }

    /** 倒计时结束后向初始出生点撤退；撤退途中仍可受伤并被击杀。 */
    public BeginRetreat(): boolean {
        if (!this.IsAlive || this._isRetreating) return false;
        this._isRetreating = true;
        this._attackTimer = 0;
        this._hitReactionTimer = 0;
        this._tremorTimer = 0;
        this.ClearKnockback();
        if (this._skeleton) this._skeleton.timeScale = 1;
        this.OnTremorStarted();
        this.PlayAnimation(this._config.MoveAnimation, true, true);
        return true;
    }

    /** 切换回备战阶段时直接回池，不播放死亡也不触发击杀事件。 */
    public RecycleImmediately(): void {
        if (!this.node?.isValid) return;
        this.unscheduleAllCallbacks();
        this.ResetHitFeedback();
        this._isDead = true;
        this._isRetreating = false;
        this.ClearAttachedStatusEffects();
        this.ClearKnockback();
        this._recycleCallback?.(this);
    }

    /** 普通敌人每次受伤都硬直；Boss 可覆盖为韧性清空时才硬直。 */
    protected ShouldEnterHitReaction(damage: number): boolean {
        return true;
    }

    /** Boss覆盖此方法即可替换受击与死亡声音。 */
    protected PlayDamageAudio(isDead: boolean): void {
        WZSJZ_AudioManager.Play(isDead ? '敌人死亡' : '敌人受击', isDead ? 0.7 : 0.42, 0.06);
    }

    /** 统一受击打击感：图像轻微膨胀并红闪，播放中拒绝再次叠加。 */
    private PlayHitFeedback(): void {
        if (this._hitFeedbackPlaying || !this._hitFeedbackNode?.isValid) {
            return;
        }
        this._hitFeedbackPlaying = true;
        this._hitFeedbackElapsed = 0;
        this._hitFeedbackBaseScale.set(this._hitFeedbackNode.scale);
        if (this._skeleton) {
            this._hitFeedbackBaseColor.set(this._skeleton.color);
        }
    }

    private UpdateHitFeedback(deltaTime: number): void {
        if (!this._hitFeedbackPlaying) return;
        if (!this._hitFeedbackNode?.isValid) {
            this._hitFeedbackPlaying = false;
            this._hitFeedbackElapsed = 0;
            return;
        }

        const config = WZSJZ_Constant.EnemyCombat;
        const expandDuration = Math.max(0, config.HitFeedbackExpandDuration);
        const recoverDuration = Math.max(0, config.HitFeedbackRecoverDuration);
        const totalDuration = expandDuration + recoverDuration;
        this._hitFeedbackElapsed += Math.max(0, deltaTime);

        let strength = 0;
        if (totalDuration <= 0 || this._hitFeedbackElapsed >= totalDuration) {
            this.RestoreHitFeedbackAppearance();
            this._hitFeedbackPlaying = false;
            this._hitFeedbackElapsed = 0;
            return;
        }
        if (expandDuration > 0 && this._hitFeedbackElapsed < expandDuration) {
            const ratio = this._hitFeedbackElapsed / expandDuration;
            strength = 1 - (1 - ratio) * (1 - ratio); // quadOut
        } else {
            const ratio = recoverDuration > 0
                ? (this._hitFeedbackElapsed - expandDuration) / recoverDuration
                : 1;
            strength = 1 - ratio * ratio; // quadIn
        }

        const scaleFactor = 1 + (config.HitFeedbackScale - 1) * strength;
        this._hitFeedbackNode.setScale(
            this._hitFeedbackBaseScale.x * scaleFactor,
            this._hitFeedbackBaseScale.y * scaleFactor,
            this._hitFeedbackBaseScale.z,
        );
        this.ApplyHitFeedbackColor(strength);
    }

    private ApplyHitFeedbackColor(strength: number): void {
        if (!this._skeleton?.node?.isValid) return;
        const tint = WZSJZ_Constant.EnemyCombat.HitFeedbackTint;
        const ratio = Math.max(0, Math.min(1, strength));
        const base = this._hitFeedbackBaseColor;
        this._skeleton.color = new Color(
            Math.round(base.r + (tint.R - base.r) * ratio),
            Math.round(base.g + (tint.G - base.g) * ratio),
            Math.round(base.b + (tint.B - base.b) * ratio),
            base.a,
        );
    }

    private RestoreHitFeedbackAppearance(): void {
        if (this._hitFeedbackNode?.isValid) {
            this._hitFeedbackNode.setScale(this._hitFeedbackBaseScale);
        }
        if (this._skeleton?.node?.isValid) {
            this._skeleton.color = this._hitFeedbackBaseColor.clone();
        }
    }

    private ResetHitFeedback(): void {
        this.RestoreHitFeedbackAppearance();
        this._hitFeedbackPlaying = false;
        this._hitFeedbackElapsed = 0;
    }

    protected onDisable(): void {
        this.ResetHitFeedback();
    }

    private GetStatusEffectAnchor(name: string): Node {
        return this.node.getChildByName("点位")?.getChildByName(name)
            || this.node.getChildByName(name)
            || this.node;
    }

    private ClearAttachedStatusEffects(): void {
        const effects = WZSJZ_CommonEffectSystem.Instance;
        effects?.StopAttached(
            WZSJZ_Constant.CommonEffect.Stun.EffectName,
            this.GetStatusEffectAnchor("眩晕点位"),
        );
        effects?.StopAttached(
            WZSJZ_Constant.ElectromagneticBlind.BlindEffectName,
            this.GetStatusEffectAnchor("致盲点位"),
        );
    }

    public ApplyKnockback(
        direction: Vec3,
        distance: number,
        duration: number = WZSJZ_Constant.EnemyCombat.KnockbackDuration,
    ): void {
        if (!this.IsAlive || distance <= 0) {
            return;
        }
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (length <= 0.0001) {
            return;
        }
        // 同一帧受到多段重叠脉冲时取较大的剩余距离，避免瞬间叠成数倍击退。
        const remainingDistance = Math.max(
            0,
            this._knockbackDistance - this._knockbackMovedDistance,
        );
        this._knockbackDirection.set(direction.x / length, direction.y / length, 0);
        this._knockbackDistance = Math.max(distance, remainingDistance);
        this._knockbackMovedDistance = 0;
        this._knockbackElapsed = 0;
        this._knockbackDuration = Math.max(0.01, duration);
    }

    /** 返回本帧开始时是否处于击退，供主状态机暂停主动行为。 */
    private UpdateKnockback(deltaTime: number): boolean {
        if (this._knockbackDistance <= 0 || this._knockbackDuration <= 0) {
            return false;
        }
        const previousProgress = Math.min(1, this._knockbackElapsed / this._knockbackDuration);
        this._knockbackElapsed = Math.min(
            this._knockbackDuration,
            this._knockbackElapsed + Math.max(0, deltaTime),
        );
        const currentProgress = Math.min(1, this._knockbackElapsed / this._knockbackDuration);
        const previousEased = 1 - Math.pow(1 - previousProgress, 3);
        const currentEased = 1 - Math.pow(1 - currentProgress, 3);
        const moveDistance = this._knockbackDistance * (currentEased - previousEased);
        if (moveDistance > 0) {
            const current = this.node.worldPosition;
            this.node.setWorldPosition(
                current.x + this._knockbackDirection.x * moveDistance,
                current.y + this._knockbackDirection.y * moveDistance,
                current.z,
            );
            this._knockbackMovedDistance += moveDistance;
        }
        if (currentProgress >= 1) {
            this.ClearKnockback();
        }
        return true;
    }

    private ClearKnockback(): void {
        this._knockbackDistance = 0;
        this._knockbackMovedDistance = 0;
        this._knockbackElapsed = 0;
        this._knockbackDuration = 0;
    }

    private UpdateRetreat(deltaTime: number): void {
        const current = this.node.worldPosition;
        const offsetX = this._spawnWorldPosition.x - current.x;
        const offsetY = this._spawnWorldPosition.y - current.y;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        const arrivalDistance = WZSJZ_Constant.StageFlow.BossRetreatArrivalDistance;
        if (distance <= arrivalDistance) {
            this._hasEscaped = true;
            this._isRetreating = false;
            this._isDead = true;
            this.ClearAttachedStatusEffects();
            WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.Boss逃跑, this);
            this._recycleCallback?.(this);
            return;
        }
        const moveDistance = Math.min(
            distance,
            this._config.MoveSpeed
                * WZSJZ_Constant.StageFlow.BossRetreatSpeedMultiplier
                * Math.max(0, deltaTime),
        );
        this.node.setWorldPosition(
            current.x + offsetX / distance * moveDistance,
            current.y + offsetY / distance * moveDistance,
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
