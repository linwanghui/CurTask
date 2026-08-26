import { _decorator, instantiate, Node, NodePool, Prefab, Vec3 } from 'cc';
import { WZSJZ_Boss } from './WZSJZ_Boss';
import { WZSJZ_BossSkill_GuanTouShield } from './WZSJZ_BossSkill_GuanTouShield';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EnemyBulletPool } from './WZSJZ_EnemyBulletPool';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';

type GuanTouAttackState = "none" | "normal" | "skill";

const { ccclass } = _decorator;

/** 光头Boss：远程普攻，技能护罩存续期间生命、韧性和控制均免疫。 */
@ccclass('WZSJZ_Boss_GuanTou')
export class WZSJZ_Boss_GuanTou extends WZSJZ_Boss {
    private static _shieldPrefab: Prefab = null;
    private static _shieldLoading: Promise<Prefab> = null;
    private static readonly _shieldPool: NodePool = new NodePool();

    private _projectileLayer: Node = null;
    private _attackState: GuanTouAttackState = "none";
    private _attackElapsed: number = 0;
    private _normalAttackTimer: number = 0;
    private _nextSkillTimer: number = 0;
    private _actionTriggered: boolean = false;
    private _isShieldActive: boolean = false;
    private _activeShield: WZSJZ_BossSkill_GuanTouShield = null;

    protected GetBossConfig() {
        return WZSJZ_Constant.BossGuanTou;
    }

    public Initialize(
        wall: WZSJZ_Wall,
        recycleCallback: (enemy: WZSJZ_Enemy) => void,
        enemyProjectileLayer: Node = null,
        healthBarLayer: Node = null,
    ): boolean {
        this.RecycleActiveShield();
        if (!super.Initialize(wall, recycleCallback, enemyProjectileLayer, healthBarLayer)) {
            return false;
        }
        this._projectileLayer = enemyProjectileLayer;
        this._attackState = "none";
        this._attackElapsed = 0;
        this._normalAttackTimer = 0;
        this._actionTriggered = false;
        this._isShieldActive = false;
        this.ResetSkillTimer();
        void WZSJZ_EnemyBulletPool.Prepare();
        void WZSJZ_Boss_GuanTou.PrepareShieldPrefab();
        return true;
    }

    /** 护罩存在时不扣血，也不会由伤害连带扣除韧性。 */
    public TakeDamage(damage: number, allowHitReaction: boolean = true): boolean {
        if (this._isShieldActive) return false;
        return super.TakeDamage(damage, allowHitReaction);
    }

    /** 护罩也拦截技能的直接韧性伤害与眩晕。 */
    public ApplyStun(duration: number, tenacityDamage: number = 0): boolean {
        if (this._isShieldActive) return false;
        return super.ApplyStun(duration, tenacityDamage);
    }

    protected UpdateAttack(deltaTime: number): void {
        const config = WZSJZ_Constant.BossGuanTou;
        this._nextSkillTimer = Math.max(0, this._nextSkillTimer - deltaTime);
        if (this._attackState !== "none") {
            this._attackElapsed += deltaTime;
            if (this._attackState === "normal") {
                if (!this._actionTriggered && this._attackElapsed >= config.NormalFireDelay) {
                    this._actionTriggered = true;
                    void this.SpawnBullet();
                }
                if (this._attackElapsed >= config.NormalAnimationDuration) {
                    this.FinishAttack(false);
                }
            } else {
                if (!this._actionTriggered && this._attackElapsed >= config.ShieldActivateDelay) {
                    this._actionTriggered = true;
                    void this.ActivateShield();
                }
                if (this._attackElapsed >= config.SkillAnimationDuration) {
                    this.FinishAttack(true);
                }
            }
            return;
        }

        if (this._nextSkillTimer <= 0) {
            this.BeginAttack("skill");
            return;
        }
        this._normalAttackTimer = Math.max(0, this._normalAttackTimer - deltaTime);
        if (this._normalAttackTimer <= 0) {
            this.BeginAttack("normal");
            return;
        }
        this.PlayAnimation(config.IdleAnimation);
    }

    protected OnTremorStarted(): void {
        this._attackState = "none";
        this._attackElapsed = 0;
        this._actionTriggered = false;
        this._normalAttackTimer = Math.max(
            this._normalAttackTimer,
            this.EnemyConfig?.AttackInterval || 0,
        );
    }

    protected onDisable(): void {
        this.RecycleActiveShield();
    }

