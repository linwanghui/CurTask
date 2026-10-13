import { _decorator, BoxCollider2D, Component, isValid } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass } = _decorator;

/** 用玩家圆形碰撞体与冰蝶矩形触发区判定接触，支持出生/瞬移时已重叠的情况。 */
@ccclass('ZRSJZ_IceButterfly')
export class ZRSJZ_IceButterfly extends Component {
    private _butterflies: BoxCollider2D[] = [];
    protected start(): void {
        this._butterflies = this.node.getComponentsInChildren(BoxCollider2D).filter(collider => collider.node.name === '冰蝶');
    }
    protected update(): void {
        const game = ZRSJZ_Game.Instance;
        if (!game || game.CurMap?.node !== this.node || game.GamePaused || game.IsGameFinished || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
        for (const butterfly of this._butterflies) {
            if (!isValid(butterfly, true) || !butterfly.enabled || !butterfly.node.activeInHierarchy) continue;
            const box = butterfly.worldAABB;
            if (box.width <= 0 || box.height <= 0) continue;
            for (const player of game.Players) {
                if (!isValid(player, true) || !player.enabledInHierarchy || player.IsDead || !player.Collider?.enabled) continue;
                const circle = player.Collider.worldAABB;
                if (circle.width <= 0 || circle.height <= 0) continue;
                const x = circle.x + circle.width / 2, y = circle.y + circle.height / 2;
                const dx = x - Math.max(box.x, Math.min(box.x + box.width, x));
                const dy = y - Math.max(box.y, Math.min(box.y + box.height, y));
                const radius = Math.max(circle.width, circle.height) / 2;
                if (dx * dx + dy * dy > radius * radius) continue;
                player.BeginFrozen();
                // 本局立即隐藏，保证同帧其他玩家不会重复消费同一只冰蝶。
                if (player.IsFrozen) { butterfly.node.active = false; break; }
            }
        }
    }
}
