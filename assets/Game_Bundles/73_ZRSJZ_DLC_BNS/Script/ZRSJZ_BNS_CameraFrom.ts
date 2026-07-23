import { _decorator, Camera, Component, Node, TiledMap, UITransform, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_CameraFrom')
export class ZRSJZ_BNS_CameraFrom extends Component {
    @property({ type: Node, displayName: '跟随目标', tooltip: '相机需要跟随的玩家节点' })
    public Nd: Node = null;

    @property({ type: Node, displayName: '地图边界', tooltip: '使用该节点的 UITransform 作为相机移动边界' })
    public BoundaryNode: Node = null;

    @property({ displayName: '平滑时间', tooltip: '相机追上目标所需的插值时间（秒）', range: [0, 1, 0.01] })
    public SmoothTime: number = 0.1;

    @property({ displayName: '人物画面下移', tooltip: '人物在画面中向下偏移的距离（像素）', range: [-500, 500, 10] })
    public PlayerScreenOffsetY: number = 100;

    private _camera: Camera = null;
    private readonly _currentWorldPosition: Vec3 = new Vec3();
    private readonly _targetWorldPosition: Vec3 = new Vec3();

    protected onLoad(): void {
        this._camera = this.getComponent(Camera);

        // 未在 Inspector 指定时，自动使用当前世界 Canvas 下的瓦片地图。
        if (!this.BoundaryNode) {
            const tiledMap = this.node.parent?.getComponentInChildren(TiledMap);
            this.BoundaryNode = tiledMap?.node ?? null;
        }
    }

    protected start(): void {
        // 进入场景时直接对准玩家，避免相机从场景原点缓慢滑过来。
        this.UpdateCamera(0, true);
    }

    protected lateUpdate(dt: number): void {
        // 放在 lateUpdate，确保玩家本帧移动完成后相机再跟随。
        this.UpdateCamera(dt, false);
    }

    private UpdateCamera(dt: number, immediately: boolean): void {
        if (!this.Nd || !this.Nd.isValid) return;

        this.node.getWorldPosition(this._currentWorldPosition);
        this.Nd.getWorldPosition(this._targetWorldPosition);
        // 相机向上移动，人物在最终画面中会向下显示。
        this._targetWorldPosition.y += this.PlayerScreenOffsetY;
        this._targetWorldPosition.z = this._currentWorldPosition.z;

        // 偏移后再限制边界，保证相机视野不会越过地图范围。
        this.ClampToBoundary(this._targetWorldPosition);

        if (immediately || this.SmoothTime <= 0) {
            this.node.setWorldPosition(this._targetWorldPosition);
            return;
        }

        // 与帧率无关的指数插值：经过 SmoothTime 后已完成 99% 的移动。
        const lerpRatio = 1 - Math.pow(0.01, dt / this.SmoothTime);
        Vec3.lerp(
            this._currentWorldPosition,
            this._currentWorldPosition,
            this._targetWorldPosition,
            lerpRatio,
        );
        this.node.setWorldPosition(this._currentWorldPosition);
    }

    private ClampToBoundary(position: Vec3): void {
        if (!this._camera || !this.BoundaryNode || !this.BoundaryNode.isValid) return;

        const boundaryTransform = this.BoundaryNode.getComponent(UITransform);
        if (!boundaryTransform) return;

        const boundary = boundaryTransform.getBoundingBoxToWorld();
        const visibleSize = view.getVisibleSize();
        const cameraRect = this._camera.rect;
        const viewportHeight = visibleSize.height * cameraRect.height;
        const viewportWidth = visibleSize.width * cameraRect.width;
        const aspect = viewportHeight > 0 ? viewportWidth / viewportHeight : 1;
        const halfHeight = this._camera.orthoHeight;
        const halfWidth = halfHeight * aspect;

        position.x = this.ClampAxis(
            position.x,
            boundary.xMin + halfWidth,
            boundary.xMax - halfWidth,
            boundary.center.x,
        );
        position.y = this.ClampAxis(
            position.y,
            boundary.yMin + halfHeight,
            boundary.yMax - halfHeight,
            boundary.center.y,
        );
    }

    private ClampAxis(value: number, min: number, max: number, center: number): number {
        // 地图比相机视野小时固定在地图中心，避免 min/max 反转。
        if (min > max) return center;
        return Math.min(Math.max(value, min), max);
    }
}
