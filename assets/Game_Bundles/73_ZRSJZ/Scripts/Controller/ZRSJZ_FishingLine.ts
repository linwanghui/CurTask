import { _decorator, Camera, Color, Component, Director, director, Graphics, isValid, Node, sp, Sprite, UITransform, Vec3 } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_FISHING_CONFIG } from '../ZRSJZ_Constant';

const { ccclass } = _decorator;

/** 跟随世界地图的鱼线与水波；绘制前读取 Spine 本帧的竿尖 dy，支持玩家镜像及地图缩放。 */
@ccclass('ZRSJZ_FishingLine')
export class ZRSJZ_FishingLine extends Component {
    private _player: ZRSJZ_Player;
    private _area: UITransform;
    private _graphics: Graphics;
    private _ui: UITransform;
    private _ripple: Node;
    private _rippleSpine: sp.Skeleton;
    private _origin = new Vec3();
    private _start = new Vec3();
    private _end = new Vec3();
    private _elapsed = 0;
    private _pull = 0;
    private _state = 'waiting';
    private _castProgress = 1;
    private _disposed = false;
    private _fish: Node;
    private _catchName = '';
    private _catchVersion = 0;
    private _catchOrigin = new Vec3();
    private _catchRodTip = new Vec3();
    private _catchProgress = 0;

    /** 与本次实际奖励共用结果；锁定水面起点，吊起后飞向玩家，不跟随竿尖回摆。 */
    public ShowCatch(name: string): void {
        if (this._disposed || !name) return;
        this._catchName = name;
        Vec3.copy(this._catchOrigin, this._end);
        Vec3.copy(this._catchRodTip, this._start);
        this._catchProgress = 0;
        const version = ++this._catchVersion;
        void ZRSJZ_UIManager.Instance.GetPropUI(name)?.then(frame => {
            if (!frame || this._disposed || version !== this._catchVersion || !isValid(this.node, true)) return;
            if (!this._fish) {
                this._fish = new Node('钓起的鱼');
                this._fish.layer = this.node.layer;
                this._fish.parent = this.node;
                this._fish.addComponent(UITransform).setAnchorPoint(0.5, 1);
                this._fish.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;
            }
            this._fish.getComponent(Sprite).spriteFrame = frame;
            const size = frame.originalSize;
            const scale = 76 / Math.max(1, size.width, size.height);
            this._fish.getComponent(UITransform).setContentSize(size.width * scale, size.height * scale);
            this._fish.active = false; // 由 Draw 定位后显示，避免异步加载时闪在旧位置。
        }).catch(error => console.warn('[钓鱼] 鱼图标加载失败', error));
    }

    private ClearCatch(): void {
        this._catchName = '';
        ++this._catchVersion;
        if (isValid(this._fish, true)) this._fish.active = false;
    }

    public Init(player: ZRSJZ_Player, area: Node, ripple: Node): void {
        this._player = player;
        this._ripple = ripple;
        this._rippleSpine = ripple.getComponentInChildren(sp.Skeleton);
        this._area = area?.getComponent(UITransform);
        this._graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
        this._ui = this.getComponent(UITransform);
        this._ui.setContentSize(1800, 1800);
    }

    public Cast(): void {
        if (this._disposed || !this._area) return;
        this.ClearCatch();
        this._graphics?.clear();
        if (isValid(this._ripple, true)) this._ripple.active = false;
        this._origin.set((0.2 + Math.random() * 0.6 - this._area.anchorX) * this._area.width,
            (0.2 + Math.random() * 0.6 - this._area.anchorY) * this._area.height, 0);
        this._elapsed = 0;
        this._pull = 0;
        this._state = 'casting';
        this._castProgress = 0;
        this.node.active = false;
    }

    public SetState(state: string, castProgress: number): void {
        if (this._disposed) return;
        this._state = state;
        if (state === 'ready' && this._catchName) this.ClearCatch();
        this._castProgress = Math.max(0, Math.min(1, castProgress));
        this.node.active = state !== 'ready' && state !== 'casting';
        this.SyncRippleAnimation();
    }

    private SyncRippleAnimation(): void {
        if (!this._rippleSpine?._skeleton) return;
        const animation = this._state === 'pulling' ? '2' : '1';
        if (this._rippleSpine && this._rippleSpine.getCurrent(0)?.animation?.name !== animation) {
            this._rippleSpine.setAnimation(0, animation, true);
        }
    }

    public Pull(): void { this._pull = Math.min(1, this._pull + 0.65); }

    protected onEnable(): void {
        if (!this._disposed) director.on(Director.EVENT_BEFORE_DRAW, this.Draw, this);
    }
    protected onDisable(): void {
        director.off(Director.EVENT_BEFORE_DRAW, this.Draw, this);
        this._graphics?.clear();
        if (isValid(this._ripple, true)) this._ripple.active = false;
    }

    protected onDestroy(): void {
        this.Dispose();
    }

