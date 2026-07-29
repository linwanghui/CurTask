import { _decorator, Node, Vec3 } from 'cc';
import {
    ZRSJZ_BOSS_CONFIG,
    ZRSJZ_BossConfig,
    ZRSJZ_BossSkillConfig,
    ZRSJZ_EnemyConfig,
} from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_EnemyBase } from './ZRSJZ_EnemyBase';

const { ccclass } = _decorator;

/**
 * Boss 通用基类。
 * Boss 配置与普通敌人配置完全分离；普攻和技能使用相同的动作配置结构。
 * 决策优先级：技能 > 普攻 > 追击/巡逻。
 */
@ccclass('ZRSJZ_BossBase')
export abstract class ZRSJZ_BossBase extends ZRSJZ_EnemyBase {
    protected BossConfig: Readonly<ZRSJZ_BossConfig> = null;

    private _skillCooldowns: number[] = [];
    private _normalAttackCooldown: number = 0;
    private _activeSkill: Readonly<ZRSJZ_BossSkillConfig> = null;
    private _activeNormalAttack: Readonly<ZRSJZ_BossSkillConfig> = null;
    private _activeAttackTriggered: boolean = false;
    private _actionSerial: number = 0;

    public get IsCastingSkill(): boolean {
        return this._activeSkill !== null;
    }

    public get IsNormalAttacking(): boolean {
        return this._activeNormalAttack !== null;
    }

    /**
     * Boss 配置不继承普通敌人配置。
     * 这里只构造 EnemyBase 运行所需的内部适配配置，不会写入普通敌人配置表。
     */
    protected ResolveEnemyConfig(enemyName: string): Readonly<ZRSJZ_EnemyConfig> {
        const config = ZRSJZ_BOSS_CONFIG.get(enemyName);
        this.BossConfig = config;
        if (!config) {
            return null;
        }

        const normalAttack = config.NormalAttack;
        return {
            MaxHealth: config.MaxHealth,
            DetectionRange: config.DetectionRange,
            LoseRange: config.LoseRange,
            PatrolRadius: config.PatrolRadius,
            PatrolSpeed: config.PatrolSpeed,
            ChaseSpeed: config.ChaseSpeed,
            PatrolWaitTime: config.PatrolWaitTime,
            PatrolArriveDistance: config.PatrolArriveDistance,
            MovingAttackRange: normalAttack.Range,
            StandingAttackRange: normalAttack.Range,
            AttackInterval: normalAttack.Cooldown,
            IdleAnimation: config.IdleAnimation,
            MoveAnimation: config.MoveAnimation,
            MovingAttackAnimation: [normalAttack.Animation],
            StandingAttackAnimation: [normalAttack.Animation],
            WeaponName: config.WeaponName,
        };
    }

    protected onLoad(): void {
        super.onLoad();
        if (!this.BossConfig) {
            return;
        }
        this._skillCooldowns = this.BossConfig.Skills.map(() => 0);
    }

    protected start(): void {
        super.start();
        // this.EnemySkeleton?.ShowEquipment(this.BossConfig?.WeaponName);
    }

    protected update(dt: number): void {
        if (this.IsDead || !this.BossConfig) {
            return;
        }

        this.UpdateCooldowns(dt);

        // 一个攻击动作播放完毕前，不允许开始其他动作。
        if (this._activeSkill) {
            this.UpdateActiveSkill(dt);
            return;
        }
        if (this._activeNormalAttack) {
            this.UpdateActiveNormalAttack(dt);
            return;
        }

        // 已经有目标时，必须先尝试技能，避免 EnemyBase 先执行普攻。
        if (this.IsTargetAvailable() && this.TryStartSkill()) {
            return;
        }

        super.update(dt);

        // super.update 可能在本帧刚找到目标或执行追击，再补一次技能判断。
        if (
            !this.IsDead
            && !this._activeSkill
            && !this._activeNormalAttack
            && this.IsTargetAvailable()
        ) {
            this.TryStartSkill();
        }
    }

    /** EnemyBase 进入站立攻击范围时，仍然先判断技能，之后才尝试普攻。 */
    public Attack(_dt: number): void {
        if (this.TryStartSkill()) {
            return;
        }
        this.TryStartNormalAttack();
    }

    /** EnemyBase 进入移动攻击范围时，仍然先判断技能，之后才尝试普攻。 */
    public MovingAttack(_dt: number): void {
        if (this.TryStartSkill()) {
            return;
        }
        this.TryStartNormalAttack();
    }

    public Die(): void {
        this.CancelActiveAttack();
        super.Die();
    }

    protected onDisable(): void {
        this.CancelActiveAttack();
        super.onDisable();
    }

    /**
     * 在具体 Boss 的 OnAttack 中调用。
     * 只有 Spine 事件与当前普攻/技能的 TriggerEvent 一致时才返回配置，
     * 并保证单次动画只结算一次伤害。
     */
    protected ConsumeAttackEvent(
        eventName: string,
    ): Readonly<ZRSJZ_BossSkillConfig> {
        const attack = this._activeSkill ?? this._activeNormalAttack;
        if (!attack || this._activeAttackTriggered || eventName !== attack.TriggerEvent) return null;

        // this._activeAttackTriggered = true;
        return attack;
    }

    private UpdateCooldowns(dt: number): void {
        this._normalAttackCooldown = Math.max(0, this._normalAttackCooldown - dt);
        for (let index = 0; index < this._skillCooldowns.length; index++) {
            this._skillCooldowns[index] = Math.max(0, this._skillCooldowns[index] - dt);
        }
    }

