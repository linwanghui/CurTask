import { _decorator, Component, Label, tween, Tween, UIOpacity, UITransform, Widget } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Tip')
export class ZRSJZ_Tip extends Component {

    UIOpacity: UIOpacity = null;
    Text: Label = null;

    private _isInit: boolean = false;
    private _baseHeight = 140;

    Show(tip: string) {
        if (!this._isInit) {
            this.UIOpacity = this.getComponent(UIOpacity);
            this.Text = this.node.getChildByName("Text").getComponent(Label);
            this._baseHeight = this.getComponent(UITransform)?.height ?? 140;
            const widget = this.Text.getComponent(Widget);
            if (widget) {
                widget.isAlignLeft = false;
                widget.isAlignRight = false;
                widget.isAlignHorizontalCenter = true;
            }
            this._isInit = true;
        }

        this.Text.string = tip;
        this.ResizeToText();
        Tween.stopAllByTarget(this.node);
        Tween.stopAllByTarget(this.UIOpacity);
        this.node.setPosition(0, 100, 0);
        this.UIOpacity.opacity = 0;
        tween(this.node)
            .by(0.2, { y: 200 }, { easing: `backOut` })
            .delay(1)
            .by(0.3, { y: 200 })
            .call(() => {
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
            .start();
        tween(this.UIOpacity)
            .to(0.2, { opacity: 255 })
            .delay(1)
            .to(0.3, { opacity: 0 })
            .start();
    }

    private ResizeToText(): void {
        const background = this.getComponent(UITransform);
        const textTransform = this.Text.getComponent(UITransform);
        if (!background || !textTransform) return;

        // Measure actual glyph widths, including this prefab's custom font.
        // Reset overflow each time because Tip nodes are reused by the object pool.
        this.Text.overflow = Label.Overflow.NONE;
        this.Text.enableWrapText = false;
        this.Text.updateRenderData(true);
        const width = Math.min(1200, Math.max(100, Math.ceil(textTransform.width) + 80));
        textTransform.setContentSize(width - 80, textTransform.height);
        this.Text.overflow = Label.Overflow.RESIZE_HEIGHT;
        this.Text.enableWrapText = true;
        this.Text.updateRenderData(true);
        background.setContentSize(width, Math.max(this._baseHeight, Math.ceil(textTransform.height) + 40));
        this.Text.getComponent(Widget)?.updateAlignment();
    }
}

