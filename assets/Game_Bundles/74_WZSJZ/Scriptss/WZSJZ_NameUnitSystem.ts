import { _decorator, Component, instantiate, Node, Prefab, UITransform, Vec3 } from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_Constant, WZSJZ_NameCombinationConfig } from './WZSJZ_Constant';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_NameCombination } from './WZSJZ_NameCombination';

const { ccclass } = _decorator;

interface WZSJZ_ActiveNameCombination {
    Key: string;
    Recipe: WZSJZ_NameCombinationConfig;
    Cells: WZSJZ_Cell[];
    Units: WZSJZ_GameNode[];
    DisplayNode: Node;
    Behavior: WZSJZ_NameCombination;
}

/** 根据 Constant 中的文字配方，统一维护组合、拆分、喂养和经验分发。 */
@ccclass('WZSJZ_NameUnitSystem')
export class WZSJZ_NameUnitSystem extends Component {
    private _formationCells: WZSJZ_Cell[] = [];
    private _objectLayer: Node = null;
    private _combinationPrefabs: Map<string, Prefab> = new Map();
    private _combinations: Map<string, WZSJZ_ActiveNameCombination> = new Map();

    protected onLoad(): void {
        this.node.on(WZSJZ_EventManager.布阵变化, this.RefreshCombinations, this);
    }

    public Configure(formationCells: WZSJZ_Cell[], objectLayer: Node): void {
        this._formationCells = formationCells;
        this._objectLayer = objectLayer;
        for (const recipe of WZSJZ_Constant.NameCombinations) {
            void this.LoadCombinationPrefab(recipe);
        }
    }

    /** 配方文字以及 FeedNames 中额外声明的文字，都可以喂给对应组合角色。 */
    public TryFeedCombination(
        feedUnit: WZSJZ_GameNode,
        sourceCell: WZSJZ_Cell,
        targetCell: WZSJZ_Cell,
    ): boolean {
        if (!feedUnit || !sourceCell || !targetCell) {
            return false;
        }
        const combination = this.FindCombinationAtCell(targetCell);
        if (!combination) {
            return false;
        }
        const feedNames = combination.Recipe.Parts.concat(combination.Recipe.FeedNames || []);
        if (!feedNames.includes(feedUnit.Name)) {
            return false;
        }

        const experience = WZSJZ_Constant.GetNameUnitFeedExperience(feedUnit.Level);
        sourceCell.Occupant = null;
        feedUnit.CurrentCell = null;
        feedUnit.node.destroy();
        for (const unit of combination.Units) {
            if (unit.node?.isValid) {
                unit.AddExperience(experience);
            }
        }
        this.RefreshCombinedLevel(combination);
        return true;
    }

    /** 组合体开始拖拽时恢复所有原文字，表现节点延迟到触摸结束后自行销毁。 */
    public DetachForDrag(behavior: WZSJZ_NameCombination): void {
        for (const [key, combination] of this._combinations) {
            if (combination.Behavior !== behavior) {
                continue;
            }
            this._combinations.delete(key);
            for (const unit of combination.Units) {
                unit.SetCombinationHidden(false);
            }
            const displayUnit = combination.DisplayNode.getComponent(WZSJZ_GameNode);
            if (displayUnit) {
                displayUnit.CurrentCell = null;
            }
            return;
        }
    }

    private async LoadCombinationPrefab(recipe: WZSJZ_NameCombinationConfig): Promise<void> {
        try {
            const prefab = await WZSJZ_Incident.Loadprefab(recipe.PrefabPath);
            if (!this.node?.isValid) {
                return;
            }
            this._combinationPrefabs.set(recipe.Name, prefab);
            this.RefreshCombinations();
        } catch (error) {
            console.error(`[WZSJZ] 组合角色预制体加载失败：${recipe.Name}`, error);
        }
    }

    private RefreshCombinations(): void {
        if (!this._objectLayer) {
            return;
        }

        const reservedUnits = new Set<WZSJZ_GameNode>();
        for (const [key, combination] of Array.from(this._combinations.entries())) {
            if (!this.IsCombinationValid(combination)) {
                this.DestroyCombination(key, combination);
                continue;
            }
            for (const unit of combination.Units) {
                reservedUnits.add(unit);
            }
            this.RefreshCombinedLevel(combination);
        }

        const columns = WZSJZ_Constant.NameUnit.FormationColumns;
        for (const recipe of WZSJZ_Constant.NameCombinations) {
            if (!this._combinationPrefabs.has(recipe.Name) || recipe.Parts.length < 2) {
                continue;
            }
            for (let startIndex = 0; startIndex < this._formationCells.length; startIndex++) {
                const key = this.GetCombinationKey(recipe, startIndex);
                if (this._combinations.has(key)
                    || startIndex % columns + recipe.Parts.length > columns) {
                    continue;
                }
                const cells = this._formationCells.slice(startIndex, startIndex + recipe.Parts.length);
                const units = cells.map((cell) => this.GetUnit(cell));
                if (units.some((unit) => !unit || reservedUnits.has(unit))) {
                    continue;
                }
                const matches = recipe.Parts.every((partName, index) => units[index]?.Name === partName);
                if (!matches) {
                    continue;
                }
                const typedUnits = units as WZSJZ_GameNode[];
                const combination = this.CreateCombination(recipe, cells, typedUnits, key);
                if (combination) {
                    typedUnits.forEach((unit) => reservedUnits.add(unit));
                }
            }
        }
    }

