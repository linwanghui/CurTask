import { _decorator, instantiate, Node, Prefab, Vec3 } from 'cc';
import { WZSJZ_BossConfig, WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_BossHealthBar } from './WZSJZ_BossHealthBar';
import { WZSJZ_BossTenacityBar } from './WZSJZ_BossTenacityBar';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';

const { ccclass } = _decorator;

/** Boss通用基类：韧性、破韧眩晕、免击退以及状态条。 */
@ccclass('WZSJZ_Boss')
export class WZSJZ_Boss extends WZSJZ_Enemy {
    private static _healthBarPrefab: Prefab = null;
    private static _healthBarLoading: Promise<Prefab> = null;
    private static _tenacityBarPrefab: Prefab = null;
    private static _tenacityBarLoading: Promise<Prefab> = null;

    private _bossConfig: WZSJZ_BossConfig = null;
    private _healthBarLayer: Node = null;
    private _currentTenacity: number = 0;
    private _tenacityRecoveryTimer: number = 0;
    private _initializeToken: number = 0;
    private _bossLevel: number = 1;
    /** 普通命中发生时，保护尚未播完的攻击/技能轨道不被待机动画覆盖。 */
    private _protectedAnimationName: string = "";
    private _protectedAnimationRemaining: number = 0;
    /** 仅允许破韧发生的那一次内部调用穿过“零韧性不可重复眩晕”保护。 */
    private _isApplyingTenacityBreakStun: boolean = false;

    public get CurrentTenacity(): number {
        return this._currentTenacity;
    }

    public get MaxTenacity(): number {
        return (this._bossConfig?.MaxTenacity || 1) * this.RuntimeStatMultiplier;
    }

    public get BossLevel(): number {
        return this._bossLevel;
    }

    /** 关卡系统在Boss生成后写入当前回合等级；测试面板生成时保持1级。 */
    public SetBossLevel(level: number): void {
        this._bossLevel = Math.max(1, Math.floor(level || 1));
    }

    /** 子类只需返回自己的Boss数值配置。 */
    protected GetBossConfig(): WZSJZ_BossConfig {
        return null;
    }

    protected PlayDamageAudio(isDead: boolean): void {
        WZSJZ_AudioManager.Play(isDead ? 'Boss死亡' : 'Boss受击', isDead ? 0.9 : 0.58, 0.08);
    }

    public Initialize(
        wall: WZSJZ_Wall,
        recycleCallback: (enemy: WZSJZ_Enemy) => void,
        enemyProjectileLayer: Node = null,
        healthBarLayer: Node = null,
        statMultiplier: number = 1,
    ): boolean {
        if (!super.Initialize(
            wall,
            recycleCallback,
            enemyProjectileLayer,
            healthBarLayer,
            statMultiplier,
        )) {
            return false;
        }
        this._bossConfig = this.GetBossConfig();
        if (!this._bossConfig) {
            console.error(`[WZSJZ] ${this.node.name} 缺少Boss专属配置。`);
            return false;
        }
        this._healthBarLayer = healthBarLayer;
        this._bossLevel = 1;
        this._currentTenacity = this.MaxTenacity;
        this._tenacityRecoveryTimer = 0;
        this.ClearHitAnimationProtection();
        this._isApplyingTenacityBreakStun = false;
        void this.CreateStatusBars(++this._initializeToken);
        return true;
    }

    /** Boss默认不接受击退，个别Boss需要时可再次覆盖。 */
    public ApplyKnockback(_direction: Vec3, _distance: number, _duration?: number): void {
    }

    public ApplyStun(duration: number, tenacityDamage: number = 0): boolean {
        const willBreakTenacity = this._currentTenacity > 0
            && tenacityDamage > 0
            && this._currentTenacity - tenacityDamage <= 0;
        const finalDuration = willBreakTenacity
            ? Math.max(duration, WZSJZ_Constant.BossCommon.TenacityBreakStunDuration)
            : duration;
        return super.ApplyStun(finalDuration, tenacityDamage);
    }

