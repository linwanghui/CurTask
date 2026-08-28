import { _decorator, Component, EventTouch, Label, Node, Sprite, Vec2 } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';
const { ccclass } = _decorator;

@ccclass('WZSJZ_SkillButtom')
export class WZSJZ_SkillButtom extends Component {
    private _cooldown: number = 0;
    private _remaining: number = 0;
    private _onUse: (() => boolean) = null;
    private _maskNode: Node = null;
    private _countdownNode: Node = null;
    private _countdownLabel: Label = null;
    private _isInfiniteCooldown: boolean = false;
    private _isTargetedSkill: boolean = false;
    private _isTargeting: boolean = false;
    private _hasTargetMoved: boolean = false;
    private _targetStartPosition: Vec2 = new Vec2();
    private _onTargetStart: ((uiPosition: Vec2) => boolean) = null;
    private _onTargetMove: ((uiPosition: Vec2) => void) = null;
    private _onTargetEnd: ((uiPosition: Vec2, cancelled: boolean) => boolean) = null;
    private _onTargetTap: (() => void) = null;

    protected onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchCancel, this);
        this._maskNode = this.node.getChildByName("遮罩");
        this._countdownNode = this.node.getChildByName("倒计时");
        this._countdownLabel = this._countdownNode?.getComponent(Label) || null;
    }

    public Configure(
        cooldown: number,
        onUse: () => boolean,
        infiniteCooldown: boolean = false,
    ): void {
        this._cooldown = Math.max(0, cooldown);
        this._isInfiniteCooldown = infiniteCooldown;
        // 技能刚生成（包括组合角色拆开后重新组合）时从完整CD开始。
        this._remaining = this._isInfiniteCooldown ? 0 : this._cooldown;
        this._onUse = onUse;
        const mask = this._maskNode?.getComponent(Sprite);
        if (mask) {
            mask.type = Sprite.Type.FILLED;
            mask.fillType = Sprite.FillType.RADIAL;
            mask.fillStart = 0.25;
        }
        this.RefreshCooldownView();
    }

    public ConfigureTargeting(
        onStart: (uiPosition: Vec2) => boolean,
        onMove: (uiPosition: Vec2) => void,
        onEnd: (uiPosition: Vec2, cancelled: boolean) => boolean,
        onTap?: () => void,
    ): void {
        this._isTargetedSkill = true;
        this._onTargetStart = onStart;
        this._onTargetMove = onMove;
        this._onTargetEnd = onEnd;
        this._onTargetTap = onTap || null;
    }

    protected update(deltaTime: number): void {
        if (this._isInfiniteCooldown || this._remaining <= 0) {
            return;
        }
        this._remaining = Math.max(0, this._remaining - deltaTime);
        this.RefreshCooldownView();
    }

    private OnClicked(): void {
        if ((!this._isInfiniteCooldown && this._remaining > 0) || !this._onUse?.()) {
            return;
        }
        this._remaining = this._isInfiniteCooldown ? 0 : this._cooldown;
        WZSJZ_AudioManager.Play('技能释放', 0.75, 0.08);
        this.RefreshCooldownView();
    }

    private OnTouchStart(event: EventTouch): void {
        if (!this._isTargetedSkill
            || (!this._isInfiniteCooldown && this._remaining > 0)) {
            return;
        }
        const position = event.getUILocation();
        this._targetStartPosition.set(position.x, position.y);
        this._hasTargetMoved = false;
        this._isTargeting = !!this._onTargetStart?.(position);
        if (this._isTargeting) {
            event.propagationStopped = true;
        }
    }

    private OnTouchMove(event: EventTouch): void {
        if (!this._isTargeting) return;
        const position = event.getUILocation();
        const deltaX = position.x - this._targetStartPosition.x;
        const deltaY = position.y - this._targetStartPosition.y;
        const minimum = WZSJZ_Constant.DragIndicator.SkillDragMinimumDistance;
        if (deltaX * deltaX + deltaY * deltaY >= minimum * minimum) {
            this._hasTargetMoved = true;
        }
        this._onTargetMove?.(position);
        event.propagationStopped = true;
    }

    private OnTouchEnd(event: EventTouch): void {
        if (!this._isTargetedSkill) {
            this.OnClicked();
            return;
        }
        if (this._isTargeting && !this._hasTargetMoved) {
            this._onTargetTap?.();
        }
        this.FinishTargeting(event, !this._hasTargetMoved);
    }

    private OnTouchCancel(event: EventTouch): void {
        if (this._isTargetedSkill) {
            // 手指移出技能按钮后抬起时，Cocos发送TOUCH_CANCEL而非TOUCH_END；
            // 已经形成拖拽的情况应在当前位置正常施法。
            this.FinishTargeting(event, !this._hasTargetMoved);
        }
    }

    private FinishTargeting(event: EventTouch, cancelled: boolean): void {
        if (!this._isTargeting) return;
        this._isTargeting = false;
        const used = !!this._onTargetEnd?.(event.getUILocation(), cancelled);
        if (used) {
            this._remaining = this._isInfiniteCooldown ? 0 : this._cooldown;
            WZSJZ_AudioManager.Play('技能释放', 0.75, 0.08);
            this.RefreshCooldownView();
        }
        event.propagationStopped = true;
    }

    public SetInfiniteCooldown(enabled: boolean): void {
        this._isInfiniteCooldown = enabled;
        if (enabled) {
            this._remaining = 0;
        }
        this.RefreshCooldownView();
    }

    private RefreshCooldownView(): void {
        const coolingDown = this._remaining > 0;
        if (this._maskNode) {
            this._maskNode.active = coolingDown;
            const mask = this._maskNode.getComponent(Sprite);
            if (mask) {
                mask.fillRange = this._cooldown > 0 ? this._remaining / this._cooldown : 0;
            }
        }
        if (this._countdownNode) {
            this._countdownNode.active = coolingDown;
        }
        if (this._countdownLabel) {
            this._countdownLabel.string = Math.ceil(this._remaining).toString();
        }
    }

}
