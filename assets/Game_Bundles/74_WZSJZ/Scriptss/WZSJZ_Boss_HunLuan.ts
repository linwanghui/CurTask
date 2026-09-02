import { _decorator, instantiate, Node, NodePool, Prefab } from 'cc';
import { WZSJZ_Boss } from './WZSJZ_Boss';
import { WZSJZ_BossSkill_HunLuanEffect } from './WZSJZ_BossSkill_HunLuanEffect';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EnemyBulletPool } from './WZSJZ_EnemyBulletPool';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';

type HunLuanAttackState = "none" | "normal" | "skill";

const { ccclass } = _decorator;

/** 混乱Boss：远程普攻，技能直接在城墙处生成伤害特效。 */
@ccclass('WZSJZ_Boss_HunLuan')
export class WZSJZ_Boss_HunLuan extends WZSJZ_Boss {
    private static _skillPrefab: Prefab = null;
    private static _skillLoading: Promise<Prefab> = null;
    private static readonly _skillPool: NodePool = new NodePool();

    private _projectileLayer: Node = null;
    private _attackState: HunLuanAttackState = "none";
    private _attackElapsed: number = 0;
    private _normalAttackTimer: number = 0;
    private _nextSkillTimer: number = 0;
    private _actionTriggered: boolean = false;
    private _nextSkillBulletIndex: number = 0;

    protected GetBossConfig() {
        return WZSJZ_Constant.BossHunLuan;
    }

    public Initialize(
        wall: WZSJZ_Wall,
        recycleCallback: (enemy: WZSJZ_Enemy) => void,
        enemyProjectileLayer: Node = null,
        healthBarLayer: Node = null,
    ): boolean {
        if (!super.Initialize(wall, recycleCallback, enemyProjectileLayer, healthBarLayer)) {
            return false;
        }
        this._projectileLayer = enemyProjectileLayer;
        this._attackState = "none";
        this._attackElapsed = 0;
        this._normalAttackTimer = 0;
        this._actionTriggered = false;
        this._nextSkillBulletIndex = 0;
        this.ResetSkillTimer();
        void WZSJZ_EnemyBulletPool.Prepare();
        void WZSJZ_Boss_HunLuan.PrepareSkillPrefab();
        return true;
    }

    protected UpdateAttack(deltaTime: number): void {
        const config = WZSJZ_Constant.BossHunLuan;
        this._nextSkillTimer = Math.max(0, this._nextSkillTimer - deltaTime);
        if (this._attackState !== "none") {
            this._attackElapsed += deltaTime;
            if (this._attackState === "normal") {
                if (!this._actionTriggered && this._attackElapsed >= config.NormalFireDelay) {
                    this._actionTriggered = true;
                    void this.SpawnBullet();
                }
                if (this._attackElapsed >= this.GetAnimationDuration(
                    this.EnemyConfig.AttackAnimation,
                    config.NormalAnimationDuration,
                )) {
                    this.FinishAttack(false);
                }
            } else {
                if (!this._actionTriggered && this._attackElapsed >= config.SkillEffectDelay) {
                    this._actionTriggered = true;
                    void this.SpawnSkillEffect();
                }
                while (this._nextSkillBulletIndex < config.SkillBulletDelays.length
                    && this._attackElapsed
                        >= config.SkillBulletDelays[this._nextSkillBulletIndex]) {
                    this._nextSkillBulletIndex++;
                    void this.SpawnBullet();
                }
                if (this._attackElapsed >= this.GetAnimationDuration(
                    config.SkillAnimation,
                    config.SkillAnimationDuration,
                )) {
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
        this._nextSkillBulletIndex = 0;
        this._normalAttackTimer = Math.max(
            this._normalAttackTimer,
            this.EnemyConfig?.AttackInterval || 0,
        );
    }

    private BeginAttack(state: HunLuanAttackState): void {
        this._attackState = state;
        this._attackElapsed = 0;
        this._actionTriggered = false;
        this._nextSkillBulletIndex = 0;
        this.PlayAnimation(
            state === "skill"
                ? WZSJZ_Constant.BossHunLuan.SkillAnimation
                : this.EnemyConfig.AttackAnimation,
            false,
            true,
        );
    }

    private FinishAttack(wasSkill: boolean): void {
        this._attackState = "none";
        this._attackElapsed = 0;
        this._actionTriggered = false;
        this._nextSkillBulletIndex = 0;
        this._normalAttackTimer = this.EnemyConfig.AttackInterval;
        if (wasSkill) this.ResetSkillTimer();
        this.PlayAnimation(WZSJZ_Constant.BossHunLuan.IdleAnimation, true, true);
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

    private async SpawnSkillEffect(): Promise<void> {
        const prefab = await WZSJZ_Boss_HunLuan.PrepareSkillPrefab();
        if (!prefab || !this.IsAlive || this._attackState !== "skill"
            || !this.Wall?.IsAlive || !this._projectileLayer?.isValid) return;
        const config = WZSJZ_Constant.BossHunLuan;
        const node = WZSJZ_Boss_HunLuan._skillPool.get() || instantiate(prefab);
        node.setParent(this._projectileLayer);
        node.setWorldPosition(
            this.Wall.node.worldPosition.x + config.SkillEffectOffsetX,
            this.Wall.node.worldPosition.y + config.SkillEffectOffsetY,
            this.Wall.node.worldPosition.z,
        );
        this.SetSkillLayerRecursively(node, this._projectileLayer.layer);
        const effect = node.getComponent(WZSJZ_BossSkill_HunLuanEffect);
        if (!effect?.Initialize(
            this.Wall,
            this.GetOutgoingAttackDamage(config.SkillDamage),
            config.SkillEffectAnimation,
            config.SkillDamageDelay,
            config.SkillEffectFallbackDuration,
            WZSJZ_Boss_HunLuan.RecycleSkillEffect,
        )) {
            node.active = false;
            WZSJZ_Boss_HunLuan._skillPool.put(node);
        }
    }

    private GetLaunchPoint(): Node {
        for (const name of WZSJZ_Constant.BossHunLuan.LaunchPointNames) {
            const point = this.node.getChildByName(name);
            if (point) return point;
        }
        return this.node;
    }

    private ResetSkillTimer(): void {
        const config = WZSJZ_Constant.BossHunLuan;
        this._nextSkillTimer = this.ScaleDuration(
            config.SkillMinInterval
                + Math.random() * Math.max(0, config.SkillMaxInterval - config.SkillMinInterval),
        );
    }

    private SetSkillLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) this.SetSkillLayerRecursively(child, layer);
    }

    private static async PrepareSkillPrefab(): Promise<Prefab> {
        if (this._skillPrefab) return this._skillPrefab;
        if (!this._skillLoading) {
            this._skillLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossHunLuan.SkillEffectPrefabPath,
            ).then((prefab) => {
                this._skillPrefab = prefab;
                while (this._skillPool.size()
                    < WZSJZ_Constant.ObjectPool.BossHunLuanSkillPrewarm) {
                    this._skillPool.put(instantiate(prefab));
                }
                return prefab;
            }).catch((error) => {
                this._skillLoading = null;
                console.error("[WZSJZ] 混乱技能特效加载失败。", error);
                return null;
            });
        }
        return this._skillLoading;
    }

    private static RecycleSkillEffect = (effect: WZSJZ_BossSkill_HunLuanEffect): void => {
        if (!effect?.node?.isValid) return;
        effect.node.active = false;
        WZSJZ_Boss_HunLuan._skillPool.put(effect.node);
    };
}
