import { _decorator, Camera, Component, Node, UITransform, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_StartCamera')
export class ZRSJZ_StartCamera extends Component {

    @property({ type: Node, displayName: "跟踪目标" })
    Target: Node = null;

    @property({ displayName: "跟踪速度" })
    FollowSpeed: number = 10;

    @property({ type: Node, displayName: "跟踪范围" })
    Scope: Node = null;

    private _camera: Camera = null;
    private _cachedScope: Node = null;
    private _scopeTransform: UITransform = null;
    private _targetPosition: Vec3 = new Vec3();
    private _hasWarnedScope: boolean = false;

    protected onLoad(): void {
        this._camera = this.getComponent(Camera);
        this.RefreshScopeTransform();
    }

    protected lateUpdate(dt: number): void {
        if (!this.Target?.isValid) return;

        if (
            this.Scope !== this._cachedScope
            || (this._scopeTransform && !this._scopeTransform.isValid)
        ) {
            this.RefreshScopeTransform();
        }

        const currentPosition = this.node.worldPosition;
        this._targetPosition.set(this.Target.worldPosition.x, currentPosition.y, currentPosition.z);
        this._targetPosition.x = this.ClampXToScope(this._targetPosition.x);

        if (this.FollowSpeed > 0) {
            // 使用指数插值，使不同帧率下的跟随速度保持接近一致。
            const followRatio = 1 - Math.exp(-this.FollowSpeed * Math.max(0, dt));
            this._targetPosition.x = currentPosition.x
                + (this._targetPosition.x - currentPosition.x) * followRatio;
            this._targetPosition.x = this.ClampXToScope(this._targetPosition.x);
        }

        this.node.setWorldPosition(this._targetPosition);
    }

    private ClampXToScope(targetX: number): number {
        if (!this.Scope?.isValid) return targetX;

        if (!this._scopeTransform) {
            if (!this._hasWarnedScope) {
                this._hasWarnedScope = true;
                console.warn("ZRSJZ_StartCamera: Scope 节点需要添加 UITransform 组件");
            }
            return targetX;
        }

        const bounds = this._scopeTransform.getBoundingBoxToWorld();
        const halfViewWidth = this.GetHalfViewWidth();
        const minCameraX = bounds.xMin + halfViewWidth;
        const maxCameraX = bounds.xMax - halfViewWidth;

        // Scope 小于相机可视宽度时无法完整限制画面，将相机固定在范围中心。
        if (minCameraX > maxCameraX) {
            return (bounds.xMin + bounds.xMax) * 0.5;
        }

        return Math.min(maxCameraX, Math.max(minCameraX, targetX));
    }

    private GetHalfViewWidth(): number {
        if (!this._camera || this._camera.projection !== Camera.ProjectionType.ORTHO) return 0;

        const visibleSize = view.getVisibleSize();
        const viewportWidth = visibleSize.width * this._camera.rect.width;
        const viewportHeight = visibleSize.height * this._camera.rect.height;
        const aspect = viewportHeight > 0 ? viewportWidth / viewportHeight : 1;
        return this._camera.orthoHeight * aspect;
    }

    private RefreshScopeTransform(): void {
        if (this._cachedScope !== this.Scope) {
            this._hasWarnedScope = false;
        }
        this._cachedScope = this.Scope;
        this._scopeTransform = this.Scope?.isValid
            ? this.Scope.getComponent(UITransform)
            : null;
    }

}


