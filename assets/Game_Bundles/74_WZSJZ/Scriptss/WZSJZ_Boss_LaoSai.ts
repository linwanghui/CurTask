import { _decorator, instantiate, Node, NodePool, Prefab } from 'cc';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_Boss } from './WZSJZ_Boss';
import { WZSJZ_BossBullet_LaoSai } from './WZSJZ_BossBullet_LaoSai';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';
const { ccclass } = _decorator;

type LaoSaiAttackState = "none" | "normal" | "skill";

@ccclass('WZSJZ_Boss_LaoSai')
export class WZSJZ_Boss_LaoSai extends WZSJZ_Boss {
    /** 以下时间对应动画播放后的秒数，需要按实际 Spine 动画手动微调。 */
    private static readonly NORMAL_ARROW_TIME = 0.22;
    private static readonly SKILL_ARROW_TIMES: readonly number[] = [0.65, 0.9, 1.15];

    private static _arrowPrefab: Prefab = null;
    private static _arrowLoading: Promise<Prefab> = null;
    private static readonly _arrowPool: NodePool = new NodePool();
    private _attackState: LaoSaiAttackState = "none";
    private _attackElapsed: number = 0;
    private _nextSkillTimer: number = 0;
    private _normalAttackTimer: number = 0;
    private _firedArrowCount: number = 0;
    private _projectileLayer: Node = null;
    protected GetBossConfig() {
        return WZSJZ_Constant.BossLaoSai;
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
        this._firedArrowCount = 0;
        this.ResetSkillTimer();
        void WZSJZ_Boss_LaoSai.PrepareArrowPrefab();
        return true;
    }

    protected OnTremorStarted(): void {
        this._attackState = "none";
        this._attackElapsed = 0;
        this._firedArrowCount = 0;
        this._normalAttackTimer = Math.max(
            this._normalAttackTimer,
            this.EnemyConfig?.AttackInterval || 0,
        );
    }

    protected UpdateAttack(deltaTime: number): void {
        this._nextSkillTimer = Math.max(0, this._nextSkillTimer - deltaTime);
        if (this._attackState !== "none") {
            this.UpdateCurrentAttack(deltaTime);
            return;
        }

        if (this._nextSkillTimer <= 0) {
            this.BeginSkillAttack();
            return;
        }

        this._normalAttackTimer -= deltaTime;
        if (this._normalAttackTimer <= 0) {
            this.BeginNormalAttack();
            return;
        }
        this.PlayAnimation(WZSJZ_Constant.BossLaoSai.IdleAnimation);
    }

    private BeginNormalAttack(): void {
        this._attackState = "normal";
        this._attackElapsed = 0;
        this._firedArrowCount = 0;
        this.PlayAnimation(this.EnemyConfig.AttackAnimation, false, true);
    }

    private BeginSkillAttack(): void {
        this._attackState = "skill";
        this._attackElapsed = 0;
        this._firedArrowCount = 0;
        this.PlayAnimation(WZSJZ_Constant.BossLaoSai.SkillAnimation, false, true);
    }

    private UpdateCurrentAttack(deltaTime: number): void {
        this._attackElapsed += deltaTime;
        if (this._attackState === "normal") {
            if (this._firedArrowCount === 0
                && this._attackElapsed >= WZSJZ_Boss_LaoSai.NORMAL_ARROW_TIME) {
                this._firedArrowCount = 1;
                this.SpawnArrow(this.EnemyConfig.AttackDamage);
            }
            if (this._firedArrowCount > 0
                && this._attackElapsed >= this.GetAnimationDuration(
                    this.EnemyConfig.AttackAnimation,
                    WZSJZ_Constant.BossLaoSai.NormalAnimationFallbackDuration,
                )) {
                this.FinishAttack(false);
            }
            return;
        }

        const times = WZSJZ_Boss_LaoSai.SKILL_ARROW_TIMES;
        while (this._firedArrowCount < times.length
            && this._attackElapsed >= times[this._firedArrowCount]) {
            this._firedArrowCount++;
            this.SpawnArrow(WZSJZ_Constant.BossLaoSai.SkillArrowDamage);
        }
        if (this._firedArrowCount >= times.length
            && this._attackElapsed >= this.GetAnimationDuration(
                WZSJZ_Constant.BossLaoSai.SkillAnimation,
                WZSJZ_Constant.BossLaoSai.SkillAnimationFallbackDuration,
            )) {
            this.FinishAttack(true);
        }
    }

    private FinishAttack(wasSkill: boolean): void {
        this._attackState = "none";
        this._attackElapsed = 0;
        this._firedArrowCount = 0;
        this._normalAttackTimer = this.EnemyConfig.AttackInterval;
        if (wasSkill) this.ResetSkillTimer();
        this.PlayAnimation(WZSJZ_Constant.BossLaoSai.IdleAnimation, true, true);
    }

    private async SpawnArrow(damage: number): Promise<void> {
        const firePoint = this.node.getChildByName("子弹发射点");
        const fireWorldPosition = (firePoint || this.node).worldPosition.clone();
        // 初始化阶段已经预加载；攻击触发时不等待，防止受控后补射弓箭。
        const prefab = WZSJZ_Boss_LaoSai._arrowPrefab;
        if (!prefab) {
            void WZSJZ_Boss_LaoSai.PrepareArrowPrefab();
            return;
        }
        const layer = this._projectileLayer;
        if (!prefab || !layer || !this.IsAlive || !this.Wall?.IsAlive) {
            return;
        }
        const arrowNode = WZSJZ_Boss_LaoSai._arrowPool.get() || instantiate(prefab);
        arrowNode.active = true;
        arrowNode.setParent(layer);
        arrowNode.setWorldPosition(fireWorldPosition);
        const arrow = arrowNode.getComponent(WZSJZ_BossBullet_LaoSai);
        if (!arrow?.Initialize(
            this.Wall,
            this.GetOutgoingAttackDamage(damage),
            WZSJZ_Constant.BossLaoSai.ArrowSpeed,
            WZSJZ_Boss_LaoSai.RecycleArrow,
        )) {
            WZSJZ_Boss_LaoSai._arrowPool.put(arrowNode);
        }
    }

    private ResetSkillTimer(): void {
        const config = WZSJZ_Constant.BossLaoSai;
        this._nextSkillTimer = this.ScaleDuration(
            config.SkillMinInterval
                + Math.random() * Math.max(0, config.SkillMaxInterval - config.SkillMinInterval),
        );
    }

    private static async PrepareArrowPrefab(): Promise<Prefab> {
        if (this._arrowPrefab) {
            return this._arrowPrefab;
        }
        if (!this._arrowLoading) {
            this._arrowLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossLaoSai.ArrowPrefabPath,
            ).then((prefab) => {
                this._arrowPrefab = prefab;
                while (this._arrowPool.size() < WZSJZ_Constant.ObjectPool.BossLaoSaiArrowPrewarm) {
                    this._arrowPool.put(instantiate(prefab));
                }
                return prefab;
            }).catch((error) => {
                this._arrowLoading = null;
                console.error("[WZSJZ] 牢赛弓箭预制体加载失败。", error);
                return null;
            });
        }
        return this._arrowLoading;
    }

    private static RecycleArrow = (arrow: WZSJZ_BossBullet_LaoSai): void => {
        if (arrow?.node?.isValid) {
            WZSJZ_Boss_LaoSai._arrowPool.put(arrow.node);
        }
    };

}
