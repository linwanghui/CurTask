import {
    _decorator,
    Collider2D,
    Component,
    Contact2DType,
    IPhysics2DContact,
    Node,
    RigidBody2D,
    sp,
    Vec3,
} from 'cc';
import { WZSJZ_Enemy } from '../WZSJZ_Enemy';

const { ccclass } = _decorator;

/** 单枚回旋飞刃；同一次技能的三枚飞刃共享去程/返程命中集合。 */
@ccclass('WZSJZ_Skill_HuiXuanFeiRen')
export class WZSJZ_Skill_HuiXuanFeiRen extends Component {
    private _enemyArea: Node = null;
    private _origin: Vec3 = new Vec3();
    private _direction: Vec3 = new Vec3(1, 0, 0);
    private _speed: number = 0;
    private _maxTravelDistance: number = 0;
    private _traveledDistance: number = 0;
    private _returnDistance: number = 0;
    private _damage: number = 0;
    private _isReturning: boolean = false;
    private _isRunning: boolean = false;
    private _outboundHits: Set<WZSJZ_Enemy> = null;
    private _returnHits: Set<WZSJZ_Enemy> = null;
    private _onRecycle: ((blade: WZSJZ_Skill_HuiXuanFeiRen) => void) = null;
    private _onKill: (() => void) = null;
    private _onHit: ((position: Vec3) => void) = null;

    protected onLoad(): void {
        // 碰撞框由预制体配置；以后只需修改BoxCollider2D尺寸即可调整命中范围。
        for (const collider of this.getComponentsInChildren(Collider2D)) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.OnBeginContact, this);
        }
    }

    public Initialize(
        enemyArea: Node,
        origin: Vec3,
        direction: Vec3,
        speed: number,
        maxTravelDistance: number,
        returnDistance: number,
        damage: number,
        animationName: string,
        outboundHits: Set<WZSJZ_Enemy>,
        returnHits: Set<WZSJZ_Enemy>,
        onRecycle: (blade: WZSJZ_Skill_HuiXuanFeiRen) => void,
        onKill: () => void,
        onHit: (position: Vec3) => void,
    ): boolean {
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (!enemyArea?.isValid || length <= 0.0001 || speed <= 0
            || maxTravelDistance <= 0 || damage <= 0) {
            return false;
        }
        this._enemyArea = enemyArea;
        this._origin.set(origin);
        this._direction.set(direction.x / length, direction.y / length, 0);
        this._speed = speed;
        this._maxTravelDistance = maxTravelDistance;
        this._traveledDistance = 0;
        this._returnDistance = Math.max(1, returnDistance);
        this._damage = damage;
        this._isReturning = false;
        this._isRunning = true;
        this._outboundHits = outboundHits;
        this._returnHits = returnHits;
        this._onRecycle = onRecycle;
        this._onKill = onKill;
        this._onHit = onHit;
        // 对象池中的旧实例可能是在开启接触监听前创建的夹具。
        // 先关闭Collider，设置监听，再激活并重建夹具，确保Box2D注册接触事件。
        const colliders = this.getComponentsInChildren(Collider2D);
        for (const collider of colliders) {
            collider.enabled = false;
        }
        const rigidBody = this.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.enabledContactListener = true;
            rigidBody.gravityScale = 0;
            rigidBody.allowSleep = false;
            rigidBody.bullet = true;
            rigidBody.enabled = true;
        }
        this.node.active = true;
        this.node.setWorldPosition(origin);
        this.node.angle = Math.atan2(this._direction.y, this._direction.x) * 180 / Math.PI;
        for (const collider of colliders) {
            collider.enabled = true;
            collider.sensor = true;
        }
        const skeleton = this.getComponent(sp.Skeleton)
            || this.getComponentInChildren(sp.Skeleton);
        if (skeleton) {
            skeleton.clearTracks();
            skeleton.setAnimation(0, animationName || "animation", true);
        }
        return true;
    }

    protected update(deltaTime: number): void {
        if (!this._isRunning || !this._enemyArea?.isValid) {
            if (this._isRunning) this.Recycle();
            return;
        }
        const current = this.node.worldPosition.clone();
        const maxMove = this._speed * deltaTime;
        if (!this._isReturning) {
            const move = Math.min(
                maxMove,
                Math.max(0, this._maxTravelDistance - this._traveledDistance),
            );
            const next = new Vec3(
                current.x + this._direction.x * move,
                current.y + this._direction.y * move,
                current.z,
            );
            this.node.setWorldPosition(next);
            this._traveledDistance += move;
            if (this._traveledDistance >= this._maxTravelDistance - 0.001) {
                this._isReturning = true;
            }
            return;
        }

        const deltaX = this._origin.x - current.x;
        const deltaY = this._origin.y - current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance <= this._returnDistance || maxMove >= distance) {
            this.node.setWorldPosition(this._origin);
            this.Recycle();
            return;
        }
        const next = new Vec3(
            current.x + deltaX / distance * maxMove,
            current.y + deltaY / distance * maxMove,
            current.z,
        );
        this.node.angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        this.node.setWorldPosition(next);
    }

    private OnBeginContact = (
        _selfCollider: Collider2D,
        otherCollider: Collider2D,
        _contact: IPhysics2DContact | null,
    ): void => {
        if (!this._isRunning) {
            return;
        }
        const enemy = this.FindEnemy(otherCollider.node);
        const hitSet = this._isReturning ? this._returnHits : this._outboundHits;
        if (!enemy?.IsAlive || !hitSet || hitSet.has(enemy)) {
            return;
        }
        hitSet.add(enemy);
        const aimPosition = enemy.GetAimWorldPosition();
        this._onHit?.(new Vec3(aimPosition.x, aimPosition.y, aimPosition.z));
        // 普通敌人明确进入受击；Boss仍由韧性逻辑决定是否播放受击动画。
        if (enemy.TakeDamage(this._damage, true)) {
            this._onKill?.();
        }
    };

    private FindEnemy(node: Node): WZSJZ_Enemy {
        let current: Node = node;
        while (current?.isValid) {
            const enemy = current.getComponent(WZSJZ_Enemy);
            if (enemy) {
                return enemy;
            }
            if (current === this._enemyArea) {
                break;
            }
            current = current.parent;
        }
        return null;
    }

    private Recycle(): void {
        if (!this._isRunning) {
            return;
        }
        this._isRunning = false;
        this.getComponent(sp.Skeleton)?.clearTracks();
        this.getComponentInChildren(sp.Skeleton)?.clearTracks();
        const recycle = this._onRecycle;
        this._onRecycle = null;
        this._onKill = null;
        this._onHit = null;
        const rigidBody = this.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.enabled = false;
        }
        for (const collider of this.getComponentsInChildren(Collider2D)) {
            collider.enabled = false;
        }
        recycle?.(this);
    }

    protected onDisable(): void {
        this._isRunning = false;
    }
}
