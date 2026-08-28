import { _decorator, Component, Node, sp, Vec3 } from 'cc';
import { WZSJZ_Enemy } from '../WZSJZ_Enemy';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';

const { ccclass } = _decorator;

/** 单把电磁力场飞刀：在动画后半段按配置时间点造成多段范围伤害。 */
@ccclass('WZSJZ_Skill_DianCiLiChang')
export class WZSJZ_Skill_DianCiLiChang extends Component {
    private _enemyArea: Node = null;
    private _damageCenter: Vec3 = new Vec3();
    private _radius: number = 0;
    private _damage: number = 0;
    private _damageDelays: number[] = [];
    private _nextDamageIndex: number = 0;
    private _elapsed: number = 0;
    private _animationCompleted: boolean = false;
    private _isRunning: boolean = false;
    private _skeleton: sp.Skeleton = null;
    private _onRecycle: ((effect: WZSJZ_Skill_DianCiLiChang) => void) = null;
    private _onKill: (() => void) = null;

    public Initialize(
        enemyArea: Node,
        damageCenter: Vec3,
        radius: number,
        damage: number,
        damageDelays: number[],
        animationName: string,
        fallbackDuration: number,
        onRecycle: (effect: WZSJZ_Skill_DianCiLiChang) => void,
        onKill: () => void,
    ): boolean {
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._enemyArea = enemyArea;
        this._damageCenter.set(damageCenter);
        this._radius = Math.max(0, radius);
        this._damage = Math.max(0, damage);
        this._damageDelays = (damageDelays || [])
            .map((delay) => Math.max(0, delay))
            .sort((left, right) => left - right);
        this._nextDamageIndex = 0;
        WZSJZ_AudioManager.Play('电磁脉冲', 0.65, 0.1);
        this._elapsed = 0;
        this._animationCompleted = false;
        this._onRecycle = onRecycle;
        this._onKill = onKill;
        if (!enemyArea?.isValid || this._radius <= 0 || this._damage <= 0
            || this._damageDelays.length <= 0) return false;

        this._isRunning = true;
        this.node.active = true;
        this._skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        if (this._skeleton) {
            this._skeleton.clearTracks();
            this._skeleton.setCompleteListener(this.OnAnimationCompleted);
            this._skeleton.setAnimation(0, animationName || "animation", false);
        } else {
            this.scheduleOnce(this.MarkAnimationCompleted, Math.max(0.01, fallbackDuration));
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._isRunning) return;
        if (!this._enemyArea?.isValid) {
            this.Recycle();
            return;
        }
        this._elapsed += Math.max(0, deltaTime);
        while (this._nextDamageIndex < this._damageDelays.length
            && this._elapsed >= this._damageDelays[this._nextDamageIndex]) {
            this._nextDamageIndex++;
            this.ApplyAreaDamage();
        }
        this.TryRecycle();
    }

    private ApplyAreaDamage(): void {
        const radiusSquared = this._radius * this._radius;
        for (const child of [...this._enemyArea.children]) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) continue;
            const position = enemy.node.worldPosition;
            const dx = position.x - this._damageCenter.x;
            const dy = position.y - this._damageCenter.y;
            if (dx * dx + dy * dy <= radiusSquared && enemy.TakeDamage(this._damage)) {
                this._onKill?.();
            }
        }
    }

    private OnAnimationCompleted = (): void => this.MarkAnimationCompleted();

    private MarkAnimationCompleted = (): void => {
        if (!this._isRunning) return;
        this._animationCompleted = true;
        this.TryRecycle();
    };

    private TryRecycle(): void {
        if (!this._animationCompleted || this._nextDamageIndex < this._damageDelays.length) return;
        this.Recycle();
    }

    private Recycle(): void {
        if (!this._isRunning) return;
        this._isRunning = false;
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._skeleton = null;
        this._enemyArea = null;
        this._onKill = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    }

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
        this._skeleton?.setCompleteListener(null);
        this._isRunning = false;
        this._onRecycle = null;
        this._onKill = null;
    }
}
