import { _decorator, Component, Node, UITransform, Vec3, view } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 挂到任意 UI 节点后，按照屏幕可用区域对节点进行等比缩放。
 * 只修改节点 Scale，不修改 UITransform 尺寸，因此不会破坏原有布局比例。
 */
@ccclass('ZRSJZ_UIAutoFit')
export class ZRSJZ_UIAutoFit extends Component {

    @property({ displayName: '允许自动放大' })
    public AllowUpscale: boolean = true;

    @property({ displayName: '水平安全边距', min: 0 })
    public HorizontalPadding: number = 0;

    @property({ displayName: '垂直安全边距', min: 0 })
    public VerticalPadding: number = 0;

    private _baseScale: Vec3 = new Vec3(1, 1, 1);
    private _hasBaseScale: boolean = false;

    protected onLoad(): void {
        this.CaptureBaseScale();
    }

    protected onEnable(): void {
        view.on('canvas-resize', this.ApplyAdaptation, this);
        view.on('design-resolution-changed', this.ApplyAdaptation, this);
        this.node.on(Node.EventType.SIZE_CHANGED, this.ApplyAdaptation, this);

        // 等待 Widget、Layout 等组件先完成本帧布局，再读取最终尺寸。
        this.scheduleOnce(this.ApplyAdaptation, 0);
    }

    protected onDisable(): void {
        view.off('canvas-resize', this.ApplyAdaptation, this);
        view.off('design-resolution-changed', this.ApplyAdaptation, this);
        this.node.off(Node.EventType.SIZE_CHANGED, this.ApplyAdaptation, this);
        this.unschedule(this.ApplyAdaptation);
    }

    /**
     * 将节点当前缩放记录为新的原始缩放，适合运行时主动修改基础 Scale 后调用。
     */
    public CaptureBaseScale(): void {
        this._baseScale.set(this.node.scale);
        this._hasBaseScale = true;
    }

    /** 立即重新执行一次屏幕适配。 */
    public AdaptNow(): void {
        this.ApplyAdaptation();
    }

    private ApplyAdaptation(): void {
        if (!this._hasBaseScale || !this.node.isValid) return;

        const transform = this.getComponent(UITransform);
        if (!transform || transform.width <= 0 || transform.height <= 0) {
            return;
        }

        const visibleSize = view.getVisibleSize();
        const availableWidth = Math.max(1, visibleSize.width - this.HorizontalPadding * 2);
        const availableHeight = Math.max(1, visibleSize.height - this.VerticalPadding * 2);
        const parentWorldScale = this.node.parent?.worldScale;
        const parentScaleX = Math.abs(parentWorldScale?.x ?? 1);
        const parentScaleY = Math.abs(parentWorldScale?.y ?? 1);
        const originalWidth = transform.width * Math.abs(this._baseScale.x) * parentScaleX;
        const originalHeight = transform.height * Math.abs(this._baseScale.y) * parentScaleY;

        if (originalWidth <= 0 || originalHeight <= 0) return;

        let fitRatio = Math.min(
            availableWidth / originalWidth,
            availableHeight / originalHeight,
        );
        if (!this.AllowUpscale) {
            fitRatio = Math.min(1, fitRatio);
        }

        this.node.setScale(
            this._baseScale.x * fitRatio,
            this._baseScale.y * fitRatio,
            this._baseScale.z,
        );
    }
}

