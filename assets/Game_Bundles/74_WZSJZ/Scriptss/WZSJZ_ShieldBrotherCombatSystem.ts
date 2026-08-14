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
import { WZSJZ_CommonEffectSystem } from './WZSJZ_CommonEffectSystem';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_ShieldProjectile } from './WZSJZ_ShieldProjectile';

const { ccclass } = _decorator;

/** 盾哥战斗域：索敌、低频攻击以及盾牌投掷物池。 */
@ccclass('WZSJZ_ShieldBrotherCombatSystem')
export class WZSJZ_ShieldBrotherCombatSystem extends Component {
    private static _instance: WZSJZ_ShieldBrotherCombatSystem = null;
    public static get Instance(): WZSJZ_ShieldBrotherCombatSystem {
        return this._instance;
    }

    private _canvas: Node = null;
    private _dragLayer: Node = null;
    private _enemyArea: Node = null;
    private _projectileLayer: Node = null;
    private _shieldPrefab: Prefab = null;
    private _shieldPool: NodePool = new NodePool();
    private _isGameStarted: boolean = false;
    private _pendingAttacks: Map<WZSJZ_GameNode, number> = new Map();
    private _attackToken: number = 0;

    protected onLoad(): void {
        WZSJZ_ShieldBrotherCombatSystem._instance = this;
        this.node.on(WZSJZ_EventManager.游戏开始, this.OnGameStart, this);
    }

    protected onDestroy(): void {
        this._pendingAttacks.clear();
        this._shieldPool.clear();
        if (WZSJZ_ShieldBrotherCombatSystem._instance === this) {
            WZSJZ_ShieldBrotherCombatSystem._instance = null;
        }
    }

    public Configure(canvas: Node, dragLayer: Node): void {
        this._canvas = canvas;
        this._dragLayer = dragLayer;
        this._enemyArea = canvas?.getChildByName("敌方单位");
        this.SetupProjectileLayer();
        void this.PrepareShieldPrefab();
    }

    public UpdateShieldBrother(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        if (this._pendingAttacks.has(gameNode)) {
            if (!this.CanCompleteDelayedAttack(gameNode)) {
                this._pendingAttacks.delete(gameNode);
                gameNode.ResetAttackCooldown();
            } else {
                // 前摇属于本次攻击间隔的一部分，等待发射时冷却仍继续流逝。
                gameNode.ReduceAttackCooldown(deltaTime);
            }
            return;
        }
        if (!this._isGameStarted || gameNode.IsDragging
            || gameNode.CurrentCell?.Zone !== "formation") {
            gameNode.ResetAttackCooldown();
            return;
        }
        const levelConfig = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
        if (!levelConfig?.AttackDamage || !levelConfig.AttackInterval
            || !levelConfig.AttackRange || !levelConfig.BulletSpeed) {
            return;
        }

        gameNode.ReduceAttackCooldown(deltaTime);
        if (!gameNode.IsAttackReady()) {
            return;
        }
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, levelConfig.AttackRange);
        if (!target) {
            return;
        }

        const token = ++this._attackToken;
        this._pendingAttacks.set(gameNode, token);
        gameNode.StartAttackCooldown(levelConfig.AttackInterval);
        const skeleton = gameNode.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setAnimation(0, WZSJZ_Constant.ShieldProjectile.AttackAnimation, false);
            skeleton.addAnimation(0, WZSJZ_Constant.ShieldProjectile.IdleAnimation, true, 0);
        }
        this.scheduleOnce(() => {
            if (this._pendingAttacks.get(gameNode) !== token) {
                return;
            }
            this._pendingAttacks.delete(gameNode);
            if (!this.CanCompleteDelayedAttack(gameNode)) {
                return;
            }
            const currentConfig = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
            if (!currentConfig?.AttackDamage || !currentConfig.BulletSpeed
                || !currentConfig.AttackRange) {
                return;
            }
            const currentTarget = this.FindNearestEnemy(
                gameNode.node.worldPosition,
                currentConfig.AttackRange,
            );
            if (currentTarget) {
                this.SpawnShield(
                    gameNode,
                    currentTarget,
                    currentConfig.AttackDamage,
                    currentConfig.BulletSpeed,
                );
            }
        }, WZSJZ_Constant.GetAttackFireDelay(gameNode.Name));
    }

    private OnGameStart(): void {
        this._isGameStarted = true;
    }

    private async PrepareShieldPrefab(): Promise<void> {
        try {
            this._shieldPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.ShieldProjectile.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 盾牌预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._shieldPrefab) {
            return;
        }
        while (this._shieldPool.size() < WZSJZ_Constant.ObjectPool.ShieldProjectilePrewarm) {
            this._shieldPool.put(this.CreateShieldNode());
        }
    }

    private CreateShieldNode(): Node {
        const shieldNode = instantiate(this._shieldPrefab);
        const oldBullet = shieldNode.getComponent(WZSJZ_Bullet);
        if (oldBullet) {
            oldBullet.enabled = false;
        }
        if (!shieldNode.getComponent(WZSJZ_ShieldProjectile)) {
            shieldNode.addComponent(WZSJZ_ShieldProjectile);
        }
        return shieldNode;
    }

    private SpawnShield(
        owner: WZSJZ_GameNode,
        target: WZSJZ_Enemy,
        damage: number,
        speed: number,
    ): boolean {
        if (!this._shieldPrefab || !this._projectileLayer || !this._enemyArea) {
            return false;
        }
        const shieldNode = this._shieldPool.get() || this.CreateShieldNode();
        shieldNode.setParent(this._projectileLayer);
        const launchNode = owner.node.getChildByName("图像") || owner.node;
        shieldNode.setWorldPosition(launchNode.worldPosition);
        this.SetLayerRecursively(shieldNode, this._projectileLayer.layer);

        const targetPosition = target.GetAimWorldPosition();
        const direction = new Vec3(
            targetPosition.x - shieldNode.worldPosition.x,
            targetPosition.y - shieldNode.worldPosition.y,
            0,
        );
        const config = WZSJZ_Constant.ShieldProjectile;
        const experienceReceiver = owner.CreateExperienceReceiver();
        const projectile = shieldNode.getComponent(WZSJZ_ShieldProjectile);
        if (!projectile?.Initialize(
            this._enemyArea,
            direction,
            damage,
            speed,
            config.MaxTravelDistance,
            config.HitRadius,
            config.KnockbackDistance,
            config.AimHeight,
            this.RecycleShield,
            (position) => WZSJZ_CommonEffectSystem.Instance?.PlayBlueExplosion(position),
            () => experienceReceiver(config.KillExperience),
        )) {
            this._shieldPool.put(shieldNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleShield = (projectile: WZSJZ_ShieldProjectile): void => {
        if (projectile?.node?.isValid) {
            projectile.node.getComponentInChildren(Animation)?.stop();
            this._shieldPool.put(projectile.node);
        }
    };

    private FindNearestEnemy(origin: Vec3, attackRange: number): WZSJZ_Enemy | null {
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

    private CanCompleteDelayedAttack(gameNode: WZSJZ_GameNode): boolean {
        return this._isGameStarted
            && !!gameNode?.node?.isValid
            && !gameNode.IsDragging
            && gameNode.CurrentCell?.Zone === "formation";
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

    private KeepProjectileLayerOnTop(): void {
        this._projectileLayer?.setSiblingIndex(this._projectileLayer.parent.children.length - 1);
        this._dragLayer?.setSiblingIndex(this._dragLayer.parent.children.length - 1);
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }
}
