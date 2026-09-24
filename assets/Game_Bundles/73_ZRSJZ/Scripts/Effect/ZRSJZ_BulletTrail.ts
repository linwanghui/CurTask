import { _decorator, Component, Node, Graphics, Color, UITransform, Vec3 } from 'cc';
import { ZRSJZ_OnlineService as Online } from '../Service/ZRSJZ_OnlineService';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass } = _decorator;

/** 直线弹道按生成时间逐段渐隐：枪口端先消失，弹头端后消失。 */
@ccclass('ZRSJZ_BulletTrail')
export class ZRSJZ_BulletTrail extends Component {
    private static pools = new WeakMap<Node, ZRSJZ_BulletTrail[]>();
    private static readonly FadeDuration = 0.3;
    private static readonly HoldDuration = 0.04;
    private origin = new Vec3();
    private head = new Vec3();
    private clock = 0;
    private headTime = 0;
    private finished = false;
    private graphics: Graphics;
    private localA = new Vec3();
    private localB = new Vec3();
    private glow = new Color(255, 255, 255, 0);
    private core = new Color(255, 255, 255, 0);

    public static Begin(parent: Node, layer: number, position: Vec3): ZRSJZ_BulletTrail {
        const pool = this.pools.get(parent) ?? [];
        this.pools.set(parent, pool);
        let trail = pool.pop();
        if (!trail?.isValid) {
            const node = new Node('弹道拖尾');
            node.layer = layer;
            node.parent = parent;
            node.addComponent(UITransform).setContentSize(1000, 1000);
            trail = node.addComponent(ZRSJZ_BulletTrail);
            trail.graphics = node.addComponent(Graphics);
        }
        trail.origin.set(position);
        trail.head.set(position);
        trail.clock = 0;
        trail.headTime = 0;
        trail.finished = false;
        trail.graphics.clear();
        trail.node.active = true;
        trail.Push(position);
        return trail;
    }
    public Push(position: Vec3): void {
        if (this.finished) return;
        this.node.setWorldPosition(position);
        this.head.set(position);
        this.headTime = this.clock;
        this.Draw();
    }
    public Finish(): void {
        if (this.finished) return;
        this.finished = true;
    }
    protected update(dt: number): void {
        if (Online.Paused || ZRSJZ_Game.Instance?.GamePaused) return;
        this.clock += Math.max(0, dt);
        this.Draw();
        if (this.finished && this.OpacityAt(1) <= 0) {
            const parent = this.node.parent;
            this.node.active = false;
            const pool = ZRSJZ_BulletTrail.pools.get(parent);
            if (pool && pool.length < 64) pool.push(this);
            else this.node.destroy();
        }
    }
    private OpacityAt(fraction: number): number {
        const age = this.clock - this.headTime * fraction;
        return Math.max(0, Math.min(1,
            1 - (age - ZRSJZ_BulletTrail.HoldDuration) / ZRSJZ_BulletTrail.FadeDuration));
    }
    private Draw(): void {
        this.graphics.clear();
        if (this.OpacityAt(1) <= 0) return;
        this.node.inverseTransformPoint(this.localA, this.origin);
        this.node.inverseTransformPoint(this.localB, this.head);
        this.node.getComponent(UITransform).setContentSize(
            Math.abs(this.localA.x - this.localB.x) * 2 + 20,
            Math.abs(this.localA.y - this.localB.y) * 2 + 20);
        // 子弹匀速直线飞行，沿线比例对应生成时刻；只细分仍可见的部分。
        const start = this.headTime > 0 ? Math.max(0,
            (this.clock - ZRSJZ_BulletTrail.HoldDuration - ZRSJZ_BulletTrail.FadeDuration) / this.headTime) : 0;
        const dx = this.localB.x - this.localA.x;
        const dy = this.localB.y - this.localA.y;
        for (const [width, color] of [[9, this.glow], [3, this.core]] as const) {
            this.graphics.lineWidth = width;
            for (let i = 0; i < 24; i++) {
                const from = start + (1 - start) * i / 24;
                const to = start + (1 - start) * (i + 1) / 24;
                color.a = Math.round((width === 9 ? 95 : 225) * this.OpacityAt((from + to) / 2));
                this.graphics.strokeColor = color;
                this.graphics.moveTo(this.localA.x + dx * from, this.localA.y + dy * from);
                this.graphics.lineTo(this.localA.x + dx * to, this.localA.y + dy * to);
                this.graphics.stroke();
            }
        }
    }
}
