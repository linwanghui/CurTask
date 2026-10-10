import { _decorator, Button, Canvas, Component, Event, game, isValid, Node, sys, tween, Tween, UITransform, Vec3 } from 'cc';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';

const { ccclass, property } = _decorator;

type FoldItem = { node: Node; position: Vec3; scale: Vec3; active: boolean };

/** 第一列固定，只收起其余列；保留节点父级和原有按钮事件。 */
@ccclass('ZRSJZ_SidebarToggle')
export class ZRSJZ_SidebarToggle extends Component {
    @property({ displayName: '展开折叠动画时长', min: 0 })
    Duration = 0.15;

    private _button: Node = null;
    private _buttonScale = new Vec3();
    private _buttonPosition = new Vec3();
    private _items: FoldItem[] = [];
    private _firstColumnRight = 0;
    private _foldWidth = 0;
    private _collapsed = false;
    private _motion = { progress: 0 };
    private _animating = false;
    private _slideDistance = 0;
    private _buttonStates = new Map<Button, boolean>();

    private BlockClick(event: Event): void {
        if (this._animating) event.propagationImmediateStopped = event.propagationStopped = true;
    }

    private UnlockButtons(): void {
        this._animating = false;
        this._buttonStates.forEach((enabled, button) => { if (isValid(button, true)) button.interactable = enabled; });
        this._buttonStates.clear();
    }

    protected onLoad(): void {
        this._button = this.node.getChildByName('展开折叠');
        if (!this._button) return;
        this._buttonScale.set(this._button.scale);
        this._buttonPosition.set(this._button.position);
        const buttons = this.node.children.filter(n => n !== this._button && n.getComponent(Button) && n.getComponent(UITransform));
        if (!buttons.length) return;
        const firstX = Math.min(...buttons.map(n => n.position.x));
        const right = (node: Node): number => {
            const ui = node.getComponent(UITransform);
            return node.position.x + Math.max(-ui.anchorX * ui.width * node.scale.x, (1 - ui.anchorX) * ui.width * node.scale.x);
        };
        this._firstColumnRight = Math.max(...buttons.filter(n => Math.abs(n.position.x - firstX) < 1).map(right));
        this._foldWidth = Math.max(0, Math.max(...buttons.map(right)) - this._firstColumnRight);
        this._items = buttons.filter(n => n.position.x > firstX + 1)
            .map(node => ({ node, position: node.position.clone(), scale: node.scale.clone(), active: node.active }));
    }

    protected onEnable(): void {
        if (!this._button) return;
        this._collapsed = false;
        this._motion.progress = 0;
        this._button.on(Button.EventType.CLICK, this.Toggle, this);
        for (const type of [Node.EventType.TOUCH_START, Node.EventType.TOUCH_END, Node.EventType.MOUSE_DOWN, Node.EventType.MOUSE_UP]) {
            this.node.on(type, this.BlockClick, this, true);
        }
        this.ApplyPosition();
    }

    public Toggle(): void {
        if (!this._button || this._animating) return;
        this._slideDistance = this.GetSlideDistance();
        this._animating = true;
        for (const button of this.node.getComponentsInChildren(Button)) {
            this._buttonStates.set(button, button.interactable);
            button.interactable = false;
        }
        ZRSJZ_AudioManager.Instance?.PlaySound('点击');
        // 只在完全展开时记录可见性，避免展开时误显示原本隐藏的功能。
        if (!this._collapsed && this._motion.progress === 0) {
            for (const item of this._items) if (isValid(item.node, true)) item.active = item.node.active;
        }
        this._collapsed = !this._collapsed;
        for (const item of this._items) if (isValid(item.node, true)) item.node.active = item.active;
        this._button.setScale(this._buttonScale.x * (this._collapsed ? -1 : 1), this._buttonScale.y, this._buttonScale.z);
        Tween.stopAllByTarget(this._motion);
        tween(this._motion).to(Math.max(0, this.Duration), { progress: this._collapsed ? 1 : 0 }, {
            easing: 'quadOut', onUpdate: () => this.ApplyPosition(),
        }).call(() => { this.ApplyPosition(); this.UnlockButtons(); }).start();
    }

    private GetSlideDistance(): number {
        const ui = this.getComponent(UITransform);
        let canvasNode = this.node;
        while (canvasNode && !canvasNode.getComponent(Canvas)) canvasNode = canvasNode.parent;
        const camera = canvasNode?.getComponent(Canvas)?.cameraComponent;
        let left = -ui.width;
        if (camera) {
            const world = this.node.worldPosition.clone();
            const screen = camera.worldToScreen(world);
            const next = camera.worldToScreen(new Vec3(world.x + 1, world.y, world.z));
            let pixelLeft = 0;
            if (sys.isBrowser && game.canvas?.getBoundingClientRect) {
                const rect = game.canvas.getBoundingClientRect();
                const container = game.canvas.parentElement?.getBoundingClientRect();
                if (rect.width > 0) pixelLeft = (Math.max(0, rect.left, container?.left ?? 0) - rect.left) * game.canvas.width / rect.width;
            }
            if (Math.abs(next.x - screen.x) > 0.000001) world.x += (pixelLeft - screen.x) / (next.x - screen.x);
            left = ui.convertToNodeSpaceAR(world).x;
        }
        return Math.max(0, this._firstColumnRight + this._foldWidth - left + 20);
    }

    private ApplyPosition(): void {
        if (!isValid(this._button, true)) return;
        const progress = this._motion.progress;
        for (const item of this._items) {
            if (!isValid(item.node, true)) continue;
            item.node.setPosition(item.position.x - this._slideDistance * progress, item.position.y, item.position.z);
            item.node.setScale(item.scale);
            if (this._collapsed && progress === 1) item.node.active = false;
        }
        this._button.setPosition(this._buttonPosition.x - this._foldWidth * progress, this._buttonPosition.y, this._buttonPosition.z);
        this._button.setScale(this._buttonScale.x * (this._collapsed ? -1 : 1), this._buttonScale.y, this._buttonScale.z);
    }

    protected onDisable(): void {
        this._button?.off(Button.EventType.CLICK, this.Toggle, this);
        for (const type of [Node.EventType.TOUCH_START, Node.EventType.TOUCH_END, Node.EventType.MOUSE_DOWN, Node.EventType.MOUSE_UP]) {
            this.node.off(type, this.BlockClick, this, true);
        }
        Tween.stopAllByTarget(this._motion);
        this.UnlockButtons();
        for (const item of this._items) {
            if (!isValid(item.node, true)) continue;
            item.node.setPosition(item.position);
            item.node.setScale(item.scale);
            if (this._motion.progress > 0) item.node.active = item.active;
        }
        if (isValid(this._button, true)) {
            this._button.setPosition(this._buttonPosition);
            this._button.setScale(this._buttonScale);
        }
    }
}
