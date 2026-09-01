import {
    _decorator,
    Animation,
    Component,
    instantiate,
    Node,
    NodePool,
    Prefab,
    sp,
    UITransform,
    Vec3,
} from 'cc';
import { WZSJZ_Bullet } from './WZSJZ_Bullet';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_Mine } from './WZSJZ_Mine';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';
import { WZSJZ_Boss } from './WZSJZ_Boss';
const { ccclass } = _decorator;

/** 战斗域：统一管理刷怪、索敌、攻击表现和所有战斗对象池。 */
@ccclass('WZSJZ_CombatSystem')
export class WZSJZ_CombatSystem extends Component {
    private static _instance: WZSJZ_CombatSystem = null;
    public static get Instance(): WZSJZ_CombatSystem {
        return this._instance;
    }

    private _canvas: Node = null;
    private _dragLayer: Node = null;
    private _enemyArea: Node = null;
    private _projectileLayer: Node = null;
    private _enemyProjectileLayer: Node = null;
    private _healthBarLayer: Node = null;
    private _trapLayer: Node = null;
    private _wall: WZSJZ_Wall = null;
    private _enemyPrefabs: Prefab[] = [];
    private _gunBulletPrefab: Prefab = null;
    private _cannonBulletPrefab: Prefab = null;
    private _minePrefab: Prefab = null;
    private _knifeEffectPrefab: Prefab = null;
    private _redDogAttackEffectPrefab: Prefab = null;
    private _isGameStarted: boolean = false;
    private _isBatchEnemySpawning: boolean = false;
    private _pendingEnemySpawnCallback: (() => void) | null = null;
    private _enemyPools: Map<string, NodePool> = new Map();
    private _gunBulletPool: NodePool = new NodePool();
    private _cannonBulletPool: NodePool = new NodePool();
    private _minePool: NodePool = new NodePool();
    private _knifeEffectPool: NodePool = new NodePool();
    private _redDogAttackEffectPool: NodePool = new NodePool();
    private _ownerMines: Map<WZSJZ_GameNode, Set<WZSJZ_Mine>> = new Map();
    private _mineOwners: Map<WZSJZ_Mine, WZSJZ_GameNode> = new Map();
    private _mineUnitsOnField: Set<WZSJZ_GameNode> = new Set();
    private _pendingWeaponAttacks: Map<WZSJZ_GameNode, number> = new Map();
    private _weaponAttackToken: number = 0;

    protected onLoad(): void {
        WZSJZ_CombatSystem._instance = this;
        this.node.on(WZSJZ_EventManager.游戏开始, this.OnGameStart, this);
        this.node.on(WZSJZ_EventManager.战斗阶段变动, this.OnCombatPhaseChanged, this);
        this.node.on(WZSJZ_EventManager.修改添加敌人, this.OnCheatAddEnemy, this);
        this.node.on(
            WZSJZ_EventManager.修改批量生成小怪,
            this.OnCheatToggleBatchEnemySpawning,
            this,
        );
    }

    protected onDestroy(): void {
        if (this._pendingEnemySpawnCallback) {
            this.unschedule(this._pendingEnemySpawnCallback);
            this._pendingEnemySpawnCallback = null;
        }
        for (const pool of this._enemyPools.values()) {
            pool.clear();
        }
        this._enemyPools.clear();
        this._gunBulletPool.clear();
        this._cannonBulletPool.clear();
        this._minePool.clear();
        this._knifeEffectPool.clear();
        this._redDogAttackEffectPool.clear();
        this._ownerMines.clear();
        this._mineOwners.clear();
        this._mineUnitsOnField.clear();
        this._pendingWeaponAttacks.clear();
        if (WZSJZ_CombatSystem._instance === this) {
            WZSJZ_CombatSystem._instance = null;
        }
    }

    public Configure(canvas: Node, dragLayer: Node): void {
        this._canvas = canvas;
        this._dragLayer = dragLayer;
        this._enemyArea = canvas?.getChildByName("敌方单位");
        this.SetupProjectileLayer();
        this.SetupEnemyProjectileLayer();
        this._healthBarLayer = this._canvas?.getChildByName("血条区") || null;
        this.SetupTrapLayer();
        void this.PrepareGunBulletPrefab();
        void this.PrepareCannonBulletPrefab();
        void this.PrepareMinePrefab();
        void this.PrepareKnifeEffectPrefab();
        void this.PrepareRedDogAttackEffectPrefab();
    }

    private OnGameStart(wall: WZSJZ_Wall): void {
        this._wall = wall;
    }

