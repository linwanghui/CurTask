import { _decorator, Collider2D, Color, Component, Contact2DType, IPhysics2DContact, sp, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TIER } from '../ZRSJZ_Constant';
import { ZRSJZ_Player } from './ZRSJZ_Player';
import { ZRSJZ_EnemyBase } from './ZRSJZ_EnemyBase';
import { ZRSJZ_Effect } from '../Effect/ZRSJZ_Effect';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Bullet')
export class ZRSJZ_Bullet extends Component {

    @property({ tooltip: "子弹每秒移动的世界坐标距离" })
    MoveSpeed: number = 1000;

    @property({ tooltip: "子弹图片默认朝向与世界坐标 X 正方向之间的角度偏移" })
    RotationOffset: number = 0;

    Collider: Collider2D = null;
    // Skeleton: sp.Skeleton = null;

    private _isInit: boolean = false;
    private _maxRange: number = 0;
    private _curRange: number = 0;
    private _dirX: number = 0;
    private _dirY: number = 0;
    private _isFlying: boolean = false;
    private _harm: number = 0;
    private _isRemove = false;

    Init() {
        this.Collider = this.getComponent(Collider2D);
        this.Collider?.on(Contact2DType.BEGIN_CONTACT, this.BeginContact, this);
        // this.Skeleton = this.node.getChildByName("子弹").getComponent(sp.Skeleton);
    }

    Show(worldPos: Vec3, dirX: number, dirY: number, range: number, harm: number = 0, bulletLevel: number = 1) {
        if (!this._isInit) {
            this._isInit = true;
            this.Init();
        }
        this._isRemove = false;
        this.node.active = true;
        this.node.setWorldPosition(worldPos.clone());

        // 归一化方向，保证斜向移动和水平、垂直移动的速度一致。
        const directionLength = Math.sqrt(dirX * dirX + dirY * dirY);
        if (directionLength > 0) {
            this._dirX = dirX / directionLength;
            this._dirY = dirY / directionLength;
        } else {
            this._dirX = 0;
            this._dirY = 0;
        }

        this._maxRange = Math.max(0, range);
        this._curRange = 0;
        this._isFlying = directionLength > 0 && this._maxRange > 0;
        this._harm = Math.max(0, harm);

        const angle = Math.atan2(this._dirY, this._dirX) * 180 / Math.PI + this.RotationOffset;
        this.node.setWorldRotationFromEuler(0, 0, angle);
        // this.Skeleton.setAnimation(0, `zd${bulletLevel}`, true);
    }

    BeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contract: IPhysics2DContact | null) {
        contract.disabled = true;
        if (this._isRemove) return;

        // console.error(otherCollider.node.name);
        if (otherCollider.group === ZRSJZ_TIER.地形) {
            this._isRemove = true;
            this.CreateEffect();
            this.scheduleOnce(() => {
                this.Recycle();
            });
        } else if (otherCollider.group === ZRSJZ_TIER.玩家 && otherCollider.node.getComponent(ZRSJZ_Player)) {
            this._isRemove = true;
            otherCollider.node.getComponent(ZRSJZ_Player).BeHit(this._harm);
            this.CreateEffect();
            this.scheduleOnce(() => {
                this.Recycle();
            });
            // this.Recycle();
        } else if (otherCollider.group === ZRSJZ_TIER.敌人 && otherCollider.node.getComponent(ZRSJZ_EnemyBase)) {
            this._isRemove = true;
            otherCollider.node.getComponent(ZRSJZ_EnemyBase).BeHit(this._harm);
            this.CreateEffect();
            this.scheduleOnce(() => {
                this.Recycle();
            });
            // this.Recycle();
        }
    }

    protected update(dt: number): void {
        if (!this._isFlying) {
            this.Recycle();
            return;
        }

        const remainingRange = this._maxRange - this._curRange;
        const moveDistance = Math.min(Math.max(0, this.MoveSpeed) * dt, remainingRange);
        if (moveDistance > 0) {
            const worldPos = this.node.worldPosition.clone();
            worldPos.x += this._dirX * moveDistance;
            worldPos.y += this._dirY * moveDistance;
            this.node.setWorldPosition(worldPos);
            this._curRange += moveDistance;
        }

        if (this._curRange >= this._maxRange || moveDistance <= 0) {
            this.Recycle();
        }
    }

    private Recycle() {
        if (!this.node.active) return;
        this._isFlying = false;
        ZRSJZ_PoolManager.Instance.PutNode(this.node);
    }

    async CreateEffect() {
        const hitEffect = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Effect/HitEffect");
        hitEffect.parent = this.node.parent;
        hitEffect.getComponent(ZRSJZ_Effect).Show(this.node.worldPosition, this._dirX, this._dirY);
    }
}


