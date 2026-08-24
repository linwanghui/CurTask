import { _decorator, instantiate, Node, NodePool, Prefab, Vec3 } from 'cc';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_BossBullet_LaoSai } from './WZSJZ_BossBullet_LaoSai';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_BossHealthBar } from './WZSJZ_BossHealthBar';
import { WZSJZ_BossTenacityBar } from './WZSJZ_BossTenacityBar';
const { ccclass } = _decorator;

type LaoSaiAttackState = "none" | "normal" | "skill";

@ccclass('WZSJZ_Boss_LaoSai')
export class WZSJZ_Boss_LaoSai extends WZSJZ_Enemy {
    /** 以下时间对应动画播放后的秒数，需要按实际 Spine 动画手动微调。 */
    private static readonly NORMAL_ARROW_TIME = 0.22;
    private static readonly SKILL_ARROW_TIMES: readonly number[] = [0.65, 0.9, 1.15];

    private static _arrowPrefab: Prefab = null;
    private static _arrowLoading: Promise<Prefab> = null;
    private static readonly _arrowPool: NodePool = new NodePool();
    private static _healthBarPrefab: Prefab = null;
    private static _healthBarLoading: Promise<Prefab> = null;
    private static _tenacityBarPrefab: Prefab = null;
    private static _tenacityBarLoading: Promise<Prefab> = null;

    private _attackState: LaoSaiAttackState = "none";
    private _attackElapsed: number = 0;
    private _nextSkillTimer: number = 0;
    private _normalAttackTimer: number = 0;
    private _firedArrowCount: number = 0;
    private _projectileLayer: Node = null;
    private _healthBarLayer: Node = null;
    private _currentTenacity: number = 0;
    private _tenacityRecoveryTimer: number = 0;
    private _initializeToken: number = 0;

    public get CurrentTenacity(): number {
        return this._currentTenacity;
    }

    public get MaxTenacity(): number {
        return WZSJZ_Constant.BossLaoSai.MaxTenacity;
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
        this._healthBarLayer = healthBarLayer;
        this._currentTenacity = this.MaxTenacity;
        this._tenacityRecoveryTimer = 0;
        const token = ++this._initializeToken;
        this._attackState = "none";
        this._attackElapsed = 0;
        this._normalAttackTimer = 0;
        this._firedArrowCount = 0;
        this.ResetSkillTimer();
        void WZSJZ_Boss_LaoSai.PrepareArrowPrefab();
        void this.CreateStatusBars(token);
        return true;
    }

    /** Boss 不接受任何击退。 */
    public ApplyKnockback(direction: Vec3, distance: number, duration?: number): void {
    }

    protected ShouldEnterHitReaction(damage: number): boolean {
        if (this._currentTenacity <= 0) {
            return false;
        }
        const tenacityDamage = Math.max(
            0,
            damage * WZSJZ_Constant.BossLaoSai.TenacityDamageScale,
        );
        const previous = this._currentTenacity;
        this._currentTenacity = Math.max(0, previous - tenacityDamage);
        if (previous > 0 && this._currentTenacity <= 0) {
            this._tenacityRecoveryTimer = WZSJZ_Constant.BossLaoSai.TenacityRecoveryDelay;
            return true;
        }
        return false;
    }

