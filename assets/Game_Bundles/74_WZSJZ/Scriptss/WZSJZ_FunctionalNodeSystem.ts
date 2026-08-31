import { _decorator, Component, Node, sp } from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_Wall } from './WZSJZ_Wall';
import { WZSJZ_NameCombination } from './WZSJZ_NameCombination';
const { ccclass } = _decorator;

/** 功能节点域：管理没有等级、按战斗阶段周期生效的布阵道具。 */
@ccclass('WZSJZ_FunctionalNodeSystem')
export class WZSJZ_FunctionalNodeSystem extends Component {
    private _formationCells: WZSJZ_Cell[] = [];
    private _wall: WZSJZ_Wall = null;
    private _repairStation: WZSJZ_GameNode = null;
    private _repairCooldown: number = WZSJZ_Constant.NanoRepairStation.SkillInterval;
    private _isCombatActive: boolean = false;
    private _draggingNode: WZSJZ_GameNode = null;
    private _combinationUnits: WZSJZ_GameNode[] = [];
    private _auraBuffedUnits: Set<WZSJZ_GameNode> = new Set<WZSJZ_GameNode>();
    private _productionBuffedUnits: Set<WZSJZ_GameNode> = new Set<WZSJZ_GameNode>();

    protected onLoad(): void {
        this.node.on(WZSJZ_EventManager.布阵变化, this.RefreshFunctionalNodes, this);
        this.node.on(WZSJZ_EventManager.战斗阶段变动, this.OnCombatPhaseChanged, this);
        this.node.on(WZSJZ_EventManager.拖拽物变化, this.OnDraggingNodeChanged, this);
        this.node.on(WZSJZ_EventManager.组合单位变化, this.OnCombinationUnitsChanged, this);
    }

    public Configure(formationCells: WZSJZ_Cell[], wallDisplayNode: Node): void {
        this._formationCells = formationCells || [];
        this._wall = wallDisplayNode?.getComponent(WZSJZ_Wall) || null;
        this.RefreshFunctionalNodes();
    }

    /** 在回合开始时调用并锁定本轮时长；每台上阵发电机各提供一次加成。 */
    public GetAdditionalCombatDuration(): number {
        const generatorCount = this._formationCells.filter((cell) => {
            const occupant = cell?.Occupant?.getComponent(WZSJZ_GameNode);
            return cell.IsUnlocked
                && occupant?.Name === WZSJZ_Constant.FusionGenerator.Name
                && occupant.CurrentCell === cell
                && !occupant.IsDragging;
        }).length;
        return generatorCount * WZSJZ_Constant.FusionGenerator.ExtraCombatDuration;
    }

    protected onDestroy(): void {
        for (const unit of this._auraBuffedUnits) {
            if (unit?.node?.isValid) {
                unit.SetFunctionalAttackMultiplier(1);
            }
        }
        this._auraBuffedUnits.clear();
        for (const unit of this._productionBuffedUnits) {
            if (unit?.node?.isValid) {
                unit.SetFunctionalProductionMultiplier(1);
            }
        }
        this._productionBuffedUnits.clear();
    }

    protected update(deltaTime: number): void {
        if (!this.CanRepairWall()) {
            return;
        }

        this._repairCooldown -= Math.max(0, deltaTime);
        if (this._repairCooldown > 0) {
            return;
        }

        this._repairCooldown += WZSJZ_Constant.NanoRepairStation.SkillInterval;
        this.PlayRepairAnimation();
        this._wall.Heal(WZSJZ_Constant.NanoRepairStation.WallHealAmount);
    }

    private OnCombatPhaseChanged(isActive: boolean): void {
        this._isCombatActive = !!isActive;
        this.RefreshFunctionalNodes();
    }

    private OnDraggingNodeChanged(gameNode: WZSJZ_GameNode | null): void {
        this._draggingNode = gameNode;
        this.RefreshAttackAura();
        this.RefreshProductionAura();
    }

    private OnCombinationUnitsChanged(units: WZSJZ_GameNode[]): void {
        this._combinationUnits = (units || []).filter((unit) => !!unit?.node?.isValid);
        this.RefreshAttackAura();
    }

    private RefreshFunctionalNodes(): void {
        const previous = this._repairStation;
        this._repairStation = null;
        for (const cell of this._formationCells) {
            if (!cell?.IsUnlocked || cell.IsEmpty()) {
                continue;
            }
            const candidate = cell.Occupant.getComponent(WZSJZ_GameNode);
            if (candidate?.Name === WZSJZ_Constant.NanoRepairStation.Name
                && candidate.CurrentCell === cell) {
                this._repairStation = candidate;
                break;
            }
        }

        // 新上场或离场后都从完整CD开始，防止反复上下场立即触发技能。
        if (previous !== this._repairStation) {
            this._repairCooldown = WZSJZ_Constant.NanoRepairStation.SkillInterval;
        }
        this.RefreshAttackAura();
        this.RefreshProductionAura();
    }

    private CanRepairWall(): boolean {
        return this._isCombatActive
            && !!this._wall?.IsAlive
            && !!this._repairStation?.node?.isValid
            && this._repairStation.CurrentCell?.Zone === 'formation'
            && this._draggingNode !== this._repairStation;
    }