    private OnCombatPhaseChanged(active: boolean): void {
        this._isGameStarted = !!active;
        if (!this._isGameStarted) {
            this.CancelNextEnemySpawn();
            // 延迟攻击回调仍会执行，但找不到对应token后不会产生子弹或地雷。
            this._pendingWeaponAttacks.clear();
            return;
        }
        if (this._isBatchEnemySpawning) {
            void this.PrepareEnemySpawning();
        }
    }

    private OnCheatToggleBatchEnemySpawning(): void {
        if (!this._isGameStarted || !this._wall) {
            WZSJZ_UIManager.Instance.ShowText('请先开始游戏再生成小怪');
            return;
        }
        this._isBatchEnemySpawning = !this._isBatchEnemySpawning;
        if (!this._isBatchEnemySpawning) {
            this.CancelNextEnemySpawn();
            WZSJZ_UIManager.Instance.ShowText('已停止批量生成小怪');
            return;
        }
        WZSJZ_UIManager.Instance.ShowText('已开启批量生成小怪');
        void this.PrepareEnemySpawning();
    }

    private async PrepareEnemySpawning(): Promise<void> {
        await this.EnsureNormalEnemyPrefabs();
        if (!this._isGameStarted || !this._isBatchEnemySpawning || !this.node?.isValid) {
            return;
        }
        if (!this._enemyArea || !this._wall || this._enemyPrefabs.length === 0) {
            console.error("[WZSJZ] 无法开始刷怪：请检查敌方单位区域、围墙和敌人预制体。");
            WZSJZ_UIManager.Instance.ShowText("敌人资源加载失败");
            return;
        }
        this.PrewarmEnemyPools();
        this.ScheduleNextEnemySpawn();
    }

    private ScheduleNextEnemySpawn(): void {
        if (!this._isGameStarted || !this._isBatchEnemySpawning) {
            return;
        }
        const spawn = WZSJZ_Constant.EnemySpawn;
        const delay = spawn.MinInterval
            + Math.random() * Math.max(0, spawn.MaxInterval - spawn.MinInterval);
        const callback = (): void => {
            if (this._pendingEnemySpawnCallback !== callback) {
                return;
            }
            this._pendingEnemySpawnCallback = null;
            this.SpawnEnemy();
        };
        this._pendingEnemySpawnCallback = callback;
        this.scheduleOnce(callback, delay);
    }

    private SpawnEnemy(): void {
        if (!this._isGameStarted || !this._isBatchEnemySpawning
            || !this._enemyArea || this._enemyPrefabs.length === 0) {
            return;
        }
        const prefab = this._enemyPrefabs[Math.floor(Math.random() * this._enemyPrefabs.length)];
        this.SpawnEnemyFromPrefab(prefab);
        this.ScheduleNextEnemySpawn();
    }

    private CancelNextEnemySpawn(): void {
        if (!this._pendingEnemySpawnCallback) {
            return;
        }
        this.unschedule(this._pendingEnemySpawnCallback);
        this._pendingEnemySpawnCallback = null;
    }

    private SpawnEnemyFromPrefab(
        prefab: Prefab,
        statMultiplier: number = 1,
    ): WZSJZ_Enemy | null {
        if (!prefab || !this._enemyArea || !this._wall) {
            return null;
        }
        const enemyName = prefab.data.name;
        const enemyConfig = WZSJZ_Constant.GetEnemyConfig(enemyName);
        const pool = this.GetEnemyPool(prefab.data.name);
        const enemyNode = pool.get() || instantiate(prefab);
        enemyNode.active = true;
        enemyNode.setParent(this._enemyArea);

        const areaTransform = this._enemyArea.getComponent(UITransform);
        if (areaTransform) {
            const size = areaTransform.contentSize;
            const anchor = areaTransform.anchorPoint;
            const padding = WZSJZ_Constant.EnemySpawn.EdgePadding;
            const minX = -size.width * anchor.x + padding;
            const maxX = size.width * (1 - anchor.x) - padding;
            const minY = -size.height * anchor.y + padding;
            const maxY = size.height * (1 - anchor.y) - padding;
            if (enemyConfig?.SpawnPositionMode === "center") {
                enemyNode.setPosition((minX + maxX) * 0.5, (minY + maxY) * 0.5, 0);
            } else {
                enemyNode.setPosition(
                    minX + Math.random() * Math.max(0, maxX - minX),
                    minY + Math.random() * Math.max(0, maxY - minY),
                    0,
                );
            }
        }

        const enemy = enemyNode.getComponent(WZSJZ_Enemy);
        if (!enemy?.Initialize(
            this._wall,
            this.RecycleEnemy,
            this._enemyProjectileLayer,
            this._healthBarLayer,
            statMultiplier,
        )) {
            pool.put(enemyNode);
            return null;
        } else {
            this.SortEnemyRenderOrder();
        }
        return enemy;
    }

