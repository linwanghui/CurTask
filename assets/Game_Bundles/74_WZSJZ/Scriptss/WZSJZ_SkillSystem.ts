import { _decorator, Component, instantiate, Node, NodePool, Prefab, sp, UITransform, Vec2, Vec3 } from 'cc';
import { WZSJZ_Bullet_XunHanHuoJian } from './WZSJZ_Bullet_XunHanHuoJian';
import { WZSJZ_CommonEffectSystem } from './WZSJZ_CommonEffectSystem';
import { WZSJZ_Constant, WZSJZ_SkillConfig } from './WZSJZ_Constant';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_NameCombination } from './WZSJZ_NameCombination';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_SkillButtom } from './WZSJZ_SkillButtom';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_Skill_ShenBoXianJing } from './技能/WZSJZ_Skill_ShenBoXianJing';
import { WZSJZ_Skill_ZhenDangMaiChong } from './技能/WZSJZ_Skill_ZhenDangMaiChong';
import { WZSJZ_Skill_DianCiZhiMang } from './技能/WZSJZ_Skill_DianCiZhiMang';
import { WZSJZ_Skill_HuiXuanFeiRen } from './技能/WZSJZ_Skill_HuiXuanFeiRen';
import { WZSJZ_Skill_DianCiLiChang } from './技能/WZSJZ_Skill_DianCiLiChang';
import { WZSJZ_Skill_ZhenDangFuChong } from './技能/WZSJZ_Skill_ZhenDangFuChong';
import { WZSJZ_Skill_ZhuiMingBaoZhu } from './技能/WZSJZ_Skill_ZhuiMingBaoZhu';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_DragIndicatorSystem } from './WZSJZ_DragIndicatorSystem';

const { ccclass } = _decorator;

interface WZSJZ_ActiveSkillButton {
    Config: WZSJZ_SkillConfig;
    ButtonNode: Node;
}

/** 根据场上的组合角色维护技能栏；多个角色拥有同一技能时只显示一个共享按钮。 */
@ccclass('WZSJZ_SkillSystem')
export class WZSJZ_SkillSystem extends Component {
    private _skillBar: Node = null;
    private _wallDisplayNode: Node = null;
    private _owners: WZSJZ_GameNode[] = [];
    private _buttonPrefabs: Map<string, Prefab> = new Map();
    private _activeButtons: WZSJZ_ActiveSkillButton[] = [];
    private _canvas: Node = null;
    private _enemyArea: Node = null;
    private _projectileLayer: Node = null;
    private _blockBridgeDogUltimatePrefab: Prefab = null;
    private _blockBridgeDogUltimatePool: NodePool = new NodePool();
    private _sonicTrapPrefab: Prefab = null;
    private _sonicTrapPool: NodePool = new NodePool();
    private _shockPulsePrefab: Prefab = null;
    private _shockPulsePool: NodePool = new NodePool();
    private _electromagneticBlindPrefab: Prefab = null;
    private _electromagneticBlindPool: NodePool = new NodePool();
    private _boomerangBladePrefab: Prefab = null;
    private _boomerangBladePool: NodePool = new NodePool();
    private _electromagneticFieldPrefab: Prefab = null;
    private _electromagneticFieldPool: NodePool = new NodePool();
    private _diveStrikePrefab: Prefab = null;
    private _diveStrikePool: NodePool = new NodePool();
    private _homingSpiderPrefab: Prefab = null;
    private _homingSpiderPool: NodePool = new NodePool();
    private _formationCells: WZSJZ_Cell[] = [];
    private _infiniteSkills: boolean = false;
    private _dragIndicatorSystem: WZSJZ_DragIndicatorSystem = null;

    protected onLoad(): void {
        this.node.on(
            WZSJZ_EventManager.组合单位变化,
            this.OnCombinationUnitsChanged,
            this,
        );
        this.node.on(
            WZSJZ_EventManager.修改无限技能,
            this.OnCheatToggleInfiniteSkills,
            this,
        );
    }

    protected onDestroy(): void {
        this._blockBridgeDogUltimatePool.clear();
        this._sonicTrapPool.clear();
        this._shockPulsePool.clear();
        this._electromagneticBlindPool.clear();
        this._boomerangBladePool.clear();
        this._electromagneticFieldPool.clear();
        this._diveStrikePool.clear();
        this._homingSpiderPool.clear();
    }

    public Configure(
        preparationZone: Node,
        wallDisplayNode: Node,
        canvas?: Node,
        formationCells: WZSJZ_Cell[] = [],
        dragIndicatorSystem?: WZSJZ_DragIndicatorSystem,
    ): void {
        this._skillBar = preparationZone?.getChildByName("技能栏") || null;
        this._wallDisplayNode = wallDisplayNode;
        this._canvas = canvas || preparationZone?.parent || null;
        this._enemyArea = this._canvas?.getChildByName("敌方单位") || null;
        this._formationCells = formationCells;
        this._dragIndicatorSystem = dragIndicatorSystem || null;
        this.SetupProjectileLayer();
        if (!this._skillBar) {
            console.error("[WZSJZ] 操作区下没有找到“技能栏”节点。");
            return;
        }
        for (const config of WZSJZ_Constant.CharacterSkills) {
            void this.PrepareSkillResources(config);
        }
        void this.PrepareBlockBridgeDogUltimate();
        void this.PrepareSonicTrap();
        void this.PrepareShockPulse();
        void this.PrepareElectromagneticBlind();
        void this.PrepareBoomerangBlade();
        void this.PrepareElectromagneticField();
        void this.PrepareDiveStrike();
        void this.PrepareHomingSpider();
        this.SyncSkillButtons();
    }

    private OnCombinationUnitsChanged(owners: WZSJZ_GameNode[]): void {
        this._owners = (owners || []).filter((owner) => !!owner?.node?.isValid);
        this.SyncSkillButtons();
    }

