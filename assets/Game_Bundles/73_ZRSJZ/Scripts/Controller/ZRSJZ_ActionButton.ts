import { _decorator, Component, director, EventTouch, input, Input, isValid, Node, Sprite, Tween, tween, UITransform, Vec3 } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_ActionService } from '../Service/ZRSJZ_ActionService';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_ActionButton')
export class ZRSJZ_ActionButton extends Component {
    public PlayerIndex = 0;
    private disc: Node = null;
    private pointer: Node = null;
    private custom: Node = null;
    private slots: Node[] = [];
    private opened = false;
    private animating = false;
    private pendingClose = false;
    private touchID = -1;
    private pressTime = 0;
    private holding = false;
    private dragging = false;
    private selected = -1;
    private point = new Vec3();
    private discScale = new Vec3(1, 1, 1);
    private discAngle = 0;
    private iconVersion = 0;
    private equipmentKey = '';
    private readonly longPressSeconds = 0.2;

    protected onLoad(): void {
        this.disc = this.node.getChildByName('动作圆盘');
        this.pointer = this.disc?.getChildByName('动作拖动');
        this.custom = this.node.getChildByName('自定义');
        if (!this.disc) return;
        this.discScale.set(this.disc.scale);
        this.discAngle = this.disc.angle;
        this.slots = [1, 2, 3, 4].map(i => this.disc.getChildByName('动作' + i));
        this.slots.forEach((slot, index) => slot?.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.opened && !this.animating && !this.holding) this.Select(index);
        }, this));
        this.custom?.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            if (!this.opened || this.animating || this.holding || !this.IsHome()) return;
            this.CloseDisc();
            ZRSJZ_UIManager.Instance.ShowPanel('73_ZRSJZ_DLC/Prefabs/Panel/动作弹窗');
        }, this);
        this.node.on(Node.EventType.TOUCH_START, this.StartPress, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.MovePress, this);
        this.node.on(Node.EventType.TOUCH_END, this.EndPress, this);
        // Cocos 会把范围外松手转换成节点 TOUCH_CANCEL，且节点可能吞掉全局事件。
        this.node.on(Node.EventType.TOUCH_CANCEL, this.EndOutsidePress, this);
        this.ResetDisc();
    }
    protected onEnable(): void {
        input.on(Input.EventType.TOUCH_START, this.OutsidePress, this);
        input.on(Input.EventType.TOUCH_MOVE, this.MovePress, this);
        input.on(Input.EventType.TOUCH_END, this.EndPress, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.CancelPress, this);
        this.equipmentKey = '';
    }
    private IsHome(): boolean { return director.getScene()?.name === 'ZRSJZ_Start'; }
    private Contains(node: Node, event: EventTouch): boolean {
        if (!node?.activeInHierarchy) return false;
        const area = node.getComponent(UITransform);
        if (!area) return false;
        const p = event.getUILocation();
        const local = area.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
        return local.x >= -area.width * area.anchorX && local.x <= area.width * (1 - area.anchorX)
            && local.y >= -area.height * area.anchorY && local.y <= area.height * (1 - area.anchorY);
    }
    private OutsidePress(event: EventTouch): void {
        if (this.opened && !this.animating && !this.holding && !this.Contains(this.node, event)
            && !this.Contains(this.disc, event) && !this.Contains(this.custom, event)) this.CloseDisc();
    }
    private StartPress(event: EventTouch): void {
        if (this.animating || this.holding || event.target !== this.node || !this.disc) return;
        event.propagationStopped = true;
        this.touchID = event.getID(); this.pressTime = 0; this.holding = true;
        this.dragging = false; this.selected = -1;
        this.ReadPoint(event);
    }
    private ReadPoint(event: EventTouch): void {
        const p = event.getUILocation();
        this.node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(p.x, p.y, 0), this.point);
    }
    private MovePress(event: EventTouch): void {
        if (!this.holding || event.getID() !== this.touchID) return;
        event.propagationStopped = true;
        this.ReadPoint(event);
        if (this.dragging && !this.animating) this.UpdateDirection();
    }
    private UpdateDirection(): void {
        const index = ZRSJZ_ActionService.GetDirection(this.point.x, this.point.y);
        this.selected = index;
        if (this.pointer) {
            this.pointer.active = index >= 0;
            // 预制体指示图默认朝上，仅允许上、右、下、左四个角度。
            if (index >= 0) this.pointer.angle = -90 * index;
        }
    }
    private EndPress(event: EventTouch): void {
        if (!this.holding || event.getID() !== this.touchID) return;
        event.propagationStopped = true;
        this.ReadPoint(event);
        const dragged = this.dragging;
        this.holding = false; this.touchID = -1;
        if (dragged) {
            if (this.animating) this.pendingClose = true;
            else { this.UpdateDirection(); this.Select(this.selected); }
        } else if (!this.animating) {
            if (this.opened) this.CloseDisc(); else this.OpenDisc();
        }
        this.dragging = false;
        if (this.pointer) this.pointer.active = false;
    }
    private EndOutsidePress(event: EventTouch): void {
        // 3.8.6 的 getEventCode 保留派发前的原始触摸类型，type 已被节点命中检测改写。
        if (event.getEventCode() === Input.EventType.TOUCH_END) this.EndPress(event);
        else this.CancelPress(event);
    }
    private CancelPress(event: EventTouch): void {
        if (!this.holding || event.getID() !== this.touchID) return;
        this.holding = false; this.dragging = false; this.touchID = -1;
        if (this.pointer) this.pointer.active = false;
        if (this.animating) this.pendingClose = true; else this.CloseDisc();
    }
    private Select(index: number): void {
        if (this.animating || !this.opened) return;
        if (index >= 0 && index < 4) ZRSJZ_ActionService.Play(index, this.PlayerIndex);
        this.CloseDisc();
    }
    private OpenDisc(): void {
        if (!this.disc || this.animating || this.opened) return;
        this.opened = true; this.animating = true; this.pendingClose = false;
        this.disc.active = true;
        this.disc.setScale(this.discScale.x * 0.05, this.discScale.y * 0.05, this.discScale.z);
        this.disc.angle = this.discAngle - 90;
        if (this.custom) this.custom.active = false;
        tween(this.disc).to(0.22, { scale: this.discScale.clone(), angle: this.discAngle }, { easing: 'quadOut' })
            .call(() => {
                this.animating = false;
                if (this.custom) this.custom.active = this.IsHome() && !this.dragging;
                if (this.pendingClose) this.CloseDisc();
                else if (this.dragging) this.UpdateDirection();
            }).start();
    }
    private CloseDisc(): void {
        if (!this.disc || !this.opened || this.animating) return;
        this.animating = true; this.pendingClose = false;
        if (this.custom) this.custom.active = false;
        if (this.pointer) this.pointer.active = false;
        tween(this.disc).to(0.18, {
            scale: new Vec3(this.discScale.x * 0.05, this.discScale.y * 0.05, this.discScale.z),
            angle: this.discAngle + 90,
        }, { easing: 'quadIn' }).call(() => this.ResetDisc()).start();
    }
    private ResetDisc(): void {
        this.opened = false; this.animating = false; this.pendingClose = false;
        if (this.disc) { Tween.stopAllByTarget(this.disc); this.disc.active = false; }
        if (this.pointer) this.pointer.active = false;
        if (this.custom) this.custom.active = false;
    }
    private RefreshIcons(): void {
        const names = ZRSJZ_GameData.Instance.EquippedActions;
        const key = JSON.stringify(names);
        if (key === this.equipmentKey) return;
        this.equipmentKey = key;
        const version = ++this.iconVersion;
        this.slots.forEach((slot, index) => {
            if (!slot) return;
            const sprite = (slot.getChildByName('Icon') ?? slot).getComponent(Sprite);
            if (!sprite) return;
            sprite.spriteFrame = null;
            const name = names[index];
            if (name) void ZRSJZ_ActionService.LoadIcon(name).then(frame => {
                if (isValid(this, true) && isValid(sprite, true) && version === this.iconVersion) sprite.spriteFrame = frame;
            }).catch(error => console.error('[动作] 图标加载失败', name, error));
        });
    }
    protected update(dt: number): void {
        if (!this.disc) return;
        this.RefreshIcons();
        if (this.holding && !this.dragging) {
            this.pressTime += dt;
            if (this.pressTime >= this.longPressSeconds) {
                this.dragging = true;
                if (this.custom) this.custom.active = false;
                this.OpenDisc();
                if (!this.animating) this.UpdateDirection();
            }
        }
    }
    protected onDisable(): void {
        input.off(Input.EventType.TOUCH_START, this.OutsidePress, this);
        input.off(Input.EventType.TOUCH_MOVE, this.MovePress, this);
        input.off(Input.EventType.TOUCH_END, this.EndPress, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.CancelPress, this);
        this.holding = false; this.dragging = false; this.touchID = -1;
        ++this.iconVersion; this.equipmentKey = '';
        this.ResetDisc();
    }
}