    public Dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this.ClearCatch();
        director.off(Director.EVENT_BEFORE_DRAW, this.Draw, this);
        this._graphics?.clear();
        this.node.active = false;
        if (isValid(this._ripple, true)) {
            this._ripple.active = false;
            this._ripple.destroy();
        }
        this._player = null;
        this._area = null;
    }

    protected update(dt: number): void {
        const paused = !!ZRSJZ_Game.Instance?.GamePaused;
        if (this._rippleSpine) this._rippleSpine.timeScale = paused ? 0 : 1;
        if (paused) return;
        this._elapsed += dt;
        this._pull *= Math.exp(-7 * dt);
    }

    private Draw(): void {
        if (this._disposed || !this.node.activeInHierarchy || !this._player?.IsFishing
            || !isValid(this._player, true) || !isValid(this._area, true) || !this._graphics) return;
        const skeleton = this._player.PlayerSkeleton?.Skeleton;
        const bone = skeleton?.findBone('dy');
        this._graphics.clear();
        if (!bone) return;
        Vec3.transformMat4(this._start, new Vec3(bone.worldX, bone.worldY, 0), skeleton.node.worldMatrix);
        const rodInArea = this._area.convertToNodeSpaceAR(this._start);
        const pulling = this._state === 'pulling';
        const waveX = pulling ? Math.sin(this._elapsed * 6.3) * 12 : 0;
        const waveY = pulling ? Math.sin(this._elapsed * 8.1) * 7 : 0;
        const towardRod = Vec3.subtract(new Vec3(), rodInArea, this._origin);
        if (towardRod.lengthSqr() > 0.001) towardRod.normalize();
        const x = this._origin.x + waveX + towardRod.x * this._pull * 24;
        const y = this._origin.y + waveY + towardRod.y * this._pull * 24;
        const margin = 8;
        const minX = -this._area.anchorX * this._area.width + margin;
        const maxX = (1 - this._area.anchorX) * this._area.width - margin;
        const minY = -this._area.anchorY * this._area.height + margin;
        const maxY = (1 - this._area.anchorY) * this._area.height - margin;
        this._area.convertToWorldSpaceAR(new Vec3(Math.max(minX, Math.min(maxX, x)), Math.max(minY, Math.min(maxY, y)), 0), this._end);
        // 鱼线在抛竿完成后启用，并直接连接水面落点。
        if (this._state === 'waiting') Vec3.lerp(this._end, this._start, this._end, this._castProgress);
        if (!isValid(this._ripple, true)) return;
        this._ripple.setWorldPosition(this._end);
        this._ripple.active = this._state !== 'waiting' || this._castProgress >= 1;
        if (this._ripple.active) this.SyncRippleAnimation();
        // 鱼线的末端严格取水波纹根节点的实际世界坐标。
        Vec3.copy(this._end, this._ripple.worldPosition);
        const camera = ZRSJZ_Game.Instance?.Cameras[this._player.PlayerIndex]?.getComponent(Camera);
        if (!camera) return;
        // 与战斗方向指示器使用相同投影，鱼线显示在当前玩家的 UI 控制区域。
        const start = camera.convertToUINode(this._start, this.node);
        const end = camera.convertToUINode(this._end, this.node);
        let drawLine = true;
        if (this._state === 'finishing' && this._catchName) {
            const track = skeleton.getCurrent(0);
            const duration = skeleton.findAnimation('dy4')?.duration || 0.667;
            if (track?.animation?.name === 'dy4') {
                this._catchProgress = Math.max(this._catchProgress, Math.min(1, Math.max(0, track.trackTime / duration)));
            }
            const progress = this._catchProgress;
            const origin = camera.convertToUINode(this._catchOrigin, this.node);
            const target = camera.convertToUINode(this._player.node.worldPosition, this.node);
            target.y += 60;
            // 使用锁定的竿尖高度设置真实顶点（不是贝塞尔控制点），先高抛再落到角色身上。
            const rodTip = camera.convertToUINode(this._catchRodTip, this.node);
            const apex = Math.max(rodTip.y + 80, origin.y + 180, target.y + 180);
            const rise = Math.sqrt(apex - origin.y);
            const fall = Math.sqrt(apex - target.y);
            const peakTime = rise / (rise + fall);
            const gravity = (rise + fall) * (rise + fall);
            end.x = origin.x + (target.x - origin.x) * progress;
            end.y = apex - gravity * (progress - peakTime) * (progress - peakTime);
            this._ripple.active = progress < 0.12;
            // 鱼离水后脱离鱼线飞入角色，收竿后半段不再显示回摆的长线。
            drawLine = progress < 0.25;
            if (isValid(this._fish, true)) {
                this._fish.active = progress < 1;
                this._fish.setPosition(end.x, end.y, 0);
                const scale = 1 - Math.max(0, (progress - 0.8) / 0.2) * 0.8;
                this._fish.setScale(scale, scale, 1);
                this._fish.setRotationFromEuler(0, 0, Math.sin(progress * Math.PI) * 18);
            }
        }
        if (!drawLine) return;
        const graphics = this._graphics;
        graphics.lineWidth = ZRSJZ_FISHING_CONFIG.LineWidth;
        graphics.strokeColor = new Color(247, 247, 226, 235);
        graphics.moveTo(start.x, start.y);
        const sag = pulling ? 3 : 14;
        graphics.quadraticCurveTo((start.x + end.x) / 2, (start.y + end.y) / 2 - sag, end.x, end.y);
        graphics.stroke();

    }
}