    private async PrepareSkillResources(config: WZSJZ_SkillConfig): Promise<void> {
        try {
            const effectSystem = WZSJZ_CommonEffectSystem.Instance;
            const effectRegistration = config.EffectName && config.EffectPrefabPath
                ? effectSystem?.RegisterEffect(
                    config.EffectName,
                    config.EffectPrefabPath,
                    config.Duration,
                    config.EffectPrewarm,
                ) || Promise.resolve(false)
                : Promise.resolve(true);
            const [buttonPrefab] = await Promise.all([
                WZSJZ_Incident.Loadprefab(config.ButtonPrefabPath),
                effectRegistration,
            ]);
            if (!this.node?.isValid) {
                return;
            }
            this._buttonPrefabs.set(this.GetConfigKey(config), buttonPrefab);
            this.SyncSkillButtons();
        } catch (error) {
            console.error(`[WZSJZ] 技能资源加载失败：${config.Id}`, error);
        }
    }

    private SyncSkillButtons(): void {
        if (!this._skillBar) {
            return;
        }
        const desiredConfigs = new Set<WZSJZ_SkillConfig>();
        for (const owner of this._owners) {
            if (!owner?.node?.isValid) {
                continue;
            }
            for (const config of this.GetOwnerSkillConfigs(owner)) {
                desiredConfigs.add(config);
            }
        }
        for (let index = this._activeButtons.length - 1; index >= 0; index--) {
            const entry = this._activeButtons[index];
            if (desiredConfigs.has(entry.Config)) {
                continue;
            }
            if (entry.ButtonNode?.isValid) {
                entry.ButtonNode.destroy();
            }
            this._activeButtons.splice(index, 1);
        }

        for (const config of desiredConfigs) {
            if (this._activeButtons.some((entry) => entry.Config === config)) {
                continue;
            }
            const prefab = this._buttonPrefabs.get(this.GetConfigKey(config));
            if (!prefab) {
                continue;
            }
            const buttonNode = instantiate(prefab);
            buttonNode.setParent(this._skillBar);
            buttonNode.setPosition(0, 0, 0);
            this.SetLayerRecursively(buttonNode, this._skillBar.layer);
            const button = buttonNode.getComponent(WZSJZ_SkillButtom)
                || buttonNode.addComponent(WZSJZ_SkillButtom);
            button.Configure(
                config.Cooldown,
                () => this.ExecuteSkill(config),
                this._infiniteSkills,
            );
            if (config.EffectType === "sonic_trap") {
                button.ConfigureTargeting(
                    (position) => this.BeginSonicTrapTargeting(
                        config,
                        buttonNode,
                        position,
                    ),
                    (position) => this._dragIndicatorSystem?.UpdateSkill(position),
                    (position, cancelled) => this.EndSonicTrapTargeting(
                        config,
                        position,
                        cancelled,
                    ),
                    () => WZSJZ_UIManager.Instance.ShowText("该技能需要拖动释放"),
                );
            } else if (config.EffectType === "electromagnetic_blind") {
                button.ConfigureTargeting(
                    (position) => this.BeginElectromagneticBlindTargeting(
                        config,
                        buttonNode,
                        position,
                    ),
                    (position) => this._dragIndicatorSystem?.UpdateSkill(position),
                    (position, cancelled) => this.EndElectromagneticBlindTargeting(
                        config,
                        position,
                        cancelled,
                    ),
                    () => WZSJZ_UIManager.Instance.ShowText("该技能需要拖动释放"),
                );
            }
            this._activeButtons.push({ Config: config, ButtonNode: buttonNode });
        }
    }

    private OnCheatToggleInfiniteSkills(): void {
        this._infiniteSkills = !this._infiniteSkills;
        for (const entry of this._activeButtons) {
            entry.ButtonNode?.getComponent(WZSJZ_SkillButtom)
                ?.SetInfiniteCooldown(this._infiniteSkills);
        }
        WZSJZ_UIManager.Instance.ShowText(
            this._infiniteSkills ? "无限技能已开启" : "无限技能已关闭",
        );
    }

    private ExecuteSkill(config: WZSJZ_SkillConfig): boolean {
        switch (config.EffectType) {
            case "wall_invincible": {
                const wall = this._wallDisplayNode?.getComponent(WZSJZ_Wall);
                if (!wall?.IsAlive) {
                    WZSJZ_UIManager.Instance.ShowText("当前没有可保护的围墙");
                    return false;
                }
                wall.SetInvincible(config.Duration);
                WZSJZ_CommonEffectSystem.Instance?.Play(
                    config.EffectName,
                    wall.node.worldPosition,
                    config.Duration,
                );
                return true;
            }
            case "wall_heal": {
                const wall = this._wallDisplayNode?.getComponent(WZSJZ_Wall);
                if (!wall?.IsAlive) {
                    WZSJZ_UIManager.Instance.ShowText("当前没有可修复的围墙");
                    return false;
                }
                const owner = this._owners
                    .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
                    .sort((left, right) => right.Level - left.Level)[0];
                if (!owner) {
                    return false;
                }
                const healed = wall.Heal(WZSJZ_Constant.GetNanoRepairHeal(owner.Level));
                if (healed <= 0) {
                    WZSJZ_UIManager.Instance.ShowText("城墙生命值已满");
                    return false;
                }
                WZSJZ_CommonEffectSystem.Instance?.Play(
                    config.EffectName,
                    wall.node.worldPosition,
                    config.Duration,
                );
                return true;
            }
            case "adjacent_overclock":
                return this.CastAdjacentOverclock(config);
            case "block_bridge_dog_artillery":
                return this.CastBlockBridgeDogArtillery(config);
            case "sonic_trap":
                return this.CastSonicTrap(config);
            case "shock_pulse":
                return this.CastShockPulse(config);
            case "self_attack_speed":
                return this.CastSelfAttackSpeed(config);
            case "electromagnetic_blind":
                // 该技能只通过拖拽回调释放，单击不会走普通施法入口。
                return false;
            case "boomerang_blades":
                return this.CastBoomerangBlades(config);
            case "electromagnetic_field":
                return this.CastElectromagneticField(config);
            case "dive_strike":
                return this.CastDiveStrike(config);
            case "homing_spider":
                return this.CastHomingSpider(config);
            default:
                return false;
        }
    }

