import { _decorator, Animation, Collider2D, Component, Node, RigidBody2D, Vec3 } from 'cc';
import { WZSJZ_Enemy } from './WZSJZ_Enemy';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';

const { ccclass } = _decorator;

/** 盾牌沿初始方向直线飞行，使用线段检测避免高速穿过敌人。 */
@ccclass('WZSJZ_ShieldProjectile')
export class WZSJZ_ShieldProjectile extends Component {
    private _enemyArea: Node = null;
    private _direction: Vec3 = new Vec3(1, 0, 0);
    private _damage: number = 0;
    private _speed: number = 0;
    private _maxTravelDistance: number = 0;
    private _travelledDistance: number = 0;
    private _hitRadius: number = 0;
    private _knockbackDistance: number = 0;
    private _aimHeight: number = 0;
    private _recycleCallback: ((projectile: WZSJZ_ShieldProjectile) => void) = null;
    private _hitEffectCallback: ((worldPosition: Vec3) => void) = null;
    private _killCallback: (() => void) = null;
    private _hitEnemies: Set<WZSJZ_Enemy> = new Set();

    public Initialize(
        enemyArea: Node,
        direction: Vec3,
        damage: number,
        speed: number,
        maxTravelDistance: number,
        hitRadius: number,
        knockbackDistance: number,
        aimHeight: number,
        recycleCallback: (projectile: WZSJZ_ShieldProjectile) => void,
        hitEffectCallback: (worldPosition: Vec3) => void,
        killCallback: () => void,
    ): boolean {
        const directionLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (!enemyArea || directionLength <= 0.0001 || damage <= 0 || speed <= 0) {
            return false;
        }
        this._enemyArea = enemyArea;
        this._direction.set(direction.x / directionLength, direction.y / directionLength, 0);
        this._damage = damage;
        this._speed = speed;
        this._maxTravelDistance = Math.max(1, maxTravelDistance);
        this._travelledDistance = 0;
        this._hitRadius = Math.max(1, hitRadius);
        this._knockbackDistance = Math.max(0, knockbackDistance);
        this._aimHeight = aimHeight;
        this._recycleCallback = recycleCallback;
        this._hitEffectCallback = hitEffectCallback;
        this._killCallback = killCallback;
        this._hitEnemies.clear();
        this.node.active = true;
        this.node.angle = Math.atan2(this._direction.y, this._direction.x) * 180 / Math.PI;
        const rigidBody = this.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.enabled = false;
        }
        for (const collider of this.getComponents(Collider2D)) {
            collider.enabled = false;
        }
        const animation = this.getComponent(Animation) || this.getComponentInChildren(Animation);
        animation?.stop();
        animation?.play();
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._enemyArea || !this._recycleCallback) {
            return;
        }
        const start = this.node.worldPosition.clone();
        const remainingDistance = this._maxTravelDistance - this._travelledDistance;
        const moveDistance = Math.min(this._speed * deltaTime, remainingDistance);
        const end = new Vec3(
            start.x + this._direction.x * moveDistance,
            start.y + this._direction.y * moveDistance,
            start.z,
        );
        const enemies = this.FindHitEnemies(start, end);
        this.node.setWorldPosition(end);
        this._travelledDistance += moveDistance;
        for (const enemy of enemies) {
            this.HitEnemy(enemy);
        }
        if (this._travelledDistance >= this._maxTravelDistance) {
            this.Recycle();
        }
    }

    private FindHitEnemies(start: Vec3, end: Vec3): WZSJZ_Enemy[] {
        const results: Array<{ Enemy: WZSJZ_Enemy; Progress: number }> = [];
        const radiusSquared = this._hitRadius * this._hitRadius;
        for (const child of this._enemyArea.children) {
            const enemy = child.getComponent(WZSJZ_Enemy);
            if (!enemy?.IsAlive || this._hitEnemies.has(enemy)) {
                continue;
            }
            const position = enemy.node.worldPosition;
            const progress = this.GetSegmentProgress(
                start,
                end,
                position.x,
                position.y + this._aimHeight,
            );
            const closestX = start.x + (end.x - start.x) * progress;
            const closestY = start.y + (end.y - start.y) * progress;
            const deltaX = position.x - closestX;
            const deltaY = position.y + this._aimHeight - closestY;
            if (deltaX * deltaX + deltaY * deltaY <= radiusSquared) {
                results.push({ Enemy: enemy, Progress: progress });
            }
        }
        results.sort((first, second) => first.Progress - second.Progress);
        return results.map((entry) => entry.Enemy);
    }

    private GetSegmentProgress(start: Vec3, end: Vec3, pointX: number, pointY: number): number {
        const segmentX = end.x - start.x;
        const segmentY = end.y - start.y;
        const lengthSquared = segmentX * segmentX + segmentY * segmentY;
        if (lengthSquared <= 0.0001) {
            return 0;
        }
        return Math.max(0, Math.min(1,
            ((pointX - start.x) * segmentX + (pointY - start.y) * segmentY) / lengthSquared,
        ));
    }

    private HitEnemy(enemy: WZSJZ_Enemy): void {
        this._hitEnemies.add(enemy);
        WZSJZ_AudioManager.Play('盾牌命中', 0.62, 0.06);
        const position = enemy.node.worldPosition;
        const effectPosition = new Vec3(position.x, position.y + this._aimHeight, position.z);
        enemy.ApplyKnockback(this._direction, this._knockbackDistance);
        if (enemy.TakeDamage(this._damage)) {
            this._killCallback?.();
        }
        this._hitEffectCallback?.(effectPosition);
    }

    private Recycle(): void {
        const callback = this._recycleCallback;
        this._enemyArea = null;
        this._recycleCallback = null;
        this._hitEffectCallback = null;
        this._killCallback = null;
        this._hitEnemies.clear();
        callback?.(this);
    }
}