    public async PrepareStageEnemyPrefabs(): Promise<boolean> {
        await this.EnsureNormalEnemyPrefabs();
        if (this._enemyPrefabs.length > 0) this.PrewarmEnemyPools();
        return this._enemyPrefabs.length > 0;
    }

    public SpawnStageNormalEnemy(statMultiplier: number): WZSJZ_Enemy | null {
        if (!this._isGameStarted || this._enemyPrefabs.length === 0) return null;
        const prefab = this._enemyPrefabs[Math.floor(Math.random() * this._enemyPrefabs.length)];
        return this.SpawnEnemyFromPrefab(prefab, statMultiplier);
    }

    public async SpawnStageBoss(
        bossName: string,
        statMultiplier: number,
    ): Promise<WZSJZ_Boss | null> {
        const path = WZSJZ_Constant.EnemyPrefabPathByName[bossName];
        if (!path || !this._isGameStarted) return null;
        try {
            const prefab = await WZSJZ_Incident.Loadprefab(path);
            const enemy = this.SpawnEnemyFromPrefab(prefab, statMultiplier);
            const boss = enemy?.node.getComponent(WZSJZ_Boss) || null;
            if (enemy && !boss) enemy.RecycleImmediately();
            return boss;
        } catch (error) {
            console.error(`[WZSJZ] 关卡Boss加载失败：${bossName}`, error);
            return null;
        }
    }

