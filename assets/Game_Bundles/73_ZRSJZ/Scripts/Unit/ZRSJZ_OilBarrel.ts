import { _decorator, Collider2D, Component, director, isValid, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_EnemyBase } from '../Controller/ZRSJZ_EnemyBase';
import { ZRSJZ_DestructibleService } from '../Service/ZRSJZ_DestructibleService';
import { ZRSJZ_Player } from '../Controller/ZRSJZ_Player';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_OilBarrel')
export class ZRSJZ_OilBarrel extends Component {
    @property({ displayName: '爆炸范围（半径）', tooltip: '世界坐标距离，以油桶根节点为圆心，不随图片缩放变化', min: 0 })
    ExplosionRadius = 500;

    @property({ displayName: '爆炸伤害', tooltip: '对双方造成的基础伤害；玩家仍按现有护盾、减伤和新手保护规则结算', min: 0 })
    ExplosionDamage = 100;

    @property(Node) BarrelVisual: Node = null;
    @property(sp.Skeleton) Explosion: sp.Skeleton = null;
    private detonated = false;

    protected onEnable(): void {
        if (!this.detonated) ZRSJZ_DestructibleService.Register(this.node, damage => this.BeHit(damage));
    }

    protected onDisable(): void { ZRSJZ_DestructibleService.Unregister(this.node); }

    BeHit(damage: number): void {
        const game = ZRSJZ_Game.Instance;
        if (this.detonated || !Number.isFinite(damage) || damage <= 0 || !game || game.GamePaused || game.IsGameFinished) return;
        this.detonated = true;
        // 物理接触回调中不能移除碰撞体，推迟到下一帧统一爆炸。
        this.scheduleOnce(() => this.Explode(), 0);
    }

    private Explode(): void {
        ZRSJZ_DestructibleService.Unregister(this.node);
        this.getComponentsInChildren(Collider2D).forEach(collider => collider.enabled = false);
        if (this.BarrelVisual) this.BarrelVisual.active = false;
        const origin = this.node.worldPosition.clone();
        const radius = Math.max(0, Number.isFinite(this.ExplosionRadius) ? this.ExplosionRadius : 0);
        const damage = Math.max(0, Number.isFinite(this.ExplosionDamage) ? this.ExplosionDamage : 0);
        const game = ZRSJZ_Game.Instance;
        if (game && !game.IsGameFinished && !game.GamePaused) {
            const inRange = (node: Node, other?: Node): boolean =>
                Vec3.distance(origin, node.worldPosition) <= radius
                || (isValid(other, true) && Vec3.distance(origin, other.worldPosition) <= radius);
            // 先结算敌人，避免玩家死亡进入结算后漏掉同次爆炸中的敌人。
            for (const enemy of director.getScene()?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? []) {
                if (enemy.node.activeInHierarchy && !enemy.IsDead && inRange(enemy.node, enemy.Other)) enemy.BeHit(damage);
            }
            for (const player of game.Players) {
                if (isValid(player, true) && player.node.activeInHierarchy && !player.IsDead && inRange(player.node, player.Other)) player.BeHit(damage);
            }

            const players = director.getScene().getComponentsInChildren(ZRSJZ_Player);
            players.sort((a, b) => Vec3.distance(this.node.worldPosition, a.node.worldPosition) - Vec3.distance(this.node.worldPosition, b.node.worldPosition));
            const distance = Vec3.distance(this.node.worldPosition, players[0].node.worldPosition);
            ZRSJZ_AudioManager.Instance.PlaySound("轰炸", (10000 - distance) / 10000);

            for (const player of players) {
                const playerDistance = Vec3.distance(this.node.worldPosition, player.node.worldPosition);
                const proximity = Math.max(0, Math.min(1, (10000 - playerDistance) / 10000));
                ZRSJZ_Game.Instance?.Cameras[player.PlayerIndex]?.Shake(
                    60 * proximity,
                    0.3,
                );
            }
        }
        if (this.Explosion) {
            this.Explosion.node.active = true;
            this.Explosion.setCompleteListener(() => this.node.destroy());
            this.Explosion.setAnimation(0, 'eff', false);
        } else this.node.destroy();
    }
}