    private TryStartSkill(): boolean {
        if (!this.Target || !this.BossConfig || this._activeSkill || this._activeNormalAttack) return false;

        const targetDistance = Vec3.distance(
            this.node.worldPosition,
            this.Target.worldPosition,
        );
        for (let index = 0; index < this.BossConfig.Skills.length; index++) {
            const skill = this.BossConfig.Skills[index];
            if (
                this._skillCooldowns[index] > 0
                || targetDistance > Math.max(0, skill.Range)
            ) {
                continue;
            }

            this.StartSkill(skill, index);
            return true;
        }
        return false;
    }

    private TryStartNormalAttack(): boolean {
        if (
            !this.Target
            || !this.BossConfig
            || this._activeSkill
            || this._activeNormalAttack
        ) {
            return false;
        }

        const normalAttack = this.BossConfig.NormalAttack;
        const targetDistance = Vec3.distance(
            this.node.worldPosition,
            this.Target.worldPosition,
        );
        if (targetDistance > Math.max(0, normalAttack.Range)) {
            return false;
        }

        // 目标仍在普攻范围内，但攻击尚未冷却完成时保持原地待机。
        if (this._normalAttackCooldown > 0) {
            this.ClearNavigation();
            this.StopMoving();
            this.PlayAnimation(this.BossConfig.IdleAnimation);
            return false;
        }

        this._normalAttackCooldown = Math.max(0, normalAttack.Cooldown);
        this.StartAttackAction(normalAttack, false);
        return true;
    }

    private StartSkill(
        skill: Readonly<ZRSJZ_BossSkillConfig>,
        skillIndex: number,
    ): void {
        this._skillCooldowns[skillIndex] = Math.max(0, skill.Cooldown);
        this.StartAttackAction(skill, true);
    }

    private StartAttackAction(
        attack: Readonly<ZRSJZ_BossSkillConfig>,
        isSkill: boolean,
    ): void {
        if (!attack.Animation) {
            console.warn(`[ZRSJZ_BossBase] 攻击“${attack.Name}”未配置 Animation。`);
            return;
        }
        if (!attack.TriggerEvent) {
            console.warn(`[ZRSJZ_BossBase] 攻击“${attack.Name}”未配置 TriggerEvent，不会结算伤害。`);
        }

        this._activeSkill = isSkill ? attack : null;
        this._activeNormalAttack = isSkill ? null : attack;
        this._activeAttackTriggered = false;
        this.ClearNavigation();
        this.RefreshAttackDirection();

        if (!attack.CanMoveWhileCasting) {
            this.StopMoving();
        }

        const actionSerial = ++this._actionSerial;
        this.RestartAnimation(attack.Animation, false, () => {
            if (actionSerial !== this._actionSerial || this.IsDead) {
                return;
            }
            this.FinishActiveAttack();
        });
    }

    private UpdateActiveSkill(dt: number): void {
        this.UpdateActiveAttack(this._activeSkill, dt);
    }

    private UpdateActiveNormalAttack(dt: number): void {
        this.UpdateActiveAttack(this._activeNormalAttack, dt);
    }

    private UpdateActiveAttack(
        attack: Readonly<ZRSJZ_BossSkillConfig>,
        dt: number,
    ): void {
        if (!attack) {
            return;
        }

        if (!this.IsTargetAvailable()) {
            // 目标丢失时仍等待当前攻击动画结束，避免动作被中途打断。
            this.StopMoving();
            return;
        }

        this.RefreshAttackDirection();
        if (attack.CanMoveWhileCasting) {
            this.NavigateTo(
                this.Target.worldPosition,
                this.BossConfig.ChaseSpeed,
                dt,
                attack.Animation,
                false,
            );
        } else {
            this.StopMoving();
        }
    }

    private RefreshAttackDirection(): void {
        if (!this.Target) {
            return;
        }

        const current = this.node.worldPosition;
        const target = this.Target.worldPosition;
        this.AttackX = target.x - current.x;
        this.AttackY = target.y - current.y;
        const distance = Math.sqrt(
            this.AttackX * this.AttackX + this.AttackY * this.AttackY,
        );
        this.UpdateAimDirection(this.AttackX, this.AttackY, distance);
    }

    private FinishActiveAttack(): void {
        const finishedNormalAttack = this._activeNormalAttack !== null;
        this._activeSkill = null;
        this._activeNormalAttack = null;
        this._activeAttackTriggered = false;

        // 普攻结束后先进入待机，等待普攻冷却；下一帧仍会优先判断可用技能。
        if (
            finishedNormalAttack
            && !this.IsDead
            && this._normalAttackCooldown > 0
        ) {
            this.ClearNavigation();
            this.StopMoving();
            this.PlayAnimation(this.BossConfig.IdleAnimation);
        }
    }

    private CancelActiveAttack(): void {
        this._actionSerial++;
        this._activeSkill = null;
        this._activeNormalAttack = null;
        this._activeAttackTriggered = false;
    }

    protected OnDeath(): void {
        ZRSJZ_Game.Instance.CreateDieEffect(this.node.worldPosition.clone(), () => {
            ZRSJZ_PoolManager.Instance.GetNode(`Prefabs/Unit/箱子/${"物资箱3"}`).then((node: Node) => {
                node.parent = this.node.parent;
                node.active = true;
                node.getComponent(ZRSJZ_Box).Show(this.node.worldPosition.clone());
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
        });

        this.PlayAnimation(this.BossConfig.DieAnimation, false);
    }
}
