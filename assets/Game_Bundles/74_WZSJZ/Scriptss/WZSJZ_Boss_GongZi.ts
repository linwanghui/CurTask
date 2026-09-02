import { _decorator, instantiate, Node, NodePool, Prefab } from 'cc';
import { WZSJZ_Boss } from './WZSJZ_Boss';
import { WZSJZ_BossSkill_GongZiBomb } from './WZSJZ_BossSkill_GongZiBomb';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EnemyBulletPool } from './WZSJZ_EnemyBulletPool';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';
type GongZiAttackState = "none" | "normal" | "skill";
const { ccclass } = _decorator;



@ccclass('WZSJZ_Boss_GongZi')
export class WZSJZ_Boss_GongZi extends WZSJZ_Boss {
    private static _bombPrefab: Prefab = null;
    private static _bombLoading: Promise<Prefab> = null;
    private static readonly _bombPool: NodePool = new NodePool();

    private _projectileLayer: Node = null;
    private _attackState: GongZiAttackState = "none";
    private _attackElapsed: number = 0;
    private _normalAttackTimer: number = 0;
    private _nextSkillTimer: number = 0;
    private _actionTriggered: boolean = false;

    protected GetBossConfig() {
        return WZSJZ_Constant.BossGongZi;
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
        this.ResetSkillTimer();
        void WZSJZ_EnemyBulletPool.Prepare();
        void WZSJZ_Boss_GongZi.PrepareBombPrefab();
        return true;
    }

    protected UpdateAttack(deltaTime: number): void {
        const config = WZSJZ_Constant.BossGongZi;
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
                if (!this._actionTriggered && this._attackElapsed >= config.SkillThrowDelay) {
                    this._actionTriggered = true;
                    void this.SpawnBomb();
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
        this._normalAttackTimer = Math.max(
            this._normalAttackTimer,
            this.EnemyConfig?.AttackInterval || 0,
        );
    }

    private BeginAttack(state: GongZiAttackState): void {
        this._attackState = state;
        this._attackElapsed = 0;
        this._actionTriggered = false;
        this.PlayAnimation(
            state === "skill"
                ? WZSJZ_Constant.BossGongZi.SkillAnimation
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
        this.PlayAnimation(WZSJZ_Constant.BossGongZi.IdleAnimation, true, true);
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

    private async SpawnBomb(): Promise<void> {
        const prefab = await WZSJZ_Boss_GongZi.PrepareBombPrefab();
        if (!prefab || !this.IsAlive || !this.Wall?.IsAlive
            || !this._projectileLayer?.isValid) return;
        const node = WZSJZ_Boss_GongZi._bombPool.get() || instantiate(prefab);
        node.setParent(this._projectileLayer);
        node.setWorldPosition(this.GetLaunchPoint().worldPosition);
        this.SetProjectileLayerRecursively(node, this._projectileLayer.layer);
        const config = WZSJZ_Constant.BossGongZi;
        const bomb = node.getComponent(WZSJZ_BossSkill_GongZiBomb);
        if (!bomb?.Initialize(
            this.Wall,
            this.GetOutgoingAttackDamage(config.BombDamage),
            config.BombSpeed,
            config.BombArcHeight,
            config.BombSpinSpeed,
            config.BombTargetOffsetY,
            config.BombExplosionAnimation,
            config.BombDamageDelay,
            config.BombExplosionFallbackDuration,
            WZSJZ_Boss_GongZi.RecycleBomb,
        )) {
            node.active = false;
            WZSJZ_Boss_GongZi._bombPool.put(node);
        }
    }

    private GetLaunchPoint(): Node {
        for (const name of WZSJZ_Constant.BossGongZi.LaunchPointNames) {
            const point = this.node.getChildByName(name);
            if (point) return point;
        }
        return this.node;
    }

    private ResetSkillTimer(): void {
        const config = WZSJZ_Constant.BossGongZi;
        this._nextSkillTimer = this.ScaleDuration(
            config.SkillMinInterval
                + Math.random() * Math.max(0, config.SkillMaxInterval - config.SkillMinInterval),
        );
    }

    private SetProjectileLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetProjectileLayerRecursively(child, layer);
        }
    }

    private static async PrepareBombPrefab(): Promise<Prefab> {
        if (this._bombPrefab) return this._bombPrefab;
        if (!this._bombLoading) {
            this._bombLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossGongZi.BombPrefabPath,
            ).then((prefab) => {
                this._bombPrefab = prefab;
                while (this._bombPool.size()
                    < WZSJZ_Constant.ObjectPool.BossGongZiBombPrewarm) {
                    this._bombPool.put(instantiate(prefab));
                }
                return prefab;
            }).catch((error) => {
                this._bombLoading = null;
                console.error("[WZSJZ] 公子技能特效加载失败。", error);
                return null;
            });
        }
        return this._bombLoading;
    }

    private static RecycleBomb = (bomb: WZSJZ_BossSkill_GongZiBomb): void => {
        if (!bomb?.node?.isValid) return;
        bomb.node.active = false;
        WZSJZ_Boss_GongZi._bombPool.put(bomb.node);
    };

}
