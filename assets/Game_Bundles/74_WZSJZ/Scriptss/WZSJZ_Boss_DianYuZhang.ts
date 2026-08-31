import { _decorator, instantiate, Node, NodePool, Prefab } from 'cc';
import { WZSJZ_Boss } from './WZSJZ_Boss';
import { WZSJZ_BossProjectile_DianYuZhang } from './WZSJZ_BossProjectile_DianYuZhang';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass } = _decorator;

type DianYuZhangAttackState = "none" | "normal" | "skill";

@ccclass('WZSJZ_Boss_DianYuZhang')
export class WZSJZ_Boss_DianYuZhang extends WZSJZ_Boss {
    private static _slashPrefab: Prefab = null;
    private static _slashLoading: Promise<Prefab> = null;
    private static readonly _slashPool: NodePool = new NodePool();

    private _projectileLayer: Node = null;
    private _attackState: DianYuZhangAttackState = "none";
    private _attackElapsed: number = 0;
    private _normalAttackTimer: number = 0;
    private _nextSkillTimer: number = 0;
    private _actionTriggered: boolean = false;

    protected GetBossConfig() {
        return WZSJZ_Constant.BossDianYuZhang;
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
        void WZSJZ_Boss_DianYuZhang.PrepareSlashPrefab();
        return true;
    }

    protected UpdateAttack(deltaTime: number): void {
        const config = WZSJZ_Constant.BossDianYuZhang;
        this._nextSkillTimer = Math.max(0, this._nextSkillTimer - deltaTime);
        if (this._attackState !== "none") {
            this._attackElapsed += deltaTime;
            if (this._attackState === "normal") {
                if (!this._actionTriggered && this._attackElapsed >= config.NormalDamageDelay) {
                    this._actionTriggered = true;
                    this.Wall.TakeDamage(
                        this.GetOutgoingAttackDamage(this.EnemyConfig.AttackDamage),
                    );
                }
                if (this._attackElapsed >= config.NormalAnimationDuration) {
                    this.FinishAttack(false);
                }
            } else {
                if (!this._actionTriggered && this._attackElapsed >= config.SkillSpawnDelay) {
                    this._actionTriggered = true;
                    void this.SpawnSlash();
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

    private BeginAttack(state: DianYuZhangAttackState): void {
        this._attackState = state;
        this._attackElapsed = 0;
        this._actionTriggered = false;
        const animation = state === "skill"
            ? WZSJZ_Constant.BossDianYuZhang.SkillAnimation
            : this.EnemyConfig.AttackAnimation;
        this.PlayAnimation(animation, false, true);
    }

    private FinishAttack(wasSkill: boolean): void {
        this._attackState = "none";
        this._attackElapsed = 0;
        this._actionTriggered = false;
        this._normalAttackTimer = this.EnemyConfig.AttackInterval;
        if (wasSkill) this.ResetSkillTimer();
        this.PlayAnimation(WZSJZ_Constant.BossDianYuZhang.IdleAnimation, true, true);
    }

    private async SpawnSlash(): Promise<void> {
        const config = WZSJZ_Constant.BossDianYuZhang;
        const launchPoint = this.node.getChildByName("技能发射点");
        const origin = (launchPoint || this.node).worldPosition.clone();
        if (!launchPoint) {
            origin.x += config.SkillLaunchOffsetX;
            origin.y += config.SkillLaunchOffsetY;
        }
        const prefab = await WZSJZ_Boss_DianYuZhang.PrepareSlashPrefab();
        if (!prefab || !this.IsAlive || !this.Wall?.IsAlive
            || !this._projectileLayer?.isValid) {
            return;
        }
        const node = WZSJZ_Boss_DianYuZhang._slashPool.get() || instantiate(prefab);
        node.setParent(this._projectileLayer);
        node.setWorldPosition(origin);
        this.SetProjectileLayerRecursively(node, this._projectileLayer.layer);
        const slash = node.getComponent(WZSJZ_BossProjectile_DianYuZhang);
        if (!slash) {
            console.error("[WZSJZ] 典狱长技能特效根节点缺少刀光控制脚本。");
            node.active = false;
            WZSJZ_Boss_DianYuZhang._slashPool.put(node);
            return;
        }
        if (!slash.Initialize(
            this.Wall,
            this.GetOutgoingAttackDamage(config.SkillDamage),
            config.SkillEffectSpeed,
            config.SkillEffectMaxDistance,
            config.SkillEffectHitDistance,
            config.SkillEffectAnimation,
            WZSJZ_Boss_DianYuZhang.RecycleSlash,
        )) {
            node.active = false;
            WZSJZ_Boss_DianYuZhang._slashPool.put(node);
        }
    }

    private ResetSkillTimer(): void {
        const config = WZSJZ_Constant.BossDianYuZhang;
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

    private static async PrepareSlashPrefab(): Promise<Prefab> {
        if (this._slashPrefab) return this._slashPrefab;
        if (!this._slashLoading) {
            this._slashLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossDianYuZhang.SkillEffectPrefabPath,
            ).then((prefab) => {
                this._slashPrefab = prefab;
                while (this._slashPool.size()
                    < WZSJZ_Constant.ObjectPool.BossDianYuZhangSlashPrewarm) {
                    this._slashPool.put(instantiate(prefab));
                }
                return prefab;
            }).catch((error) => {
                this._slashLoading = null;
                console.error("[WZSJZ] 典狱长技能特效加载失败。", error);
                return null;
            });
        }
        return this._slashLoading;
    }

    private static RecycleSlash = (
        slash: WZSJZ_BossProjectile_DianYuZhang,
    ): void => {
        if (!slash?.node?.isValid) return;
        slash.node.active = false;
        WZSJZ_Boss_DianYuZhang._slashPool.put(slash.node);
    };

}