    private CreateCombination(
        recipe: WZSJZ_NameCombinationConfig,
        cells: WZSJZ_Cell[],
        units: WZSJZ_GameNode[],
        key: string,
    ): WZSJZ_ActiveNameCombination | null {
        const prefab = this._combinationPrefabs.get(recipe.Name);
        if (!prefab || cells.length === 0) {
            return null;
        }
        const displayNode = instantiate(prefab);
        displayNode.setParent(this._objectLayer);
        this.SetLayerRecursively(displayNode, this._objectLayer.layer);

        const parentTransform = this._objectLayer.getComponent(UITransform);
        if (parentTransform) {
            const firstWorld = cells[0].node.worldPosition;
            const lastWorld = cells[cells.length - 1].node.worldPosition;
            displayNode.setPosition(parentTransform.convertToNodeSpaceAR(new Vec3(
                (firstWorld.x + lastWorld.x) * 0.5,
                (firstWorld.y + lastWorld.y) * 0.5,
                (firstWorld.z + lastWorld.z) * 0.5,
            )));
        }
        displayNode.setSiblingIndex(this._objectLayer.children.length - 1);

        const displayUnit = displayNode.getComponent(WZSJZ_GameNode);
        if (!displayUnit) {
            displayNode.destroy();
            console.error(`[WZSJZ] ${recipe.Name}预制体缺少 WZSJZ_GameNode 组件。`);
            return null;
        }
        displayUnit.Init(
            cells[0],
            WZSJZ_Constant.GetCombinedNameUnitLevel(units.map((unit) => unit.Level)),
        );
        displayUnit.SetCombinationDisplay(true);
        displayUnit.SetExperienceReceiver((amount) => {
            for (const unit of units) {
                if (unit.node?.isValid) {
                    unit.AddExperience(amount);
                }
            }
            const current = this._combinations.get(key);
            if (current) {
                this.RefreshCombinedLevel(current);
            }
        });

        const behavior = displayNode.addComponent(WZSJZ_NameCombination);
        behavior.Configure(this, units);
        units.forEach((unit) => unit.SetCombinationHidden(true));
        const combination: WZSJZ_ActiveNameCombination = {
            Key: key,
            Recipe: recipe,
            Cells: cells,
            Units: units,
            DisplayNode: displayNode,
            Behavior: behavior,
        };
        this._combinations.set(key, combination);
        return combination;
    }

    private IsCombinationValid(combination: WZSJZ_ActiveNameCombination): boolean {
        return combination.Recipe.Parts.every((partName, index) =>
            this.GetUnit(combination.Cells[index]) === combination.Units[index]
            && combination.Units[index]?.Name === partName,
        );
    }

    private RefreshCombinedLevel(combination: WZSJZ_ActiveNameCombination): void {
        combination.DisplayNode.getComponent(WZSJZ_GameNode)?.SetDisplayLevel(
            WZSJZ_Constant.GetCombinedNameUnitLevel(
                combination.Units.map((unit) => unit.Level),
            ),
        );
    }

    private FindCombinationAtCell(cell: WZSJZ_Cell): WZSJZ_ActiveNameCombination | null {
        for (const combination of this._combinations.values()) {
            if (combination.Cells.includes(cell)) {
                return combination;
            }
        }
        return null;
    }

    private DestroyCombination(key: string, combination: WZSJZ_ActiveNameCombination): void {
        this._combinations.delete(key);
        for (const unit of combination.Units) {
            unit?.SetCombinationHidden(false);
        }
        if (combination.DisplayNode?.isValid) {
            combination.DisplayNode.destroy();
        }
    }

    private GetCombinationKey(recipe: WZSJZ_NameCombinationConfig, startIndex: number): string {
        return `${recipe.Name}:${startIndex}`;
    }

    private GetUnit(cell: WZSJZ_Cell): WZSJZ_GameNode | null {
        return cell?.Occupant?.isValid
            ? cell.Occupant.getComponent(WZSJZ_GameNode)
            : null;
    }

    private SetLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.SetLayerRecursively(child, layer);
        }
    }
}
