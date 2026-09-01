import {
    _decorator,
    Component,
    Collider2D,
    Node,
    RigidBody2D,
    sp,
    Vec3,
} from 'cc';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';

const { ccclass, property } = _decorator;

@ccclass('WZSJZ_Bullet_XunHanHuoJian')
export class WZSJZ_Bullet_XunHanHuoJian extends Component {
    private _enemyArea: Node = null;
    private _damage: number = 0;
    private _damageRadius: number = 0;
    private _impactAudioName: string = "";
    private _impactAudioVolume: number = 1;
    private _onRecycle: ((projectile: WZSJZ_Bullet_XunHanHuoJian) => void) = null;
    private _onKill: (() => void) = null;

    /** 每次从对象池取出时重新初始化；炮弹不追踪目标，只攻击固定世界落点。 */
    public Initialize(
        enemyArea: Node,
        damage: number,
        damageRadius: number,
        damageTriggerDelay: number,
        recycleDelay: number,
        animationName: string,
        impactAudioName: string,
        impactAudioVolume: number,
        onRecycle: (projectile: WZSJZ_Bullet_XunHanHuoJian) => void,
        onKill?: () => void,
    ): boolean {
        this.unscheduleAllCallbacks();
        this._enemyArea = enemyArea;
        this._damage = Math.max(0, damage);
        this._damageRadius = Math.max(0, damageRadius);
        this._impactAudioName = impactAudioName || "";
        this._impactAudioVolume = Math.max(0, Math.min(1, impactAudioVolume));
        this._onRecycle = onRecycle;
        this._onKill = onKill || null;
        if (!this._enemyArea?.isValid || this._damage <= 0) {
            return false;
        }

        // 该预制体使用Spine内部动画完成下落，关闭物理碰撞以免根节点被推动。
        const rigidBody = this.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.enabled = false;
        }
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.enabled = false;
        }
        this.node.active = true;
        const skeleton = this.getComponentInChildren(sp.Skeleton);
        if (skeleton && animationName) {
            skeleton.setAnimation(0, animationName, false);
        }
        this.scheduleOnce(this.TriggerDamage, Math.max(0, damageTriggerDelay));
        this.scheduleOnce(
            this.Recycle,
            Math.max(damageTriggerDelay, recycleDelay),
        );
        return true;
    }

    private TriggerDamage = (): void => {
        if (!this.node?.isValid || !this._enemyArea?.isValid) {
            return;
        }
        const center = this.node.worldPosition;
        WZSJZ_AudioManager.Play(this._impactAudioName, this._impactAudioVolume, 0.08);
        const radiusSquared = this._damageRadius * this._damageRadius;
        // 复制数组，避免敌人死亡回池改变children时影响本轮范围伤害遍历。
        for (const child of [...this._enemyArea.children]) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive) {
                continue;
            }
            const position: Vec3 = child.worldPosition;
            const dx = position.x - center.x;
            const dy = position.y - center.y;
            if (dx * dx + dy * dy <= radiusSquared && enemy.TakeDamage(this._damage)) {
                this._onKill?.();
            }
        }
    };

    private Recycle = (): void => {
        this.unscheduleAllCallbacks();
        this._onRecycle?.(this);
    };

}
