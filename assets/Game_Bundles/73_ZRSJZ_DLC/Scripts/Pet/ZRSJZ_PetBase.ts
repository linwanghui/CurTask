import { _decorator, Collider2D, Color, Component, Graphics, instantiate, isValid, Node, Prefab, RigidBody2D, sp, Vec2, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Game';
import { ZRSJZ_Player } from '../../../73_ZRSJZ/Scripts/Controller/ZRSJZ_Player';
import { ZRSJZ_EnemyBase } from '../../../73_ZRSJZ/Scripts/Controller/ZRSJZ_EnemyBase';
import { ZRSJZ_HP } from '../../../73_ZRSJZ/Scripts/UI/ZRSJZ_HP';
import { ZRSJZ_PetService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
import { ZRSJZ_FriendlyDamageService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_FriendlyDamageService';
import { ZRSJZ_PET_BATTLE_CONFIG, ZRSJZ_PET_SKIN_CONFIG, ZRSJZ_PetBattleSkillConfig } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';

const { ccclass, property } = _decorator;
type PetEffect = { node: Node; elapsed: number; duration: number; tick: (elapsed: number, dt: number) => void;
    complete?: () => void; cleanup?: () => void; spines: sp.Skeleton[] };

/** 子类只实现普通攻击与主动技能；不直接操作存档，不重复发放玩家被动属性。 */
@ccclass('ZRSJZ_PetBase')
export abstract class ZRSJZ_PetBase extends Component {
    @property PetName = '';
    @property({ tooltip: '每3秒输出技能解锁、条件、冷却和事件状态，排查技能未释放时开启' })
    DebugSkills = false;
    private _debugRemaining = 0;
    protected Owner: ZRSJZ_Player = null;
    protected Game: ZRSJZ_Game = null;
    protected Stats: ReturnType<typeof ZRSJZ_PetService.GetPetStats> = null;
    protected Health = 0;
    private _spine: sp.Skeleton = null;
    private _hp: ZRSJZ_HP = null;
    private _body: RigidBody2D = null;
    private _cooldowns = [0, 0, 0, 0];
    private _skills: Readonly<ZRSJZ_PetBattleSkillConfig>[] = [];
    private _effects: PetEffect[] = [];
    private _enemies: ZRSJZ_EnemyBase[] = [];
    private _searchRemaining = 0;
    private _reviveRemaining = 0;
    private _deathStarted = false;
    private _animation = '';
    private _animationRemaining = 0;
    private _cast: { index: number; skill: Readonly<ZRSJZ_PetBattleSkillConfig>; track: sp.spine.TrackEntry;
        eventSeen: boolean; released: boolean; finished: boolean; elapsed: number; timeout: number;
        interrupted: boolean; resumeTime: number; generation: number; targetPosition: Vec3 } = null;
    private _recallPending = false;
    /** 施法期间霸体但不免伤；包括释放事件之后尚未结束的施法动作。 */
    public get IsSuperArmor(): boolean { return this.Health > 0 && !!this._cast && !this._cast.finished; }
    private _trail: Vec3[] = [];
    private _followVelocity = new Vec3();
    private _following = false;
    private _hoverTime = Math.random() * Math.PI * 2;
    private _spineOrigin = new Vec3();

    public Init(owner: ZRSJZ_Player, petName: string): void {
        this.Owner = owner;
        this.Game = ZRSJZ_Game.Instance;
        this.PetName = petName;
        this.Stats = ZRSJZ_PetService.GetPetStats(petName, owner.PlayerIndex);
        this.Health = this.Stats.HP;
        this._skills = [0, 1, 2, 3].map(index => ZRSJZ_PetService.IsSkillUnlocked(petName, index)
            ? ZRSJZ_PetService.GetBattleSkill(petName, index) : null);
        this._spine = this.getComponentInChildren(sp.Skeleton);
        if (this._spine) this._spineOrigin.set(this._spine.node.position);
        this._hp = this.getComponentInChildren(ZRSJZ_HP);
        this._body = this.getComponent(RigidBody2D);
        if (this._body) { this._body.gravityScale = 0; this._body.linearVelocity = Vec2.ZERO; }
        const skin = ZRSJZ_PET_SKIN_CONFIG.get(ZRSJZ_PetService.GetCurrentSkin(petName, owner.PlayerIndex));
        if (this._spine?.skeletonData) {
            // 逐轨道事件需要实时模式；缓存动画不能作为战斗释放事件的可靠来源。
            if (this._spine.isAnimationCached()) this._spine.setAnimationCacheMode(sp.Skeleton.AnimationCacheMode.REALTIME);
            const name = skin?.PetSkinSpineSkin || 'default';
            const data = this._spine.skeletonData.getRuntimeData();
            this._spine.setSkin(data?.findSkin(name) ? name : 'default');
            this._spine.setSlotsToSetupPose();
        }
        this._hp?.Init(this.Stats.HP);
        this._hp?.Show(this.Health);
        this.node.setWorldPosition(owner.node.worldPosition.clone().add3f(-ZRSJZ_PET_BATTLE_CONFIG.FollowDistance, 60, 0));
        this.ResetFollow();
        this.PlayAnimation('daiji');
    }

    protected onEnable(): void {
        this.node.on('zrsjz-pet-hit', this.BeHit, this);
        ZRSJZ_FriendlyDamageService.RegisterPet(this.node, () => this.Health > 0 && this.CanRun(), damage => this.BeHit(damage), () => {
            if (!this.Stats || this.Health <= 0 || !isValid(this.Owner, true) || this.Owner.IsDead
                || !this.Owner.node.activeInHierarchy || ZRSJZ_Game.Instance !== this.Game || this.Game?.IsGameFinished) return null;
            return { playerIndex: this.Owner.PlayerIndex, slots: this.Stats.Backpack };
        });
    }
    protected onDisable(): void {
        ZRSJZ_FriendlyDamageService.UnregisterPet(this.node);
        if (isValid(this.node, true)) this.node.off('zrsjz-pet-hit', this.BeHit, this);
        this.ClearEffects();
        this.ResetCast();
        if (isValid(this._spine, true)) {
            this._spine.setEventListener(null);
            this._spine.setCompleteListener(null);
        }
        if (isValid(this._body, true)) this._body.linearVelocity = Vec2.ZERO;
        if (isValid(this.Owner, true)) this.Owner.ClearPetShield(this);
    }

    protected CanRun(): boolean {
        return isValid(this.Game, true) && ZRSJZ_Game.Instance === this.Game
            && !this.Game.GamePaused && !this.Game.IsGameFinished
            && isValid(this.Owner, true)
            && this.Owner.node.activeInHierarchy && !this.Owner.IsDead;
    }

    protected update(dt: number): void {
        if (!this.Stats) return;
        if (this.DebugSkills) {
            this._debugRemaining -= dt;
            if (this._debugRemaining <= 0) { this.PrintSkillDiagnostics(); this._debugRemaining = 3; }
        }
        if (this._body) this._body.linearVelocity = Vec2.ZERO;
        // 死亡界面会暂停战斗，随主人死亡和关闭碰撞必须先于暂停判断处理。
        if (isValid(this.Owner, true) && this.Owner.IsDead && this.Health > 0) this.Die();
        if (this._deathStarted) {
            this.getComponents(Collider2D).forEach(c => { if (c.enabled) c.enabled = false; });
        }
        const running = this.CanRun();
        if (this._spine) this._spine.paused = !running;
        for (const effect of this._effects) {
            for (const spine of effect.spines) if (isValid(spine, true)) spine.paused = !running;
        }
        if (!running) {
            if (!isValid(this.Game, true) || ZRSJZ_Game.Instance !== this.Game || !isValid(this.Owner, true) || this.Game?.IsGameFinished) {
                if (isValid(this._hp, true)) this._hp.node.active = false;
                this.ResetCast();
                this.ClearEffects();
            }
            if (this.Owner?.IsDead && isValid(this._hp, true)) this._hp.node.active = false;
            return;
        }
        dt = Math.max(0, dt);
        if (isValid(this._hp, true)) this._hp.node.active = this.Health > 0 && !this.Owner.IsDead;
        if (this.Health <= 0) {
            // 碰撞回调内不能改Box2D碰撞体，统一延后到update处理。
            this.getComponents(Collider2D).forEach(c => { if (c.enabled) c.enabled = false; });
            // -1是本局不复活的标记，不能参与倒计时后被当作已经到期。
            if (ZRSJZ_PET_BATTLE_CONFIG.ReviveSeconds === -1 || this._reviveRemaining === -1) return;
            this._reviveRemaining -= dt;
            if (this._reviveRemaining <= 0) {
                this.Health = this.Stats.HP;
                this._deathStarted = false;
                this._hp?.Show(this.Health);
                if (this._spine) this._spine.node.active = true;
                this.getComponents(Collider2D).forEach(c => c.enabled = true);
                this.node.setWorldPosition(this.Owner.node.worldPosition);
                this.ResetFollow();
                this._animation = '';
                this.PlayAnimation('daiji');
            }
            return;
        }
        // 包含释放事件后的收招阶段，施法结束前不跟随、传送或上下悬浮。
        const ownerAvailable = this.Owner.node.activeInHierarchy && !this.Owner.IsDead;
        if (ownerAvailable && Vec3.distance(this.node.worldPosition, this.Owner.node.worldPosition) > ZRSJZ_PET_BATTLE_CONFIG.TeleportDistance) {
            this.RequestRecall();
        }
        if (!this._cast && ownerAvailable) this.Follow(dt);
        this._searchRemaining -= dt;
        if (this._searchRemaining <= 0) {
            this._enemies = this.Game.CurMap?.Unit?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? [];
            this._searchRemaining = ZRSJZ_PET_BATTLE_CONFIG.SearchInterval;
        }
        this.UpdateEffects(dt);
        this._animationRemaining = Math.max(0, this._animationRemaining - dt);
        for (let index = 0; index < 4; index++) {
            this._cooldowns[index] = Math.max(0, this._cooldowns[index] - dt);
        }
        const cast = this._cast;
        if (cast) {
            cast.elapsed += dt;
            if (cast.interrupted) this.ResumeCast();
            if (cast.eventSeen && !cast.released) {
                cast.released = true; // 先标记再结算，重复事件不能重复召唤或治疗。
                const applied = cast.index === 0 ? this.NormalAttack(cast.skill) : this.ActiveSkill(cast.index, cast.skill);
                this._cooldowns[cast.index] = applied
                    ? Math.max(0.05, cast.skill.Cooldown ?? 1) / (cast.index === 0 ? Math.max(0.1, this.Stats.AttackSpeedMultiplier) : 1)
                    : 1;
                if (!applied) console.warn(`[${this.PetName}] ${cast.skill.Name}已收到释放事件，但效果执行失败；1秒后重试，请检查目标和预制体`);
            }
            if (cast.finished || cast.elapsed >= cast.timeout) {
                if (!cast.eventSeen) {
                    this._cooldowns[cast.index] = 1;
                    console.warn(`[${this.PetName}] ${cast.skill.Name}动画未触发释放事件：期待 ${cast.skill.ReleaseEvent || cast.skill.Animation || (cast.index === 0 ? 'gongji' : 'jineng')}；未消耗完整冷却`);
                }
                this.ResetCast();
            }
            return;
        }
        if (!ownerAvailable) return;
        // 先释放已就绪主动技，普通攻击不会抢占每次可用的动画轨道。
        for (const index of this.GetSkillPriority()) {
            const skill = this._skills[index];
            if (!skill || skill.Kind === '被动' || this._cooldowns[index] > 0) continue;
            if (!this.CanUseSkill(index, skill) || !this.BeginCast(index, skill)) continue;
            // 当前施法独占轨道，效果成功执行后才开始技能冷却。
            break;
        }
    }

    private BeginCast(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean {
        const name = skill.Animation || (index === 0 ? 'gongji' : 'jineng');
        const animation = this._spine?.skeletonData?.getRuntimeData()?.findAnimation(name);
        if (!animation) return false;
        const target = this.GetSkillFacingTarget(index, skill);
        if (isValid(target, true)) {
            const dx = target.worldPosition.x - this.node.worldPosition.x;
            if (Math.abs(dx) > 0.01) {
                const scale = this._spine.node.scale;
                this._spine.node.setScale(Math.abs(scale.x) * Math.sign(dx), scale.y, scale.z);
            }
        }
        this._spine.timeScale = index === 0 ? Math.max(0.1, this.Stats.AttackSpeedMultiplier) : 1;
        this._animation = name;
        const track = this._spine.setAnimation(0, name, false);
        if (!track) return false;
        const cast = { index, skill, track, eventSeen: false, released: false, finished: false,
            elapsed: 0, timeout: animation.duration / this._spine.timeScale + 0.5,
            interrupted: false, resumeTime: 0, generation: 0,
            targetPosition: isValid(target, true) ? target.worldPosition.clone() : null };
        this._cast = cast;
        this._followVelocity.set(0, 0, 0);
        this._following = false;
        if (this._body) this._body.linearVelocity = Vec2.ZERO;
        this.BindCastTrack();
        this._animationRemaining = animation.duration / this._spine.timeScale;
        return true;
    }

    private BindCastTrack(): void {
        const cast = this._cast;
        if (!cast) return;
        const { track, skill } = cast;
        const name = skill.Animation || (cast.index === 0 ? 'gongji' : 'jineng');
        const generation = ++cast.generation;
        const current = () => this._cast === cast && cast.generation === generation && !cast.interrupted;
        // 引擎用监听ID分发本次TrackEntry，不比较WASM回调包装对象的===引用。
        this._spine.setTrackEventListener(track, (_entry, event) => {
            if (!current() || typeof event === 'number') return;
            if (this.DebugSkills) console.info(`[${this.PetName}] ${skill.Name}收到Spine事件：${event?.data?.name}`);
            if (event?.data?.name === (skill.ReleaseEvent || name)) cast.eventSeen = true;
        });
        this._spine.setTrackCompleteListener(track, () => {
            if (current()) cast.finished = true;
        });
        this._spine.setTrackInterruptListener(track, entry => {
            if (!current() || !this.IsSuperArmor) return;
            // 外部脚本直接替换Spine轨道时，也不能把受击当作施法结束。
            cast.resumeTime = Math.max(0, Number.isFinite(entry.trackTime) ? entry.trackTime : 0);
            cast.interrupted = true;
        });
    }

    private ResumeCast(): void {
        const cast = this._cast;
        if (!cast || !this.IsSuperArmor || !isValid(this._spine, true)) return;
        const name = cast.skill.Animation || (cast.index === 0 ? 'gongji' : 'jineng');
        const animation = this._spine.skeletonData?.getRuntimeData()?.findAnimation(name);
        if (!animation) return;
        this._spine.timeScale = cast.index === 0 ? Math.max(0.1, this.Stats.AttackSpeedMultiplier) : 1;
        const track = this._spine.setAnimation(0, name, false);
        if (!track) return;
        // 回退一帧覆盖事件边界；released标记保证已释放的技能不会再次结算。
        track.trackTime = Math.max(0, Math.min(cast.resumeTime, animation.duration) - 1 / 60);
        cast.track = track;
        cast.interrupted = false;
        cast.timeout = cast.elapsed + (animation.duration - track.trackTime) / this._spine.timeScale + 0.5;
        this._animation = name;
        this.BindCastTrack();
    }

    /** 可在预制体开启DebugSkills，或在运行时调用此方法；只读诊断，不改变解锁和存档。 */
    public PrintSkillDiagnostics(): string {
        const ready = !!this.Stats && isValid(this.Owner, true);
        const result = JSON.stringify({ pet: this.PetName, initialized: !!this.Stats, running: ready && this.CanRun(),
            petHP: this.Health, playerHP: ready ? `${this.Owner.CurHP}/${this.Owner.MaxHP}` : null,
            playerDistance: ready ? Math.round(Vec3.distance(this.node.worldPosition, this.Owner.node.worldPosition)) : null,
            enemies: this._enemies.filter(enemy => isValid(enemy, true) && !enemy.IsDead && enemy.node.activeInHierarchy).length,
            casting: this._cast ? { skill: this._cast.skill.Name, eventSeen: this._cast.eventSeen, released: this._cast.released } : null,
            skills: [0, 1, 2, 3].map(index => ({ name: ZRSJZ_PetService.GetSkill(this.PetName, index)?.Name,
                unlocked: !!this._skills[index], cooldown: this._cooldowns[index],
                condition: ready && this._skills[index] ? this.GetSkillCondition(index, this._skills[index]) : '未解锁或未初始化' })) });
        console.info('[宠物技能诊断]', result);
        return result;
    }

    protected GetSkillPriority(): readonly number[] { return [3, 2, 0]; }

    /** 对敌技能由子类提供朝向目标；治疗和护盾默认保持当前朝向。 */
    protected GetSkillFacingTarget(_index: number, _skill: Readonly<ZRSJZ_PetBattleSkillConfig>): Node { return null; }

    protected GetCastTargetPosition(): Vec3 { return this._cast?.targetPosition?.clone() ?? null; }

    /** 所有强制召回应走此入口，施法结束后在Follow里执行。 */
    public RequestRecall(): void { this._recallPending = true; }

    private ResetCast(): void {
        this._cast = null; // 先使旧TrackEntry回调失效，避免clearTracks触发中断恢复。
        this._animation = '';
        this._animationRemaining = 0;
        this._followVelocity.set(0, 0, 0);
        if (isValid(this._spine, true)) {
            this._spine.timeScale = 1;
            this._spine.clearTracks();
        }
    }

    protected GetSkillCondition(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): string {
        return skill.Kind === '被动' ? '被动技能' : this.CanUseSkill(index, skill) ? '满足' : '没有可用目标';
    }

    private ResetFollow(): void {
        this._trail = [this.node.worldPosition.clone(), this.Owner.node.worldPosition.clone()];
        this._followVelocity.set(0, 0, 0);
        this._following = false;
    }

    private Follow(dt: number): void {
        if (dt <= 0 || this._cast) return;
        const config = ZRSJZ_PET_BATTLE_CONFIG;
        const owner = this.Owner.node.worldPosition;
        if (!this._trail.length) this.ResetFollow();
        if (this._recallPending || Vec3.distance(this.node.worldPosition, owner) > config.TeleportDistance) {
            this._recallPending = false;
            this.node.setWorldPosition(owner.clone().add3f(-config.FollowDistance, 60, 0));
            this.ResetFollow();
        }
        if (Vec3.distance(this._trail[this._trail.length - 1], owner) >= config.TrailSampleDistance) {
            this._trail.push(owner.clone());
            if (this._trail.length > 96) this._trail.shift();
        }
        // 沿玩家最近的真实轨迹回溯，转弯时不会瞬间从玩家一侧切换到另一侧。
        let target = owner.clone();
        let remaining = config.FollowDistance;
        for (let i = this._trail.length - 1; i >= 0; i--) {
            const previous = this._trail[i];
            const length = Vec3.distance(target, previous);
            if (length >= remaining && length > 0) {
                Vec3.lerp(target, target, previous, remaining / length);
                break;
            }
            remaining -= length;
            target.set(previous);
        }
        const pos = this.node.worldPosition.clone();
        const distance = Vec3.distance(pos, target);
        if (distance > config.FollowStartDistance) this._following = true;
        else if (distance < config.FollowStopDistance) this._following = false;
        const desired = new Vec3();
        if (this._following && distance > 0) {
            const speed = Math.min(Math.max(config.FollowSpeed, this.Owner.CurSpeed * 1.15), distance * 5);
            Vec3.subtract(desired, target, pos).multiplyScalar(speed / distance);
        }
        Vec3.lerp(this._followVelocity, this._followVelocity, desired, 1 - Math.exp(-config.FollowResponse * dt));
        const step = this._followVelocity.clone().multiplyScalar(dt);
        if (step.length() > distance && distance > 0) step.multiplyScalar(distance / step.length());
        this.node.setWorldPosition(pos.add(step));
        if (this._spine) {
            if (Math.abs(this._followVelocity.x) > 12) {
                const scale = this._spine.node.scale;
                this._spine.node.setScale(Math.abs(scale.x) * Math.sign(this._followVelocity.x), scale.y, scale.z);
            }
            this._hoverTime += dt;
            this._spine.node.setPosition(this._spineOrigin.x,
                this._spineOrigin.y + Math.sin(this._hoverTime * config.HoverFrequency) * config.HoverHeight, this._spineOrigin.z);
        }
        if (!this._cast && this._animationRemaining <= 0) this.PlayAnimation(this._followVelocity.length() > 20 ? 'yidong' : 'daiji');
    }

    protected PlayAnimation(name: string, loop = true): void {
        if (this.IsSuperArmor) return;
        if (!this._spine?.skeletonData || (loop && this._animation === name)) return;
        const animation = this._spine.skeletonData.getRuntimeData()?.findAnimation(name);
        if (!animation) return;
        this._animation = name;
        this._spine.timeScale = 1;
        this._spine.setAnimation(0, name, loop);
        this._animationRemaining = loop ? 0 : animation.duration;
    }

    public BeHit(damage: number): void {
        if (!this.CanRun() || this.Health <= 0 || !Number.isFinite(damage) || damage <= 0) return;
        this.Health = Math.max(0, this.Health - Math.max(1, Math.round(damage - this.Stats.Defense)));
        this._hp?.Show(this.Health);
        if (this.Health <= 0) {
            this.Die();
        } else if (!this.IsSuperArmor) this.PlayAnimation('shouji', false);
    }

    private Die(): void {
        if (this._deathStarted) return;
        this._deathStarted = true;
        this.Health = 0;
        this._hp?.Show(0);
        this.ResetCast();
        this.ClearEffects();
        if (isValid(this.Owner, true)) this.Owner.ClearPetShield(this);
        this._reviveRemaining = ZRSJZ_PET_BATTLE_CONFIG.ReviveSeconds;
        if (this._spine) this._spine.node.active = false;
    }

    protected HealSelf(amount: number): void {
        if (this.Health <= 0 || amount <= 0) return;
        this.Health = Math.min(this.Stats.HP, this.Health + Math.round(amount));
        this._hp?.Show(this.Health);
    }

    protected EnemiesInRange(center: Vec3, range: number): ZRSJZ_EnemyBase[] {
        return this._enemies.filter(enemy => isValid(enemy, true) && enemy.node.activeInHierarchy
            && !enemy.IsDead && Vec3.distance(center, enemy.node.worldPosition) <= range);
    }

    protected NearestEnemy(range: number): ZRSJZ_EnemyBase {
        return this.EnemiesInRange(this.node.worldPosition, range)
            .sort((a, b) => Vec3.distance(this.node.worldPosition, a.node.worldPosition)
                - Vec3.distance(this.node.worldPosition, b.node.worldPosition))[0] ?? null;
    }

    protected DamageArea(center: Vec3, skill: Readonly<ZRSJZ_PetBattleSkillConfig>, hits = 1): void {
        for (const enemy of this.EnemiesInRange(center, skill.Range ?? 300)) {
            for (let hit = 0; hit < hits && !enemy.IsDead; hit++) enemy.BeHit(Math.max(0, this.Stats.Attack * (skill.DamageMultiplier ?? 1)));
        }
    }

    /** 特效只由战斗update计时，暂停、死亡、退出时不会遗留schedule/tween伤害回调。 */
    protected Effect(name: string, position: Vec3, radius: number, color: Color, duration: number,
        tick: (node: Node, elapsed: number, dt: number) => void = null, complete: () => void = null): Node {
        const node = new Node(name);
        node.layer = this.node.layer;
        node.setParent(this.Game.CurMap.BulletParent ?? this.node.parent);
        node.setWorldPosition(position);
        const g = node.addComponent(Graphics);
        g.fillColor = new Color(color.r, color.g, color.b, 55);
        g.strokeColor = color;
        g.lineWidth = 4;
        g.circle(0, 0, radius);
        g.fill(); g.stroke();
        this.TrackEffect(node, duration, tick, complete);
        return node;
    }

    /** 实例化美术特效，保留预制体的缩放及子节点偏移，根节点位置由战斗目标确定。 */
    protected PrefabEffect(prefab: Prefab, position: Vec3, duration: number,
        tick: (node: Node, elapsed: number, dt: number) => void = null, cleanup: () => void = null,
        parent: Node = null): Node {
        if (!prefab) { console.warn(`[${this.PetName}] 未绑定技能特效预制体`); return null; }
        const node = instantiate(prefab);
        node.setParent(parent ?? this.Game.CurMap.BulletParent ?? this.node.parent);
        if (parent) node.setPosition(position);
        else node.setWorldPosition(position);
        const setLayer = (item: Node) => { item.layer = parent?.layer ?? this.node.layer; item.children.forEach(setLayer); };
        setLayer(node);
        node.active = true;
        for (const spine of node.getComponentsInChildren(sp.Skeleton)) {
            const data = spine.skeletonData?.getRuntimeData();
            // 纳米修复含入场和持续动画；其他特效使用预制体设置的默认动画。
            const loop = data?.findAnimation('loop') ? 'loop' : spine.animation;
            if (data?.findAnimation('in') && loop && loop !== 'in') {
                spine.setAnimation(0, 'in', false);
                spine.addAnimation(0, loop, true);
            } else if (loop && data?.findAnimation(loop)) spine.setAnimation(0, loop, true);
        }
        this.TrackEffect(node, duration, tick, null, cleanup);
        return node;
    }

    private TrackEffect(node: Node, duration: number, tick: (node: Node, elapsed: number, dt: number) => void,
        complete: () => void = null, cleanup: () => void = null): void {
        this._effects.push({ node, elapsed: 0, duration: Math.max(0.05, duration),
            tick: (elapsed, dt) => tick?.(node, elapsed, dt), complete, cleanup, spines: node.getComponentsInChildren(sp.Skeleton) });
    }

    protected RefreshEffectDuration(node: Node, duration: number): boolean {
        const effect = this._effects.find(item => item.node === node && isValid(node, true));
        if (!effect) return false;
        effect.duration = Math.max(effect.duration, effect.elapsed + duration);
        return true;
    }

    private UpdateEffects(dt: number): void {
        for (const effect of [...this._effects]) {
            if (!this._effects.includes(effect)) continue;
            effect.elapsed = Math.min(effect.duration, effect.elapsed + dt);
            if (isValid(effect.node, true)) effect.tick(effect.elapsed, dt);
            if (!isValid(effect.node, true) || effect.elapsed >= effect.duration) {
                this._effects.splice(this._effects.indexOf(effect), 1);
                if (isValid(effect.node, true) && effect.elapsed >= effect.duration) effect.complete?.();
                effect.cleanup?.();
                if (isValid(effect.node, true)) effect.node.destroy();
            }
        }
    }

    private ClearEffects(): void {
        const effects = this._effects.slice();
        this._effects.length = 0;
        for (const effect of effects) {
            effect.cleanup?.();
            if (isValid(effect.node, true)) effect.node.destroy();
        }
    }

    protected abstract NormalAttack(skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean;
    /** 只判断施法条件，不能在这里结算伤害、治疗或生成特效。 */
    protected abstract CanUseSkill(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean;
    protected abstract ActiveSkill(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean;
}
