import { _decorator, Color, Component, Graphics, Node, Sprite, SpriteFrame, sp, UIOpacity, UITransform } from 'cc';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_Game } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Game';
import { ZRSJZ_OnlineService as Online } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_OnlineService';
import { ZRSJZ_OnlineCombat as Coop } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_OnlineCombat';
import { ZRSJZ_PoolManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_PoolManager';
const { ccclass, property } = _decorator;
type Part = { node: Node; sprite: Sprite; opacity: UIOpacity };

/** 三元素枪贴图 + 沼泽气泡 Spine；全部表现资源留在 DLC。 */
@ccclass('ZRSJZ_ElementStatusFX')
export class ZRSJZ_ElementStatusFX extends Component {
    @property Mode = 'frost';
    @property({ type: SpriteFrame }) ElementFrame: SpriteFrame = null;
    @property({ type: [SpriteFrame] }) HitFrames: SpriteFrame[] = [];
    @property({ type: sp.SkeletonData }) BubbleData: sp.SkeletonData = null;
    @property({ type: sp.SkeletonData }) FireData: sp.SkeletonData = null;
    private static readonly trails = new Set<ZRSJZ_ElementStatusFX>();
    private parts: Part[] = [];
    private bubbles: sp.Skeleton[] = [];
    private flames: sp.Skeleton[] = [];
    private fireSpots = [-1, 1, 3];
    private nextFireTimes = [-1, -1, -1];
    private fireExitTimes = [-1, -1, -1];
    private lastFireIgnition = -1;
    private burst: Part = null;
    private opacity: UIOpacity = null;
    private width = 200;
    private height = 400;
    private clock = 0;
    private lifetime = 0;
    private ending = -1;
    private configured = false;
    private readonly color = new Color(255, 255, 255, 255);

    public Configure(width: number, height: number, lifetime = 0): void {
        this.width = Math.max(10, width); this.height = Math.max(10, height);
        this.clock = 0; this.ending = -1; this.lifetime = lifetime; this.configured = true;
        this.fireSpots = [-1, 1, 3]; this.nextFireTimes = [0, .7, 1.4];
        this.fireExitTimes = [-1, -1, -1]; this.lastFireIgnition = -1;
        this.getComponent(Graphics)?.clear();
        this.opacity = this.getComponent(UIOpacity) ?? this.addComponent(UIOpacity);
        (this.getComponent(UITransform) ?? this.addComponent(UITransform)).setContentSize(this.width * 2, this.height * 2);
        this.Build();
        if (this.Mode === 'fire') {
            for (const flame of this.flames) { flame.node.active = false; flame.paused = true; }
            if (this.flames.length) this.StartFireSpot(0);
        }
        for (let i = 0; i < this.bubbles.length; i++) {
            const skeleton = this.bubbles[i]; skeleton.paused = false;
            const track = skeleton.setAnimation(0, '气泡', true);
            track.trackTime = i * .19; skeleton.timeScale = .85 + i * .11;
        }
        if (this.Mode === 'trail') {
            ZRSJZ_ElementStatusFX.trails.delete(this);
            while (ZRSJZ_ElementStatusFX.trails.size >= 72) ZRSJZ_ElementStatusFX.trails.values().next().value.Recycle();
            ZRSJZ_ElementStatusFX.trails.add(this);
        }
        this.Render();
    }
    public End(): void {
        if (this.ending >= 0) return;
        this.ending = 0;
        let order = 0;
        for (let i = 0; i < this.flames.length; i++) {
            const skeleton = this.flames[i]; this.nextFireTimes[i] = -1;
            if (!skeleton.node.active) continue;
            if (skeleton.getCurrent(0)?.animation?.name === 'out') continue;
            this.fireExitTimes[i] = this.clock + order++ * .25;
            if (this.fireExitTimes[i] <= this.clock) this.StartFireExit(i);
        }
        for (const skeleton of this.bubbles) { const track = skeleton.getCurrent(0); if (track) track.loop = false; }
    }
    public Resume(): void {
        if (this.ending < 0) return;
        this.ending = -1;
        this.fireExitTimes = [-1, -1, -1];
        for (let i = 0; i < this.flames.length; i++) if (!this.flames[i].node.active) this.nextFireTimes[i] = this.clock + .2;
        // 重施减益时也先让当前位置的火焰熄灭，再自然进入下一处。
        for (const skeleton of this.bubbles) { const track = skeleton.getCurrent(0); if (track) track.loop = true; }
    }
    protected update(dt: number): void {
        if (!this.configured) return;
        const game = ZRSJZ_Game.Instance;
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || !game || game.IsGameFinished) { this.Recycle(); return; }
        const paused = Coop.Stopped || (game.GamePaused && !Online.Battle);
        for (const skeleton of this.bubbles) skeleton.paused = paused;
        for (const skeleton of this.flames) skeleton.paused = paused;
        if (paused) return;
        const elapsed = Math.max(0, dt); this.clock += elapsed;
        if (this.ending >= 0) this.ending += elapsed;
        if (this.lifetime > 0 && this.clock >= this.lifetime) { this.Recycle(); return; }
        if (this.Mode === 'fire') {
            if (!this.flames.length) { this.Recycle(); return; }
            if (this.ending >= 0) {
                for (let i = 0; i < this.flames.length; i++) {
                    if (this.fireExitTimes[i] >= 0 && this.clock >= this.fireExitTimes[i]) this.StartFireExit(i);
                }
                if (this.flames.every((_, i) => this.FireFinished(i))) { this.Recycle(); return; }
            } else for (let i = 0; i < this.flames.length; i++) {
                if (this.nextFireTimes[i] >= 0) {
                    // 即使掉帧让多个计划同时到期，也只每隔0.7秒点燃一簇。
                    if (this.clock >= this.nextFireTimes[i] && this.clock - this.lastFireIgnition >= .7 - 1e-8) this.StartFireSpot(i);
                } else if (this.FireFinished(i)) {
                    this.flames[i].node.active = false;
                    this.nextFireTimes[i] = this.clock + .2;
                }
            }
        } else if (this.ending >= this.OutDuration()) { this.Recycle(); return; }
        this.Render();
    }
    private OutDuration(): number { return this.Mode === 'fire' ? .82 : this.Mode === 'poison' ? .4 : .35; }
    private Smooth(value: number): number { const n = Math.max(0, Math.min(1, value)); return n * n * (3 - 2 * n); }
    private MakeSprite(name: string, frame: SpriteFrame): Part {
        const node = new Node(name); node.layer = this.node.layer; node.parent = this.node;
        node.addComponent(UITransform);
        const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.spriteFrame = frame;
        return { node, sprite, opacity: node.addComponent(UIOpacity) };
    }
    private Size(part: Part, width: number, height: number): void { part.node.getComponent(UITransform).setContentSize(width, height); }
    private StartFireSpot(index: number): void {
        const skeleton = this.flames[index];
        const points = [[-.20, -.18], [.18, .10], [-.14, .24], [.20, -.28], [0, -.02]];
        for (let step = 1; step <= points.length; step++) {
            const candidate = (this.fireSpots[index] + step) % points.length;
            if (!this.fireSpots.some((spot, i) => i !== index && this.flames[i]?.node.active && spot === candidate)) {
                this.fireSpots[index] = candidate; break;
            }
        }
        this.nextFireTimes[index] = -1;
        this.lastFireIgnition = this.clock;
        const [x, y] = points[this.fireSpots[index]];
        skeleton.node.setPosition(x * this.width, y * this.height, 0);
        const scale = this.height * .30 / 88;
        skeleton.node.setScale(scale, scale, 1); skeleton.node.active = true;
        skeleton.paused = false; skeleton.setToSetupPose(); skeleton.timeScale = .8;
        skeleton.setAnimation(0, 'in', false);
        skeleton.addAnimation(0, 'loop', false, 0);
        skeleton.addAnimation(0, 'out', false, 0);
    }
    private StartFireExit(index: number): void {
        this.fireExitTimes[index] = -1;
        const skeleton = this.flames[index];
        if (!skeleton.node.active || skeleton.getCurrent(0)?.animation?.name === 'out') return;
        skeleton.clearTrack(0); skeleton.setAnimation(0, 'out', false);
    }
    private FireFinished(index: number): boolean {
        const skeleton = this.flames[index];
        if (!skeleton || !skeleton.node.active) return true;
        const track = skeleton.getCurrent(0);
        return !!track && track.animation?.name === 'out' && track.isComplete();
    }
    private Build(): void {
        if (this.Mode === 'fire') {
            if (!this.FireData) return;
            while (this.flames.length > 3) this.flames.pop().node.active = false;
            while (this.flames.length < 3) {
                const node = new Node('燃烧Spine_' + this.flames.length); node.layer = this.node.layer; node.parent = this.node;
                const skeleton = node.addComponent(sp.Skeleton); skeleton.skeletonData = this.FireData; this.flames.push(skeleton);
            }
            return;
        }
        if (this.Mode === 'poison') {
            if (!this.BubbleData) return;
            while (this.bubbles.length < 4) {
                const node = new Node('沼泽气泡_' + this.bubbles.length); node.layer = this.node.layer; node.parent = this.node;
                const skeleton = node.addComponent(sp.Skeleton); skeleton.skeletonData = this.BubbleData; this.bubbles.push(skeleton);
            }
            for (let i = 0; i < this.bubbles.length; i++) {
                const node = this.bubbles[i].node;
                node.setPosition((i % 2 ? .28 : -.28) * this.width, (-.35 + i * .22) * this.height, 0);
                const scale = this.width / 200 * (1.05 + (i % 2) * .15); node.setScale(scale, scale, 1);
            }
            return;
        }
        if (!this.ElementFrame) return;
        while (this.parts.length < 9) this.parts.push(this.MakeSprite('贴图冰晶', this.ElementFrame));
        if (!this.burst && this.HitFrames.length) this.burst = this.MakeSprite('元素闪烁', this.HitFrames[0]);
        for (const part of this.parts) part.sprite.spriteFrame = this.ElementFrame;
    }
    private Render(): void {
        // 火焰的出现、燃烧和消失全部交给 in/loop/out Spine 动画，不用拉伸贴图模拟。
        if (this.Mode === 'fire') { this.opacity.opacity = 255; return; }
        const out = this.ending >= 0 ? this.Smooth(this.ending / this.OutDuration()) : 0;
        const fade = this.Mode === 'trail' ? this.Smooth((this.lifetime - this.clock) / .65) : this.Smooth(this.clock / .16);
        this.opacity.opacity = Math.round(255 * fade * (1 - out));
        if (this.Mode === 'poison') return;
        this.Frost(out);
    }
    private Frost(out: number): void {
        for (let i = 0; i < this.parts.length; i++) {
            const part = this.parts[i], angle = i / this.parts.length * Math.PI * 2;
            const shimmer = this.Mode === 'trail' ? 1 : .94 + .06 * Math.sin(this.clock * 3 + i);
            this.Size(part, this.width * (.30 + (i % 3) * .035), this.width * .105);
            part.node.setPosition(Math.cos(angle) * this.width * .30, Math.sin(angle) * this.height * .27, 0);
            part.node.angle = angle * 180 / Math.PI; part.node.setScale(shimmer * (1 - out * .25), shimmer, 1);
            this.color.set(185, 235, 255, 255); part.sprite.color = this.color; part.opacity.opacity = this.Mode === 'trail' ? 175 : 225;
        }
        if (this.burst) {
            const phase = this.clock % 1.4; this.burst.node.active = this.Mode !== 'trail' && phase < .4 && out === 0;
            if (this.burst.node.active) {
                this.burst.sprite.spriteFrame = this.HitFrames[Math.min(this.HitFrames.length - 1, Math.floor(phase / .067))];
                this.Size(this.burst, this.width * .8, this.height * 1.3); this.burst.opacity.opacity = Math.round(130 * (1 - phase / .4));
            }
        }
    }
    private Recycle(): void {
        ZRSJZ_ElementStatusFX.trails.delete(this);
        if (this.node.active) ZRSJZ_PoolManager.Instance.PutNode(this.node);
    }
    protected onDisable(): void {
        this.configured = false; ZRSJZ_ElementStatusFX.trails.delete(this);
        for (const skeleton of this.bubbles) skeleton.paused = true;
        for (const skeleton of this.flames) skeleton.paused = true;
        if (this.opacity) this.opacity.opacity = 0;
    }
}
