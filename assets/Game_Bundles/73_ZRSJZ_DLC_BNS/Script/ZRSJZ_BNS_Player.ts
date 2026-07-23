import { _decorator, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, RigidBody2D, sp, v2 } from 'cc';
import { ZRSJZ_PlayerSkeleton } from '../../73_ZRSJZ/Scripts/Controller/ZRSJZ_PlayerSkeleton';
import { ZRSJZ_GameData } from '../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_ANI } from '../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../../73_ZRSJZ/Scripts/Manager/ZRSJZ_EventManager';
import { ZRSJZ_BNS_InteractionNode } from './ZRSJZ_BNS_InteractionNode';
import { ZRSJZ_BNS_EventManager, ZRSJZ_BNS_MyEvent } from './ZRSJZ_BNS_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_Player')
export class ZRSJZ_BNS_Player extends Component {
    RigidBody: RigidBody2D = null;
    collider: Collider2D = null;
    Skeleton: sp.Skeleton = null;
    WeaponType: string = "枪";

    PlayerSkeleton: ZRSJZ_PlayerSkeleton = null;

    private _moveSpeed: number = 500;
    private _moveX: number = 0;
    private _moveY: number = 0;
    private _moveRadius: number = 0;
    private _aniName: string = "";

    protected onLoad(): void {
        this.RigidBody = this.getComponent(RigidBody2D);
        this.collider = this.node.getComponent(Collider2D);
        this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this.PlayerSkeleton = this.Skeleton.node.getComponent(ZRSJZ_PlayerSkeleton);
    }

    protected start(): void {
        this.WeaponType == ZRSJZ_GameData.Instance.WeaponryID[0] ? this.WeaponType = "枪" : this.WeaponType = "刀";
        if (ZRSJZ_GameData.Instance.WeaponryID[0]) {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(ZRSJZ_ANI.Idle_D1);
        }
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.Move, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, this.Attack, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, this.SwitchWeapon, this);
        ZRSJZ_BNS_EventManager.On(ZRSJZ_BNS_MyEvent.交互被按下, this.OnInteractionClick, this);
        this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);//添加碰撞监听
        this.collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);//添加碰撞监听
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.Move, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_ATTACK, this.Attack, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, this.SwitchWeapon, this);
    }

    protected update(dt: number): void {
        this.AniSwitch();
        this.RigidBody.linearVelocity = v2(this._moveX * dt * this._moveSpeed * this._moveRadius, this._moveY * dt * this._moveSpeed * this._moveRadius);
    }

    Move(x: number, y: number, radius: number) {
        this._moveX = x;
        this._moveY = y;
        this._moveRadius = radius;
        if (x != 0) {
            this.PlayerSkeleton.SetPlayerDir(x / Math.abs(x))
        }
    }

    Attack(x: number, y: number, radius: number) {
        if (x === 0 && y === 0) {
            this.WeaponType === "枪" ? this.PlayAni(ZRSJZ_ANI.Idle_Q) : this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => { this.PlayAni(ZRSJZ_ANI.Idle_D1) });
            this.PlayerSkeleton.HasDirection = false;
            return;
        }
        if (this.WeaponType === "枪") {
            this._moveX == 0 && this._moveY == 0 ? this.PlayAni(ZRSJZ_ANI.Attack_Idle_Q) : this.PlayAni(ZRSJZ_ANI.Attack_Move_Q);
        } else {
            this._moveX == 0 && this._moveY == 0 ? this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2) : this.PlayAni(ZRSJZ_ANI.Attack_Move_D2);
        }
        this.PlayerSkeleton.AttackX = x;
        this.PlayerSkeleton.AttackY = y;
        this.PlayerSkeleton.HasDirection = true;
    }

    PlayAni(aniName: string, loop: boolean = true, cb: Function = null) {
        if (aniName == this._aniName) return;
        this._aniName = aniName;
        this.PlayerSkeleton.PlayAni(aniName, loop, cb);
    }

    //动画切换
    AniSwitch() {
        if (this._moveX == 0 && this._moveY == 0) {
            if (this._aniName == ZRSJZ_ANI.Walk_D) {
                this.PlayAni(ZRSJZ_ANI.Idle_D1);
            } else if (this._aniName == ZRSJZ_ANI.Walk_Q) {
                this.PlayAni(ZRSJZ_ANI.Idle_Q);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_D2) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_D3) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_D3);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Move_Q) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_Q);
            }
        } else if (this._moveX != 0 || this._moveY != 0) {
            if (this._aniName == ZRSJZ_ANI.Idle_D1 || this._aniName == ZRSJZ_ANI.Idle_D2) {
                this.PlayAni(ZRSJZ_ANI.Walk_D);
            } else if (this._aniName == ZRSJZ_ANI.Idle_Q) {
                this.PlayAni(ZRSJZ_ANI.Walk_Q);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Idle_D2) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_D2);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Idle_D3) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_D3);
            } else if (this._aniName == ZRSJZ_ANI.Attack_Idle_Q) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_Q);
            }
        }
    }

    SwitchWeapon() {
        if (this.WeaponType === "刀") {
            this.WeaponType = "枪";
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
            this.PlayerSkeleton.ShowEquipment(ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[0]].Name);
        } else if (this.WeaponType === "枪") {
            this.WeaponType = "刀";
            this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => { this.PlayAni(ZRSJZ_ANI.Idle_D1) });
            this.PlayerSkeleton.ShowEquipment(ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[4]].Name);
        }
        this.PlayerSkeleton.IsKnife = this.WeaponType === "刀";
    }
    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.node.getComponent(ZRSJZ_BNS_InteractionNode)) {
            ZRSJZ_BNS_EventManager.Emit(ZRSJZ_BNS_MyEvent.进入交互对象范围, otherCollider.node);
        }

    }
    onEndContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        if (otherCollider.node.getComponent(ZRSJZ_BNS_InteractionNode)) {
            ZRSJZ_BNS_EventManager.Emit(ZRSJZ_BNS_MyEvent.离开交互对象范围, otherCollider.node);
        }

    }
    //按下交互
    OnInteractionClick(node: Node) {
        switch (node.name) {
            case "松树":

                break;
        }
    }
}


