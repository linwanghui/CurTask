import { _decorator, isValid, Node, Prefab, sp, Vec3 } from 'cc';
import { ZRSJZ_PetBase } from './ZRSJZ_PetBase';
import { ZRSJZ_PetBattleSkillConfig, ZRSJZ_PET_SWARM_CONFIG, ZRSJZ_PET_SKIN_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_PetService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
import { ZRSJZ_Player } from '../../../73_ZRSJZ/Scripts/Controller/ZRSJZ_Player';
import { ZRSJZ_EnemyBase } from '../../../73_ZRSJZ/Scripts/Controller/ZRSJZ_EnemyBase';
const { ccclass, property } = _decorator;
type SwarmTarget = { node: Node; player?: ZRSJZ_Player; enemy?: ZRSJZ_EnemyBase };

@ccclass('ZRSJZ_PetBee')
export class ZRSJZ_PetBee extends ZRSJZ_PetBase {
    @property(Prefab) RepairPrefab: Prefab = null;
    @property(Prefab) ShieldPrefab: Prefab = null;
    @property(Prefab) SwarmPrefab: Prefab = null;
    @property(Prefab) ParalysisPrefab: Prefab = null;
    private readonly _attachedEffects = new Map<Node, Map<string, Node>>();

    protected GetSkillPriority(): readonly number[] { return [2, 3, 0]; }
    protected GetSkillFacingTarget(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): Node {
        // 蜂群部署兼具治疗与攻击；存在敌人时朝向敌人，纯治疗时保持朝向。
        return index === 3 ? this.NearestEnemy(skill.Range ?? 400)?.node ?? null : null;
    }
    private HasThreat(range: number): boolean {
        return !!this.NearestEnemy(range) || this.EnemiesInRange(this.Owner.node.worldPosition, range).length > 0;
    }
    protected CanUseSkill(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean {
        if (index === 0) return (this.Owner.CurHP < this.Owner.MaxHP || this.Health < this.Stats.HP)
            && Vec3.distance(this.Owner.node.worldPosition, this.node.worldPosition) <= (skill.Range ?? 350);
        const threatened = this.HasThreat(skill.Range ?? 600);
        return index === 2 ? threatened && !this.Owner.HasPetShield(this) : !!this.SwarmPrefab && (threatened || this.Owner.CurHP < this.Owner.MaxHP);
    }
    protected GetSkillCondition(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): string {
        if (index === 1) return '出战被动';
        if (index === 0) {
            if (this.Owner.CurHP >= this.Owner.MaxHP && this.Health >= this.Stats.HP) return '玩家与宠物均满血';
            if (Vec3.distance(this.Owner.node.worldPosition, this.node.worldPosition) > (skill.Range ?? 350)) return '玩家距离超出治疗范围';
        }
        if (index === 2 && this.Owner.HasPetShield(this)) return '屏障仍在生效';
        if (index === 3 && !this.SwarmPrefab) return '未绑定蜂群部署预制体';
        if (!this.CanUseSkill(index, skill)) return index === 2 ? '护盾范围内没有敌人' : '范围内没有敌人且玩家满血';
        return '满足';
    }
    protected NormalAttack(skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean {
        // 开始施法已判断治疗条件，释放事件不因跟随移动而空放。
        const amount = this.Stats.Attack * (skill.DamageMultiplier ?? 1) * (skill.HitCount ?? 1);
        this.Owner.HealFromPet(amount);
        this.HealSelf(amount);
        this.AttachVisual('纳米修复', this.RepairPrefab, this.Owner.node,
            Math.max(0.3, (skill.Cooldown ?? 3) / Math.max(0.1, this.Stats.AttackSpeedMultiplier)), () => !this.Owner.IsDead);
        return true;
    }

    protected ActiveSkill(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean {
        if (index === 2) {
            if (!this.ShieldPrefab) return false;
            // 开始施法时已确认威胁，动画事件不再重复检查距离造成空放。
            const count = Math.max(1, Math.floor(skill.ShieldCharges ?? 2));
            const duration = skill.Duration ?? 6;
            this.Owner.ApplyPetShield(this, count, duration);
            for (let i = 0; i < count; i++) {
                // 两片共用玩家原点，用根节点镜像预制体内的偏移形成左右屏障。
                const shield = this.PrefabEffect(this.ShieldPrefab, Vec3.ZERO, duration, effect => {
                    if (this.Owner.IsDead || this.Owner.GetPetShieldCount(this) <= i) { effect.destroy(); return; }
                }, null, this.Owner.node);
                if (shield && i % 2 === 0) {
                    const scale = shield.scale;
                    shield.setScale(-scale.x, scale.y, scale.z);
                }
            }
        } else if (index === 3) {
            if (!this.SwarmPrefab) return false;
            const reserved = new Set<Node>();
            const count = Math.max(1, Math.floor(ZRSJZ_PET_SWARM_CONFIG.Count));
            for (let i = 0; i < count; i++) this.SummonSwarm(i, count, skill, reserved);
        } else return false;
        return true;
    }

    /** 同一目标同一种特效只保留一个实例，普攻与蜂群治疗重叠时延长显示时间。 */
    private AttachVisual(name: string, prefab: Prefab, target: Node, duration: number, alive: () => boolean): void {
        if (!prefab || !isValid(target, true)) return;
        let effects = this._attachedEffects.get(target);
        if (!effects) { effects = new Map(); this._attachedEffects.set(target, effects); }
        if (this.RefreshEffectDuration(effects.get(name), duration)) return;
        const node = this.PrefabEffect(prefab, Vec3.ZERO, duration, effect => {
            if (!isValid(target, true) || !target.activeInHierarchy || !alive()) { effect.destroy(); return; }
        }, () => {
            if (effects.get(name) === node) effects.delete(name);
            if (!effects.size) this._attachedEffects.delete(target);
        }, target);
        if (node) effects.set(name, node);
    }

    private TargetAlive(target: SwarmTarget): boolean {
        return !!target && isValid(target.node, true) && target.node.activeInHierarchy
            && (target.player ? isValid(target.player, true) && !target.player.IsDead : isValid(target.enemy, true) && !target.enemy.IsDead);
    }

    private SelectSwarmTarget(preferPlayer: boolean, range: number, reserved: Set<Node>): SwarmTarget {
        const origin = this.node.worldPosition;
        const players = this.Game.Players.filter(player => isValid(player, true) && !player.IsDead && player.node.activeInHierarchy
            && !reserved.has(player.node) && Vec3.distance(origin, player.node.worldPosition) <= range)
            .sort((a, b) => a.CurHP / a.MaxHP - b.CurHP / b.MaxHP);
        const enemies = this.EnemiesInRange(origin, range).filter(enemy => !reserved.has(enemy.node))
            .sort((a, b) => Vec3.distance(origin, a.node.worldPosition) - Vec3.distance(origin, b.node.worldPosition));
        if (players.length && (preferPlayer || !enemies.length)) return { node: players[0].node, player: players[0] };
        if (enemies.length) return { node: enemies[0].node, enemy: enemies[0] };
        return null;
    }

    private SummonSwarm(index: number, count: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>, reserved: Set<Node>): void {
        const config = ZRSJZ_PET_SWARM_CONFIG;
        const phase = index * Math.PI * 2 / count;
        const spawn = this.node.worldPosition.clone().add3f(Math.cos(phase) * 45, 70 + Math.sin(phase) * 35, 0);
        const range = skill.Range ?? 400;
        let target: SwarmTarget = null;
        let attached = false;
        let attachedTime = 0;
        let attachmentDuration = config.Duration;
        let nextTick = Math.max(0.1, config.TickInterval);
        let ticks = 0;
        let searchRemaining = 0;
        let animation = '';
        let spines: sp.Skeleton[] = [];
        const choose = () => {
            target = this.SelectSwarmTarget(index === 0, range, reserved);
            if (target) reserved.add(target.node);
        };
        choose();
        const release = () => {
            if (target) {
                reserved.delete(target.node);
                if (isValid(target.enemy, true)) target.enemy.ClearPetStun(node);
            }
        };
        const node = this.PrefabEffect(this.SwarmPrefab, spawn, config.Lifetime, (swarm, elapsed, dt) => {
            if (target && !this.TargetAlive(target)) {
                release();
                if (attached) { swarm.destroy(); return; }
                target = null;
            }
            // 飞行阶段目标离开施法范围则重新搜索；附身后持续跟随目标。
            if (!attached && target && Vec3.distance(this.node.worldPosition, target.node.worldPosition) > range) {
                release(); target = null;
            }
            searchRemaining -= dt;
            if (!target && searchRemaining <= 0) { choose(); searchRemaining = 0.2; }
            const position = swarm.worldPosition.clone();
            if (!attached) {
                const destination = target ? target.node.worldPosition.clone().add3f(0, 70, 0)
                    : this.node.worldPosition.clone().add3f(Math.cos(elapsed * 2 + phase) * 70, 80 + Math.sin(elapsed * 2 + phase) * 45, 0);
                const distance = Vec3.distance(position, destination);
                Vec3.lerp(position, position, destination, distance > 0 ? Math.min(1, config.MoveSpeed * dt / distance) : 1);
                swarm.setWorldPosition(position);
                if (target && Vec3.distance(position, destination) <= config.AttachDistance) {
                    attached = true;
                    attachmentDuration = target.enemy ? Math.max(config.Duration, config.StunDuration) : config.Duration;
                    this.RefreshEffectDuration(swarm, attachmentDuration);
                    if (target.player) {
                        const player = target.player;
                        this.AttachVisual('纳米修复', this.RepairPrefab, player.node, attachmentDuration, () => !player.IsDead);
                    } else {
                        const enemy = target.enemy;
                        enemy.ApplyPetStun(config.StunDuration, swarm);
                        this.AttachVisual('蜂群麻痹', this.ParalysisPrefab, enemy.node, attachmentDuration, () => !enemy.IsDead && enemy.IsPetStunned);
                    }
                }
            } else {
                attachedTime = Math.min(attachmentDuration, attachedTime + dt);
                swarm.setWorldPosition(target.node.worldPosition.clone().add3f(Math.cos(attachedTime * 3 + phase) * 35, 90, 0));
                while (attachedTime + 1e-6 >= nextTick && ticks < config.HitCount && this.TargetAlive(target)) {
                    ticks++; nextTick += Math.max(0.1, config.TickInterval);
                    if (target.player) target.player.HealFromPet(target.player.MaxHP * config.HealPlayerMaxHPRate);
                    else target.enemy.BeHit(this.Stats.Attack * config.DamageMultiplier);
                }
                if (attachedTime >= attachmentDuration) swarm.destroy();
            }
            const desiredAnimation = attached ? (target.player ? 'zhiliao' : 'mabi') : 'yidong';
            if (animation !== desiredAnimation) {
                animation = desiredAnimation;
                for (const spine of spines) if (spine.skeletonData?.getRuntimeData()?.findAnimation(animation)) spine.setAnimation(0, animation, true);
            }
        }, release);
        if (node) {
            spines = node.getComponentsInChildren(sp.Skeleton);
            const skin = ZRSJZ_PET_SKIN_CONFIG.get(ZRSJZ_PetService.GetCurrentSkin(this.PetName, this.Owner.PlayerIndex));
            const skinName = skin?.PetSkinSwarmSkin ?? skin?.PetSkinSpineSkin ?? 'default';
            for (const spine of spines) {
                const data = spine.skeletonData?.getRuntimeData();
                if (!data) continue;
                spine.setSkin(data.findSkin(skinName) ? skinName : 'default');
                spine.setSlotsToSetupPose();
                if (data.findAnimation('yidong')) spine.setAnimation(0, 'yidong', true);
            }
            animation = 'yidong';
        }
        else if (target) reserved.delete(target.node);
    }
}