    public TakeDamage(damage: number, allowHitReaction: boolean = true): boolean {
        const playback = this.GetCurrentAnimationPlayback();
        const killed = super.TakeDamage(damage, allowHitReaction);
        if (killed || !this.IsAlive || this._currentTenacity <= 0) {
            this.ClearHitAnimationProtection();
            return killed;
        }

        // 循环待机/行走无需保护；只保护确实还没有播放完成的非循环动作。
        if (playback && !playback.Loop) {
            const remaining = Math.max(0, playback.Duration - playback.TrackTime);
            if (remaining > 0.001) {
                const currentPlayback = this.GetCurrentAnimationPlayback();
                // TakeDamage 是同步调用；如果调用前后轨道发生变化，就一定是受击链路覆盖了动作。
                if (currentPlayback?.Name !== playback.Name) {
                    this.RestoreAnimationPlayback(
                        playback.Name,
                        playback.Loop,
                        playback.TrackTime,
                    );
                }
                const isSameProtectedAnimation = this._protectedAnimationName === playback.Name;
                this._protectedAnimationName = playback.Name;
                this._protectedAnimationRemaining = isSameProtectedAnimation
                    ? Math.max(this._protectedAnimationRemaining, remaining)
                    : remaining;
            }
        }
        return killed;
    }

    /** 破韧只暂停当前动作；韧性回满后继续原来的攻击或技能，不回待机重置。 */
    protected ShouldPreserveAnimationOnTremor(): boolean {
        return true;
    }

    protected ShouldEnterHitReaction(damage: number): boolean {
        if (this._currentTenacity <= 0) {
            return false;
        }
        const previous = this._currentTenacity;
        this._currentTenacity = Math.max(
            0,
            previous - Math.max(0, damage * this._bossConfig.TenacityDamageScale),
        );
        if (previous > 0 && this._currentTenacity <= 0) {
            this.StartTenacityBreak();
        } else {
            // 普通受击绝不能暂停或切换 Boss 当前攻击/技能动画。
            this.EnsureAnimationPlayback();
        }
        return false;
    }

    protected UpdateEnemyState(deltaTime: number): void {
        if (this._protectedAnimationRemaining > 0) {
            this._protectedAnimationRemaining = Math.max(
                0,
                this._protectedAnimationRemaining - Math.max(0, deltaTime),
            );
            if (this._protectedAnimationRemaining <= 0) {
                this.ClearHitAnimationProtection();
            }
        }
        if (this._currentTenacity > 0 || this._tenacityRecoveryTimer <= 0) {
            return;
        }
        this._tenacityRecoveryTimer = Math.max(0, this._tenacityRecoveryTimer - deltaTime);
        if (this._tenacityRecoveryTimer <= 0) {
            this._currentTenacity = this.MaxTenacity;
            // 防止零韧性期间的多段控制把眩晕延长到韧性已经回满之后。
            this.ClearTremorState();
        }
    }

    protected PlayAnimation(
        animationName: string,
        loop: boolean = true,
        restart: boolean = false,
    ): void {
        const isForcedControlAnimation = animationName === this.EnemyConfig?.DeathAnimation
            || animationName === this.EnemyConfig?.HitAnimation
            || (this.IsRetreating && animationName === this.EnemyConfig?.MoveAnimation);
        if (!isForcedControlAnimation
            && this._protectedAnimationRemaining > 0
            && this._protectedAnimationName
            && animationName !== this._protectedAnimationName) {
            return;
        }
        super.PlayAnimation(animationName, loop, restart);
    }

