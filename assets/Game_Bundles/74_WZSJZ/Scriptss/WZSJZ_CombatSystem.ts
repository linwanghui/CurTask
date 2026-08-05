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
    private _trapLayer: Node = null;
    private _wall: WZSJZ_Wall = null;
    private _enemyPrefabs: Prefab[] = [];
    private _gunBulletPrefab: Prefab = null;
    private _cannonBulletPrefab: Prefab = null;
    private _minePrefab: Prefab = null;
    private _knifeEffectPrefab: Prefab = null;
    private _isGameStarted: boolean = false;
    private _pendingEnemySpawnCallback: (() => void) | null = null;
    private _enemyPools: Map<string, NodePool> = new Map();
    private _gunBulletPool: NodePool = new NodePool();
    private _cannonBulletPool: NodePool = new NodePool();
    private _minePool: NodePool = new NodePool();
    private _knifeEffectPool: NodePool = new NodePool();
    private _ownerMines: Map<WZSJZ_GameNode, Set<WZSJZ_Mine>> = new Map();
    private _mineOwners: Map<WZSJZ_Mine, WZSJZ_GameNode> = new Map();
    private _mineUnitsOnField: Set<WZSJZ_GameNode> = new Set();

    protected onLoad(): void {
        WZSJZ_CombatSystem._instance = this;
        this.node.on(WZSJZ_EventManager.游戏开始, this.OnGameStart, this);
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
        this._ownerMines.clear();
        this._mineOwners.clear();
        this._mineUnitsOnField.clear();
        if (WZSJZ_CombatSystem._instance === this) {
            WZSJZ_CombatSystem._instance = null;
        }
    }

    public Configure(canvas: Node, dragLayer: Node): void {
        this._canvas = canvas;
        this._dragLayer = dragLayer;
        this._enemyArea = canvas?.getChildByName("敌方单位");
        this.SetupProjectileLayer();
        this.SetupTrapLayer();
        void this.PrepareGunBulletPrefab();
        void this.PrepareCannonBulletPrefab();
        void this.PrepareMinePrefab();
        void this.PrepareKnifeEffectPrefab();
    }

    private OnGameStart(wall: WZSJZ_Wall): void {
        if (this._isGameStarted) {
            return;
        }
        this._isGameStarted = true;
        this._wall = wall;
        void this.PrepareEnemySpawning();
    }

    private async PrepareEnemySpawning(): Promise<void> {
        if (this._enemyPrefabs.length === 0) {
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
        if (!this._isGameStarted || !this.node?.isValid) {
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
        if (!this._isGameStarted) {
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
        if (!this._isGameStarted || !this._enemyArea || this._enemyPrefabs.length === 0) {
            return;
        }
        const prefab = this._enemyPrefabs[Math.floor(Math.random() * this._enemyPrefabs.length)];
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
            enemyNode.setPosition(
                minX + Math.random() * Math.max(0, maxX - minX),
                minY + Math.random() * Math.max(0, maxY - minY),
                0,
            );
        }

        const enemy = enemyNode.getComponent(WZSJZ_Enemy);
        if (!enemy?.Initialize(this._wall, this.RecycleEnemy)) {
            pool.put(enemyNode);
        } else {
            this.SortEnemyRenderOrder();
        }
        this.ScheduleNextEnemySpawn();
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
        const config = this.GetReadyWeaponConfig(gameNode, deltaTime, true);
        if (!config) {
            return;
        }
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, config.AttackRange);
        if (!target || !this.SpawnGunBullet(gameNode, target, config.AttackDamage, config.BulletSpeed)) {
            return;
        }
        this.FinishWeaponAttack(gameNode, config.AttackInterval);
    }

    public UpdateKnife(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        const config = this.GetReadyWeaponConfig(gameNode, deltaTime, false);
        if (!config) {
            return;
        }
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, config.AttackRange);
        if (!target || !this.SpawnKnifeEffect(target)) {
            return;
        }
        target.TakeDamage(config.AttackDamage);
        this.FinishWeaponAttack(gameNode, config.AttackInterval);
    }

    public UpdateCannon(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        const config = this.GetReadyWeaponConfig(gameNode, deltaTime, true);
        if (!config?.AreaRadius) {
            return;
        }
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, config.AttackRange);
        if (!target || !this.SpawnCannonBullet(
            gameNode,
            target,
            config.AttackDamage,
            config.BulletSpeed,
            config.AreaRadius,
        )) {
            return;
        }
        this.FinishWeaponAttack(gameNode, config.AttackInterval);
    }

    public UpdateMineLayer(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        if (!this._isGameStarted) {
            return;
        }
        if (gameNode.CurrentCell?.Zone !== "formation") {
            this.RemoveMinesByOwner(gameNode);
            return;
        }
        // 拖动过程中先保留已有地雷和当前冷却，落到非布阵区后再统一清理。
        if (gameNode.IsDragging) {
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
        if (!this.SpawnMine(
            gameNode,
            config.AttackDamage,
            config.TriggerRadius,
            config.AreaRadius,
        )) {
            return;
        }
        this.FinishWeaponAttack(gameNode, config.AttackInterval);
    }

    private GetReadyWeaponConfig(
        gameNode: WZSJZ_GameNode,
        deltaTime: number,
        needsBullet: boolean,
    ) {
        if (!this._isGameStarted || gameNode.IsDragging
            || gameNode.CurrentCell?.Zone !== "formation") {
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
        gameNode.StartAttackCooldown(interval);
        const skeleton = gameNode.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setAnimation(0, "attack", false);
            skeleton.addAnimation(0, "daiji", true, 0);
        }
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
        this.scheduleOnce(() => {
            if (effectNode.isValid) {
                animation?.stop();
                this._knifeEffectPool.put(effectNode);
            }
        }, WZSJZ_Constant.KnifeEffect.Duration);
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
