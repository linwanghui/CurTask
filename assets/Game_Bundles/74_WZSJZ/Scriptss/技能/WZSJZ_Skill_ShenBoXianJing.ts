import { _decorator, Component, Node, sp } from 'cc';
import { WZSJZ_Enemy } from '../WZSJZ_Enemy';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
const { ccclass } = _decorator;

@ccclass('WZSJZ_Skill_ShenBoXianJing')
export class WZSJZ_Skill_ShenBoXianJing extends Component {
    private _enemyArea: Node = null;
    private _radius: number = 0;
    private _pulseInterval: number = 0;
    private _tremorDuration: number = 0;
    private _remainingPulses: number = 0;
    private _animationName: string = "animation";
    private _onRecycle: ((trap: WZSJZ_Skill_ShenBoXianJing) => void) = null;

    public Initialize(
        enemyArea: Node,
        radius: number,
        pulseCount: number,
        pulseInterval: number,
        tremorDuration: number,
        animationName: string,
        onRecycle: (trap: WZSJZ_Skill_ShenBoXianJing) => void,
    ): boolean {
        this.unscheduleAllCallbacks();
        this._enemyArea = enemyArea;
        this._radius = Math.max(0, radius);
        this._remainingPulses = Math.max(0, Math.floor(pulseCount));
        this._pulseInterval = Math.max(0.01, pulseInterval);
        this._tremorDuration = Math.max(0, tremorDuration);
        this._animationName = animationName || "animation";
        this._onRecycle = onRecycle;
        if (!this._enemyArea?.isValid || this._radius <= 0 || this._remainingPulses <= 0) {
            return false;
        }
        this.node.active = true;
        this.PlayPulse();
        return true;
    }

    private PlayPulse(): void {
        if (!this.node?.isValid || !this._enemyArea?.isValid) {
            this.Recycle();
            return;
        }
        const skeleton = this.getComponentInChildren(sp.Skeleton);
        skeleton?.setAnimation(0, this._animationName, false);
        this.ApplyTremorInRange();
        this._remainingPulses--;
        // 不要在定时回调内部重复注册同一个函数引用；Cocos清理本轮任务时
        // 可能连同新任务一起移除，表现为第二轮结束后卡在最后一帧且无法回池。
        if (this._remainingPulses > 0) {
            this.scheduleOnce(() => this.PlayPulse(), this._pulseInterval);
        } else {
            this.scheduleOnce(() => this.Recycle(), this._pulseInterval);
        }
    }

    private ApplyTremorInRange(): void {
        const center = this.node.worldPosition;
        const radiusSquared = this._radius * this._radius;
        for (const child of [...this._enemyArea.children]) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) {
                continue;
            }
            const position = child.worldPosition;
            const dx = position.x - center.x;
            const dy = position.y - center.y;
            if (dx * dx + dy * dy <= radiusSquared) {
                enemy.ApplyStun(
                    this._tremorDuration,
                    WZSJZ_Constant.SonicTrap.BossTenacityDamage,
                );
            }
        }
    }

    private Recycle = (): void => {
        this.unscheduleAllCallbacks();
        const skeleton = this.getComponentInChildren(sp.Skeleton);
        skeleton?.clearTracks();
        this._onRecycle?.(this);
    };

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
    }
}

