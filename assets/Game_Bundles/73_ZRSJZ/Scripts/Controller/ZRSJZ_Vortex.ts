import { _decorator, CircleCollider2D, Component, instantiate, isValid, Node, sp, UITransform, Vec2, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_VORTEX_CONFIG } from '../ZRSJZ_Constant';

const { ccclass } = _decorator;
/** 沙漠漩涡按点位动态加载；玩家移动结束时叠加轻微向心速度，继续沿用物理碰撞。 */
@ccclass('ZRSJZ_Vortex')
export class ZRSJZ_Vortex extends Component {
    private _points: Node[] = [];
    private _vortices: Node[] = [];
    private _loading = false;
    private _retryAfter = 0;
    private _pull = new Vec2();
    private _local = new Vec3();
    private _center = new Vec3();

    protected start(): void {
        const visit = (node: Node): void => {
            if (node.name === '漩涡') this._points.push(node);
            else node.children.forEach(visit);
        };
        visit(this.node);
        this.LoadVortices();
    }

    private LoadVortices(): void {
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || !this._points.length || this._vortices.length || this._loading || this._retryAfter > 0) return;
        this._loading = true;
        ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', 'Prefabs/Unit/Map/漩涡').then(prefab => {
            if (!isValid(this, true) || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
            for (const point of this._points) {
                if (!isValid(point, true)) continue;
                const vortex = instantiate(prefab);
                vortex.parent = point;
                vortex.setPosition(0, 0, 0);
                const layer = (node: Node): void => { node.layer = point.layer; node.children.forEach(layer); };
                layer(vortex);
                this._vortices.push(vortex);
            }
        }).catch(error => {
            console.error('[漩涡] DLC预制体加载失败', error);
            this._retryAfter = 3;
        }).finally(() => { this._loading = false; });
    }

    /** 返回与玩家CurSpeed相同单位的拉扯速度；重叠时只采用最强一股拉力。 */
    public GetPull(position: Vec3): Vec2 {
        this._pull.set(0, 0);
        const game = ZRSJZ_Game.Instance;
        if (!this.enabledInHierarchy || !game || game.GamePaused || game.IsGameFinished || !ZRSJZ_UIManager.ZRSJZ_DLC) return this._pull;
        let strongest = 0;
        for (const vortex of this._vortices) {
            if (!isValid(vortex, true) || !vortex.activeInHierarchy) continue;
            const area = vortex.getComponent(UITransform), circle = vortex.getComponent(CircleCollider2D);
            if (!area || !circle?.enabled || circle.radius <= 0) continue;
            area.convertToNodeSpaceAR(position, this._local);
            const localX = this._local.x - circle.offset.x, localY = this._local.y - circle.offset.y;
            const localDistance = Math.sqrt(localX * localX + localY * localY);
            if (localDistance >= circle.radius) continue;
            area.convertToWorldSpaceAR(new Vec3(circle.offset.x, circle.offset.y, 0), this._center);
            const x = this._center.x - position.x, y = this._center.y - position.y;
            const distance = Math.sqrt(x * x + y * y);
            if (distance < 0.001) continue;
            const edge = Math.min(1, (1 - localDistance / circle.radius) / Math.max(0.01, ZRSJZ_VORTEX_CONFIG.EdgeFadeRatio));
            const center = Math.min(1, distance / Math.max(1, ZRSJZ_VORTEX_CONFIG.CenterSoftRadius));
            const speed = Math.max(0, ZRSJZ_VORTEX_CONFIG.PullSpeed) * edge * center;
            if (speed <= strongest) continue;
            strongest = speed;
            this._pull.set(x / distance * speed, y / distance * speed);
        }
        return this._pull;
    }

    protected update(dt: number): void {
        this._retryAfter = Math.max(0, this._retryAfter - dt);
        this.LoadVortices();
        const game = ZRSJZ_Game.Instance;
        for (const vortex of this._vortices) {
            if (!isValid(vortex, true)) continue;
            vortex.active = ZRSJZ_UIManager.ZRSJZ_DLC;
            const spine = vortex.getComponent(sp.Skeleton);
            if (isValid(spine, true)) spine.timeScale = game?.GamePaused || game?.IsGameFinished ? 0 : 1;
        }
    }

    protected onDestroy(): void {
        this._vortices.forEach(vortex => { if (isValid(vortex, true)) vortex.destroy(); });
    }
}
