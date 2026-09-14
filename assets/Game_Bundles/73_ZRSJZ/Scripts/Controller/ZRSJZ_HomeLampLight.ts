import { _decorator, Component, Node, sp, Sprite, UITransform, Vec3, Vec4 } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

/** Sends the actual Spine lamp alpha/position to the background lighting shader.
 * The lamp's click easter egg lasts only for this home visit; no save data is changed. */
@ccclass('ZRSJZ_HomeLampLight')
@requireComponent(Sprite)
export class ZRSJZ_HomeLampLight extends Component {
    @property(sp.Skeleton)
    lamp: sp.Skeleton | null = null;

    @property(Node)
    lampHitArea: Node | null = null;

    private extinguished = false;

    @property({ min: 1, max: 6400, tooltip: '以灯为中心的照明半径，单位为背景设计像素；边缘衰减为零' })
    radiusPixels = 4800;

    @property({ min: 0, max: 1, tooltip: '红光反射强度，当前 0.5；越高越明亮' })
    strength = 0.5;

    @property({ min: 0, max: 0.2, tooltip: '熄灯时附近表面压暗程度，不影响远处' })
    darkness = 0.07;

    private sprite: Sprite | null = null;
    private transform: UITransform | null = null;
    private material: ReturnType<Sprite['getMaterialInstance']> = null;
    private readonly localLamp = new Vec3();
    private readonly lightData = new Vec4();
    private readonly settings = new Vec4();
    private readonly uvOriginU = new Vec4();
    private readonly uvVAspect = new Vec4();

    protected onEnable(): void {
        this.sprite = this.getComponent(Sprite);
        this.transform = this.getComponent(UITransform);
        // UIRenderer owns/releases its material instance; never mutate the shared asset.
        this.material = this.sprite?.customMaterial ? this.sprite.getMaterialInstance(0) : null;
        this.lamp = this.lamp || this.node.getChildByName('指示灯_慢闪')?.getComponent(sp.Skeleton) || null;
        this.lampHitArea?.on(Node.EventType.TOUCH_END, this.extinguishLamp, this);
    }

    private extinguishLamp(): void {
        if (this.extinguished || !this.lamp) return;
        this.extinguished = true;
        // Native Spine off pose keeps the physical housing visible, both light slots invisible.
        this.lamp.setAnimation(0, 'off', false);
        this.lightData.w = 0;
        this.settings.set(0, 0, 3, 0);
        this.material?.setProperty('lightData', this.lightData);
        this.material?.setProperty('lightSettings', this.settings);
    }

    protected lateUpdate(): void {
        const bg = this.transform, mat = this.material, frame = this.sprite?.spriteFrame;
        if (!bg || !mat || !frame || !this.lamp || bg.width <= 0 || bg.height <= 0) return;
        const uv = frame.uv;
        const ux = uv[2] - uv[0], uy = uv[3] - uv[1];
        const vx = uv[4] - uv[0], vy = uv[5] - uv[1];
        if (Math.abs(ux * vy - uy * vx) < 1e-10) return;
        bg.convertToNodeSpaceAR(this.lamp.node.worldPosition, this.localLamp);
        // Read the rig's evaluated slot: stays in phase on pause/restart/timeScale changes.
        const slot = this.lamp.findSlot('halo');
        const visible = this.lamp.enabledInHierarchy && this.lamp.node.activeInHierarchy;
        const alpha = visible && slot ? slot.color.a : 18 / 255;
        const pulse = Math.max(0, Math.min(1, (alpha * 255 - 18) / 92));
        this.lightData.set(this.localLamp.x / bg.width + bg.anchorX,
            this.localLamp.y / bg.height + bg.anchorY, this.radiusPixels / bg.height, pulse);
        this.settings.set(this.extinguished ? 0 : this.strength, this.extinguished ? 0 : this.darkness, 3, 0);
        this.uvOriginU.set(uv[0], uv[1], ux, uy);
        this.uvVAspect.set(vx, vy, bg.width / bg.height, 0);
        mat.setProperty('lightData', this.lightData);
        mat.setProperty('lightSettings', this.settings);
        mat.setProperty('uvOriginU', this.uvOriginU);
        mat.setProperty('uvVAspect', this.uvVAspect);
    }

    protected onDisable(): void {
        this.lampHitArea?.off(Node.EventType.TOUCH_END, this.extinguishLamp, this);
        this.lightData.w = 0;
        this.material?.setProperty('lightData', this.lightData);
        this.material?.setProperty('lightSettings', new Vec4(0, 0, 3, 0));
    }
}
