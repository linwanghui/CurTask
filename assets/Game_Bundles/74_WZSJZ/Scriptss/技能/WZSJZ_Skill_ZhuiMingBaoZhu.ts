import { _decorator, Component, Node, sp } from 'cc';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';
import { WZSJZ_Enemy } from '../WZSJZ_Enemy';

const { ccclass } = _decorator;
type WZSJZ_HomingSpiderPhase = "idle" | "entrance" | "hunting" | "exploding";

/** 夺命小蜘蛛：播放出场、追踪随机敌人、范围爆炸并回到对象池。 */
@ccclass('WZSJZ_Skill_ZhuiMingBaoZhu')
export class WZSJZ_Skill_ZhuiMingBaoZhu extends Component {
    private _enemyArea: Node = null;
    private _skeleton: sp.Skeleton = null;
    private _target: WZSJZ_Enemy = null;
    private _phase: WZSJZ_HomingSpiderPhase = "idle";
    private _moveSpeed: number = 0;
    private _arrivalDistance: number = 0;
    private _explosionRadius: number = 0;
    private _damage: number = 0;
    private _walkAnimationSpeed: number = 1;
    private _walkAnimation: string = "zoulu";
    private _explosionAnimation: string = "baozha";
    private _explosionDamageDelay: number = 0;
    private _explosionFallbackDuration: number = 0;
    private _explosionAudioName: string = "";
    private _explosionAudioVolume: number = 1;
    private _onRecycle: ((spider: WZSJZ_Skill_ZhuiMingBaoZhu) => void) = null;
    private _onKill: (() => void) = null;

    public Initialize(
        enemyArea: Node,
        moveSpeed: number,
        arrivalDistance: number,
        explosionRadius: number,
        damage: number,
        initialTarget: WZSJZ_Enemy,
        entranceAnimation: string,
        walkAnimation: string,
        walkAnimationSpeed: number,
        explosionAnimation: string,
        entranceFallbackDuration: number,
        explosionFallbackDuration: number,
        explosionDamageDelay: number,
        explosionAudioName: string,
        explosionAudioVolume: number,
        onRecycle: (spider: WZSJZ_Skill_ZhuiMingBaoZhu) => void,
        onKill: () => void,
    ): boolean {
        this.unscheduleAllCallbacks();
        this._enemyArea = enemyArea;
        this._moveSpeed = Math.max(0, moveSpeed);
        this._arrivalDistance = Math.max(0, arrivalDistance);
        this._explosionRadius = Math.max(0, explosionRadius);
        this._damage = Math.max(0, damage);
        this._target = initialTarget?.IsAlive ? initialTarget : null;
        this._walkAnimation = walkAnimation || "zoulu";
        this._walkAnimationSpeed = Math.max(0.01, walkAnimationSpeed);
        this._explosionAnimation = explosionAnimation || "baozha";
        this._explosionFallbackDuration = Math.max(0.01, explosionFallbackDuration);
        this._explosionDamageDelay = Math.max(0, explosionDamageDelay);
        this._explosionAudioName = explosionAudioName || "";
        this._explosionAudioVolume = Math.max(0, Math.min(1, explosionAudioVolume));
        this._onRecycle = onRecycle;
        this._onKill = onKill;
        if (!enemyArea?.isValid || this._moveSpeed <= 0
            || this._explosionRadius <= 0 || this._damage <= 0) {
            return false;
        }

        this.node.active = true;
        this._skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        this._phase = "entrance";
        const safeEntrance = entranceAnimation || "chuchang";
        const entranceDuration = this.GetAnimationDuration(
            safeEntrance,
            entranceFallbackDuration,
        );
        if (this._skeleton) {
            this._skeleton.timeScale = 1;
            this._skeleton.clearTracks();
            this._skeleton.setAnimation(0, safeEntrance, false);
        }
        this.scheduleOnce(this.BeginHunting, entranceDuration);
        return true;
    }

    protected update(deltaTime: number): void {
        if (this._phase !== "hunting") {
            return;
        }
        if (!this._enemyArea?.isValid) {
            this.Recycle();
            return;
        }
        if (!this._target?.IsAlive) {
            this._target = this.FindRandomEnemy();
        }
        if (!this._target) {
            this.BeginExplosion();
            return;
        }

        const current = this.node.worldPosition;
        const target = this._target.node.worldPosition;
        const deltaX = target.x - current.x;
        const deltaY = target.y - current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance <= this._arrivalDistance) {
            this.BeginExplosion();
            return;
        }
        const moveDistance = Math.min(distance, this._moveSpeed * Math.max(0, deltaTime));
        if (distance > 0.0001) {
            this.node.setWorldPosition(
                current.x + deltaX / distance * moveDistance,
                current.y + deltaY / distance * moveDistance,
                current.z,
            );
        }
    }

    private BeginHunting = (): void => {
        if (this._phase !== "entrance") {
            return;
        }
        this._phase = "hunting";
        if (!this._target?.IsAlive) {
            this._target = this.FindRandomEnemy();
        }
        if (!this._target) {
            this.BeginExplosion();
            return;
        }
        if (this._skeleton) {
            this._skeleton.timeScale = this._walkAnimationSpeed;
            this._skeleton.setAnimation(0, this._walkAnimation, true);
        }
    };

    private BeginExplosion(): void {
        if (this._phase !== "hunting") {
            return;
        }
        this._phase = "exploding";
        this._target = null;
        const duration = this.GetAnimationDuration(
            this._explosionAnimation,
            this._explosionFallbackDuration,
        );
        if (this._skeleton) {
            this._skeleton.timeScale = 1;
            this._skeleton.setAnimation(0, this._explosionAnimation, false);
        }
        this.scheduleOnce(this.ApplyExplosionDamage, this._explosionDamageDelay);
        this.scheduleOnce(
            this.Recycle,
            Math.max(duration, this._explosionDamageDelay + 0.01),
        );
    }

    private ApplyExplosionDamage = (): void => {
        if (this._phase !== "exploding" || !this._enemyArea?.isValid) {
            return;
        }
        WZSJZ_AudioManager.Play(
            this._explosionAudioName,
            this._explosionAudioVolume,
            0.08,
        );
        const center = this.node.worldPosition;
        const radiusSquared = this._explosionRadius * this._explosionRadius;
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

    private FindRandomEnemy(): WZSJZ_Enemy | null {
        const enemies = (this._enemyArea?.children || [])
            .map((child) => child.getComponent(WZSJZ_Enemy))
            .filter((enemy) => !!enemy?.IsAlive);
        return enemies.length > 0
            ? enemies[Math.floor(Math.random() * enemies.length)]
            : null;
    }

    private GetAnimationDuration(name: string, fallback: number): number {
        return Math.max(
            0.01,
            this._skeleton?.findAnimation(name)?.duration || fallback,
        );
    }

    private Recycle = (): void => {
        if (this._phase === "idle") {
            return;
        }
        this._phase = "idle";
        this.unscheduleAllCallbacks();
        if (this._skeleton) {
            this._skeleton.timeScale = 1;
            this._skeleton.clearTracks();
        }
        this._skeleton = null;
        this._enemyArea = null;
        this._target = null;
        this._onKill = null;
        const recycle = this._onRecycle;
        this._onRecycle = null;
        recycle?.(this);
    };

    protected onDisable(): void {
        this.unscheduleAllCallbacks();
        this._phase = "idle";
        this._skeleton = null;
        this._enemyArea = null;
        this._target = null;
        this._onRecycle = null;
        this._onKill = null;
    }
}
