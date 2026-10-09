import { _decorator, Button, Canvas, Component, game, isValid, Node, sys, tween, Tween, UITransform, Vec3, Widget } from 'cc';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';

const { ccclass, property } = _decorator;

/** 改变 Widget 左边距，避免布局刷新把折叠位置覆盖。 */
@ccclass('ZRSJZ_SidebarToggle')
export class ZRSJZ_SidebarToggle extends Component {
    @property({ displayName: '展开折叠动画时长', min: 0 })
    Duration = 0.25;

    private _button: Node = null;
    private _widget: Widget = null;
    private _expandedLeft = 0;
    private _buttonScale = new Vec3();
    private _collapsed = false;
    private _motion = { progress: 0 };

    protected onLoad(): void {
        this._button = this.node.getChildByName('展开折叠');
        this._widget = this.getComponent(Widget);
        if (!this._button || !this._widget) return;
        this._expandedLeft = this._widget.left;
        this._buttonScale.set(this._button.scale);
    }

    protected onEnable(): void {
        if (!this._button || !this._widget) return;
        this._collapsed = false;
        this._motion.progress = 0;
        this._button.active = true;
        this._button.setScale(this._buttonScale);
        this._button.on(Button.EventType.CLICK, this.Toggle, this);
        this.ApplyPosition();
    }

    public Toggle(): void {
        if (!this._button || !this._widget) return;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        this._collapsed = !this._collapsed;
        this._button.setScale(this._buttonScale.x * (this._collapsed ? -1 : 1), this._buttonScale.y, this._buttonScale.z);
        Tween.stopAllByTarget(this._motion);
        tween(this._motion).to(Math.max(0, this.Duration), { progress: this._collapsed ? 1 : 0 }, {
            easing: 'quadOut', onUpdate: () => this.ApplyPosition(),
        }).start();
    }

    protected lateUpdate(): void {
        // 保持与 Canvas 当前宽度、主页缩放和窗口尺寸一致。
        this.ApplyPosition();
    }

    private ApplyPosition(): void {
        if (!this._widget || !isValid(this._button, true)) return;
        const target = this._widget.target ?? this.node.parent;
        const targetUI = target?.getComponent(UITransform);
        const sidebarUI = this.getComponent(UITransform);
        const buttonUI = this._button.getComponent(UITransform);
        let canvasNode: Node = this.node;
        while (canvasNode && !canvasNode.getComponent(Canvas)) canvasNode = canvasNode.parent;
        const canvasUI = canvasNode?.getComponent(UITransform);
        if (!targetUI || !sidebarUI || !buttonUI || !canvasUI) return;
        // 预览/宽屏适配时 Canvas 的逻辑左边缘可能在可视区域之外，使用 UI 相机的屏幕左边缘。
        const camera = canvasNode.getComponent(Canvas).cameraComponent;
        const worldLeft = this.node.worldPosition.clone();
        if (camera) {
            let screenLeftPixel = 0;
            // 浏览器适配可能把宽画布居中裁剪；屏幕边界应取可见容器而非画布边界。
            if (sys.isBrowser && game.canvas?.getBoundingClientRect) {
                const rect = game.canvas.getBoundingClientRect();
                const container = game.canvas.parentElement?.getBoundingClientRect();
                const visibleLeft = Math.max(0, container?.left ?? 0, rect.left);
                if (rect.width > 0) screenLeftPixel = (visibleLeft - rect.left) * game.canvas.width / rect.width;
            }
            // 在 UI 所在的深度平面上求屏幕左边缘，兼容透视 UI 相机。
            const screen = camera.worldToScreen(worldLeft);
            const next = camera.worldToScreen(new Vec3(worldLeft.x + 1, worldLeft.y, worldLeft.z));
            if (Math.abs(next.x - screen.x) > 0.000001) worldLeft.x += (screenLeftPixel - screen.x) / (next.x - screen.x);
        } else worldLeft.set(canvasUI.convertToWorldSpaceAR(new Vec3(-canvasUI.anchorX * canvasUI.width, 0, 0)));
        const screenLeft = targetUI.convertToNodeSpaceAR(worldLeft).x + targetUI.anchorX * targetUI.width;
        const sx = this._button.scale.x;
        const buttonLeft = this._button.position.x + Math.min(-buttonUI.anchorX * buttonUI.width * sx,
            (1 - buttonUI.anchorX) * buttonUI.width * sx);
        const collapsedLeft = screenLeft - (sidebarUI.anchorX * sidebarUI.width + buttonLeft) * this.node.scale.x;
        this._widget.left = this._expandedLeft + (collapsedLeft - this._expandedLeft) * this._motion.progress;
        this._widget.updateAlignment();
    }

    protected onDisable(): void {
        this._button?.off(Button.EventType.CLICK, this.Toggle, this);
        Tween.stopAllByTarget(this._motion);
        if (this._widget) this._widget.left = this._expandedLeft;
        if (isValid(this._button, true)) this._button.setScale(this._buttonScale);
    }
}
