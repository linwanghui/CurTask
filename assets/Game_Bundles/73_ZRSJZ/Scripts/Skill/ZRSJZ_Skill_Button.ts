import { _decorator, Component, EventTouch, Node, Sprite, Vec2, clamp01, } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent, } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';

const { ccclass, property } = _decorator;

/**
 * 玩家技能按钮。
 *
 * 操作方式：
 * 1. 按下按钮开始记录技能方向；
 * 2. 拖动时根据起点到当前位置计算方向和力度；
 * 3. 松手时发送 ZRSJZ_PLAYER_SKILL 并开始冷却；
 * 4. 触摸取消时不会释放技能。
 */
@ccclass('ZRSJZ_Skill_Button')
export class ZRSJZ_Skill_Button extends Component {
    @property({ tooltip: '发送给玩家的技能名称' })
    SkillName: string = '';

    @property({ min: 0, tooltip: '技能冷却时间，单位为秒；0 表示无冷却' })
    CD: number = 0;

    @property({ tooltip: '是否需要锁定' })
    IsNeedLock: boolean = true;

    @property({ min: 1, tooltip: '拖动达到该距离时，技能力度视为 100%' })
    AimRadius: number = 100;


    private _skillCDSprite: Sprite = null;
    private _touchID: number = -1;
    private _skillCD: number = 0;
    private _touchStart: Vec2 = new Vec2();
    private _aimDirection: Vec2 = new Vec2();
    private _aimStrength: number = 0;

    public get IsReady(): boolean {
        return this._skillCD <= 0;
    }

    public get CooldownRemaining(): number {
        return this._skillCD;
    }

    public get CooldownProgress(): number {
        if (this.CD <= 0) {
            return 0;
        }
        return clamp01(this._skillCD / this.CD);
    }

    protected onLoad(): void {
        this._skillCDSprite = this.node.getChildByName('CD')?.getComponent(Sprite) ?? null;
        this.RefreshCooldownView();
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.OnTouchCancel, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.OnTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.OnTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.OnTouchCancel, this);
        this.ResetTouch();
    }

    protected update(dt: number): void {
        if (this._skillCD <= 0) {
            return;
        }

        this._skillCD = Math.max(0, this._skillCD - Math.max(0, dt));
        this.RefreshCooldownView();
    }

    /** 主动释放技能；返回 false 表示技能名为空或仍在冷却。 */
    public TryCast(
        dirX: number = 0,
        dirY: number = 0,
        strength: number = 0,
    ): boolean {
        const skillName = this.SkillName.trim();
        if (!this.IsReady || !skillName) {
            return false;
        }

        const directionLength = Math.sqrt(dirX * dirX + dirY * dirY);
        if (directionLength > 0) {
            dirX /= directionLength;
            dirY /= directionLength;
        } else {
            dirX = 0;
            dirY = 0;
        }

        ZRSJZ_EventManager.Emit(
            ZRSJZ_MyEvent.ZRSJZ_PLAYER_SKILL,
            skillName,
            dirX,
            dirY,
            clamp01(strength),
        );
        this.StartCooldown();
        return true;
    }

    /** 从完整冷却时间开始计时，也可传入自定义时长。 */
    public StartCooldown(duration: number = this.CD): void {
        this._skillCD = Math.max(0, duration);
        this.RefreshCooldownView();
    }

    /** 立即结束冷却。 */
    public ResetCooldown(): void {
        this._skillCD = 0;
        this.RefreshCooldownView();
    }

    private OnTouchStart(event: EventTouch): void {
        if (this.IsNeedLock && !ZRSJZ_Game.Instance.CurPlayer.IsLockEnemy) {
            ZRSJZ_UIManager.Instance.ShowTip("请先锁定目标！");
            return;
        }
        if (!this.IsReady || this._touchID !== -1) {
            return;
        }

        event.propagationStopped = true;
        this._touchID = event.getID();
        this._touchStart.set(event.getUILocation());
        this._aimDirection.set(0, 0);
        this._aimStrength = 0;
    }

    private OnTouchMove(event: EventTouch): void {
        if (!this.IsCurrentTouch(event)) {
            return;
        }

        event.propagationStopped = true;
        this.UpdateAim(event);
    }

    private OnTouchEnd(event: EventTouch): void {
        if (!this.IsCurrentTouch(event)) {
            return;
        }

        event.propagationStopped = true;
        this.UpdateAim(event);
        const dirX = this._aimDirection.x;
        const dirY = this._aimDirection.y;
        const strength = this._aimStrength;
        this.ResetTouch();
        this.TryCast(dirX, dirY, strength);
    }

    private OnTouchCancel(event: EventTouch): void {
        if (!this.IsCurrentTouch(event)) {
            return;
        }

        event.propagationStopped = true;
        this.ResetTouch();
    }

    private IsCurrentTouch(event: EventTouch): boolean {
        return this._touchID !== -1 && this._touchID === event.getID();
    }

    private UpdateAim(event: EventTouch): void {
        const location = event.getUILocation();
        const offsetX = location.x - this._touchStart.x;
        const offsetY = location.y - this._touchStart.y;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        if (distance <= 0) {
            this._aimDirection.set(0, 0);
            this._aimStrength = 0;
            return;
        }

        this._aimDirection.set(offsetX / distance, offsetY / distance);
        this._aimStrength = clamp01(distance / Math.max(1, this.AimRadius));
    }

    private ResetTouch(): void {
        this._touchID = -1;
        this._aimDirection.set(0, 0);
        this._aimStrength = 0;
    }

    private RefreshCooldownView(): void {
        if (!this._skillCDSprite) {
            return;
        }

        const isCoolingDown = this._skillCD > 0 && this.CD > 0;
        this._skillCDSprite.node.active = isCoolingDown;
        this._skillCDSprite.fillRange = isCoolingDown
            ? this.CooldownProgress
            : 0;
    }
}
