import { _decorator, Button, Component, isValid, Node, UITransform, Vec3 } from 'cc';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';

const { ccclass } = _decorator;

type FoldItem = { node: Node; active: boolean };

/** 第一列固定，其余列折叠时直接隐藏，展开时恢复原有可见性。 */
@ccclass('ZRSJZ_SidebarToggle')
export class ZRSJZ_SidebarToggle extends Component {
    private _button: Node = null;
    private _buttonScale = new Vec3();
    private _buttonPosition = new Vec3();
    private _items: FoldItem[] = [];
    private _foldWidth = 0;
    private _collapsed = false;

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
        const firstColumnRight = Math.max(...buttons.filter(n => Math.abs(n.position.x - firstX) < 1).map(right));
        this._foldWidth = Math.max(0, Math.max(...buttons.map(right)) - firstColumnRight);
        this._items = buttons.filter(n => n.position.x > firstX + 1)
            .map(node => ({ node, active: node.active }));
    }

    protected onEnable(): void {
        if (!this._button) return;
        this._collapsed = false;
        this._button.on(Button.EventType.CLICK, this.Toggle, this);
        this.ApplyButtonState();
    }

    public Toggle(): void {
        if (!isValid(this._button, true)) return;
        ZRSJZ_AudioManager.Instance?.PlaySound('点击');
        // 折叠前记录状态，展开时不误显示原本隐藏的功能。
        if (!this._collapsed) {
            for (const item of this._items) if (isValid(item.node, true)) item.active = item.node.active;
        }
        this._collapsed = !this._collapsed;
        for (const item of this._items) {
            if (isValid(item.node, true)) item.node.active = !this._collapsed && item.active;
        }
        this.ApplyButtonState();
    }

    private ApplyButtonState(): void {
        if (!isValid(this._button, true)) return;
        this._button.setPosition(this._buttonPosition.x - (this._collapsed ? this._foldWidth : 0), this._buttonPosition.y, this._buttonPosition.z);
        this._button.setScale(this._buttonScale.x * (this._collapsed ? -1 : 1), this._buttonScale.y, this._buttonScale.z);
    }

    protected onDisable(): void {
        this._button?.off(Button.EventType.CLICK, this.Toggle, this);
        if (this._collapsed) {
            for (const item of this._items) if (isValid(item.node, true)) item.node.active = item.active;
        }
        this._collapsed = false;
        this.ApplyButtonState();
    }
}
