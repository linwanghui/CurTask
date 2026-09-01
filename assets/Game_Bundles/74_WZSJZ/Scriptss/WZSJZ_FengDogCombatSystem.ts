import { _decorator, Component, instantiate, Node, NodePool, Prefab, sp, UITransform, Vec3 } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';

const { ccclass } = _decorator;

/** 疯狗独立战斗模块：维护近战前摇、索敌和普通攻击特效池。 */
@ccclass('WZSJZ_FengDogCombatSystem')
export class WZSJZ_FengDogCombatSystem extends Component {
    private static _instance: WZSJZ_FengDogCombatSystem = null;
    public static get Instance(): WZSJZ_FengDogCombatSystem {
        return this._instance;
    }

    private _enemyArea: Node = null;
    private _projectileLayer: Node = null;
    private _dragLayer: Node = null;
    private _attackEffectPrefab: Prefab = null;
    private readonly _attackEffectPool: NodePool = new NodePool();
    private readonly _pendingAttacks: Map<WZSJZ_GameNode, number> = new Map();
    private _attackToken: number = 0;
    private _isGameStarted: boolean = false;

    protected onLoad(): void {
        WZSJZ_FengDogCombatSystem._instance = this;
        this.node.on(WZSJZ_EventManager.战斗阶段变动, this.OnCombatPhaseChanged, this);
    }

    protected onDestroy(): void {
        this._pendingAttacks.clear();
        this._attackEffectPool.clear();
        if (WZSJZ_FengDogCombatSystem._instance === this) {
            WZSJZ_FengDogCombatSystem._instance = null;
        }
    }

    public Configure(canvas: Node, dragLayer: Node): void {
        this._enemyArea = canvas?.getChildByName("敌方单位") || null;
        this._projectileLayer = canvas?.getChildByName("玩家投掷物") || null;
        this._dragLayer = dragLayer;
        if (!this._projectileLayer && canvas) {
            this._projectileLayer = new Node("玩家投掷物");
            this._projectileLayer.layer = canvas.layer;
            this._projectileLayer.setParent(canvas);
            const transform = this._projectileLayer.addComponent(UITransform);
            const canvasTransform = canvas.getComponent(UITransform);
            if (canvasTransform) {
                transform.setContentSize(canvasTransform.contentSize);
                transform.setAnchorPoint(canvasTransform.anchorPoint);
            }
        }
        void this.PrepareAttackEffect();
    }

    public UpdateFengDog(gameNode: WZSJZ_GameNode, deltaTime: number): void {
        if (this._pendingAttacks.has(gameNode)) {
            if (!this.CanAttack(gameNode)) {
                this._pendingAttacks.delete(gameNode);
                gameNode.ResetAttackCooldown();
            } else {
                gameNode.ReduceAttackCooldown(deltaTime);
            }
            return;
        }
        if (!this._isGameStarted) {
            return;
        }
        if (!this.CanAttack(gameNode)) {
            gameNode.ResetAttackCooldown();
            return;
        }
        const levelConfig = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
        if (!levelConfig?.AttackDamage || !levelConfig.AttackInterval || !levelConfig.AttackRange) {
            return;
        }
        gameNode.ReduceAttackCooldown(deltaTime);
        if (!gameNode.IsAttackReady()
            || !this.FindNearestEnemy(gameNode.node.worldPosition, gameNode.GetAttackRange())) {
            return;
        }

        const token = ++this._attackToken;
        this._pendingAttacks.set(gameNode, token);
        gameNode.StartAttackCooldown(gameNode.GetAttackInterval(levelConfig.AttackInterval));
        gameNode.PlayAttackAnimation(levelConfig.AttackInterval, "gongji", "daiji");
        const delay = gameNode.GetAttackFireDelay(
            WZSJZ_Constant.GetAttackFireDelay(gameNode.Name),
        );
        const complete = (): void => {
            if (this._pendingAttacks.get(gameNode) !== token) return;
            this._pendingAttacks.delete(gameNode);
            this.CompleteAttack(gameNode);
        };
        if (delay <= 0) complete();
        else this.scheduleOnce(complete, delay);
    }