    public ClearStageEnemies(except: WZSJZ_Enemy = null): void {
        for (const child of [...(this._enemyArea?.children || [])]) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (enemy && enemy !== except) enemy.RecycleImmediately();
        }
    }

    private async EnsureNormalEnemyPrefabs(): Promise<void> {
        if (this._enemyPrefabs.length > 0) return;
        const loadedPrefabs: Prefab[] = [];
        for (const path of WZSJZ_Constant.EnemyPrefabPaths) {
            try {
                loadedPrefabs.push(await WZSJZ_Incident.Loadprefab(path));
            } catch (error) {
                console.error(`[WZSJZ] 敌人预制体加载失败：${path}`, error);
            }
        }
        this._enemyPrefabs = loadedPrefabs;
    }

    private OnCheatAddEnemy = async (enemyName: string): Promise<void> => {
        const name = (enemyName || '').trim();
        const path = WZSJZ_Constant.EnemyPrefabPathByName[name];
        if (!path) {
            WZSJZ_UIManager.Instance.ShowText(`没有找到敌人：${name}`);
            return;
        }
        if (!this._isGameStarted || !this._wall) {
            WZSJZ_UIManager.Instance.ShowText('请先开始游戏再添加敌人');
            return;
        }
        try {
            const prefab = await WZSJZ_Incident.Loadprefab(path);
            if (this.SpawnEnemyFromPrefab(prefab)) {
                WZSJZ_UIManager.Instance.ShowText(`已添加敌人：${name}`);
            }
        } catch (error) {
            console.error(`[WZSJZ] 手动加载敌人失败：${path}`, error);
            WZSJZ_UIManager.Instance.ShowText(`敌人加载失败：${name}`);
        }
    };

    public GetEnemyProjectileLayer(): Node {
        return this._enemyProjectileLayer;
    }

    /** 俯视遮挡规则：Y越低越靠近镜头，因此放到更大的兄弟索引。 */
    private SortEnemyRenderOrder(): void {
        if (!this._enemyArea) {
            return;
        }
        const enemies = [...this._enemyArea.children].sort(
            (first, second) => second.worldPosition.y - first.worldPosition.y,
        );
        enemies.forEach((enemyNode, index) => enemyNode.setSiblingIndex(index));
    }

    private GetEnemyPool(enemyName: string): NodePool {
        let pool = this._enemyPools.get(enemyName);
        if (!pool) {
            pool = new NodePool();
            this._enemyPools.set(enemyName, pool);
        }
        return pool;
    }

    private PrewarmEnemyPools(): void {
        for (const prefab of this._enemyPrefabs) {
            const pool = this.GetEnemyPool(prefab.data.name);
            while (pool.size() < WZSJZ_Constant.ObjectPool.EnemyPrewarmPerType) {
                pool.put(instantiate(prefab));
            }
        }
    }

    private RecycleEnemy = (enemy: WZSJZ_Enemy): void => {
        if (!enemy?.node?.isValid) {
            return;
        }
        enemy.unscheduleAllCallbacks();
        this.GetEnemyPool(enemy.node.name).put(enemy.node);
    };

    private async PrepareGunBulletPrefab(): Promise<void> {
        try {
            this._gunBulletPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.GunBullet.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 枪子弹预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._gunBulletPrefab) {
            return;
        }
        while (this._gunBulletPool.size() < WZSJZ_Constant.ObjectPool.GunBulletPrewarm) {
            this._gunBulletPool.put(instantiate(this._gunBulletPrefab));
        }
    }

    private async PrepareKnifeEffectPrefab(): Promise<void> {
        try {
            this._knifeEffectPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.KnifeEffect.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 刀特效预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._knifeEffectPrefab) {
            return;
        }
        while (this._knifeEffectPool.size() < WZSJZ_Constant.ObjectPool.KnifeEffectPrewarm) {
            this._knifeEffectPool.put(instantiate(this._knifeEffectPrefab));
        }
    }

    private async PrepareRedDogAttackEffectPrefab(): Promise<void> {
        try {
            this._redDogAttackEffectPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.RedDogAttackEffect.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 红狗普通攻击特效预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._redDogAttackEffectPrefab) {
            return;
        }
        while (this._redDogAttackEffectPool.size()
            < WZSJZ_Constant.ObjectPool.RedDogAttackEffectPrewarm) {
            this._redDogAttackEffectPool.put(instantiate(this._redDogAttackEffectPrefab));
        }
    }

    private async PrepareCannonBulletPrefab(): Promise<void> {
        try {
            this._cannonBulletPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.CannonBullet.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 炮子弹预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._cannonBulletPrefab) {
            return;
        }
        while (this._cannonBulletPool.size() < WZSJZ_Constant.ObjectPool.CannonBulletPrewarm) {
            this._cannonBulletPool.put(instantiate(this._cannonBulletPrefab));
        }
    }

    private async PrepareMinePrefab(): Promise<void> {
        try {
            this._minePrefab = await WZSJZ_Incident.Loadprefab(WZSJZ_Constant.Mine.PrefabPath);
        } catch (error) {
            console.error("[WZSJZ] 地雷预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._minePrefab) {
            return;
        }
        while (this._minePool.size() < WZSJZ_Constant.ObjectPool.MinePrewarm) {
            this._minePool.put(instantiate(this._minePrefab));
        }
    }

    public UpdateGun(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        if (this.UpdatePendingWeaponAttack(gameNode, deltaTime)) {
            return;
        }
        const config = this.GetReadyWeaponConfig(gameNode, deltaTime, true);
        if (!config) {
            return;
        }
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, gameNode.GetAttackRange());
        if (!target) {
            return;
        }
        this.BeginWeaponAttack(gameNode, config.AttackInterval, () => {
            const currentConfig = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
            if (!currentConfig?.AttackDamage || !currentConfig.BulletSpeed || !currentConfig.AttackRange) {
                return;
            }
            const currentTarget = this.FindNearestEnemy(gameNode.node.worldPosition, gameNode.GetAttackRange());
            if (currentTarget) {
                this.SpawnGunBullet(gameNode, currentTarget, gameNode.GetAttackDamage(), currentConfig.BulletSpeed);
            }
        });
    }

    public UpdateKnife(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        if (this.UpdatePendingWeaponAttack(gameNode, deltaTime)) {
            return;
        }
        const config = this.GetReadyWeaponConfig(gameNode, deltaTime, false);
        if (!config) {
            return;
        }
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, gameNode.GetAttackRange());
        if (!target) {
            return;
        }
        this.BeginWeaponAttack(gameNode, config.AttackInterval, () => {
            const currentConfig = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
            if (!currentConfig?.AttackDamage || !currentConfig.AttackRange) {
                return;
            }
            const currentTarget = this.FindNearestEnemy(gameNode.node.worldPosition, gameNode.GetAttackRange());
            if (currentTarget && this.SpawnKnifeEffect(currentTarget)) {
                currentTarget.TakeDamage(gameNode.GetAttackDamage());
            }
        });
    }

    public UpdateRedDog(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        if (this.UpdatePendingWeaponAttack(gameNode, deltaTime)) {
            return;
        }
        const config = this.GetReadyWeaponConfig(gameNode, deltaTime, false);
        if (!config) {
            return;
        }
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, gameNode.GetAttackRange());
        if (!target) {
            return;
        }
        this.BeginWeaponAttack(gameNode, config.AttackInterval, () => {
            const currentConfig = WZSJZ_Constant.GetMaterialLevelConfig(
                gameNode.Name,
                gameNode.Level,
            );
            if (!currentConfig?.AttackDamage || !currentConfig.AttackRange) {
                return;
            }
            const currentTarget = this.FindNearestEnemy(
                gameNode.node.worldPosition,
                gameNode.GetAttackRange(),
            );
            if (!currentTarget || !this.SpawnRedDogAttackEffect(currentTarget)) {
                return;
            }
            if (currentTarget.TakeDamage(gameNode.GetAttackDamage())) {
                gameNode.CreateExperienceReceiver()(
                    WZSJZ_Constant.RedDogAttackEffect.KillExperience,
                );
            }
        });
    }

    public UpdateCannon(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        if (this.UpdatePendingWeaponAttack(gameNode, deltaTime)) {
            return;
        }
        const config = this.GetReadyWeaponConfig(gameNode, deltaTime, true);
        if (!config?.AreaRadius) {
            return;
        }
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, gameNode.GetAttackRange());
        if (!target) {
            return;
        }
        this.BeginWeaponAttack(gameNode, config.AttackInterval, () => {
            const currentConfig = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
            if (!currentConfig?.AttackDamage || !currentConfig.BulletSpeed
                || !currentConfig.AttackRange || !currentConfig.AreaRadius) {
                return;
            }
            // 前摇期间原目标可能死亡或离开范围，发射帧重新索敌。
            const currentTarget = this.FindNearestEnemy(
                gameNode.node.worldPosition,
                gameNode.GetAttackRange(),
            );
            if (currentTarget) {
                this.SpawnCannonBullet(
                    gameNode,
                    currentTarget,
                    gameNode.GetAttackDamage(),
                    currentConfig.BulletSpeed,
                    currentConfig.AreaRadius,
                );
            }
        });
    }

    public UpdateMineLayer(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        if (gameNode.CurrentCell?.Zone !== "formation") {
            this.CancelPendingWeaponAttack(gameNode);
            this.RemoveMinesByOwner(gameNode);
            return;
        }
        if (!this._isGameStarted) {
            return;
        }
        // 拖动过程中先保留已有地雷和当前冷却，落到非布阵区后再统一清理。
        if (gameNode.IsDragging) {
            return;
        }
        if (this.UpdatePendingWeaponAttack(gameNode, deltaTime)) {
            return;
        }
        const config = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
        if (!config?.AreaRadius || !config.TriggerRadius) {
            return;
        }
        // 首次上场或重新上场先进入完整CD，不立即生成地雷。
        if (!this._mineUnitsOnField.has(gameNode)) {
            this._mineUnitsOnField.add(gameNode);
            gameNode.StartAttackCooldown(config.AttackInterval);
            return;
        }
        gameNode.ReduceAttackCooldown(deltaTime);
        if (!gameNode.IsAttackReady()) {
            return;
        }
        this.BeginWeaponAttack(gameNode, config.AttackInterval, () => {
            const currentConfig = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
            if (!currentConfig?.AttackDamage || !currentConfig.TriggerRadius || !currentConfig.AreaRadius) {
                return;
            }
            this.SpawnMine(
                gameNode,
                gameNode.GetAttackDamage(),
                currentConfig.TriggerRadius,
                currentConfig.AreaRadius,
            );
        });
    }

    private GetReadyWeaponConfig(
        gameNode: WZSJZ_GameNode,
        deltaTime: number,
        needsBullet: boolean,
    ) {
        if (!this._isGameStarted) {
            return null;
        }
        if (gameNode.IsDragging || gameNode.CurrentCell?.Zone !== "formation") {
            gameNode.ResetAttackCooldown();
            return null;
        }
        const config = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
        if (!config?.AttackDamage || !config.AttackInterval || !config.AttackRange
            || (needsBullet && !config.BulletSpeed)) {
            return null;
        }
        gameNode.ReduceAttackCooldown(deltaTime);
        return gameNode.IsAttackReady() ? config : null;
    }

    private FinishWeaponAttack(gameNode: WZSJZ_GameNode, interval: number): void {
        gameNode.StartAttackCooldown(gameNode.GetAttackInterval(interval));
        gameNode.PlayAttackAnimation(interval);
    }

    private BeginWeaponAttack(
        gameNode: WZSJZ_GameNode,
        interval: number,
        fireAction: () => void,
    ): void {
        this.FinishWeaponAttack(gameNode, interval);
        const delay = gameNode.GetAttackFireDelay(
            WZSJZ_Constant.GetAttackFireDelay(gameNode.Name),
        );
        if (delay <= 0) {
            fireAction();
            return;
        }
        const token = ++this._weaponAttackToken;
        this._pendingWeaponAttacks.set(gameNode, token);
        this.scheduleOnce(() => {
            if (this._pendingWeaponAttacks.get(gameNode) !== token) {
                return;
            }
            this._pendingWeaponAttacks.delete(gameNode);
            if (this.CanCompleteDelayedAttack(gameNode)) {
                fireAction();
            }
        }, delay);
    }

    private UpdatePendingWeaponAttack(gameNode: WZSJZ_GameNode, deltaTime: number): boolean {
        if (!this._pendingWeaponAttacks.has(gameNode)) {
            return false;
        }
        if (!this.CanCompleteDelayedAttack(gameNode)) {
            this.CancelPendingWeaponAttack(gameNode);
        } else {
            // 前摇属于本次攻击间隔的一部分，等待实际生效时冷却仍继续流逝。
            gameNode.ReduceAttackCooldown(deltaTime);
        }
        return true;
    }

    private CancelPendingWeaponAttack(gameNode: WZSJZ_GameNode): void {
        if (this._pendingWeaponAttacks.delete(gameNode)) {
            gameNode.ResetAttackCooldown();
        }
    }

    private CanCompleteDelayedAttack(gameNode: WZSJZ_GameNode): boolean {
        return this._isGameStarted
            && !!gameNode?.node?.isValid
            && !gameNode.IsDragging
            && gameNode.CurrentCell?.Zone === "formation";
    }

    private FindNearestEnemy(origin: Vec3, attackRange: number): WZSJZ_Enemy {
        let nearest: WZSJZ_Enemy = null;
        let nearestDistanceSquared = attackRange * attackRange;
        for (const child of this._enemyArea?.children || []) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) {
                continue;
            }
            const position = enemy.node.worldPosition;
            const deltaX = position.x - origin.x;
            const deltaY = position.y - origin.y;
            const distanceSquared = deltaX * deltaX + deltaY * deltaY;
            if (distanceSquared <= nearestDistanceSquared) {
                nearest = enemy;
                nearestDistanceSquared = distanceSquared;
            }
        }
        return nearest;
    }

    private SpawnGunBullet(
        gun: WZSJZ_GameNode,
        target: WZSJZ_Enemy,
        damage: number,
        speed: number,
    ): boolean {
        if (!this._gunBulletPrefab || !this._projectileLayer) {
            return false;
        }
        const bulletNode = this._gunBulletPool.get() || instantiate(this._gunBulletPrefab);
        bulletNode.active = true;
        bulletNode.setParent(this._projectileLayer);
        bulletNode.setWorldPosition((gun.node.getChildByName("图像") || gun.node).worldPosition);
        this.SetLayerRecursively(bulletNode, this._projectileLayer.layer);
        const bullet = bulletNode.getComponent(WZSJZ_Bullet);
        if (!bullet?.Initialize(target, damage, speed, this.RecycleGunBullet)) {
            this._gunBulletPool.put(bulletNode);
            return false;
        }
        WZSJZ_AudioManager.Play('枪发射', 0.52, 0.04);
        this.KeepCombatLayersOnTop();
        return true;
    }

    private RecycleGunBullet = (bullet: WZSJZ_Bullet): void => {
        if (bullet?.node?.isValid) {
            bullet.unscheduleAllCallbacks();
            this._gunBulletPool.put(bullet.node);
        }
    };

    private SpawnCannonBullet(
        cannon: WZSJZ_GameNode,
        target: WZSJZ_Enemy,
        damage: number,
        speed: number,
        radius: number,
    ): boolean {
        if (!this._cannonBulletPrefab || !this._projectileLayer) {
            return false;
        }
        const bulletNode = this._cannonBulletPool.get() || instantiate(this._cannonBulletPrefab);
        bulletNode.active = true;
        bulletNode.setParent(this._projectileLayer);
        bulletNode.setWorldPosition((cannon.node.getChildByName("图像") || cannon.node).worldPosition);
        this.SetLayerRecursively(bulletNode, this._projectileLayer.layer);
        const bullet = bulletNode.getComponent(WZSJZ_Bullet);
        if (!bullet?.Initialize(
            target,
            damage,
            speed,
            this.RecycleCannonBullet,
            (position, hitDamage) => this.ApplyAreaDamage(position, radius, hitDamage),
            WZSJZ_Constant.CannonBullet.HitDistance,
            WZSJZ_Constant.CannonBullet.HitEffectDuration,
            true,
            WZSJZ_Constant.CannonBullet.ArcHeight,
        )) {
            this._cannonBulletPool.put(bulletNode);
            return false;
        }
        WZSJZ_AudioManager.Play('炮发射', 0.72, 0.08);
        this.KeepCombatLayersOnTop();
        return true;
    }

    private RecycleCannonBullet = (bullet: WZSJZ_Bullet): void => {
        if (bullet?.node?.isValid) {
            bullet.unscheduleAllCallbacks();
            this._cannonBulletPool.put(bullet.node);
        }
    };

    private ApplyAreaDamage(center: Vec3, radius: number, damage: number): void {
        const radiusSquared = radius * radius;
        for (const child of [...(this._enemyArea?.children || [])]) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) {
                continue;
            }
            const position = enemy.node.worldPosition;
            const deltaX = position.x - center.x;
            const deltaY = position.y - center.y;
            if (deltaX * deltaX + deltaY * deltaY <= radiusSquared) {
                enemy.TakeDamage(damage);
            }
        }
    }

    private SpawnMine(
        owner: WZSJZ_GameNode,
        damage: number,
        triggerRadius: number,
        explosionRadius: number,
    ): boolean {
        if (!this._minePrefab || !this._trapLayer || !this._enemyArea || !this._wall) {
            return false;
        }
        const worldPosition = this.GetRandomMineWorldPosition();
        if (!worldPosition) {
            return false;
        }
        const mineNode = this._minePool.get() || instantiate(this._minePrefab);
        mineNode.active = true;
        mineNode.setParent(this._trapLayer);
        mineNode.setWorldPosition(worldPosition);
        mineNode.angle = 0;
        this.SetLayerRecursively(mineNode, this._trapLayer.layer);
        const mine = mineNode.getComponent(WZSJZ_Mine);
        if (!mine?.Initialize(
            this._enemyArea,
            damage,
            triggerRadius,
            explosionRadius,
            WZSJZ_Constant.Mine.Lifetime,
            WZSJZ_Constant.Mine.HitEffectDuration,
            (center, radius, hitDamage) => this.ApplyAreaDamage(center, radius, hitDamage),
            this.RecycleMine,
        )) {
            this._minePool.put(mineNode);
            return false;
        }
        let mines = this._ownerMines.get(owner);
        if (!mines) {
            mines = new Set<WZSJZ_Mine>();
            this._ownerMines.set(owner, mines);
        }
        mines.add(mine);
        this._mineOwners.set(mine, owner);
        return true;
    }

    private GetRandomMineWorldPosition(): Vec3 | null {
        const transform = this._enemyArea?.getComponent(UITransform);
        if (!transform || !this._wall) {
            return null;
        }
        const bounds = transform.getBoundingBoxToWorld();
        const enemyCenterX = this._enemyArea.worldPosition.x;
        const wallCenterX = this._wall.node.worldPosition.x;
        const side = enemyCenterX >= wallCenterX ? 1 : -1;
        const wallFrontX = this._wall.GetFrontWorldX(enemyCenterX);
        const nearX = wallFrontX + side * WZSJZ_Constant.Mine.MinDistanceFromWall;
        const farX = side > 0
            ? bounds.xMax - WZSJZ_Constant.Mine.FarEdgePadding
            : bounds.xMin + WZSJZ_Constant.Mine.FarEdgePadding;
        const minX = Math.min(nearX, farX);
        const maxX = Math.max(nearX, farX);
        const minY = bounds.yMin + WZSJZ_Constant.Mine.VerticalPadding;
        const maxY = bounds.yMax - WZSJZ_Constant.Mine.VerticalPadding;
        return new Vec3(
            minX + Math.random() * Math.max(0, maxX - minX),
            minY + Math.random() * Math.max(0, maxY - minY),
            this._trapLayer.worldPosition.z,
        );
    }

    private RecycleMine = (mine: WZSJZ_Mine): void => {
        if (mine?.node?.isValid) {
            const owner = this._mineOwners.get(mine);
            this._mineOwners.delete(mine);
            if (owner) {
                const mines = this._ownerMines.get(owner);
                mines?.delete(mine);
                if (mines?.size === 0) {
                    this._ownerMines.delete(owner);
                }
            }
            mine.unscheduleAllCallbacks();
            this._minePool.put(mine.node);
        }
    };

    public RemoveMinesByOwner(owner: WZSJZ_GameNode): void {
        this._mineUnitsOnField.delete(owner);
        const mines = this._ownerMines.get(owner);
        if (!mines || mines.size === 0) {
            return;
        }
        this._ownerMines.delete(owner);
        for (const mine of [...mines]) {
            this._mineOwners.delete(mine);
            mine.ForceRecycle();
        }
    }

    private SpawnKnifeEffect(target: WZSJZ_Enemy): boolean {
        if (!target?.IsAlive || !this._knifeEffectPrefab || !this._projectileLayer) {
            return false;
        }
        const effectNode = this._knifeEffectPool.get() || instantiate(this._knifeEffectPrefab);
        effectNode.active = true;
        effectNode.setParent(this._projectileLayer);
        const position = target.node.worldPosition;
        effectNode.setWorldPosition(
            position.x + WZSJZ_Constant.KnifeEffect.PositionOffsetX,
            position.y + WZSJZ_Constant.KnifeEffect.PositionOffsetY,
            position.z,
        );
        this.SetLayerRecursively(effectNode, this._projectileLayer.layer);
        const animation = effectNode.getChildByName("命中特效")?.getComponent(Animation);
        animation?.stop();
        animation?.play();
        WZSJZ_AudioManager.Play('近战挥砍', 0.58, 0.05);
        this.scheduleOnce(() => {
            if (effectNode.isValid) {
                animation?.stop();
                this._knifeEffectPool.put(effectNode);
            }
        }, WZSJZ_Constant.KnifeEffect.Duration);
        this.KeepCombatLayersOnTop();
        return true;
    }

    private SpawnRedDogAttackEffect(target: WZSJZ_Enemy): boolean {
        if (!target?.IsAlive || !this._redDogAttackEffectPrefab || !this._projectileLayer) {
            return false;
        }
        const effectNode = this._redDogAttackEffectPool.get()
            || instantiate(this._redDogAttackEffectPrefab);
        effectNode.active = true;
        effectNode.setParent(this._projectileLayer);
        const position = target.node.worldPosition;
        const config = WZSJZ_Constant.RedDogAttackEffect;
        effectNode.setWorldPosition(
            position.x + config.PositionOffsetX,
            position.y + config.PositionOffsetY,
            position.z,
        );
        effectNode.angle = 0;
        this.SetLayerRecursively(effectNode, this._projectileLayer.layer);
        const skeleton = effectNode.getComponent(sp.Skeleton)
            || effectNode.getComponentInChildren(sp.Skeleton);
        if (skeleton) {
            skeleton.clearTracks();
            skeleton.setAnimation(0, config.AnimationName, false);
        }
        WZSJZ_AudioManager.Play('近战挥砍', 0.62, 0.05);
        this.scheduleOnce(() => {
            if (effectNode?.isValid) {
                skeleton?.clearTracks();
                effectNode.active = false;
                this._redDogAttackEffectPool.put(effectNode);
            }
        }, config.Duration);
        this.KeepCombatLayersOnTop();
        return true;
    }

    private SetupProjectileLayer(): void {
        if (!this._canvas) {
            return;
        }
        this._projectileLayer = this._canvas.getChildByName("玩家投掷物");
        if (!this._projectileLayer) {
            this._projectileLayer = new Node("玩家投掷物");
            this._projectileLayer.layer = this._canvas.layer;
            this._projectileLayer.setParent(this._canvas);
            const transform = this._projectileLayer.addComponent(UITransform);
            const canvasTransform = this._canvas.getComponent(UITransform);
            if (canvasTransform) {
                transform.setContentSize(canvasTransform.contentSize);
                transform.setAnchorPoint(canvasTransform.anchorPoint);
            }
        }
    }

    private SetupEnemyProjectileLayer(): void {
        if (!this._canvas) {
            return;
        }
        this._enemyProjectileLayer = this._canvas.getChildByName("敌人投掷物");
        if (!this._enemyProjectileLayer) {
            this._enemyProjectileLayer = new Node("敌人投掷物");
            this._enemyProjectileLayer.layer = this._canvas.layer;
            this._enemyProjectileLayer.setParent(this._canvas);
            const transform = this._enemyProjectileLayer.addComponent(UITransform);
            const canvasTransform = this._canvas.getComponent(UITransform);
            if (canvasTransform) {
                transform.setContentSize(canvasTransform.contentSize);
                transform.setAnchorPoint(canvasTransform.anchorPoint);
            }
        }
    }

    private SetupTrapLayer(): void {
        if (!this._canvas) {
            return;
        }
        this._trapLayer = this._canvas.getChildByName("陷阱区");
        if (!this._trapLayer) {
            this._trapLayer = new Node("陷阱区");
            this._trapLayer.layer = this._canvas.layer;
            this._trapLayer.setParent(this._canvas);
            const transform = this._trapLayer.addComponent(UITransform);
            const canvasTransform = this._canvas.getComponent(UITransform);
            if (canvasTransform) {
                transform.setContentSize(canvasTransform.contentSize);
                transform.setAnchorPoint(canvasTransform.anchorPoint);
            }
        }
        // 同一Canvas中兄弟索引较小的节点先绘制，确保地雷位于敌方单位下层。
        if (this._enemyArea?.parent === this._trapLayer.parent) {
            const enemyIndex = this._enemyArea.getSiblingIndex();
            this._trapLayer.setSiblingIndex(Math.max(0, enemyIndex - 1));
        }
    }

    private KeepCombatLayersOnTop(): void {
        if (this._projectileLayer?.parent) {
            this._projectileLayer.setSiblingIndex(this._projectileLayer.parent.children.length - 1);
        }
        if (this._dragLayer?.parent) {
            this._dragLayer.setSiblingIndex(this._dragLayer.parent.children.length - 1);
        }
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }
}
