import { _decorator, Color, Component, Graphics, Node, tween, Tween, UIOpacity, UITransform, v3 } from 'cc';

const { ccclass } = _decorator;

/** 密码箱纯视觉装饰，不读取或修改箱子状态，也不注册交互事件。 */
@ccclass('ZRSJZ_PasswordBoxVisual')
export class ZRSJZ_PasswordBoxVisual extends Component {
    private _halo: Node = null;
    private _haloOpacity: UIOpacity = null;
    private _animations: Tween<any>[] = [];

    protected onLoad(): void {
        this._halo = this.CreateVisual('视觉_底部光圈', 480, 200);
        this._halo.setPosition(0, -110, 0);
        this._halo.setSiblingIndex(0);
        this._haloOpacity = this._halo.addComponent(UIOpacity);
        const halo = this._halo.addComponent(Graphics);
        // 静态绘制多层半透明椭圆，缓动只更新缩放和透明度。
        for (let i = 4; i >= 0; i--) {
            halo.lineWidth = 8 + i * 6;
            halo.strokeColor = new Color(20, 225, 255, i === 0 ? 255 : 35);
            halo.ellipse(0, 0, 205, 68);
            halo.stroke();
        }
        halo.lineWidth = 4;
        halo.strokeColor = new Color(180, 255, 255, 235);
        halo.ellipse(0, 0, 181, 53);
        halo.stroke();
    }

    private CreateVisual(name: string, width: number, height: number): Node {
        const node = new Node(name);
        node.layer = this.node.layer;
        node.parent = this.node;
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    protected onEnable(): void {
        if (!this._halo) return;
        this.StopAnimations();
        this._halo.setScale(1, 1, 1);
        this._haloOpacity.opacity = 205;
        this._animations = [
            tween(this._halo).to(1.2, { scale: v3(1.06, 1.06, 1) }, { easing: 'sineInOut' })
                .to(1.2, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' }).union().repeatForever().start(),
            tween(this._haloOpacity).to(1.2, { opacity: 255 }, { easing: 'sineInOut' })
                .to(1.2, { opacity: 205 }, { easing: 'sineInOut' }).union().repeatForever().start(),
        ];
    }

    private StopAnimations(): void {
        this._animations.forEach(animation => animation.stop());
        this._animations.length = 0;
    }

    protected onDisable(): void { this.StopAnimations(); }

    protected onDestroy(): void {
        this.StopAnimations();
        if (this._halo?.isValid) this._halo.destroy();
    }
}
