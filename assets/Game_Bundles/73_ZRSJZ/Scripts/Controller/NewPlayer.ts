import { _decorator, Component, RigidBody2D, Vec2, Vec3 } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { NewPlayerSkeleton } from './NewPlayerSkeleton';
const { ccclass, property } = _decorator;

/** test 场景专用玩家控制，只验证移动与 Spine 多 Track 动画。 */
@ccclass('NewPlayer')
export class NewPlayer extends Component {
    @property({ tooltip: '摇杆事件所属玩家，test 场景默认为玩家1' })
    PlayerIndex: number = 0;

    @property({ tooltip: '移动速度' })
    MoveSpeed: number = 1000;

    @property({ tooltip: '超过此实际位移速度才视为正在移动' })
    MovingSpeedThreshold: number = 1;

    @property(NewPlayerSkeleton)
    SkeletonController: NewPlayerSkeleton = null;

    private _rigidBody: RigidBody2D = null;
    private _moveX: number = 0;
    private _moveY: number = 0;
    private _moveRadius: number = 0;
    private _lastWorldPosition: Vec3 = new Vec3();
    private _velocity: Vec2 = new Vec2();
    private _hasPreviousPosition: boolean = false;

    protected onLoad(): void {
        this._rigidBody = this.getComponent(RigidBody2D);
        this.SkeletonController ??= this.node
            .getChildByName('Spine')
            ?.getComponent(NewPlayerSkeleton) ?? null;
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.OnMove, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, this.OnAttack, this);
        this._lastWorldPosition.set(this.node.worldPosition);
        this._hasPreviousPosition = true;
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.OnMove, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, this.OnAttack, this);
        this._velocity.set(0, 0);
        if (this._rigidBody) this._rigidBody.linearVelocity = this._velocity;
        this.SkeletonController?.SetMoving(false);
        this.SkeletonController?.SetAttacking(false);
        this._hasPreviousPosition = false;
    }

    protected update(dt: number): void {
        if (this._rigidBody) {
            this._velocity.set(
                this._moveX * this._moveRadius * this.MoveSpeed * dt,
                this._moveY * this._moveRadius * this.MoveSpeed * dt,
            );
            this._rigidBody.linearVelocity = this._velocity;
        }

        // 使用节点上一帧到当前帧的真实位移，而不是仅依据摇杆输入判断移动动画。
        const worldPosition = this.node.worldPosition;
        if (this._hasPreviousPosition) {
            const deltaX = worldPosition.x - this._lastWorldPosition.x;
            const deltaY = worldPosition.y - this._lastWorldPosition.y;
            const threshold = Math.max(0, this.MovingSpeedThreshold) * Math.max(dt, 0);
            const isActuallyMoving = deltaX * deltaX + deltaY * deltaY > threshold * threshold;
            this.SkeletonController?.SetMoving(isActuallyMoving);
        }
        this._lastWorldPosition.set(worldPosition);
        this._hasPreviousPosition = true;
    }

    private OnMove(
        x: number,
        y: number,
        radius: number = 0,
        playerIndex?: number,
    ): void {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        this._moveX = x;
        this._moveY = y;
        this._moveRadius = Math.max(0, radius);
    }

    private OnAttack(isAttacking: boolean, playerIndex?: number): void {
        if (playerIndex !== undefined && playerIndex !== this.PlayerIndex) return;
        this.SkeletonController?.SetAttacking(isAttacking);
    }
}
