import { _decorator, Component, director, Node, RigidBody2D, sp, Vec2, Vec3 } from 'cc';
import { ZRSJZ_ANI } from '../ZRSJZ_Constant';
import { ZRSJZ_EnemySkeleton } from './ZRSJZ_EnemySkeleton';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Bullet } from './ZRSJZ_Bullet';
const { ccclass, property } = _decorator;

enum ZRSJZ_ENEMY_STATE {
    PATROL,
    CHASE,
}

@ccclass('ZRSJZ_Enemy')
export class ZRSJZ_Enemy extends Component {
    @property({ tooltip: '玩家进入该距离后开始追击' })
    DetectionRange: number = 800;

    @property({ tooltip: '追击中玩家超过该距离后脱战（建议大于警戒范围）' })
    LoseRange: number = 1200;

    @property({ tooltip: '以敌人出生点为中心的巡逻半径' })
    PatrolRadius: number = 500;

    @property({ tooltip: '巡逻移动速度，单位/秒' })
    PatrolSpeed: number = 120;

    @property({ tooltip: '追击移动速度，单位/秒' })
    ChaseSpeed: number = 220;

    @property({ tooltip: '到达一个巡逻点后的停留时间' })
    PatrolWaitTime: number = 1;

    @property({ tooltip: '距离巡逻点小于该值时判定为到达' })
    PatrolArriveDistance: number = 20;

    @property({ tooltip: '追击到该距离时停止继续贴近玩家' })
    ChaseStopDistance: number = 100;

    @property({ tooltip: '待机动画名' })
    IdleAnimation: string = ZRSJZ_ANI.Idle_Q;

    @property({ tooltip: '移动动画名' })
    MoveAnimation: string = ZRSJZ_ANI.Walk_Q;

    @property({ tooltip: '武器' })
    WeaponName: string = "突击步枪";

    Target: Node = null;

    private _rigidBody: RigidBody2D = null;
    private _enemySkeleton: ZRSJZ_EnemySkeleton = null;
    private _state: ZRSJZ_ENEMY_STATE = ZRSJZ_ENEMY_STATE.PATROL;
    private _patrolCenter: Vec3 = new Vec3();
    private _patrolTarget: Vec3 = new Vec3();
    private _worldPosition: Vec3 = new Vec3();
    private _moveVelocity: Vec2 = new Vec2();
    private _patrolWaitRemaining: number = 0;
    private _targetSearchRemaining: number = 0;
    private _animationName: string = '';

    protected onLoad(): void {
        this._rigidBody = this.getComponent(RigidBody2D);
        this._enemySkeleton = this.getComponentInChildren(ZRSJZ_EnemySkeleton);
        this._enemySkeleton.ShowEquipment(this.WeaponName);
    }

    protected start(): void {
        this._patrolCenter.set(this.node.worldPosition);
        this.SelectNextPatrolPoint();
        this.TryFindPlayer();
        this.PlayAnimation(this.IdleAnimation);

        this._enemySkeleton.Skeleton.setEventListener((trackEntry, event) => {
            if (typeof event !== "number" && event.data.name === "kq") {
                void this.Fire();
            }
        });
    }

    protected update(dt: number): void {
        this.RefreshTarget(dt);

        if (!this.IsTargetAvailable()) {
            if (this._state === ZRSJZ_ENEMY_STATE.CHASE) {
                this.EnterPatrol();
            }
            this.UpdatePatrol(dt);
            return;
        }

        const currentPosition = this.node.worldPosition;
        const targetPosition = this.Target.worldPosition;
        const offsetX = targetPosition.x - currentPosition.x;
        const offsetY = targetPosition.y - currentPosition.y;
        const distanceSquared = offsetX * offsetX + offsetY * offsetY;
        const detectionRange = Math.max(0, this.DetectionRange);
        const loseRange = Math.max(detectionRange, this.LoseRange);

        if (
            this._state === ZRSJZ_ENEMY_STATE.PATROL
            && distanceSquared <= detectionRange * detectionRange
        ) {
            this.EnterChase();
        } else if (
            this._state === ZRSJZ_ENEMY_STATE.CHASE
            && distanceSquared > loseRange * loseRange
        ) {
            this.EnterPatrol();
        }

        if (this._state === ZRSJZ_ENEMY_STATE.CHASE) {
            this.UpdateChase(offsetX, offsetY, distanceSquared, dt);
        } else {
            this.UpdatePatrol(dt);
        }
    }

    protected onDisable(): void {
        this.StopMoving();
        if (this._enemySkeleton) {
            this._enemySkeleton.HasDirection = false;
        }
    }

    private RefreshTarget(dt: number): void {
        if (this.IsTargetAvailable()) {
            return;
        }

        this.Target = null;
        this._targetSearchRemaining -= dt;
        if (this._targetSearchRemaining > 0) {
            return;
        }

        // 玩家由 ZRSJZ_Game 异步创建，因此目标不存在时需要持续重试。
        this._targetSearchRemaining = 0.25;
        this.TryFindPlayer();
    }

    private TryFindPlayer(): void {
        if (this.IsTargetAvailable()) {
            return;
        }

        const player = director.getScene()?.getComponentInChildren(ZRSJZ_Player);
        if (player) {
            this.Target = player.node;
        }
    }

    private IsTargetAvailable(): boolean {
        return !!(
            this.Target
            && this.Target.isValid
            && this.Target.activeInHierarchy
        );
    }

    private EnterChase(): void {
        this._state = ZRSJZ_ENEMY_STATE.CHASE;
        this._patrolWaitRemaining = 0;
    }

