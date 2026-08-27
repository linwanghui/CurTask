import { _decorator, Component, Node, sp } from 'cc';
import { WZSJZ_Enemy } from '../WZSJZ_Enemy';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';

const { ccclass } = _decorator;

/** 电磁致盲区域：按固定频率结算低伤害，并刷新范围内敌人的致盲时间。 */
@ccclass('WZSJZ_Skill_DianCiZhiMang')
export class WZSJZ_Skill_DianCiZhiMang extends Component {
    private _enemyArea: Node = null;
    private _radius: number = 0;
    private _remainingDuration: number = 0;
    private _damageInterval: number = 0.5;
    private _damageTimer: number = 0.5;
    private _damage: number = 0;
    private _blindDuration: number = 0;
    private _onRecycle: ((effect: WZSJZ_Skill_DianCiZhiMang) => void) = null;
    private _onKill: (() => void) = null;

    public Initialize(
        enemyArea: Node,
        radius: number,
        duration: number,
        damageInterval: number,
        damage: number,
        blindDuration: number,
        animationName: string,
        onRecycle: (effect: WZSJZ_Skill_DianCiZhiMang) => void,
        onKill: () => void,
    ): boolean {
        WZSJZ_AudioManager.Play('电磁脉冲', 0.6, 0.1);
        this.unscheduleAllCallbacks();
        this._enemyArea = enemyArea;
        this._radius = Math.max(0, radius);
        this._remainingDuration = Math.max(0, duration);
        this._damageInterval = Math.max(0.01, damageInterval);
        this._damageTimer = this._damageInterval;
        this._damage = Math.max(0, damage);
        this._blindDuration = Math.max(0, blindDuration);
        this._onRecycle = onRecycle;
        this._onKill = onKill;
        if (!this._enemyArea?.isValid || this._radius <= 0
            || this._remainingDuration <= 0 || this._damage <= 0) {
            return false;
        }
        this.node.active = true;
        const skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        if (skeleton) {
            skeleton.clearTracks();
            skeleton.setAnimation(0, animationName || "animation", true);
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._enemyArea?.isValid || this._remainingDuration <= 0) {
            this.Recycle();
            return;
        }
        this._remainingDuration = Math.max(0, this._remainingDuration - deltaTime);
        this._damageTimer -= deltaTime;
        while (this._damageTimer <= 0 && this._remainingDuration >= 0) {
            this.ApplyPulse();
            this._damageTimer += this._damageInterval;
        }
        if (this._remainingDuration <= 0) {
            this.Recycle();
        }
    }

    private ApplyPulse(): void {
        const center = this.node.worldPosition;
        const radiusSquared = this._radius * this._radius;
        for (const child of [...this._enemyArea.children]) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) {
                continue;
            }
            const position = child.worldPosition;
            const deltaX = position.x - center.x;
            const deltaY = position.y - center.y;
            if (deltaX * deltaX + deltaY * deltaY > radiusSquared) {
                continue;
            }
            enemy.ApplyBlind(this._blindDuration);
            // 周期低伤害不播放受击硬直，确保致盲期间敌人仍能移动和播放攻击动画。
            if (enemy.TakeDamage(this._damage, false)) {
                this._onKill?.();
            }
        }
    }

    private Recycle(): void {
        const recycle = this._onRecycle;
        this._onRecycle = null;
        this._onKill = null;
        this.getComponent(sp.Skeleton)?.clearTracks();
        this.getComponentInChildren(sp.Skeleton)?.clearTracks();
        recycle?.(this);
    }

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
    }
}
