import { _decorator, Camera, Component, Node, UITransform, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GameCamera')
export class ZRSJZ_GameCamera extends Component {

    Target: Node = null;
    Scope: Node = null;

    @property({ tooltip: "跟随速度；小于等于 0 时立即跟随" })
    FollowSpeed: number = 10;

    @property({ displayName: "开枪抖动强度", min: 0 })
    GunShakeStrength: number = 18;

    @property({ displayName: "开枪抖动时间（秒）", min: 0 })
    GunShakeDuration: number = 0.12;

    private _isInit: boolean = false;
    private _camera: Camera = null;
    private _scopeTransform: UITransform = null;
    private _targetPos: Vec3 = new Vec3();
    private _followPos: Vec3 = new Vec3();
    private _hasWarnedScope: boolean = false;
    private _shakeRemaining: number = 0;
    private _shakeDuration: number = 0;
    private _shakeStrength: number = 0;

    Init(target: Node, scope: Node) {
        this.Target = target;
        this.Scope = scope;
        this._camera = this.getComponent(Camera);
        this.RefreshScopeTransform();
        this._followPos.set(this.node.worldPosition);
        this._isInit = true;
    }

    /** 叠加一次开枪抖动；最终位置仍会经过地图边界限制。 */
    public Shake(strength: number = this.GunShakeStrength, duration: number = this.GunShakeDuration): void {
        const safeStrength = Math.max(0, strength || 0);
        const safeDuration = Math.max(0, duration || 0);
        if (safeStrength <= 0 || safeDuration <= 0) return;

        this._shakeStrength = Math.max(this._shakeStrength, safeStrength);
        this._shakeDuration = safeDuration;
        this._shakeRemaining = safeDuration;
    }

    protected lateUpdate(dt: number): void {
        if (!this.Target?.isValid || !this._isInit) return;

        if (this.Scope?.isValid && (!this._scopeTransform || this._scopeTransform.node !== this.Scope)) {
            this.RefreshScopeTransform();
        }

        const targetWorldPos = this.Target.worldPosition;
        this._targetPos.set(targetWorldPos.x, targetWorldPos.y, this.node.worldPosition.z);
        this.ClampToScope(this._targetPos);

        if (this.FollowSpeed <= 0) {
            this._followPos.set(this._targetPos);
        } else {
            // 指数插值在不同帧率下具有接近一致的跟随手感。使用独立的跟随坐标，
            // 避免上一帧抖动偏移参与插值后造成相机漂移。
            const t = 1 - Math.exp(-this.FollowSpeed * Math.max(0, dt));
            this._followPos.x += (this._targetPos.x - this._followPos.x) * t;
            this._followPos.y += (this._targetPos.y - this._followPos.y) * t;
            this._followPos.z = this._targetPos.z;
            this.ClampToScope(this._followPos);
        }

        this._targetPos.set(this._followPos);
        this.ApplyShake(this._targetPos, dt);
        // 抖动后再次限制，保证相机视野始终不会越出地图范围。
        this.ClampToScope(this._targetPos);
        this.node.setWorldPosition(this._targetPos);
    }

    private ApplyShake(position: Vec3, dt: number): void {
        if (this._shakeRemaining <= 0 || this._shakeDuration <= 0) return;

        const decay = Math.max(0, Math.min(1, this._shakeRemaining / this._shakeDuration));
        const angle = Math.random() * Math.PI * 2;
        const radius = this._shakeStrength * decay * (0.65 + Math.random() * 0.35);
        position.x += Math.cos(angle) * radius;
        position.y += Math.sin(angle) * radius;

        this._shakeRemaining = Math.max(0, this._shakeRemaining - Math.max(0, dt));
        if (this._shakeRemaining <= 0) this._shakeStrength = 0;
    }

    private ClampToScope(position: Vec3): void {
        if (!this.Scope?.isValid) return;
        if (!this._scopeTransform) {
            if (!this._hasWarnedScope) {
                this._hasWarnedScope = true;
                console.warn("ZRSJZ_GameCamera: Scope 节点需要添加 UITransform 组件");
            }
            return;
        }

        const bounds = this._scopeTransform.getBoundingBoxToWorld();
        let halfViewWidth = 0;
        let halfViewHeight = 0;

        if (this._camera && this._camera.projection === Camera.ProjectionType.ORTHO) {
            const visibleSize = view.getVisibleSize();
            const viewportWidth = Math.max(0.01, this._camera.rect?.width ?? 1);
            const viewportHeight = Math.max(0.01, this._camera.rect?.height ?? 1);
            const aspect = visibleSize.height > 0
                ? (visibleSize.width * viewportWidth) / (visibleSize.height * viewportHeight)
                : 1;
            halfViewHeight = this._camera.orthoHeight;
            halfViewWidth = halfViewHeight * aspect;
        }

        const minX = bounds.xMin + halfViewWidth;
        const maxX = bounds.xMax - halfViewWidth;
        const minY = bounds.yMin + halfViewHeight;
        const maxY = bounds.yMax - halfViewHeight;

        // Scope 比相机画面小时，将相机固定在该轴的范围中心。
        position.x = minX <= maxX
            ? Math.min(maxX, Math.max(minX, position.x))
            : (bounds.xMin + bounds.xMax) * 0.5;
        position.y = minY <= maxY
            ? Math.min(maxY, Math.max(minY, position.y))
            : (bounds.yMin + bounds.yMax) * 0.5;
    }

    private RefreshScopeTransform(): void {
        this._scopeTransform = this.Scope?.getComponent(UITransform) || null;
        this._hasWarnedScope = false;
    }

}