    private CompleteAttack(gameNode: WZSJZ_GameNode): void {
        if (!this.CanAttack(gameNode)) return;
        const levelConfig = WZSJZ_Constant.GetMaterialLevelConfig(gameNode.Name, gameNode.Level);
        if (!levelConfig?.AttackRange) return;
        const target = this.FindNearestEnemy(gameNode.node.worldPosition, gameNode.GetAttackRange());
        if (!target || !this.SpawnAttackEffect(target)) return;
        WZSJZ_AudioManager.Play('近战挥砍', 0.68, 0.05);
        if (target.TakeDamage(gameNode.GetAttackDamage())) {
            gameNode.CreateExperienceReceiver()(
                WZSJZ_Constant.FengDogAttackEffect.KillExperience,
            );
        }
    }

    private SpawnAttackEffect(target: WZSJZ_Enemy): boolean {
        if (!target?.IsAlive || !this._attackEffectPrefab || !this._projectileLayer) return false;
        const node = this._attackEffectPool.get() || instantiate(this._attackEffectPrefab);
        const config = WZSJZ_Constant.FengDogAttackEffect;
        node.setParent(this._projectileLayer);
        const position = target.node.worldPosition;
        node.setWorldPosition(
            position.x + config.PositionOffsetX,
            position.y + config.PositionOffsetY,
            position.z,
        );
        node.angle = 0;
        this.SetLayerRecursively(node, this._projectileLayer.layer);
        node.active = true;
        const skeleton = node.getComponent(sp.Skeleton) || node.getComponentInChildren(sp.Skeleton);
        if (skeleton) {
            skeleton.clearTracks();
            skeleton.setAnimation(0, config.AnimationName, false);
        }
        this.scheduleOnce(() => {
            if (!node?.isValid) return;
            skeleton?.clearTracks();
            node.active = false;
            this._attackEffectPool.put(node);
        }, config.Duration);
        this.KeepLayersOnTop();
        return true;
    }

    private FindNearestEnemy(origin: Vec3, attackRange: number): WZSJZ_Enemy | null {
        let nearest: WZSJZ_Enemy = null;
        let nearestDistanceSquared = attackRange * attackRange;
        for (const child of this._enemyArea?.children || []) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) continue;
            const position = enemy.node.worldPosition;
            const dx = position.x - origin.x;
            const dy = position.y - origin.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared <= nearestDistanceSquared) {
                nearest = enemy;
                nearestDistanceSquared = distanceSquared;
            }
        }
        return nearest;
    }

    private CanAttack(gameNode: WZSJZ_GameNode): boolean {
        return this._isGameStarted && !!gameNode?.node?.isValid
            && !gameNode.IsDragging && gameNode.CurrentCell?.Zone === "formation";
    }

    private OnCombatPhaseChanged(active: boolean): void {
        this._isGameStarted = !!active;
        if (!this._isGameStarted) {
            this._pendingAttacks.clear();
        }
    }

    private async PrepareAttackEffect(): Promise<void> {
        try {
            this._attackEffectPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.FengDogAttackEffect.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 疯狗普通攻击特效加载失败。", error);
            return;
        }
        while (this.node?.isValid && this._attackEffectPool.size()
            < WZSJZ_Constant.ObjectPool.FengDogAttackEffectPrewarm) {
            this._attackEffectPool.put(instantiate(this._attackEffectPrefab));
        }
    }

    private KeepLayersOnTop(): void {
        this._projectileLayer?.setSiblingIndex(this._projectileLayer.parent.children.length - 1);
        this._dragLayer?.setSiblingIndex(this._dragLayer.parent.children.length - 1);
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) this.SetLayerRecursively(child, layer);
    }
}
