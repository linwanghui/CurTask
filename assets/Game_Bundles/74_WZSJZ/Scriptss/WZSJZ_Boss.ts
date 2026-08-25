import { _decorator, instantiate, Node, Prefab, Vec3 } from 'cc';
import { WZSJZ_BossConfig, WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_BossHealthBar } from './WZSJZ_BossHealthBar';
import { WZSJZ_BossTenacityBar } from './WZSJZ_BossTenacityBar';

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

    public get CurrentTenacity(): number {
        return this._currentTenacity;
    }

    public get MaxTenacity(): number {
        return this._bossConfig?.MaxTenacity || 1;
    }

    /** 子类只需返回自己的Boss数值配置。 */
    protected GetBossConfig(): WZSJZ_BossConfig {
        return null;
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
        this._bossConfig = this.GetBossConfig();
        if (!this._bossConfig) {
            console.error(`[WZSJZ] ${this.node.name} 缺少Boss专属配置。`);
            return false;
        }
        this._healthBarLayer = healthBarLayer;
        this._currentTenacity = this.MaxTenacity;
        this._tenacityRecoveryTimer = 0;
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
        this.ResetTenacityRecoveryTimer();
        return true;
    }

    private StartTenacityBreak(): void {
        this.ResetTenacityRecoveryTimer();
        this.ApplyStun(WZSJZ_Constant.BossCommon.TenacityBreakStunDuration);
    }

    private ResetTenacityRecoveryTimer(): void {
        this._tenacityRecoveryTimer = Math.max(
            this._bossConfig.TenacityRecoveryDelay,
            WZSJZ_Constant.BossCommon.TenacityBreakStunDuration,
        );
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
