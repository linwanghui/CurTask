import { _decorator, Color, isValid, Node, Prefab, sp, Vec3 } from 'cc';
import { ZRSJZ_PetBase } from './ZRSJZ_PetBase';
import { ZRSJZ_PetBattleSkillConfig } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PetDragon')
export class ZRSJZ_PetDragon extends ZRSJZ_PetBase {
    @property(Prefab) BoltPrefab: Prefab = null;
    @property(Prefab) MeteorPrefab: Prefab = null;
    @property(Prefab) NovaPrefab: Prefab = null;

    protected GetSkillFacingTarget(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): Node {
        return index === 1 ? null : this.NearestEnemy(skill.Range ?? 400)?.node ?? null;
    }

    protected CanUseSkill(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean {
        const prefab = index === 0 ? this.BoltPrefab : index === 2 ? this.MeteorPrefab : this.NovaPrefab;
        return !!prefab && !!this.NearestEnemy(skill.Range ?? 400);
    }
    protected GetSkillCondition(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): string {
        if (index === 1) return '出战被动';
        const prefab = index === 0 ? this.BoltPrefab : index === 2 ? this.MeteorPrefab : this.NovaPrefab;
        return !prefab ? '未绑定技能预制体' : this.NearestEnemy(skill.Range ?? 400) ? '满足' : '范围内没有敌人';
    }

    private PlayEffect(node: Node, name: string, loop: boolean): void {
        for (const spine of node.getComponentsInChildren(sp.Skeleton)) {
            if (spine.skeletonData?.getRuntimeData()?.findAnimation(name)) spine.setAnimation(0, name, loop);
        }
    }

    protected NormalAttack(skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean {
        const target = this.NearestEnemy(skill.Range ?? 400);
        if (!target || !this.BoltPrefab) return false;
        const origin = this.GetBoltOrigin(skill);
        if (!origin) return false;
        let hit = false;
        let impactElapsed = 0;
        const impactDuration = skill.ImpactDuration ?? 0.25;
        const effect = this.PrefabEffect(this.BoltPrefab, origin, skill.ProjectileLifetime ?? 2,
            (node, _, dt) => {
                if (hit) {
                    impactElapsed += dt;
                    if (impactElapsed >= impactDuration) node.destroy();
                    return;
                }
                if (!isValid(target, true) || !target.node.activeInHierarchy || target.IsDead) { node.destroy(); return; }
                const pos = node.worldPosition.clone();
                const end = target.node.worldPosition;
                const distance = Vec3.distance(pos, end);
                const step = (skill.ProjectileSpeed ?? 900) * dt;
                if (distance <= step + 20) {
                    hit = true;
                    node.setWorldPosition(end);
                    node.angle = 0;
                    this.PlayEffect(node, 'baozha', false);
                    this.RefreshEffectDuration(node, impactDuration);
                    for (let i = 0; i < (skill.HitCount ?? 1) && !target.IsDead; i++) {
                        target.BeHit(this.Stats.Attack * (skill.DamageMultiplier ?? 1));
                    }
                } else {
                    node.angle = Math.atan2(end.y - pos.y, end.x - pos.x) * 180 / Math.PI;
                    Vec3.lerp(pos, pos, end, step / distance);
                    node.setWorldPosition(pos);
                }
            });
        if (effect) {
            const end = target.node.worldPosition;
            effect.angle = Math.atan2(end.y - origin.y, end.x - origin.x) * 180 / Math.PI;
            this.PlayEffect(effect, 'zidan', true);
        }
        return !!effect;
    }

    private GetBoltOrigin(skill: Readonly<ZRSJZ_PetBattleSkillConfig>): Vec3 | null {
        const spine = this.getComponentInChildren(sp.Skeleton);
        const bone = spine?.findBone(skill.ProjectileBone ?? '球');
        if (!bone) {
            console.warn('[星核幼龙] 找不到魔弹嘴部骨骼', skill.ProjectileBone ?? '球');
            return null;
        }
        // Spine worldX/worldY 是骨架局部坐标，节点矩阵同时包含朝向翻转、缩放和浮动偏移。
        return Vec3.transformMat4(new Vec3(), new Vec3(bone.worldX, bone.worldY, 0), spine.node.worldMatrix);
    }

    protected ActiveSkill(index: number, skill: Readonly<ZRSJZ_PetBattleSkillConfig>): boolean {
        const target = this.NearestEnemy(skill.Range ?? 400);
        const center = this.GetCastTargetPosition() ?? target?.node.worldPosition.clone();
        if (!center) return false;
        const duration = skill.Duration ?? 3;
        if (index === 2) {
            if (!this.MeteorPrefab) return false;
            const interval = Math.max(0.1, skill.TickInterval ?? 1);
            const count = Math.max(1, Math.floor(duration / interval));
            const lifetime = Math.max(0.1, skill.MeteorLifetime ?? 1.2);
            const radius = Math.max(0, skill.Range ?? 800);
            const impactRadius = Math.min(radius, Math.max(0, skill.ImpactRadius ?? 120));
            let spawned = 0;
            const spawn = () => {
                // sqrt使落点在圆内面积均匀分布，并保证伤害圆也位于显示范围内。
                const distance = Math.sqrt(Math.random()) * Math.max(0, radius - impactRadius);
                const angle = Math.random() * Math.PI * 2;
                const point = center.clone().add3f(Math.cos(angle) * distance, Math.sin(angle) * distance, 0);
                this.DropMeteor(point, skill, impactRadius, lifetime);
                spawned++;
            };
            this.Effect('星陨范围', center, radius, new Color(190, 110, 255), (count - 1) * interval + lifetime,
                (_, elapsed) => {
                    while (spawned < count && elapsed >= spawned * interval) spawn();
                });
            spawn();
            return true;
        }
        if (index === 3) {
            if (!this.NovaPrefab) return false;
            let exploded = false;
            const node = this.PrefabEffect(this.NovaPrefab, center, Math.max(duration, skill.EffectDuration ?? duration),
                (_, elapsed, dt) => {
                    if (exploded) return;
                    const pullDt = Math.max(0, Math.min(dt, duration - (elapsed - dt)));
                    for (const enemy of this.EnemiesInRange(center, skill.Range ?? 450)) {
                        enemy.ApplyPetPull(center, (skill.PullSpeed ?? 220) * pullDt);
                    }
                    if (elapsed >= duration) {
                        exploded = true;
                        this.DamageArea(center, skill, skill.HitCount ?? 1);
                    }
                });
            if (node) this.PlayEffect(node, 'jineng', false);
            return !!node;
        }
        return false;
    }
    private DropMeteor(point: Vec3, skill: Readonly<ZRSJZ_PetBattleSkillConfig>, radius: number, lifetime: number): void {
        let applied = false;
        const node = this.PrefabEffect(this.MeteorPrefab, point, lifetime);
        if (!node) return;
        const spine = node.getComponentInChildren(sp.Skeleton);
        const animation = spine?.skeletonData?.getRuntimeData()?.findAnimation('jineng');
        if (!spine || !animation) { node.destroy(); console.warn('[星核幼龙] 星陨特效缺少jineng动画'); return; }
        if (spine.isAnimationCached()) spine.setAnimationCacheMode(sp.Skeleton.AnimationCacheMode.REALTIME);
        spine.timeScale = animation.duration / lifetime;
        const track = spine.setAnimation(0, 'jineng', false);
        if (!track) { node.destroy(); return; }
        spine.setTrackEventListener(track, (_entry, event) => {
            if (!isValid(node, true) || !this.CanRun() || typeof event === 'number') return;
            if (applied || event?.data?.name !== (skill.ImpactEvent ?? 'hit')) return;
            // 落地爆炸这一刻查询敌人位置，不预判下落过程，也不延迟到下一次特效更新。
            applied = true;
            this.DamageArea(node.worldPosition.clone(), { ...skill, Range: radius }, skill.HitCount ?? 1);
        });
    }

}