    private BeginAttack(state: GuanTouAttackState): void {
        this._attackState = state;
        this._attackElapsed = 0;
        this._actionTriggered = false;
        this.PlayAnimation(
            state === "skill"
                ? WZSJZ_Constant.BossGuanTou.SkillAnimation
                : this.EnemyConfig.AttackAnimation,
            false,
            true,
        );
    }

    private FinishAttack(wasSkill: boolean): void {
        this._attackState = "none";
        this._attackElapsed = 0;
        this._actionTriggered = false;
        this._normalAttackTimer = this.EnemyConfig.AttackInterval;
        if (wasSkill) this.ResetSkillTimer();
        this.PlayAnimation(WZSJZ_Constant.BossGuanTou.IdleAnimation, true, true);
    }

    private async SpawnBullet(): Promise<void> {
        if (!this.IsAlive || !this.Wall?.IsAlive || !this._projectileLayer?.isValid) return;
        await WZSJZ_EnemyBulletPool.Spawn(
            this._projectileLayer,
            this.GetLaunchPoint().worldPosition.clone(),
            this.Wall,
            this.GetOutgoingAttackDamage(this.EnemyConfig.AttackDamage),
        );
    }

    private async ActivateShield(): Promise<void> {
        const prefab = await WZSJZ_Boss_GuanTou.PrepareShieldPrefab();
        if (!prefab || !this.IsAlive || this._attackState !== "skill"
            || this._activeShield) return;
        const node = WZSJZ_Boss_GuanTou._shieldPool.get() || instantiate(prefab);
        node.setParent(this.node);
        node.setPosition(Vec3.ZERO);
        node.setRotationFromEuler(Vec3.ZERO);
        this.SetShieldLayerRecursively(node, this.node.layer);
        const shield = node.getComponent(WZSJZ_BossSkill_GuanTouShield);
        if (!shield) {
            console.error("[WZSJZ] 光头技能特效缺少WZSJZ_BossSkill_GuanTouShield脚本。");
            node.active = false;
            WZSJZ_Boss_GuanTou._shieldPool.put(node);
            return;
        }

        this._activeShield = shield;
        this._isShieldActive = true;
        const config = WZSJZ_Constant.BossGuanTou;
        shield.Initialize(
            config.ShieldAnimation,
            config.ShieldLoopCount,
            config.ShieldFallbackDuration,
            this.OnShieldCompleted,
        );
    }

    private OnShieldCompleted = (shield: WZSJZ_BossSkill_GuanTouShield): void => {
        if (shield !== this._activeShield) return;
        this._activeShield = null;
        this._isShieldActive = false;
        WZSJZ_Boss_GuanTou.RecycleShield(shield);
    };

    private RecycleActiveShield(): void {
        const shield = this._activeShield;
        this._activeShield = null;
        this._isShieldActive = false;
        if (shield?.node?.isValid) WZSJZ_Boss_GuanTou.RecycleShield(shield);
    }

    private GetLaunchPoint(): Node {
        for (const name of WZSJZ_Constant.BossGuanTou.LaunchPointNames) {
            const point = this.node.getChildByName(name);
            if (point) return point;
        }
        return this.node;
    }

    private ResetSkillTimer(): void {
        const config = WZSJZ_Constant.BossGuanTou;
        this._nextSkillTimer = config.SkillMinInterval
            + Math.random() * Math.max(0, config.SkillMaxInterval - config.SkillMinInterval);
    }

    private SetShieldLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) this.SetShieldLayerRecursively(child, layer);
    }

    private static async PrepareShieldPrefab(): Promise<Prefab> {
        if (this._shieldPrefab) return this._shieldPrefab;
        if (!this._shieldLoading) {
            this._shieldLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossGuanTou.ShieldPrefabPath,
            ).then((prefab) => {
                this._shieldPrefab = prefab;
                while (this._shieldPool.size()
                    < WZSJZ_Constant.ObjectPool.BossGuanTouShieldPrewarm) {
                    this._shieldPool.put(instantiate(prefab));
                }
                return prefab;
            }).catch((error) => {
                this._shieldLoading = null;
                console.error("[WZSJZ] 光头技能特效加载失败。", error);
                return null;
            });
        }
        return this._shieldLoading;
    }

    private static RecycleShield(shield: WZSJZ_BossSkill_GuanTouShield): void {
        if (!shield?.node?.isValid) return;
        shield.node.active = false;
        WZSJZ_Boss_GuanTou._shieldPool.put(shield.node);
    }
}
