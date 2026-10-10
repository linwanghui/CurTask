import { _decorator, Component, instantiate, isValid, Node } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_LaserTrap } from './ZRSJZ_LaserTrap';
const { ccclass } = _decorator;

/** 城镇激光占位点按需加载，主包不序列化引用DLC预制体。 */
@ccclass('ZRSJZ_LaserTraps')
export class ZRSJZ_LaserTraps extends Component {
    private _points: Node[] = [];
    private _traps: Node[] = [];
    private _loading = false;
    private _retryAfter = 0;

    protected start(): void {
        const visit = (node: Node): void => {
            if (node.name === '激光') this._points.push(node);
            else node.children.forEach(visit);
        };
        visit(this.node);
        this.LoadTraps();
    }

    private LoadTraps(): void {
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || !this._points.length || this._traps.length || this._loading || this._retryAfter > 0) return;
        this._loading = true;
        ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', 'Prefabs/Unit/Map/激光').then(prefab => {
            if (!isValid(this, true) || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
            for (const point of this._points) {
                if (!isValid(point, true)) continue;
                const trap = instantiate(prefab);
                trap.parent = point;
                trap.setPosition(0, 0, 0);
                const layer = (node: Node): void => { node.layer = point.layer; node.children.forEach(layer); };
                layer(trap);
                trap.addComponent(ZRSJZ_LaserTrap);
                this._traps.push(trap);
            }
        }).catch(error => {
            console.error('[激光] DLC预制体加载失败', error);
            this._retryAfter = 3;
        }).finally(() => { this._loading = false; });
    }

    protected update(dt: number): void {
        this._retryAfter = Math.max(0, this._retryAfter - dt);
        this.LoadTraps();
        this._traps.forEach(trap => { if (isValid(trap, true)) trap.active = ZRSJZ_UIManager.ZRSJZ_DLC; });
    }

    protected onDestroy(): void {
        this._traps.forEach(trap => { if (isValid(trap, true)) trap.destroy(); });
    }
}
