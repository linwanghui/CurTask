import { _decorator, Camera, Component, Node, UITransform, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GameCamera')
export class ZRSJZ_GameCamera extends Component {

    Target: Node = null;
    Scope: Node = null;

    @property({ tooltip: "跟随速度；小于等于 0 时立即跟随" })
    FollowSpeed: number = 10;

    private _isInit: boolean = false;
    private _camera: Camera = null;
    private _scopeTransform: UITransform = null;
    private _targetPos: Vec3 = new Vec3();
    private _hasWarnedScope: boolean = false;

    Init(target: Node, scope: Node) {
        this.Target = target;
        this.Scope = scope;
        this._camera = this.getComponent(Camera);
        this.RefreshScopeTransform();
        this._isInit = true;
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
            this.node.setWorldPosition(this._targetPos);
            return;
        }

        // 指数插值在不同帧率下具有接近一致的跟随手感。
        const t = 1 - Math.exp(-this.FollowSpeed * Math.max(0, dt));
        const currentPos = this.node.worldPosition;
        this._targetPos.x = currentPos.x + (this._targetPos.x - currentPos.x) * t;
        this._targetPos.y = currentPos.y + (this._targetPos.y - currentPos.y) * t;
        this.ClampToScope(this._targetPos);
        this.node.setWorldPosition(this._targetPos);
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

