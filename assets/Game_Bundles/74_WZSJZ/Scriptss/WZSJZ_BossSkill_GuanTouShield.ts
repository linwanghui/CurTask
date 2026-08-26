import { _decorator, Component, sp } from 'cc';

const { ccclass } = _decorator;

/** 光头护罩表现：独立循环指定次数，完成后通知Boss解除无敌并回池。 */
@ccclass('WZSJZ_BossSkill_GuanTouShield')
export class WZSJZ_BossSkill_GuanTouShield extends Component {
    private _skeleton: sp.Skeleton = null;
    private _isRunning: boolean = false;
    private _completedLoops: number = 0;
    private _targetLoopCount: number = 1;
    private _onComplete: ((shield: WZSJZ_BossSkill_GuanTouShield) => void) = null;

    public Initialize(
        animationName: string,
        loopCount: number,
        fallbackDuration: number,
        onComplete: (shield: WZSJZ_BossSkill_GuanTouShield) => void,
    ): boolean {
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._onComplete = onComplete;
        this._isRunning = true;
        this._completedLoops = 0;
        this._targetLoopCount = Math.max(1, Math.floor(loopCount));
        this.node.active = true;
        this._skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        if (this._skeleton) {
            this._skeleton.clearTracks();
            this._skeleton.setCompleteListener(this.OnAnimationCycleComplete);
            this._skeleton.setAnimation(0, animationName || "animation", true);
        }
        // Spine完成回调优先；兜底避免动画名或资源配置异常导致Boss永久无敌。
        this.scheduleOnce(this.Complete, Math.max(0.01, fallbackDuration));
        return true;
    }

    private OnAnimationCycleComplete = (): void => {
        if (!this._isRunning) return;
        this._completedLoops++;
        if (this._completedLoops >= this._targetLoopCount) this.Complete();
    };

    private Complete = (): void => {
        if (!this._isRunning) return;
        this._isRunning = false;
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._skeleton = null;
        const complete = this._onComplete;
        this._onComplete = null;
        complete?.(this);
    };

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._isRunning = false;
        this._completedLoops = 0;
        this._targetLoopCount = 1;
        this._onComplete = null;
    }
}
