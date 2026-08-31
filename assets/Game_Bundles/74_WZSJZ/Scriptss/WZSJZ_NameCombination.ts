import { _decorator, Component, EventTouch, Node, UITransform, Vec2 } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_NodeInspectSystem } from './WZSJZ_NodeInspectSystem';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import type { WZSJZ_NameUnitSystem } from './WZSJZ_NameUnitSystem';

const { ccclass } = _decorator;

/** 多格组合表现的触摸代理；按下哪一段，就拆出对应的原文字继续拖拽。 */
@ccclass('WZSJZ_NameCombination')
export class WZSJZ_NameCombination extends Component {
    private _system: WZSJZ_NameUnitSystem = null;
    private _partUnits: WZSJZ_GameNode[] = [];
    private _draggedUnit: WZSJZ_GameNode = null;
    private _selectedUnit: WZSJZ_GameNode = null;
    private _isPointerDown: boolean = false;
    private _touchStartUI: Vec2 = new Vec2();
    private _skillEffectAnchors: Node[] = [];

    protected onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchCancel, this);
    }

    public Configure(
        system: WZSJZ_NameUnitSystem,
        partUnits: WZSJZ_GameNode[],
    ): void {
        this._system = system;
        this._partUnits = partUnits;
    }

    public GetPartUnits(): readonly WZSJZ_GameNode[] {
        return this._partUnits;
    }

    /** 为组合中的每个文字提供独立特效点位，同时保持组合表现处于可交互的最上层。 */
    public GetPartEffectTargets(): Node[] {
        if (this._skillEffectAnchors.length === this._partUnits.length
            && this._skillEffectAnchors.every((anchor) => anchor?.isValid)) {
            return this._skillEffectAnchors;
        }
        this._skillEffectAnchors = this._partUnits.map((unit, index) => {
            const anchor = new Node(`技能特效点位_${index + 1}`);
            anchor.setParent(this.node);
            anchor.layer = this.node.layer;
            anchor.setWorldPosition(unit.node.worldPosition);
            anchor.setSiblingIndex(this.node.children.length - 1);
            return anchor;
        });
        return this._skillEffectAnchors;
    }

    /**
     * 组合经验按“所有组成文字以后继续同时获得相同经验”计算。
     * 返回距离组合显示等级下一次提升的完成比例，不读取展示节点自身的Exp。
     */
    public GetCombinedExperienceProgress(): number {
        if (this._partUnits.length === 0) {
            return 0;
        }
        const baseline = this.GetSharedExperienceUntilUpgrade(false);
        const remaining = this.GetSharedExperienceUntilUpgrade(true);
        if (!Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(remaining)) {
            return 0;
        }
        return Math.max(0, Math.min(1, 1 - remaining / baseline));
    }

    private OnTouchStart(event: EventTouch): void {
        if (this._draggedUnit || !this._system) {
            return;
        }
        const bounds = this.node.getComponent(UITransform)?.getBoundingBoxToWorld();
        if (!bounds || this._partUnits.length === 0) {
            return;
        }
        const normalizedX = Math.max(0, Math.min(0.9999,
            (event.getUILocation().x - bounds.x) / Math.max(1, bounds.width),
        ));
        const partIndex = Math.floor(normalizedX * this._partUnits.length);
        const selected = this._partUnits[partIndex];
        if (!selected?.node?.isValid) {
            return;
        }

        this._selectedUnit = selected;
        this._isPointerDown = true;
        this._touchStartUI.set(event.getUILocation());
    }

    private OnTouchMove(event: EventTouch): void {
        if (this._isPointerDown && !this._draggedUnit && this._selectedUnit) {
            const current = event.getUILocation();
            const deltaX = current.x - this._touchStartUI.x;
            const deltaY = current.y - this._touchStartUI.y;
            const threshold = WZSJZ_Constant.NodeInteraction.DragThreshold;
            if (deltaX * deltaX + deltaY * deltaY >= threshold * threshold) {
                this._isPointerDown = false;
                this._system.DetachForDrag(this);
                this.SetVisualVisible(false);
                this._draggedUnit = this._selectedUnit;
                this._draggedUnit.BeginExternalDrag(event, this._touchStartUI);
            }
        }
        this._draggedUnit?.MoveExternalDrag(event);
    }

    private OnTouchEnd(event: EventTouch): void {
        if (!this._draggedUnit) {
            if (this._isPointerDown) {
                const displayUnit = this.node.getComponent('WZSJZ_GameNode') as WZSJZ_GameNode;
                WZSJZ_NodeInspectSystem.Instance?.Show(displayUnit);
            }
            this.ResetPointer();
            return;
        }
        const draggedUnit = this._draggedUnit;
        this.ResetPointer();
        draggedUnit.EndExternalDrag(event);
        this.node.destroy();
    }

    private OnTouchCancel(event: EventTouch): void {
        if (this._draggedUnit) {
            const draggedUnit = this._draggedUnit;
            this.ResetPointer();
            draggedUnit.EndExternalDrag(event);
            this.node.destroy();
            return;
        }
        this.ResetPointer();
    }

    private ResetPointer(): void {
        this._isPointerDown = false;
        this._selectedUnit = null;
        this._draggedUnit = null;
    }

    /** 计算每个组成文字同时增加多少经验后，组合等级会首次提高。 */
    private GetSharedExperienceUntilUpgrade(useCurrentExperience: boolean): number {
        const levels = this._partUnits.map((unit) => unit.Level);
        const currentCombinedLevel = WZSJZ_Constant.GetCombinedNameUnitLevel(levels);
        const levelUpEvents: Array<{ Cost: number; UnitIndex: number }> = [];

        this._partUnits.forEach((unit, unitIndex) => {
            const material = WZSJZ_Constant.GetMaterialConfig(unit.Name);
            const maxLevel = material?.MaxLevel || unit.Level;
            let cumulativeCost = 0;
            for (let level = unit.Level; level < maxLevel; level++) {
                const requirement = WZSJZ_Constant.GetNameUnitExperienceRequirement(level);
                if (requirement <= 0) {
                    break;
                }
                const ownedExperience = level === unit.Level && useCurrentExperience
                    ? Math.max(0, unit.Exp)
                    : 0;
                cumulativeCost += Math.max(0, requirement - ownedExperience);
                levelUpEvents.push({ Cost: cumulativeCost, UnitIndex: unitIndex });
            }
        });
        levelUpEvents.sort((first, second) => first.Cost - second.Cost);

        for (let eventIndex = 0; eventIndex < levelUpEvents.length;) {
            const sharedCost = levelUpEvents[eventIndex].Cost;
            // 同一经验值下可能有多个文字同时升级，要一起结算后再判断组合等级。
            while (eventIndex < levelUpEvents.length
                && Math.abs(levelUpEvents[eventIndex].Cost - sharedCost) < 0.0001) {
                levels[levelUpEvents[eventIndex].UnitIndex]++;
                eventIndex++;
            }
            if (WZSJZ_Constant.GetCombinedNameUnitLevel(levels) > currentCombinedLevel) {
                return sharedCost;
            }
        }
        return Number.POSITIVE_INFINITY;
    }

    private SetVisualVisible(visible: boolean): void {
        for (const child of this.node.children) {
            child.active = visible;
        }
    }
}