    protected CanApplyStun(tenacityDamage: number): boolean {
        if (this._currentTenacity <= 0) {
            // 同一次破韧只眩晕一次；等待恢复期间不能被多段技能无限续控。
            return this._isApplyingTenacityBreakStun;
        }
        this._currentTenacity = Math.max(
            0,
            this._currentTenacity - Math.max(0, tenacityDamage),
        );
        if (this._currentTenacity > 0) {
            return false;
        }
        this.ResetTenacityRecoveryTimer();
        return true;
    }

    private StartTenacityBreak(): void {
        this.ResetTenacityRecoveryTimer();
        this._isApplyingTenacityBreakStun = true;
        try {
            this.ApplyStun(WZSJZ_Constant.BossCommon.TenacityBreakStunDuration);
        } finally {
            this._isApplyingTenacityBreakStun = false;
        }
    }

    private ResetTenacityRecoveryTimer(): void {
        this._tenacityRecoveryTimer = Math.max(
            this._bossConfig.TenacityRecoveryDelay,
            WZSJZ_Constant.BossCommon.TenacityBreakStunDuration,
        );
    }

    private ClearHitAnimationProtection(): void {
        this._protectedAnimationName = "";
        this._protectedAnimationRemaining = 0;
    }

    private async CreateStatusBars(token: number): Promise<void> {
        const [healthPrefab, tenacityPrefab] = await Promise.all([
            WZSJZ_Boss.PrepareHealthBarPrefab(),
            WZSJZ_Boss.PrepareTenacityBarPrefab(),
        ]);
        if (token !== this._initializeToken || !this.IsAlive
            || !this._healthBarLayer?.isValid) {
            return;
        }
        const healthAnchor = this.node.getChildByName("血条位置");
        const tenacityAnchor = this.node.getChildByName("韧性条位置");
        if (healthPrefab && healthAnchor) {
            const node = healthAnchor.children.find(
                (child) => !!child.getComponent(WZSJZ_BossHealthBar),
            ) || instantiate(healthPrefab);
            node.name = `${this.node.name}_血条`;
            node.setParent(healthAnchor);
            node.setPosition(Vec3.ZERO);
            node.active = true;
            this.SetLayerRecursively(node, this._healthBarLayer.layer);
            (node.getComponent(WZSJZ_BossHealthBar)
                || node.addComponent(WZSJZ_BossHealthBar)).Configure(this, healthAnchor);
        }
        if (tenacityPrefab && tenacityAnchor) {
            const node = tenacityAnchor.children.find(
                (child) => !!child.getComponent(WZSJZ_BossTenacityBar),
            ) || instantiate(tenacityPrefab);
            node.name = `${this.node.name}_韧性条`;
            node.setParent(tenacityAnchor);
            node.setPosition(Vec3.ZERO);
            node.active = true;
            this.SetLayerRecursively(node, this._healthBarLayer.layer);
            (node.getComponent(WZSJZ_BossTenacityBar)
                || node.addComponent(WZSJZ_BossTenacityBar)).Configure(this, tenacityAnchor);
        }
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }

    private static async PrepareHealthBarPrefab(): Promise<Prefab> {
        if (this._healthBarPrefab) return this._healthBarPrefab;
        if (!this._healthBarLoading) {
            this._healthBarLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossCommon.HealthBarPrefabPath,
            ).then((prefab) => this._healthBarPrefab = prefab).catch((error) => {
                this._healthBarLoading = null;
                console.error("[WZSJZ] Boss血条预制体加载失败。", error);
                return null;
            });
        }
        return this._healthBarLoading;
    }

    private static async PrepareTenacityBarPrefab(): Promise<Prefab> {
        if (this._tenacityBarPrefab) return this._tenacityBarPrefab;
        if (!this._tenacityBarLoading) {
            this._tenacityBarLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossCommon.TenacityBarPrefabPath,
            ).then((prefab) => this._tenacityBarPrefab = prefab).catch((error) => {
                this._tenacityBarLoading = null;
                console.error("[WZSJZ] Boss韧性条预制体加载失败。", error);
                return null;
            });
        }
        return this._tenacityBarLoading;
    }
}
