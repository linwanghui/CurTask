import { _decorator, Component, sp } from 'cc';
import { WZSJZ_Wall } from './WZSJZ_Wall';

const { ccclass } = _decorator;

/** 混乱技能落点特效：独立结算延迟伤害，动画完整播放后回池。 */
@ccclass('WZSJZ_BossSkill_HunLuanEffect')
export class WZSJZ_BossSkill_HunLuanEffect extends Component {
    private _wall: WZSJZ_Wall = null;
    private _damage: number = 0;
    private _isRunning: boolean = false;
    private _damageApplied: boolean = false;
    private _animationCompleted: boolean = false;
    private _skeleton: sp.Skeleton = null;
    private _onRecycle: ((effect: WZSJZ_BossSkill_HunLuanEffect) => void) = null;

    public Initialize(
        wall: WZSJZ_Wall,
        damage: number,
        animationName: string,
        damageDelay: number,
        fallbackDuration: number,
        onRecycle: (effect: WZSJZ_BossSkill_HunLuanEffect) => void,
    ): boolean {
        if (!wall?.IsAlive || damage < 0) return false;
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._wall = wall;
        this._damage = Math.max(0, damage);
        this._isRunning = true;
        this._damageApplied = false;
        this._animationCompleted = false;
        this._onRecycle = onRecycle;
        this.node.active = true;
        this._skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        if (this._skeleton) {
            this._skeleton.clearTracks();
            this._skeleton.setCompleteListener(this.OnAnimationCompleted);
            this._skeleton.setAnimation(0, animationName || "animation", false);
        } else {
            // 仅在预制体缺少Spine时兜底，正常动画不会被计时器提前截断。
            this.scheduleOnce(this.MarkAnimationCompleted, Math.max(0.01, fallbackDuration));
        }
        this.scheduleOnce(this.ApplyDamage, Math.max(0, damageDelay));
        return true;
    }

    private ApplyDamage = (): void => {
        if (!this._isRunning || this._damageApplied) return;
        this._damageApplied = true;
        this._wall?.TakeDamage(this._damage);
        this.TryRecycle();
    };

    private OnAnimationCompleted = (): void => {
        this.MarkAnimationCompleted();
    };

    private MarkAnimationCompleted = (): void => {
        if (!this._isRunning || this._animationCompleted) return;
        this._animationCompleted = true;
        this.TryRecycle();
    };

    private TryRecycle(): void {
        if (!this._isRunning || !this._damageApplied || !this._animationCompleted) return;
        this._isRunning = false;
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._skeleton = null;
        this._wall = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    }

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._isRunning = false;
        this._onRecycle = null;
    }
}
