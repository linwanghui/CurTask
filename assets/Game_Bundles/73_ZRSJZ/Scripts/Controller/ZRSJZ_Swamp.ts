import { _decorator, CircleCollider2D, Component, instantiate, isValid, Node, sp, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_SWAMP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_Player } from './ZRSJZ_Player';

const { ccclass } = _decorator;
/** 通过占位点动态加载DLC沼泽；根据玩家脚下位置判定，重叠区域不叠加。 */
@ccclass('ZRSJZ_Swamp')
export class ZRSJZ_Swamp extends Component {
    private _points: Node[] = [];
    private _swamps: Node[] = [];
    private _loading = false;
    private _retryAfter = 0;
    private _players = new Map<ZRSJZ_Player, number>();
    private _local = new Vec3();

    protected start(): void {
        const visit = (node: Node): void => {
            if (node.name === '沼泽') this._points.push(node);
            else node.children.forEach(visit);
        };
        visit(this.node);
        this.LoadSwamps();
    }

    private LoadSwamps(): void {
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || !this._points.length || this._swamps.length || this._loading || this._retryAfter > 0) return;
        this._loading = true;
        ZRSJZ_Tools.LoadPrefabByBundle('73_ZRSJZ_DLC', 'Prefabs/Unit/Map/沼泽').then(prefab => {
            if (!isValid(this, true) || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
            for (const point of this._points) {
                if (!isValid(point, true)) continue;
                const swamp = instantiate(prefab);
                swamp.parent = point;
                swamp.setPosition(0, 0, 0);
                // 沿用预制体自身变换与占位点缩放；区域大小随地图中的点一起变化。
                const layer = (node: Node): void => { node.layer = point.layer; node.children.forEach(layer); };
                layer(swamp);
                this._swamps.push(swamp);
            }
        }).catch(error => {
            console.error('[沼泽] DLC预制体加载失败', error);
            this._retryAfter = 3;
        }).finally(() => { this._loading = false; });
    }

    public Contains(position: Vec3): boolean {
        return this._swamps.some(swamp => {
            if (!isValid(swamp, true) || !swamp.activeInHierarchy) return false;
            const area = swamp.getComponent(UITransform);
            const circle = swamp.getComponent(CircleCollider2D);
            if (!area || !circle || !circle.enabled) return false;
            area.convertToNodeSpaceAR(position, this._local);
            const x = this._local.x - circle.offset.x;
            const y = this._local.y - circle.offset.y;
            return x * x + y * y <= circle.radius * circle.radius;
        });
    }

    protected update(dt: number): void {
        this._retryAfter = Math.max(0, this._retryAfter - dt);
        this.LoadSwamps();
        const game = ZRSJZ_Game.Instance;
        const enabled = !!game && !game.IsGameFinished && ZRSJZ_UIManager.ZRSJZ_DLC;
        for (const swamp of this._swamps) {
            if (!isValid(swamp, true)) continue;
            swamp.active = ZRSJZ_UIManager.ZRSJZ_DLC;
            const skeleton = swamp.getComponent(sp.Skeleton);
            if (skeleton) skeleton.timeScale = game?.GamePaused ? 0 : 1;
        }
        for (const player of this._players.keys()) {
            if (!isValid(player, true) || !enabled || !player.node.activeInHierarchy || player.IsDead
                || !game.Players.includes(player) || !this.Contains(player.node.worldPosition)) {
                if (isValid(player, true)) player.SwampSpeedMultiplier = 1;
                this._players.delete(player);
            }
        }
        if (!enabled) return;
        for (const player of game.Players) {
            if (!isValid(player, true) || !player.node.activeInHierarchy || player.IsDead || !this.Contains(player.node.worldPosition)) continue;
            player.SwampSpeedMultiplier = ZRSJZ_SWAMP_CONFIG.SpeedMultiplier;
            let elapsed = this._players.get(player) ?? 0;
            if (!game.GamePaused) elapsed += dt;
            while (elapsed >= ZRSJZ_SWAMP_CONFIG.DamageInterval && !player.IsDead) {
                elapsed -= ZRSJZ_SWAMP_CONFIG.DamageInterval;
                player.BeHit(ZRSJZ_SWAMP_CONFIG.Damage);
            }
            this._players.set(player, elapsed);
        }
    }

    protected onDisable(): void {
        for (const player of this._players.keys()) {
            if (isValid(player, true)) player.SwampSpeedMultiplier = 1;
        }
        this._players.clear();
    }

    protected onDestroy(): void {
        this.onDisable();
        this._swamps.forEach(swamp => { if (isValid(swamp, true)) swamp.destroy(); });
    }
}