    private PlayRepairAnimation(): void {
        const station = this._repairStation;
        const config = WZSJZ_Constant.NanoRepairStation;
        const skeleton = station?.node?.getChildByName('图像')?.getComponent(sp.Skeleton);
        if (!skeleton?.findAnimation(config.SkillAnimation)) {
            return;
        }
        skeleton.setAnimation(0, config.SkillAnimation, false);
        if (skeleton.findAnimation(config.IdleAnimation)) {
            skeleton.addAnimation(0, config.IdleAnimation, true, 0);
        }
    }

    private RefreshAttackAura(): void {
        for (const unit of this._auraBuffedUnits) {
            if (unit?.node?.isValid) {
                unit.SetFunctionalAttackMultiplier(1);
            }
        }
        this._auraBuffedUnits.clear();
        if (!this._isCombatActive) {
            return;
        }

        const coreCells = this._formationCells.filter((cell) => {
            const occupant = cell?.Occupant?.getComponent(WZSJZ_GameNode);
            return cell.IsUnlocked
                && occupant?.Name === WZSJZ_Constant.FlameOverloadCore.Name
                && occupant !== this._draggingNode;
        });
        if (coreCells.length === 0) {
            return;
        }

        const candidates = new Set<WZSJZ_GameNode>();
        for (const cell of this._formationCells) {
            const unit = cell?.Occupant?.getComponent(WZSJZ_GameNode);
            if (unit && this.IsAttackingUnit(unit) && !unit.IsDragging) {
                candidates.add(unit);
            }
        }
        for (const unit of this._combinationUnits) {
            if (this.IsAttackingUnit(unit) && !unit.IsDragging) {
                candidates.add(unit);
            }
        }

        for (const unit of candidates) {
            const occupiedCells = this.GetOccupiedCells(unit);
            const adjacentCoreCount = coreCells.filter((coreCell) =>
                occupiedCells.some((unitCell) => this.AreNeighborCells(coreCell, unitCell)),
            ).length;
            if (adjacentCoreCount <= 0) {
                continue;
            }
            unit.SetFunctionalAttackMultiplier(
                1 + adjacentCoreCount * WZSJZ_Constant.FlameOverloadCore.AttackBonusRate,
            );
            this._auraBuffedUnits.add(unit);
        }
    }

    private IsAttackingUnit(unit: WZSJZ_GameNode): boolean {
        return (WZSJZ_Constant.GetMaterialLevelConfig(unit.Name, unit.Level)?.AttackDamage || 0) > 0;
    }

    private RefreshProductionAura(): void {
        for (const unit of this._productionBuffedUnits) {
            if (unit?.node?.isValid) {
                unit.SetFunctionalProductionMultiplier(1);
            }
        }
        this._productionBuffedUnits.clear();
        if (!this._isCombatActive) {
            return;
        }

        const hubCells = this._formationCells.filter((cell) => {
            const occupant = cell?.Occupant?.getComponent(WZSJZ_GameNode);
            return cell.IsUnlocked
                && occupant?.Name === WZSJZ_Constant.StarSpeedHub.Name
                && occupant !== this._draggingNode;
        });
        if (hubCells.length === 0) {
            return;
        }

        for (const cell of this._formationCells) {
            const unit = cell?.Occupant?.getComponent(WZSJZ_GameNode);
            if (!unit || unit.IsDragging || unit.GetProductionPerSecond() <= 0) {
                continue;
            }
            const adjacentHubCount = hubCells.filter((hubCell) =>
                this.AreNeighborCellsWithOption(
                    hubCell,
                    cell,
                    WZSJZ_Constant.StarSpeedHub.IncludeDiagonalCells,
                ),
            ).length;
            if (adjacentHubCount <= 0) {
                continue;
            }
            unit.SetFunctionalProductionMultiplier(
                1 + adjacentHubCount * WZSJZ_Constant.StarSpeedHub.ProductionBonusRate,
            );
            this._productionBuffedUnits.add(unit);
        }
    }

    private GetOccupiedCells(unit: WZSJZ_GameNode): WZSJZ_Cell[] {
        const combination = unit.node.getComponent(WZSJZ_NameCombination);
        if (combination) {
            return combination.GetPartUnits()
                .map((part) => part.CurrentCell)
                .filter((cell): cell is WZSJZ_Cell => !!cell);
        }
        return unit.CurrentCell ? [unit.CurrentCell] : [];
    }

    private AreNeighborCells(first: WZSJZ_Cell, second: WZSJZ_Cell): boolean {
        return this.AreNeighborCellsWithOption(
            first,
            second,
            WZSJZ_Constant.FlameOverloadCore.IncludeDiagonalCells,
        );
    }

    private AreNeighborCellsWithOption(
        first: WZSJZ_Cell,
        second: WZSJZ_Cell,
        includeDiagonal: boolean,
    ): boolean {
        const columns = WZSJZ_Constant.NameUnit.FormationColumns;
        const rowDelta = Math.abs(Math.floor(first.Index / columns) - Math.floor(second.Index / columns));
        const columnDelta = Math.abs(first.Index % columns - second.Index % columns);
        if (rowDelta === 0 && columnDelta === 0) {
            return false;
        }
        return includeDiagonal
            ? rowDelta <= 1 && columnDelta <= 1
            : rowDelta + columnDelta === 1;
    }
}