    private CastAdjacentOverclock(config: WZSJZ_SkillConfig): boolean {
        const owner = this._owners
            .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
            .sort((left, right) => right.Level - left.Level)[0];
        if (!owner?.CurrentCell || this._formationCells.length <= 0) {
            return false;
        }
        const targets = this.GetNeighborUnits(owner);
        let appliedCount = 0;
        for (const target of targets) {
            const overclock = WZSJZ_Constant.OverclockCommand;
            if (!target.ApplyOverclock(
                overclock.Duration,
                overclock.AttackDamageMultiplier,
                overclock.ProductionMultiplier,
            )) {
                continue;
            }
            appliedCount++;
            WZSJZ_CommonEffectSystem.Instance?.PlayAttached(
                config.EffectName,
                target.node,
                overclock.Duration,
                true,
            );
        }
        if (appliedCount <= 0) {
            WZSJZ_UIManager.Instance.ShowText("周围没有可超频的单位");
            return false;
        }
        return true;
    }

    private CastSelfAttackSpeed(config: WZSJZ_SkillConfig): boolean {
        const owner = this._owners
            .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
            .sort((left, right) => right.Level - left.Level)[0];
        if (!owner?.ApplyAttackSpeedBuff(
            WZSJZ_Constant.HuntProtocol.Duration,
            WZSJZ_Constant.HuntProtocol.AttackSpeedMultiplier,
        )) {
            return false;
        }
        const combination = owner.node.getComponent(WZSJZ_NameCombination);
        const effectTargets = combination?.GetPartEffectTargets() || [owner.node];
        for (const target of effectTargets) {
            WZSJZ_CommonEffectSystem.Instance?.PlayAttached(
                config.EffectName,
                target,
                config.Duration,
                true,
            );
        }
        const skeleton = owner.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setAnimation(0, WZSJZ_Constant.HuntProtocol.SkillAnimation, false);
            skeleton.addAnimation(0, WZSJZ_Constant.HuntProtocol.IdleAnimation, true, 0);
        }
        return true;
    }

    private GetNeighborUnits(owner: WZSJZ_GameNode): WZSJZ_GameNode[] {
        const columns = WZSJZ_Constant.NameUnit.FormationColumns;
        const recipe = WZSJZ_Constant.NameCombinations
            .find((item) => item.Name === owner.Name);
        const span = Math.max(1, recipe?.Parts.length || 1);
        const startIndex = owner.CurrentCell.Index;
        const row = Math.floor(startIndex / columns);
        const startColumn = startIndex % columns;
        const endColumn = startColumn + span - 1;
        const range = Math.max(0, WZSJZ_Constant.OverclockCommand.NeighborRange);
        const rowCount = Math.ceil(this._formationCells.length / columns);
        const occupiedIndexes = new Set<number>();
        for (let offset = 0; offset < span; offset++) {
            occupiedIndexes.add(startIndex + offset);
        }

        const result = new Set<WZSJZ_GameNode>();
        for (let targetRow = Math.max(0, row - range);
            targetRow <= Math.min(rowCount - 1, row + range);
            targetRow++) {
            for (let column = Math.max(0, startColumn - range);
                column <= Math.min(columns - 1, endColumn + range);
                column++) {
                const index = targetRow * columns + column;
                if (occupiedIndexes.has(index)) {
                    continue;
                }
                const cell = this._formationCells.find((item) => item.Index === index);
                if (!cell?.IsUnlocked || cell.IsEmpty()) {
                    continue;
                }
                const target = this.ResolveDisplayedUnitAtCell(cell);
                if (target?.node?.isValid && target !== owner) {
                    result.add(target);
                }
            }
        }
        return Array.from(result);
    }

    /** 组合占格中的隐藏文字要解析成组合表现，避免Buff加在不可见子文字上。 */
    private ResolveDisplayedUnitAtCell(cell: WZSJZ_Cell): WZSJZ_GameNode | null {
        for (const combination of this._owners) {
            const recipe = WZSJZ_Constant.NameCombinations
                .find((item) => item.Name === combination.Name);
            const startIndex = combination.CurrentCell?.Index ?? -1;
            const span = recipe?.Parts.length || 1;
            if (startIndex >= 0
                && Math.floor(startIndex / WZSJZ_Constant.NameUnit.FormationColumns)
                    === Math.floor(cell.Index / WZSJZ_Constant.NameUnit.FormationColumns)
                && cell.Index >= startIndex
                && cell.Index < startIndex + span) {
                return combination;
            }
        }
        return cell.Occupant?.getComponent('WZSJZ_GameNode') as WZSJZ_GameNode || null;
    }

    private async PrepareBlockBridgeDogUltimate(): Promise<void> {
        try {
            this._blockBridgeDogUltimatePrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BlockBridgeDogUltimate.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 堵桥狗大招炮弹预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._blockBridgeDogUltimatePrefab) {
            return;
        }
        while (this._blockBridgeDogUltimatePool.size()
            < WZSJZ_Constant.ObjectPool.BlockBridgeDogUltimatePrewarm) {
            this._blockBridgeDogUltimatePool.put(instantiate(this._blockBridgeDogUltimatePrefab));
        }
    }

    private async PrepareSonicTrap(): Promise<void> {
        try {
            this._sonicTrapPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.SonicTrap.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 声波陷阱预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._sonicTrapPrefab) {
            return;
        }
        while (this._sonicTrapPool.size() < WZSJZ_Constant.ObjectPool.SonicTrapPrewarm) {
            this._sonicTrapPool.put(instantiate(this._sonicTrapPrefab));
        }
    }

    private async PrepareShockPulse(): Promise<void> {
        try {
            this._shockPulsePrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.ShockPulse.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 震荡脉冲特效预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._shockPulsePrefab) {
            return;
        }
        while (this._shockPulsePool.size() < WZSJZ_Constant.ObjectPool.ShockPulsePrewarm) {
            this._shockPulsePool.put(instantiate(this._shockPulsePrefab));
        }
    }

    private async PrepareElectromagneticBlind(): Promise<void> {
        try {
            this._electromagneticBlindPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.ElectromagneticBlind.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 电磁致盲特效预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._electromagneticBlindPrefab) {
            return;
        }
        while (this._electromagneticBlindPool.size()
            < WZSJZ_Constant.ObjectPool.ElectromagneticBlindPrewarm) {
            this._electromagneticBlindPool.put(
                instantiate(this._electromagneticBlindPrefab),
            );
        }
    }

    private async PrepareBoomerangBlade(): Promise<void> {
        try {
            this._boomerangBladePrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.BoomerangBlades.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 回旋飞刃特效预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._boomerangBladePrefab) {
            return;
        }
        while (this._boomerangBladePool.size()
            < WZSJZ_Constant.ObjectPool.BoomerangBladePrewarm) {
            this._boomerangBladePool.put(instantiate(this._boomerangBladePrefab));
        }
    }

    private async PrepareElectromagneticField(): Promise<void> {
        try {
            this._electromagneticFieldPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.ElectromagneticField.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 电磁力场特效预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._electromagneticFieldPrefab) return;
        while (this._electromagneticFieldPool.size()
            < WZSJZ_Constant.ObjectPool.ElectromagneticFieldPrewarm) {
            this._electromagneticFieldPool.put(
                instantiate(this._electromagneticFieldPrefab),
            );
        }
    }

    private async PrepareDiveStrike(): Promise<void> {
        try {
            this._diveStrikePrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.DiveStrike.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 震荡俯冲特效预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._diveStrikePrefab) {
            return;
        }
        while (this._diveStrikePool.size()
            < WZSJZ_Constant.ObjectPool.DiveStrikePrewarm) {
            this._diveStrikePool.put(instantiate(this._diveStrikePrefab));
        }
    }

    private async PrepareHomingSpider(): Promise<void> {
        try {
            this._homingSpiderPrefab = await WZSJZ_Incident.Loadprefab(
                WZSJZ_Constant.HomingSpider.PrefabPath,
            );
        } catch (error) {
            console.error("[WZSJZ] 夺命小蜘蛛预制体加载失败。", error);
        }
        if (!this.node?.isValid || !this._homingSpiderPrefab) {
            return;
        }
        while (this._homingSpiderPool.size()
            < WZSJZ_Constant.ObjectPool.HomingSpiderPrewarm) {
            this._homingSpiderPool.put(instantiate(this._homingSpiderPrefab));
        }
    }

    private CastBlockBridgeDogArtillery(config: WZSJZ_SkillConfig): boolean {
        if (!this._blockBridgeDogUltimatePrefab || !this._enemyArea || !this._projectileLayer) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const owner = this._owners.find((item) => item?.node?.isValid
            && item.Name === config.OwnerName);
        if (!owner) {
            return false;
        }
        const positions = this.BuildArtilleryTargetPositions();
        if (positions.length <= 0) {
            return false;
        }
        const receiveExperience = owner.CreateExperienceReceiver();
        let spawnedCount = 0;
        for (const position of positions) {
            if (this.SpawnBlockBridgeDogUltimate(
                position,
                () => receiveExperience(WZSJZ_Constant.BlockBridgeDogUltimate.KillExperience),
            )) {
                spawnedCount++;
            }
        }
        return spawnedCount > 0;
    }

    private BuildArtilleryTargetPositions(): Vec3[] {
        const config = WZSJZ_Constant.BlockBridgeDogUltimate;
        const liveEnemyPositions = this._enemyArea.children
            .filter((child) => child.getComponent(WZSJZ_Enemy)?.IsAlive)
            .map((child) => child.worldPosition.clone());
        // 洗牌后取目标，避免每次都固定轰炸children数组前面的敌人。
        for (let index = liveEnemyPositions.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [liveEnemyPositions[index], liveEnemyPositions[randomIndex]]
                = [liveEnemyPositions[randomIndex], liveEnemyPositions[index]];
        }
        const result = liveEnemyPositions.slice(0, config.StrikeCount);
        while (result.length < config.StrikeCount) {
            result.push(this.GetRandomEnemyAreaWorldPosition());
        }
        return result;
    }

    private GetRandomEnemyAreaWorldPosition(
        padding: number = WZSJZ_Constant.BlockBridgeDogUltimate.RandomPositionPadding,
    ): Vec3 {
        const transform = this._enemyArea?.getComponent(UITransform);
        if (!transform) {
            const center = this._enemyArea?.worldPosition || Vec3.ZERO;
            return new Vec3(
                center.x + (Math.random() - 0.5) * 500,
                center.y + (Math.random() - 0.5) * 500,
                center.z,
            );
        }
        const bounds = transform.getBoundingBoxToWorld();
        const minX = bounds.xMin + Math.min(padding, bounds.width * 0.5);
        const maxX = bounds.xMax - Math.min(padding, bounds.width * 0.5);
        const minY = bounds.yMin + Math.min(padding, bounds.height * 0.5);
        const maxY = bounds.yMax - Math.min(padding, bounds.height * 0.5);
        return new Vec3(
            minX + Math.random() * Math.max(0, maxX - minX),
            minY + Math.random() * Math.max(0, maxY - minY),
            this._enemyArea.worldPosition.z,
        );
    }

    private SpawnBlockBridgeDogUltimate(position: Vec3, onKill: () => void): boolean {
        const projectileNode = this._blockBridgeDogUltimatePool.get()
            || instantiate(this._blockBridgeDogUltimatePrefab);
        projectileNode.setParent(this._projectileLayer);
        projectileNode.setWorldPosition(position);
        projectileNode.angle = 0;
        this.SetLayerRecursively(projectileNode, this._projectileLayer.layer);
        const projectile = projectileNode.getComponent(WZSJZ_Bullet_XunHanHuoJian)
            || projectileNode.addComponent(WZSJZ_Bullet_XunHanHuoJian);
        const config = WZSJZ_Constant.BlockBridgeDogUltimate;
        if (!projectile.Initialize(
            this._enemyArea,
            config.Damage,
            config.DamageRadius,
            config.DamageTriggerDelay,
            config.RecycleDelay,
            config.AnimationName,
            this.RecycleBlockBridgeDogUltimate,
            onKill,
        )) {
            this._blockBridgeDogUltimatePool.put(projectileNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleBlockBridgeDogUltimate = (
        projectile: WZSJZ_Bullet_XunHanHuoJian,
    ): void => {
        if (projectile?.node?.isValid) {
            projectile.unscheduleAllCallbacks();
            this._blockBridgeDogUltimatePool.put(projectile.node);
        }
    };

    private CastSonicTrap(config: WZSJZ_SkillConfig): boolean {
        if (!this._sonicTrapPrefab || !this._enemyArea || !this._projectileLayer) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const hasOwner = this._owners.some((item) => item?.node?.isValid
            && item.Name === config.OwnerName);
        if (!hasOwner) {
            return false;
        }
        const liveEnemies = this._enemyArea.children
            .filter((child) => child.getComponent(WZSJZ_Enemy)?.IsAlive);
        const target = liveEnemies.length > 0
            ? liveEnemies[Math.floor(Math.random() * liveEnemies.length)].worldPosition.clone()
            : this.GetRandomEnemyAreaWorldPosition(
                WZSJZ_Constant.SonicTrap.RandomPositionPadding,
            );
        return this.SpawnSonicTrap(target);
    }

    private BeginSonicTrapTargeting(
        config: WZSJZ_SkillConfig,
        buttonNode: Node,
        initialPosition: Vec2,
    ): boolean {
        if (!this._sonicTrapPrefab || !this._enemyArea || !this._projectileLayer
            || !this._dragIndicatorSystem) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const hasOwner = this._owners.some((item) => item?.node?.isValid
            && item.Name === config.OwnerName);
        if (!hasOwner) {
            return false;
        }
        this._dragIndicatorSystem.BeginSkill(
            buttonNode.worldPosition,
            WZSJZ_Constant.SonicTrap.Radius,
        );
        this._dragIndicatorSystem.UpdateSkill(initialPosition);
        return true;
    }

    private EndSonicTrapTargeting(
        config: WZSJZ_SkillConfig,
        position: Vec2,
        cancelled: boolean,
    ): boolean {
        this._dragIndicatorSystem?.Clear();
        if (cancelled) {
            return false;
        }
        const hasOwner = this._owners.some((item) => item?.node?.isValid
            && item.Name === config.OwnerName);
        if (!hasOwner || !this._sonicTrapPrefab || !this._projectileLayer) {
            return false;
        }
        return this.SpawnSonicTrap(new Vec3(
            position.x,
            position.y,
            this._projectileLayer.worldPosition.z,
        ));
    }

    private SpawnSonicTrap(position: Vec3): boolean {
        const trapNode = this._sonicTrapPool.get() || instantiate(this._sonicTrapPrefab);
        trapNode.setParent(this._projectileLayer);
        trapNode.setWorldPosition(position);
        trapNode.angle = 0;
        this.SetLayerRecursively(trapNode, this._projectileLayer.layer);
        const trap = trapNode.getComponent(WZSJZ_Skill_ShenBoXianJing)
            || trapNode.addComponent(WZSJZ_Skill_ShenBoXianJing);
        const config = WZSJZ_Constant.SonicTrap;
        if (!trap.Initialize(
            this._enemyArea,
            config.Radius,
            config.PulseCount,
            config.PulseInterval,
            config.TremorDuration,
            config.AnimationName,
            this.RecycleSonicTrap,
        )) {
            this._sonicTrapPool.put(trapNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleSonicTrap = (trap: WZSJZ_Skill_ShenBoXianJing): void => {
        if (trap?.node?.isValid) {
            trap.unscheduleAllCallbacks();
            trap.node.active = false;
            this._sonicTrapPool.put(trap.node);
        }
    };

    private BeginElectromagneticBlindTargeting(
        config: WZSJZ_SkillConfig,
        buttonNode: Node,
        initialPosition: Vec2,
    ): boolean {
        if (!this._electromagneticBlindPrefab || !this._enemyArea
            || !this._projectileLayer || !this._dragIndicatorSystem) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const hasOwner = this._owners.some((item) => item?.node?.isValid
            && item.Name === config.OwnerName);
        if (!hasOwner) {
            return false;
        }
        this._dragIndicatorSystem.BeginSkill(
            buttonNode.worldPosition,
            WZSJZ_Constant.ElectromagneticBlind.Radius,
        );
        this._dragIndicatorSystem.UpdateSkill(initialPosition);
        return true;
    }

    private EndElectromagneticBlindTargeting(
        config: WZSJZ_SkillConfig,
        position: Vec2,
        cancelled: boolean,
    ): boolean {
        this._dragIndicatorSystem?.Clear();
        if (cancelled || !this._electromagneticBlindPrefab || !this._projectileLayer) {
            return false;
        }
        const owner = this._owners
            .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
            .sort((left, right) => right.Level - left.Level)[0];
        if (!owner) {
            return false;
        }
        const skeleton = owner.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setAnimation(
                0,
                WZSJZ_Constant.ElectromagneticBlind.SkillAnimation,
                false,
            );
            skeleton.addAnimation(
                0,
                WZSJZ_Constant.ElectromagneticBlind.IdleAnimation,
                true,
                0,
            );
        }
        return this.SpawnElectromagneticBlind(
            owner,
            new Vec3(position.x, position.y, this._projectileLayer.worldPosition.z),
        );
    }

    private SpawnElectromagneticBlind(owner: WZSJZ_GameNode, position: Vec3): boolean {
        const effectNode = this._electromagneticBlindPool.get()
            || instantiate(this._electromagneticBlindPrefab);
        effectNode.setParent(this._projectileLayer);
        effectNode.setWorldPosition(position);
        effectNode.angle = 0;
        this.SetLayerRecursively(effectNode, this._projectileLayer.layer);
        const effect = effectNode.getComponent(WZSJZ_Skill_DianCiZhiMang)
            || effectNode.addComponent(WZSJZ_Skill_DianCiZhiMang);
        const config = WZSJZ_Constant.ElectromagneticBlind;
        const receiveExperience = owner.CreateExperienceReceiver();
        if (!effect.Initialize(
            this._enemyArea,
            config.Radius,
            config.EffectDuration,
            config.DamageInterval,
            WZSJZ_Constant.GetElectromagneticBlindDamage(owner.Level),
            config.BlindDuration,
            config.AnimationName,
            this.RecycleElectromagneticBlind,
            () => receiveExperience(config.KillExperience),
        )) {
            this._electromagneticBlindPool.put(effectNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleElectromagneticBlind = (
        effect: WZSJZ_Skill_DianCiZhiMang,
    ): void => {
        if (!effect?.node?.isValid) {
            return;
        }
        effect.node.active = false;
        this._electromagneticBlindPool.put(effect.node);
    };

    private CastBoomerangBlades(config: WZSJZ_SkillConfig): boolean {
        if (!this._boomerangBladePrefab || !this._enemyArea || !this._projectileLayer) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const owner = this._owners
            .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
            .sort((left, right) => right.Level - left.Level)[0];
        if (!owner) {
            return false;
        }
        const bladeConfig = WZSJZ_Constant.BoomerangBlades;
        const launchNode = owner.node.getChildByName(bladeConfig.LaunchNodeName)
            || owner.node;
        const skeleton = owner.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setAnimation(0, bladeConfig.SkillAnimation, false);
            skeleton.addAnimation(0, bladeConfig.IdleAnimation, true, 0);
        }
        // 三枚飞刃共享两组记录，所以单个敌人整次技能最多去程一次、返程一次。
        const outboundHits = new Set<WZSJZ_Enemy>();
        const returnHits = new Set<WZSJZ_Enemy>();
        const receiveExperience = owner.CreateExperienceReceiver();
        let spawnedCount = 0;
        for (const angle of bladeConfig.AnglesDegrees) {
            if (this.SpawnBoomerangBlade(
                launchNode.worldPosition,
                angle,
                WZSJZ_Constant.GetBoomerangBladeDamage(owner.Level),
                outboundHits,
                returnHits,
                () => receiveExperience(bladeConfig.KillExperience),
            )) {
                spawnedCount++;
            }
        }
        return spawnedCount > 0;
    }

    private SpawnBoomerangBlade(
        origin: Vec3,
        angleDegrees: number,
        damage: number,
        outboundHits: Set<WZSJZ_Enemy>,
        returnHits: Set<WZSJZ_Enemy>,
        onKill: () => void,
    ): boolean {
        const bladeNode = this._boomerangBladePool.get()
            || instantiate(this._boomerangBladePrefab);
        // 兼容热更新前对象池里已经缓存的实例：缺失脚本会被Cocos反序列化为null。
        this.RemoveMissingComponents(bladeNode);
        bladeNode.setParent(this._projectileLayer);
        bladeNode.setWorldPosition(origin);
        this.SetLayerRecursively(bladeNode, this._projectileLayer.layer);
        const radians = angleDegrees * Math.PI / 180;
        const direction = new Vec3(Math.cos(radians), Math.sin(radians), 0);
        const blade = bladeNode.getComponent(WZSJZ_Skill_HuiXuanFeiRen);
        if (!blade) {
            console.error("[WZSJZ] 回旋飞刃预制体根节点缺少WZSJZ_Skill_HuiXuanFeiRen脚本。");
            bladeNode.active = false;
            this._boomerangBladePool.put(bladeNode);
            return false;
        }
        const config = WZSJZ_Constant.BoomerangBlades;
        if (!blade.Initialize(
            this._enemyArea,
            origin,
            direction,
            config.Speed,
            config.MaxTravelDistance,
            config.ReturnDistance,
            damage,
            config.AnimationName,
            outboundHits,
            returnHits,
            this.RecycleBoomerangBlade,
            onKill,
            (position) => WZSJZ_CommonEffectSystem.Instance?.PlayBlueExplosion(position),
        )) {
            this._boomerangBladePool.put(bladeNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleBoomerangBlade = (blade: WZSJZ_Skill_HuiXuanFeiRen): void => {
        if (!blade?.node?.isValid) {
            return;
        }
        blade.node.active = false;
        this._boomerangBladePool.put(blade.node);
    };

    private CastElectromagneticField(config: WZSJZ_SkillConfig): boolean {
        if (!this._electromagneticFieldPrefab || !this._enemyArea || !this._projectileLayer) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const owner = this._owners
            .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
            .sort((left, right) => right.Level - left.Level)[0];
        if (!owner) return false;
        const liveEnemies = this._enemyArea.children
            .map((child) => child.getComponent(WZSJZ_Enemy))
            .filter((enemy) => !!enemy?.IsAlive);
        for (let index = liveEnemies.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [liveEnemies[index], liveEnemies[randomIndex]]
                = [liveEnemies[randomIndex], liveEnemies[index]];
        }

        const fieldConfig = WZSJZ_Constant.ElectromagneticField;
        const skeleton = owner.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        const castDuration = Math.max(
            0.01,
            skeleton?.findAnimation(fieldConfig.SkillAnimation)?.duration
                || fieldConfig.CastAnimationDuration,
        );
        if (skeleton) {
            skeleton.setAnimation(0, fieldConfig.SkillAnimation, false);
            skeleton.addAnimation(0, fieldConfig.IdleAnimation, true, 0);
        }
        // 技能动作期间占用自身攻击冷却，防止普通攻击动画覆盖jineng。
        owner.StartAttackCooldown(castDuration);
        const ownerLevel = owner.Level;
        const receiveExperience = owner.CreateExperienceReceiver();
        this.scheduleOnce(() => {
            if (!this.node?.isValid || !this._enemyArea?.isValid) return;
            const targets = this._enemyArea.children
                .map((child) => child.getComponent(WZSJZ_Enemy))
                .filter((enemy) => !!enemy?.IsAlive);
            // 超过五名时洗牌抽取，避免总是命中children数组最前面的单位。
            for (let index = targets.length - 1; index > 0; index--) {
                const randomIndex = Math.floor(Math.random() * (index + 1));
                [targets[index], targets[randomIndex]] = [targets[randomIndex], targets[index]];
            }
            for (const target of targets.slice(0, fieldConfig.MaxTargetCount)) {
                this.SpawnElectromagneticField(
                    target,
                    ownerLevel,
                    () => receiveExperience(fieldConfig.KillExperience),
                );
            }
        }, castDuration);
        return true;
    }

    private SpawnElectromagneticField(
        target: WZSJZ_Enemy,
        ownerLevel: number,
        onKill: () => void,
    ): boolean {
        if (!target?.IsAlive || !this._electromagneticFieldPrefab) return false;
        const config = WZSJZ_Constant.ElectromagneticField;
        const effectNode = this._electromagneticFieldPool.get()
            || instantiate(this._electromagneticFieldPrefab);
        const targetPosition = target.node.worldPosition.clone();
        effectNode.setParent(this._projectileLayer);
        effectNode.setWorldPosition(targetPosition);
        effectNode.angle = 0;
        this.SetLayerRecursively(effectNode, this._projectileLayer.layer);
        const effect = effectNode.getComponent(WZSJZ_Skill_DianCiLiChang);
        if (!effect) {
            console.error("[WZSJZ] 技能电磁力场特效缺少WZSJZ_Skill_DianCiLiChang脚本。");
            effectNode.active = false;
            this._electromagneticFieldPool.put(effectNode);
            return false;
        }
        const damageIndex = Math.max(
            0,
            Math.min(config.DamagePerPulseByLevel.length - 1, ownerLevel - 1),
        );
        if (!effect.Initialize(
            this._enemyArea,
            targetPosition,
            config.Radius,
            config.DamagePerPulseByLevel[damageIndex],
            config.DamageDelays,
            config.AnimationName,
            config.AnimationFallbackDuration,
            this.RecycleElectromagneticField,
            onKill,
        )) {
            effectNode.active = false;
            this._electromagneticFieldPool.put(effectNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleElectromagneticField = (
        effect: WZSJZ_Skill_DianCiLiChang,
    ): void => {
        if (!effect?.node?.isValid) return;
        effect.node.active = false;
        this._electromagneticFieldPool.put(effect.node);
    };

    private CastDiveStrike(config: WZSJZ_SkillConfig): boolean {
        if (!this._diveStrikePrefab || !this._enemyArea || !this._projectileLayer) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const owner = this._owners
            .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
            .sort((left, right) => right.Level - left.Level)[0];
        if (!owner) {
            return false;
        }

        const targets = this._enemyArea.children
            .map((child) => child.getComponent(WZSJZ_Enemy))
            .filter((enemy) => !!enemy?.IsAlive);
        if (targets.length <= 0) {
            WZSJZ_UIManager.Instance.ShowText("当前没有可攻击的敌人");
            return false;
        }
        for (let index = targets.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [targets[index], targets[randomIndex]] = [targets[randomIndex], targets[index]];
        }
        const positions = targets
            .slice(0, WZSJZ_Constant.DiveStrike.MaxTargetCount)
            .map((target) => target.node.worldPosition.clone());

        const diveConfig = WZSJZ_Constant.DiveStrike;
        const skeleton = owner.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        const castDuration = Math.max(
            0.01,
            skeleton?.findAnimation(diveConfig.SkillAnimation)?.duration
                || diveConfig.CastAnimationFallbackDuration,
        );
        if (skeleton) {
            skeleton.setAnimation(0, diveConfig.SkillAnimation, false);
            skeleton.addAnimation(0, diveConfig.IdleAnimation, true, 0);
        }
        // 技能动作期间避免普通攻击抢占同一条Spine轨道。
        owner.StartAttackCooldown(castDuration);

        const receiveExperience = owner.CreateExperienceReceiver();
        const damage = WZSJZ_Constant.GetDiveStrikeDamage(owner.Level);
        let spawnedCount = 0;
        for (const position of positions) {
            if (this.SpawnDiveStrike(
                position,
                damage,
                () => receiveExperience(diveConfig.KillExperience),
            )) {
                spawnedCount++;
            }
        }
        return spawnedCount > 0;
    }

    private SpawnDiveStrike(
        position: Vec3,
        damage: number,
        onKill: () => void,
    ): boolean {
        const effectNode = this._diveStrikePool.get()
            || instantiate(this._diveStrikePrefab);
        effectNode.setParent(this._projectileLayer);
        effectNode.setWorldPosition(position);
        effectNode.angle = 0;
        this.SetLayerRecursively(effectNode, this._projectileLayer.layer);
        const effect = effectNode.getComponent(WZSJZ_Skill_ZhenDangFuChong)
            || effectNode.addComponent(WZSJZ_Skill_ZhenDangFuChong);
        const config = WZSJZ_Constant.DiveStrike;
        if (!effect.Initialize(
            this._enemyArea,
            config.Radius,
            damage,
            config.DamageTriggerDelay,
            config.AnimationName,
            config.AnimationFallbackDuration,
            this.RecycleDiveStrike,
            onKill,
        )) {
            effectNode.active = false;
            this._diveStrikePool.put(effectNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleDiveStrike = (
        effect: WZSJZ_Skill_ZhenDangFuChong,
    ): void => {
        if (!effect?.node?.isValid) {
            return;
        }
        effect.node.active = false;
        this._diveStrikePool.put(effect.node);
    };

    private CastHomingSpider(config: WZSJZ_SkillConfig): boolean {
        if (!this._homingSpiderPrefab || !this._enemyArea || !this._projectileLayer) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const owner = this._owners
            .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
            .sort((left, right) => right.Level - left.Level)[0];
        if (!owner) {
            return false;
        }
        const liveEnemies = this._enemyArea.children
            .map((child) => child.getComponent(WZSJZ_Enemy))
            .filter((enemy) => !!enemy?.IsAlive);
        if (liveEnemies.length <= 0) {
            WZSJZ_UIManager.Instance.ShowText("当前没有可攻击的敌人");
            return false;
        }

        const spiderConfig = WZSJZ_Constant.HomingSpider;
        const skeleton = owner.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        const castDuration = Math.max(
            0.01,
            skeleton?.findAnimation(spiderConfig.SkillAnimation)?.duration
                || spiderConfig.CastAnimationFallbackDuration,
        );
        if (skeleton) {
            skeleton.setAnimation(0, spiderConfig.SkillAnimation, false);
            skeleton.addAnimation(0, spiderConfig.IdleAnimation, true, 0);
        }
        owner.StartAttackCooldown(castDuration);

        const receiveExperience = owner.CreateExperienceReceiver();
        const spawnPositions = this.BuildHomingSpiderSpawnPositions(
            owner,
            liveEnemies[0]?.node.worldPosition.x ?? this.GetEnemyAreaCenterWorldX(),
        );
        const damage = WZSJZ_Constant.GetHomingSpiderDamage(owner.Level);
        let spawnedCount = 0;
        for (let index = 0; index < spawnPositions.length; index++) {
            const initialTarget = liveEnemies.length > 0
                ? liveEnemies[index % liveEnemies.length]
                : null;
            if (this.SpawnHomingSpider(
                spawnPositions[index],
                damage,
                initialTarget,
                () => receiveExperience(spiderConfig.KillExperience),
            )) {
                spawnedCount++;
            }
        }
        return spawnedCount > 0;
    }

    private GetEnemyAreaCenterWorldX(): number {
        const bounds = this._enemyArea?.getComponent(UITransform)?.getBoundingBoxToWorld();
        return bounds
            ? (bounds.xMin + bounds.xMax) * 0.5
            : this._enemyArea?.worldPosition.x || 0;
    }

    private BuildHomingSpiderSpawnPositions(
        owner: WZSJZ_GameNode,
        enemyWorldX: number,
    ): Vec3[] {
        const config = WZSJZ_Constant.HomingSpider;
        const wall = this._wallDisplayNode?.getComponent(WZSJZ_Wall);
        const launchNode = owner.node.getChildByName(config.LaunchNodeName)
            || owner.node;
        const fallback = launchNode.worldPosition;
        if (!wall?.node?.isValid) {
            const direction = enemyWorldX >= fallback.x ? 1 : -1;
            return config.SpawnVerticalOffsets.map((offsetY) => new Vec3(
                fallback.x + direction * config.SpawnForwardOffset,
                fallback.y + offsetY,
                fallback.z,
            ));
        }

        const wallCenter = wall.node.worldPosition;
        const enemyDirection = enemyWorldX >= wallCenter.x ? 1 : -1;
        const spawnX = wall.GetFrontWorldX(enemyWorldX)
            + enemyDirection * config.SpawnForwardOffset;
        return config.SpawnVerticalOffsets.map((offsetY) => new Vec3(
            spawnX,
            wallCenter.y + offsetY,
            fallback.z,
        ));
    }

    private SpawnHomingSpider(
        position: Vec3,
        damage: number,
        initialTarget: WZSJZ_Enemy,
        onKill: () => void,
    ): boolean {
        const spiderNode = this._homingSpiderPool.get()
            || instantiate(this._homingSpiderPrefab);
        spiderNode.setParent(this._projectileLayer);
        spiderNode.setWorldPosition(position);
        spiderNode.angle = 0;
        this.SetLayerRecursively(spiderNode, this._projectileLayer.layer);
        const spider = spiderNode.getComponent(WZSJZ_Skill_ZhuiMingBaoZhu)
            || spiderNode.addComponent(WZSJZ_Skill_ZhuiMingBaoZhu);
        const spiderConfig = WZSJZ_Constant.HomingSpider;
        if (!spider.Initialize(
            this._enemyArea,
            spiderConfig.MoveSpeed,
            spiderConfig.ArrivalDistance,
            spiderConfig.ExplosionRadius,
            damage,
            initialTarget,
            spiderConfig.EntranceAnimation,
            spiderConfig.WalkAnimation,
            spiderConfig.WalkAnimationSpeed,
            spiderConfig.ExplosionAnimation,
            spiderConfig.EntranceFallbackDuration,
            spiderConfig.ExplosionFallbackDuration,
            spiderConfig.ExplosionDamageDelay,
            this.RecycleHomingSpider,
            onKill,
        )) {
            spiderNode.active = false;
            this._homingSpiderPool.put(spiderNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleHomingSpider = (
        spider: WZSJZ_Skill_ZhuiMingBaoZhu,
    ): void => {
        if (!spider?.node?.isValid) {
            return;
        }
        spider.node.active = false;
        this._homingSpiderPool.put(spider.node);
    };

    private RemoveMissingComponents(node: Node): void {
        const internalNode = node as any;
        if (Array.isArray(internalNode._components)) {
            internalNode._components = internalNode._components.filter(
                (component: Component) => !!component,
            );
        }
        for (const child of node.children) {
            this.RemoveMissingComponents(child);
        }
    }

    private CastShockPulse(config: WZSJZ_SkillConfig): boolean {
        if (!this._shockPulsePrefab || !this._enemyArea || !this._projectileLayer) {
            WZSJZ_UIManager.Instance.ShowText("技能资源尚未加载完成");
            return false;
        }
        const owner = this._owners
            .filter((item) => item?.node?.isValid && item.Name === config.OwnerName)
            .sort((left, right) => right.Level - left.Level)[0];
        if (!owner) {
            return false;
        }
        const launchNode = owner.node.getChildByName("子弹发射点位") || owner.node;
        const skeleton = owner.node.getChildByName("图像")?.getComponent(sp.Skeleton);
        if (skeleton) {
            skeleton.setAnimation(0, WZSJZ_Constant.ShockPulse.SkillAnimation, false);
            skeleton.addAnimation(0, WZSJZ_Constant.ShockPulse.IdleAnimation, true, 0);
        }
        let spawnedCount = 0;
        for (const angle of WZSJZ_Constant.ShockPulse.AnglesDegrees) {
            if (this.SpawnShockPulse(launchNode.worldPosition, angle)) {
                spawnedCount++;
            }
        }
        return spawnedCount > 0;
    }

    private SpawnShockPulse(position: Vec3, angleDegrees: number): boolean {
        const projectileNode = this._shockPulsePool.get()
            || instantiate(this._shockPulsePrefab);
        projectileNode.setParent(this._projectileLayer);
        projectileNode.setWorldPosition(position);
        projectileNode.angle = angleDegrees;
        this.SetLayerRecursively(projectileNode, this._projectileLayer.layer);
        const radians = angleDegrees * Math.PI / 180;
        const direction = new Vec3(Math.cos(radians), Math.sin(radians), 0);
        const projectile = projectileNode.getComponent(WZSJZ_Skill_ZhenDangMaiChong)
            || projectileNode.addComponent(WZSJZ_Skill_ZhenDangMaiChong);
        const config = WZSJZ_Constant.ShockPulse;
        if (!projectile.Initialize(
            this._enemyArea,
            direction,
            config.HitTriggerDelay,
            config.EffectDuration,
            config.KnockbackDistance,
            config.StunDuration,
            config.BossTenacityDamage,
            config.AnimationName,
            this.RecycleShockPulse,
        )) {
            this._shockPulsePool.put(projectileNode);
            return false;
        }
        this.KeepProjectileLayerOnTop();
        return true;
    }

    private RecycleShockPulse = (projectile: WZSJZ_Skill_ZhenDangMaiChong): void => {
        if (projectile?.node?.isValid) {
            projectile.node.active = false;
            this._shockPulsePool.put(projectile.node);
        }
    };

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
        if (this._projectileLayer?.parent) {
            this._projectileLayer.setSiblingIndex(this._projectileLayer.parent.children.length - 1);
        }
    }

    private GetOwnerSkillConfigs(owner: WZSJZ_GameNode): WZSJZ_SkillConfig[] {
        return WZSJZ_Constant.CharacterSkills.filter((config) => config.OwnerName === owner.Name);
    }

    private GetConfigKey(config: WZSJZ_SkillConfig): string {
        return `${config.OwnerName}:${config.Id}`;
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }
}