    protected UpdateEnemyState(deltaTime: number): void {
        if (this._currentTenacity > 0 || this._tenacityRecoveryTimer <= 0) {
            return;
        }
        this._tenacityRecoveryTimer = Math.max(0, this._tenacityRecoveryTimer - deltaTime);
        if (this._tenacityRecoveryTimer <= 0) {
            this._currentTenacity = this.MaxTenacity;
        }
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

    protected CanApplyStun(tenacityDamage: number): boolean {
        if (this._currentTenacity <= 0) {
            return true;
        }
        this._currentTenacity = Math.max(
            0,
            this._currentTenacity - Math.max(0, tenacityDamage),
        );
        if (this._currentTenacity > 0) {
            return false;
        }
        this._tenacityRecoveryTimer = WZSJZ_Constant.BossLaoSai.TenacityRecoveryDelay;
        return true;
    }

    private async CreateStatusBars(token: number): Promise<void> {
        const [healthPrefab, tenacityPrefab] = await Promise.all([
            WZSJZ_Boss_LaoSai.PrepareHealthBarPrefab(),
            WZSJZ_Boss_LaoSai.PrepareTenacityBarPrefab(),
        ]);
        if (token !== this._initializeToken || !this.IsAlive
            || !this._healthBarLayer?.isValid) {
            return;
        }
        const healthAnchor = this.node.getChildByName("血条位置");
        const tenacityAnchor = this.node.getChildByName("韧性条位置");
        if (healthPrefab && healthAnchor) {
            const node = instantiate(healthPrefab);
            node.name = `${this.node.name}_血条`;
            node.setParent(this._healthBarLayer);
            this.SetLayerRecursively(node, this._healthBarLayer.layer);
            (node.getComponent(WZSJZ_BossHealthBar)
                || node.addComponent(WZSJZ_BossHealthBar)).Configure(this, healthAnchor);
        }
        if (tenacityPrefab && tenacityAnchor) {
            const node = instantiate(tenacityPrefab);
            node.name = `${this.node.name}_韧性条`;
            node.setParent(this._healthBarLayer);
            this.SetLayerRecursively(node, this._healthBarLayer.layer);
            (node.getComponent(WZSJZ_BossTenacityBar)
                || node.addComponent(WZSJZ_BossTenacityBar)).Configure(this, tenacityAnchor);
        }
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
        }
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
                this._attackState = "none";
                this._normalAttackTimer = this.EnemyConfig.AttackInterval;
            }
            return;
        }

        const times = WZSJZ_Boss_LaoSai.SKILL_ARROW_TIMES;
        while (this._firedArrowCount < times.length
            && this._attackElapsed >= times[this._firedArrowCount]) {
            this._firedArrowCount++;
            this.SpawnArrow(WZSJZ_Constant.BossLaoSai.SkillArrowDamage);
        }
        if (this._firedArrowCount >= times.length) {
            this._attackState = "none";
            this._normalAttackTimer = this.EnemyConfig.AttackInterval;
            this.ResetSkillTimer();
        }
    }

    private async SpawnArrow(damage: number): Promise<void> {
        const firePoint = this.node.getChildByName("子弹发射点");
        const fireWorldPosition = (firePoint || this.node).worldPosition.clone();
        const prefab = await WZSJZ_Boss_LaoSai.PrepareArrowPrefab();
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
        this._nextSkillTimer = config.SkillMinInterval
            + Math.random() * Math.max(0, config.SkillMaxInterval - config.SkillMinInterval);
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
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

    private static async PrepareHealthBarPrefab(): Promise<Prefab> {
        if (this._healthBarPrefab) {
            return this._healthBarPrefab;
        }
        if (!this._healthBarLoading) {
            this._healthBarLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossLaoSai.HealthBarPrefabPath,
            ).then((prefab) => this._healthBarPrefab = prefab).catch((error) => {
                this._healthBarLoading = null;
                console.error("[WZSJZ] Boss血条预制体加载失败。", error);
                return null;
            });
        }
        return this._healthBarLoading;
    }

    private static async PrepareTenacityBarPrefab(): Promise<Prefab> {
        if (this._tenacityBarPrefab) {
            return this._tenacityBarPrefab;
        }
        if (!this._tenacityBarLoading) {
            this._tenacityBarLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossLaoSai.TenacityBarPrefabPath,
            ).then((prefab) => this._tenacityBarPrefab = prefab).catch((error) => {
                this._tenacityBarLoading = null;
                console.error("[WZSJZ] Boss韧性条预制体加载失败。", error);
                return null;
            });
        }
        return this._tenacityBarLoading;
    }

    private static RecycleArrow = (arrow: WZSJZ_BossBullet_LaoSai): void => {
        if (arrow?.node?.isValid) {
            WZSJZ_Boss_LaoSai._arrowPool.put(arrow.node);
        }
    };

}
