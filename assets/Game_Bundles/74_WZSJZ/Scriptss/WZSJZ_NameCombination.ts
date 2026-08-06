import { _decorator, Component, EventTouch, Node, UITransform } from 'cc';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import type { WZSJZ_NameUnitSystem } from './WZSJZ_NameUnitSystem';

const { ccclass } = _decorator;

/** 多格组合表现的触摸代理；按下哪一段，就拆出对应的原文字继续拖拽。 */
@ccclass('WZSJZ_NameCombination')
export class WZSJZ_NameCombination extends Component {
    private _system: WZSJZ_NameUnitSystem = null;
    private _partUnits: WZSJZ_GameNode[] = [];
    private _draggedUnit: WZSJZ_GameNode = null;

    protected onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchEnd, this);
    }

    public Configure(
        system: WZSJZ_NameUnitSystem,
        partUnits: WZSJZ_GameNode[],
    ): void {
        this._system = system;
        this._partUnits = partUnits;
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

        this._system.DetachForDrag(this);
        this.SetVisualVisible(false);
        this._draggedUnit = selected;
        selected.BeginExternalDrag(event);
    }

    private OnTouchMove(event: EventTouch): void {
        this._draggedUnit?.MoveExternalDrag(event);
    }

    private OnTouchEnd(event: EventTouch): void {
        if (!this._draggedUnit) {
            return;
        }
        const draggedUnit = this._draggedUnit;
        this._draggedUnit = null;
        draggedUnit.EndExternalDrag(event);
        this.node.destroy();
    }

    private SetVisualVisible(visible: boolean): void {
        for (const child of this.node.children) {
            child.active = visible;
        }
    }
}
