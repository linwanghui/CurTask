import { _decorator, Component, Node, sp } from 'cc';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';
import { WZSJZ_Enemy } from '../WZSJZ_Enemy';

const { ccclass } = _decorator;

/** 单个震荡俯冲落点：延迟结算一次范围伤害，动画结束后交还对象池。 */
@ccclass('WZSJZ_Skill_ZhenDangFuChong')
export class WZSJZ_Skill_ZhenDangFuChong extends Component {
    private _enemyArea: Node = null;
    private _radius: number = 0;
    private _damage: number = 0;
    private _isRunning: boolean = false;
    private _onRecycle: ((effect: WZSJZ_Skill_ZhenDangFuChong) => void) = null;
    private _onKill: (() => void) = null;

    public Initialize(
        enemyArea: Node,
        radius: number,
        damage: number,
        damageTriggerDelay: number,
        animationName: string,
        animationFallbackDuration: number,
        onRecycle: (effect: WZSJZ_Skill_ZhenDangFuChong) => void,
        onKill: () => void,
    ): boolean {
        this.unscheduleAllCallbacks();
        this._enemyArea = enemyArea;
        this._radius = Math.max(0, radius);
        this._damage = Math.max(0, damage);
        this._onRecycle = onRecycle;
        this._onKill = onKill;
        if (!enemyArea?.isValid || this._radius <= 0 || this._damage <= 0) {
            return false;
        }

        this._isRunning = true;
        this.node.active = true;
        const skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        const safeAnimationName = animationName || "animation";
        const animationDuration = Math.max(
            0.01,
            skeleton?.findAnimation(safeAnimationName)?.duration
                || animationFallbackDuration,
        );
        if (skeleton) {
            skeleton.clearTracks();
            skeleton.setAnimation(0, safeAnimationName, false);
        }

        const hitDelay = Math.max(0, damageTriggerDelay);
        this.scheduleOnce(this.ApplyAreaDamage, hitDelay);
        // 即使配置的伤害时机晚于动画，也必须先完成伤害结算再回池。
        this.scheduleOnce(this.Recycle, Math.max(animationDuration, hitDelay + 0.01));
        return true;
    }

    private ApplyAreaDamage = (): void => {
        if (!this._isRunning || !this._enemyArea?.isValid) {
            return;
        }
        WZSJZ_AudioManager.Play('爆炸', 0.65, 0.08);
        const center = this.node.worldPosition;
        const radiusSquared = this._radius * this._radius;
        for (const child of [...this._enemyArea.children]) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) {
                continue;
            }
            const position = enemy.node.worldPosition;
            const deltaX = position.x - center.x;
            const deltaY = position.y - center.y;
            if (deltaX * deltaX + deltaY * deltaY <= radiusSquared
                && enemy.TakeDamage(this._damage)) {
                this._onKill?.();
            }
        }
    };

    private Recycle = (): void => {
        if (!this._isRunning) {
            return;
        }
        this._isRunning = false;
        this.unscheduleAllCallbacks();
        this.getComponent(sp.Skeleton)?.clearTracks();
        this.getComponentInChildren(sp.Skeleton)?.clearTracks();
        this._enemyArea = null;
        this._onKill = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    };

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
        this._isRunning = false;
        this._enemyArea = null;
        this._onRecycle = null;
        this._onKill = null;
    }
}
