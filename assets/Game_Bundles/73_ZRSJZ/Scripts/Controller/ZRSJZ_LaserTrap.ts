import { _decorator, BoxCollider2D, Component, isValid, sp, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_LASER_TRAP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_Player } from './ZRSJZ_Player';

const { ccclass } = _decorator;

/** 单个激光陷阱：触发播放动画，在真正的gj事件时重新判定伤害。 */
@ccclass('ZRSJZ_LaserTrap')
export class ZRSJZ_LaserTrap extends Component {
    private _spine: sp.Skeleton = null;
    private _trigger: BoxCollider2D = null;
    private _area: UITransform = null;
    private _cooldown = 0;
    private _firing = false;
    private _pendingHit = false;
    private _hitDelivered = false;
    private _completed = false;
    private _local = new Vec3();
    private _center = new Vec3();
    private _nearest = new Vec3();

    protected start(): void {
        this._spine = this.getComponent(sp.Skeleton);
        const trigger = this.node.getChildByName('激光触发');
        this._trigger = trigger?.getComponent(BoxCollider2D);
        this._area = trigger?.getComponent(UITransform);
        if (!this._spine || !this._trigger || !this._area) {
            console.error('[激光] 预制体缺少Spine或激光触发碰撞区');
            this.enabled = false;
            return;
        }
        // 对该独立Spine统一监听，避免连续切换动画时TrackEntry监听被运行时回收。
        this._spine.setEventListener((track, event) => {
            if (!isValid(this, true) || !this.enabledInHierarchy || !this._firing || this._hitDelivered || typeof event === 'number'
                || track.animation?.name !== ZRSJZ_LASER_TRAP_CONFIG.AttackAnimation) return;
            if (event.data.name === ZRSJZ_LASER_TRAP_CONFIG.HitEvent) {
                this._pendingHit = true;
                this.DeliverHit();
            }
        });
        this._spine.setCompleteListener(track => {
            if (isValid(this, true) && this.enabledInHierarchy && this._firing && track.animation?.name === ZRSJZ_LASER_TRAP_CONFIG.AttackAnimation) this._completed = true;
        });
        this.PlayIdle();
    }

    /** 按玩家碰撞圆与旋转后的激光触发矩形相交判定，支持点位缩放和旋转。 */
    public Contains(player: ZRSJZ_Player): boolean {
        if (!this._area || !this._trigger?.enabled || !this._trigger.node.activeInHierarchy
            || !isValid(player, true) || !player.node.activeInHierarchy || player.IsDead) return false;
        const circle = player.Collider;
        Vec3.copy(this._center, player.node.worldPosition);
        let radius = 0;
        if (circle?.enabled) {
            Vec3.transformMat4(this._center, new Vec3(circle.offset.x, circle.offset.y, 0), player.node.worldMatrix);
            radius = circle.radius * Math.max(Math.abs(player.node.worldScale.x), Math.abs(player.node.worldScale.y));
        }
        this._area.convertToNodeSpaceAR(this._center, this._local);
        const offset = this._trigger.offset, size = this._trigger.size;
        this._nearest.set(Math.max(offset.x - size.width / 2, Math.min(offset.x + size.width / 2, this._local.x)),
            Math.max(offset.y - size.height / 2, Math.min(offset.y + size.height / 2, this._local.y)), 0);
        this._area.convertToWorldSpaceAR(this._nearest, this._nearest);
        return Vec3.squaredDistance(this._center, this._nearest) <= radius * radius + 0.001;
    }

    private Fire(): void {
        if (!isValid(this._spine, true) || !this._spine.findAnimation(ZRSJZ_LASER_TRAP_CONFIG.AttackAnimation)) return;
        this._firing = true;
        this._pendingHit = false;
        this._hitDelivered = false;
        this._completed = false;
        this._cooldown = Math.max(0, ZRSJZ_LASER_TRAP_CONFIG.AttackInterval);
        this._spine.setAnimation(0, ZRSJZ_LASER_TRAP_CONFIG.AttackAnimation, false);
    }

    /** 正常情况下在gj回调当场判定；暂停边界收到的事件保留至恢复。 */
    private DeliverHit(): void {
        const game = ZRSJZ_Game.Instance;
        if (!this._pendingHit || this._hitDelivered || !this.enabledInHierarchy
            || !game || game.GamePaused || game.IsGameFinished || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
        this._pendingHit = false;
        this._hitDelivered = true;
        for (const player of game.Players) {
            if (this.Contains(player)) player.BeHit(ZRSJZ_LASER_TRAP_CONFIG.Damage);
        }
    }

    private PlayIdle(): void {
        if (isValid(this.node, true) && isValid(this._spine, true)
            && this._spine.findAnimation(ZRSJZ_LASER_TRAP_CONFIG.IdleAnimation)) {
            this._spine.setAnimation(0, ZRSJZ_LASER_TRAP_CONFIG.IdleAnimation, true);
        }
    }

    protected update(dt: number): void {
        const game = ZRSJZ_Game.Instance;
        if (!isValid(this._spine, true) || !game) return;
        const stopped = game.GamePaused || game.IsGameFinished || !ZRSJZ_UIManager.ZRSJZ_DLC;
        this._spine.timeScale = stopped ? 0 : 1;
        if (stopped) return;
        this._cooldown = Math.max(0, this._cooldown - dt);
        this.DeliverHit();
        if (this._firing && this._completed) {
            this._firing = false;
            this.PlayIdle();
        }
        if (!this._firing && this._cooldown <= 0 && game.Players.some(player => this.Contains(player))) this.Fire();
    }

    protected onDestroy(): void {
        // 监听属于同节点Spine，由Spine自行释放。这里可能晚于其销毁，不能再调用动画/监听API。
        this._firing = false;
        this._pendingHit = false;
        this._completed = false;
        this._spine = null;
        this._trigger = null;
        this._area = null;
    }

    protected onDisable(): void {
        this._firing = false;
        this._pendingHit = false;
        this._completed = false;
        this._cooldown = 0;
        this.PlayIdle();
    }
}

