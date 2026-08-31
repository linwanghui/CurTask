import { _decorator, instantiate, Node, NodePool, Prefab, UITransform, Vec3 } from 'cc';
import { WZSJZ_Boss } from './WZSJZ_Boss';
import { WZSJZ_Boss_LaoTaiTank } from './WZSJZ_Boss_LaoTaiTank';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EnemyBulletPool } from './WZSJZ_EnemyBulletPool';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';
type LaoTaiAttackState = "none" | "normal" | "skill";

const { ccclass } = _decorator;



@ccclass('WZSJZ_Boss_LaoTai')
export class WZSJZ_Boss_LaoTai extends WZSJZ_Boss {
    private static _tankPrefab: Prefab = null;
    private static _tankLoading: Promise<Prefab> = null;
    private static readonly _tankPool: NodePool = new NodePool();

    private _projectileLayer: Node = null;
    private _attackState: LaoTaiAttackState = "none";
    private _attackElapsed: number = 0;
    private _normalAttackTimer: number = 0;
    private _nextSkillTimer: number = 0;
    private _actionTriggered: boolean = false;

    protected GetBossConfig() {
        return WZSJZ_Constant.BossLaoTai;
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
        void WZSJZ_Boss_LaoTai.PrepareTankPrefab();
        return true;
    }

