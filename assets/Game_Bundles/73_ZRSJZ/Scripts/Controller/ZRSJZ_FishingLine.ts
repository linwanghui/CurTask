import { _decorator, Camera, Color, Component, Director, director, Graphics, isValid, Node, sp, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_FISHING_CONFIG } from '../ZRSJZ_Constant';

const { ccclass } = _decorator;

/** 跟随世界地图的鱼线与水波；绘制前读取 Spine 本帧的 bone13，支持玩家镜像及地图缩放。 */
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
        if (!this._area) return;
        this._origin.set((0.2 + Math.random() * 0.6 - this._area.anchorX) * this._area.width,
            (0.2 + Math.random() * 0.6 - this._area.anchorY) * this._area.height, 0);
        this._elapsed = 0;
        this._pull = 0;
        this.node.active = true;
    }

    public SetState(state: string, castProgress: number): void {
        this._state = state;
        this._castProgress = Math.max(0, Math.min(1, castProgress));
        this.node.active = state !== 'ready';
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

    protected onEnable(): void { director.on(Director.EVENT_BEFORE_DRAW, this.Draw, this); }
    protected onDisable(): void {
        director.off(Director.EVENT_BEFORE_DRAW, this.Draw, this);
        if (isValid(this._ripple, true)) this._ripple.active = false;
    }

    protected onDestroy(): void {
        if (isValid(this._ripple, true)) this._ripple.destroy();
    }

    protected update(dt: number): void {
        const paused = !!ZRSJZ_Game.Instance?.GamePaused;
        if (this._rippleSpine) this._rippleSpine.timeScale = paused ? 0 : 1;
        if (paused) return;
        this._elapsed += dt;
        this._pull *= Math.exp(-7 * dt);
    }

    private Draw(): void {
        if (!isValid(this._player, true) || !isValid(this._area, true) || !this._graphics) return;
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
        // 抛竿时鱼线从竿尖伸向落点；其余阶段始终连接水面端点。
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
        const graphics = this._graphics;
        graphics.lineWidth = ZRSJZ_FISHING_CONFIG.LineWidth;
        graphics.strokeColor = new Color(247, 247, 226, 235);
        graphics.moveTo(start.x, start.y);
        const sag = pulling ? 3 : 14;
        graphics.quadraticCurveTo((start.x + end.x) / 2, (start.y + end.y) / 2 - sag, end.x, end.y);
        graphics.stroke();

    }
}