    private EnterPatrol(): void {
        this._state = ZRSJZ_ENEMY_STATE.PATROL;
        this._patrolWaitRemaining = 0;
        if (this._enemySkeleton) {
            this._enemySkeleton.HasDirection = false;
        }
        this.SelectNextPatrolPoint();
    }

    private UpdatePatrol(dt: number): void {
        if (this.PatrolRadius <= 0 || this.PatrolSpeed <= 0) {
            this.StopMoving();
            this.PlayAnimation(this.IdleAnimation);
            return;
        }

        if (this._patrolWaitRemaining > 0) {
            this._patrolWaitRemaining -= dt;
            this.StopMoving();
            this.PlayAnimation(this.IdleAnimation);
            if (this._patrolWaitRemaining <= 0) {
                this.SelectNextPatrolPoint();
            }
            return;
        }

        const currentPosition = this.node.worldPosition;
        const offsetX = this._patrolTarget.x - currentPosition.x;
        const offsetY = this._patrolTarget.y - currentPosition.y;
        const distanceSquared = offsetX * offsetX + offsetY * offsetY;
        const arriveDistance = Math.max(0, this.PatrolArriveDistance);

        if (distanceSquared <= arriveDistance * arriveDistance) {
            this.StopMoving();
            this.PlayAnimation(this.IdleAnimation);
            this._patrolWaitRemaining = Math.max(0, this.PatrolWaitTime);
            if (this._patrolWaitRemaining === 0) {
                this.SelectNextPatrolPoint();
            }
            return;
        }

        this.MoveTowards(offsetX, offsetY, Math.sqrt(distanceSquared), this.PatrolSpeed, dt);
    }

    private UpdateChase(
        offsetX: number,
        offsetY: number,
        distanceSquared: number,
        dt: number,
    ): void {
        const distance = Math.sqrt(distanceSquared);
        const stopDistance = Math.max(0, this.ChaseStopDistance);

        this.UpdateAimDirection(offsetX, offsetY, distance);
        if (distance <= stopDistance || this.ChaseSpeed <= 0) {
            this.StopMoving();
            this.PlayAnimation(this.IdleAnimation);
            return;
        }

        this.MoveTowards(offsetX, offsetY, distance, this.ChaseSpeed, dt);
    }

    private MoveTowards(
        offsetX: number,
        offsetY: number,
        distance: number,
        speed: number,
        dt: number,
    ): void {
        if (distance <= 0) {
            this.StopMoving();
            return;
        }

        const directionX = offsetX / distance;
        const directionY = offsetY / distance;
        this._moveVelocity.set(directionX * speed * dt, directionY * speed * dt);

        if (this._rigidBody && this._rigidBody.enabledInHierarchy) {
            this._rigidBody.linearVelocity = this._moveVelocity;
        } else {
            // 没有刚体时仍可工作，方便在编辑器中快速测试敌人逻辑。
            this._worldPosition.set(this.node.worldPosition);
            this._worldPosition.x += this._moveVelocity.x * dt;
            this._worldPosition.y += this._moveVelocity.y * dt;
            this.node.setWorldPosition(this._worldPosition);
        }

        if (this._enemySkeleton && directionX !== 0) {
            this._enemySkeleton.SetPlayerDir(directionX > 0 ? 1 : -1);
        }
        this.PlayAnimation(this.MoveAnimation);
    }

    private StopMoving(): void {
        this._moveVelocity.set(0, 0);
        // 节点失活时 enabledInHierarchy 已可能为 false，也要清除刚体缓存速度。
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = this._moveVelocity;
        }
    }

    private UpdateAimDirection(offsetX: number, offsetY: number, distance: number): void {
        if (!this._enemySkeleton || distance <= 0) {
            return;
        }

        this._enemySkeleton.AttackX = offsetX / distance;
        this._enemySkeleton.AttackY = offsetY / distance;
        this._enemySkeleton.HasDirection = true;
    }

    private SelectNextPatrolPoint(): void {
        const radius = Math.max(0, this.PatrolRadius);
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * radius;
        this._patrolTarget.set(
            this._patrolCenter.x + Math.cos(angle) * distance,
            this._patrolCenter.y + Math.sin(angle) * distance,
            this._patrolCenter.z,
        );
    }

    private PlayAnimation(animationName: string): void {
        if (
            !animationName
            || animationName === this._animationName
            || !this._enemySkeleton?.Skeleton
        ) {
            return;
        }

        this._animationName = animationName;
        this._enemySkeleton.PlayAni(animationName);
    }

    async Fire() {
        // const qkBone = this.PlayerSkeleton?.QKBone;
        // if (!qkBone) {
        //     console.warn("[ZRSJZ_Player] 找不到枪口骨骼 kaihuo/texiao");
        //     return;
        // }

        // const bullet = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/PlayerBullet");
        // bullet.parent = this.node;
        // bullet.active = true;

        // // Bone.worldX/worldY 是 Spine 节点空间坐标。
        // // 再经过 Spine 节点的世界矩阵，得到 Cocos 世界坐标。
        // const boneLocalPos = new Vec3(qkBone.worldX, qkBone.worldY, 0);
        // const muzzleWorldPos = new Vec3();
        // Vec3.transformMat4(
        //     muzzleWorldPos,
        //     boneLocalPos,
        //     this._enemySkeleton.node.worldMatrix,
        // );

        // bullet.getComponent(ZRSJZ_Bullet).Show(
        //     muzzleWorldPos,
        //     this._enemySkeleton.AttackX,
        //     this._enemySkeleton.AttackY,
        //     1000,
        // );
    }
}