    protected UpdateAttack(deltaTime: number): void {
        const config = WZSJZ_Constant.BossLaoTai;
        this._nextSkillTimer = Math.max(0, this._nextSkillTimer - deltaTime);
        if (this._attackState !== "none") {
            this._attackElapsed += deltaTime;
            if (this._attackState === "normal") {
                if (!this._actionTriggered && this._attackElapsed >= config.NormalFireDelay) {
                    this._actionTriggered = true;
                    void this.FireBullet();
                }
                if (this._attackElapsed >= config.NormalAnimationDuration) {
                    this.FinishAttack(false);
                }
            } else {
                if (!this._actionTriggered && this._attackElapsed >= config.TankSummonDelay) {
                    this._actionTriggered = true;
                    void this.SummonTanks();
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

    private BeginAttack(state: LaoTaiAttackState): void {
        this._attackState = state;
        this._attackElapsed = 0;
        this._actionTriggered = false;
        this.PlayAnimation(
            state === "skill"
                ? WZSJZ_Constant.BossLaoTai.SkillAnimation
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
        this.PlayAnimation(WZSJZ_Constant.BossLaoTai.IdleAnimation, true, true);
    }

    private async FireBullet(): Promise<void> {
        if (!this.IsAlive || !this.Wall?.IsAlive || !this._projectileLayer?.isValid) return;
        await WZSJZ_EnemyBulletPool.Spawn(
            this._projectileLayer,
            this.GetLaunchPoint().worldPosition.clone(),
            this.Wall,
            this.GetOutgoingAttackDamage(this.EnemyConfig.AttackDamage),
        );
    }

    private async SummonTanks(): Promise<void> {
        const prefab = await WZSJZ_Boss_LaoTai.PrepareTankPrefab();
        const enemyArea = this.node.parent;
        if (!prefab || !this.IsAlive || !this.Wall?.IsAlive
            || !enemyArea?.isValid || !this._projectileLayer?.isValid) return;
        const config = WZSJZ_Constant.BossLaoTai;
        const areaTransform = enemyArea.getComponent(UITransform);
        for (const direction of [1, -1]) {
            let spawnWorld = new Vec3(
                this.node.worldPosition.x + 800,
                this.node.worldPosition.y + direction * config.TankVerticalOffset,
                this.node.worldPosition.z,
            );
            let targetWorld = new Vec3(
                this.node.worldPosition.x,
                this.node.worldPosition.y + direction * config.TankVerticalOffset,
                this.node.worldPosition.z,
            );
            if (areaTransform) {
                const size = areaTransform.contentSize;
                const anchor = areaTransform.anchorPoint;
                const bossLocal = areaTransform.convertToNodeSpaceAR(this.node.worldPosition);
                const minY = -size.height * anchor.y + config.TankAreaEdgePadding;
                const maxY = size.height * (1 - anchor.y) - config.TankAreaEdgePadding;
                const targetY = Math.max(
                    minY,
                    Math.min(maxY, bossLocal.y + direction * config.TankVerticalOffset),
                );
                const rightX = size.width * (1 - anchor.x) - config.TankSpawnEdgePadding;
                spawnWorld = areaTransform.convertToWorldSpaceAR(new Vec3(rightX, targetY, 0));
                targetWorld = areaTransform.convertToWorldSpaceAR(
                    new Vec3(bossLocal.x, targetY, 0),
                );
            }
            this.SpawnTank(prefab, enemyArea, spawnWorld, targetWorld);
        }
        this.SortEnemyRenderOrder(enemyArea);
    }

    private SpawnTank(
        prefab: Prefab,
        enemyArea: Node,
        spawnWorld: Vec3,
        targetWorld: Vec3,
    ): void {
        const config = WZSJZ_Constant.BossLaoTai;
        const node = WZSJZ_Boss_LaoTai._tankPool.get() || instantiate(prefab);
        node.setParent(enemyArea);
        node.setWorldPosition(spawnWorld);
        this.SetTankLayerRecursively(node, enemyArea.layer);
        const tank = node.getComponent(WZSJZ_Boss_LaoTaiTank);
        if (!tank?.Initialize(
            targetWorld,
            this.Wall,
            this._projectileLayer,
            config.TankMoveSpeed * this.RuntimeStatMultiplier,
            config.TankArrivalDistance,
            this.GetOutgoingAttackDamage(config.TankAttackDamage),
            this.ScaleDuration(config.TankAttackInterval),
            config.TankFireDelay,
            config.TankAttackAnimationDuration,
            config.TankAttackCount,
            config.TankEnterAnimation,
            config.TankIdleAnimation,
            config.TankAttackAnimation,
            config.TankDeathAnimation,
            config.TankDeathFallbackDuration,
            WZSJZ_Boss_LaoTai.RecycleTank,
        )) {
            node.active = false;
            WZSJZ_Boss_LaoTai._tankPool.put(node);
        }
    }

    private GetLaunchPoint(): Node {
        for (const name of WZSJZ_Constant.BossLaoTai.LaunchPointNames) {
            const point = this.node.getChildByName(name);
            if (point) return point;
        }
        return this.node;
    }

    private ResetSkillTimer(): void {
        const config = WZSJZ_Constant.BossLaoTai;
        this._nextSkillTimer = this.ScaleDuration(
            config.SkillMinInterval
                + Math.random() * Math.max(0, config.SkillMaxInterval - config.SkillMinInterval),
        );
    }

    private SortEnemyRenderOrder(enemyArea: Node): void {
        [...enemyArea.children]
            .sort((first, second) => second.worldPosition.y - first.worldPosition.y)
            .forEach((child, index) => child.setSiblingIndex(index));
    }

    private SetTankLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) this.SetTankLayerRecursively(child, layer);
    }

    private static async PrepareTankPrefab(): Promise<Prefab> {
        if (this._tankPrefab) return this._tankPrefab;
        if (!this._tankLoading) {
            this._tankLoading = WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BossLaoTai.TankPrefabPath,
            ).then((prefab) => {
                this._tankPrefab = prefab;
                while (this._tankPool.size()
                    < WZSJZ_Constant.ObjectPool.BossLaoTaiTankPrewarm) {
                    this._tankPool.put(instantiate(prefab));
                }
                return prefab;
            }).catch((error) => {
                this._tankLoading = null;
                console.error("[WZSJZ] 牢太战车预制体加载失败。", error);
                return null;
            });
        }
        return this._tankLoading;
    }

    private static RecycleTank = (tank: WZSJZ_Boss_LaoTaiTank): void => {
        if (!tank?.node?.isValid) return;
        tank.node.active = false;
        WZSJZ_Boss_LaoTai._tankPool.put(tank.node);
    };

}
