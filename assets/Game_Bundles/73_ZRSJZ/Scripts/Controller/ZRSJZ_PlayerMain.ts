import { _decorator, CircleCollider2D, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, RigidBody2D, v2 } from 'cc';
import { ZRSJZ_PlayerSkeleton } from './ZRSJZ_PlayerSkeleton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ANI, ZRSJZ_TIER } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PlayerMain')
export class ZRSJZ_PlayerMain extends Component {

    RigidBody: RigidBody2D = null;
    Collider: CircleCollider2D = null;
    PlayerSkeleton: ZRSJZ_PlayerSkeleton = null;

    Target: Node = null;
    private _moveSpeed: number = 1000;
    private _moveX: number = 0;
    private _moveY: number = 0;
    private _aniName: string = "";
    private _weaponType: string = "";
    private _isSliding: boolean = false;
    private _slideDirection: number = 1;

    protected onLoad(): void {
        this.RigidBody = this.getComponent(RigidBody2D);
        this.Collider = this.getComponent(CircleCollider2D);
        this.PlayerSkeleton = this.node.getChildByName("Spine").getComponent(ZRSJZ_PlayerSkeleton);
    }

    protected start(): void {
        this._moveSpeed *= 1 + ZRSJZ_GameData.Instance.GetGymMoveSpeedBonusRate();
        this._weaponType = ZRSJZ_GameData.Instance.WeaponryID[0] ? "枪" : "刀";
        this.ApplyWeaponType(this._weaponType);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.Move, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, this.SwitchWeapon, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE, this.Slide, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHANGE_SKIN, this.ChangeSkin, this);
        this.Collider.on(Contact2DType.BEGIN_CONTACT, this.BeginContact, this)
        this.Collider.on(Contact2DType.END_CONTACT, this.EndContact, this)
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.Move, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, this.SwitchWeapon, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE, this.Slide, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHANGE_SKIN, this.ChangeSkin, this);
        this.Collider.off(Contact2DType.BEGIN_CONTACT, this.BeginContact, this)
        this.Collider.off(Contact2DType.END_CONTACT, this.EndContact, this)
    }

    protected update(dt: number): void {
        if (!this._isSliding) this.AniSwitch();

        this.PlayerSkeleton.AttackX = Math.sign(this._moveX) != 0 ? Math.sign(this._moveX) < 0 ? -200 : 200 : this.PlayerSkeleton.AttackX;
        this.PlayerSkeleton.AttackY = 0;
        const moveX = this._isSliding ? this._slideDirection : this._moveX;
        const speed = this._isSliding ? this._moveSpeed + 1500 : this._moveSpeed;
        this.RigidBody.linearVelocity = v2(moveX * dt * speed, 0);
    }

    Move(x: number, y: number, radius: number) {
        this._moveX = x;
        this._moveY = y;
        if (x != 0) {
            this.PlayerSkeleton.SetPlayerDir(x / Math.abs(x))
        }
    }

    /** 大厅场景切换枪和刀；只有对应装备存在时才允许切换。 */
    SwitchWeapon(): void {
        if (this._isSliding) return;
        const targetType = this._weaponType === "枪" ? "刀" : "枪";
        const targetIndex = targetType === "枪" ? 0 : 4;
        const targetID = ZRSJZ_GameData.Instance.WeaponryID[targetIndex];
        if (!targetID || !ZRSJZ_GameData.Instance.PropData[targetID]) return;
        this._weaponType = targetType;
        this.ApplyWeaponType(targetType);
    }

    private ApplyWeaponType(weaponType: string): void {
        const targetIndex = weaponType === "枪" ? 0 : 4;
        const targetID = ZRSJZ_GameData.Instance.WeaponryID[targetIndex];
        const propData = ZRSJZ_GameData.Instance.PropData[targetID];
        if (!propData) return;

        this.PlayerSkeleton.IsKnife = weaponType === "刀";
        this.PlayerSkeleton.ShowEquipment(propData.Name);
        this.PlayAni(weaponType === "枪" ? ZRSJZ_ANI.Idle_Q : ZRSJZ_ANI.Idle_D2, false, () => {
            this.PlayAni(weaponType === "枪" ? ZRSJZ_ANI.Idle_Q : ZRSJZ_ANI.Idle_D1);
        });
    }

    /** 大厅滑铲没有冷却；仅等待当前滑铲动作结束即可再次使用。 */
    Slide(): void {
        if (this._isSliding) return;
        this._isSliding = true;
        this._slideDirection = Math.sign(this._moveX) || this.PlayerSkeleton.Facing || 1;
        const slideAnimation = this._weaponType === "枪" ? ZRSJZ_ANI.HC_Q : ZRSJZ_ANI.HC_D;
        this._aniName = "";
        this.PlayAni(slideAnimation, false, () => {
            this._isSliding = false;
            this._aniName = "";
            if (this._moveX == 0) {
                this.PlayAni(this._weaponType === "枪" ? ZRSJZ_ANI.Idle_Q : ZRSJZ_ANI.Idle_D1);
            } else {
                this.PlayAni(this._weaponType === "枪" ? ZRSJZ_ANI.Walk_Q : ZRSJZ_ANI.Walk_D);
            }
        });
    }


    //#region 碰撞检测
    BeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contract: IPhysics2DContact | null) {
        // if (this._targetBox) return;
        if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node != this.Target) {
            this.Target = otherCollider.node;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHECKED, otherCollider.node, true);
        }
    }

    EndContact(selfCollider: Collider2D, otherCollider: Collider2D, contract: IPhysics2DContact | null) {
        if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node == this.Target) {
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHECKED, otherCollider.node, false);
            this.Target = null;
        }
    }

    //#region 动画
    PlayAni(aniName: string, loop: boolean = true, cb: Function = null) {
        if (aniName == this._aniName) return;
        this._aniName = aniName;
        this.PlayerSkeleton.PlayAni(aniName, loop, cb);
    }
    //动画切换
    AniSwitch() {
        if (this._moveX == 0 && this._moveY == 0) {
            if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Walk_D) {
                this.PlayAni(ZRSJZ_ANI.Idle_D1);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Walk_Q) {
                this.PlayAni(ZRSJZ_ANI.Idle_Q);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Attack_Move_D2) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Attack_Move_D3) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_D3);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Attack_Move_Q) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_Q);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Attack_Move_Q2) {
                this.PlayAni(ZRSJZ_ANI.Attack_Idle_Q2);
            }
        } else if (this._moveX != 0 || this._moveY != 0) {
            if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Idle_D1 || this.PlayerSkeleton.AniName == ZRSJZ_ANI.Idle_D2) {
                this.PlayAni(ZRSJZ_ANI.Walk_D);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Idle_Q) {
                this.PlayAni(ZRSJZ_ANI.Walk_Q);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Attack_Idle_D2) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_D2);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Attack_Idle_D3) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_D3);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Attack_Idle_Q) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_Q);
            } else if (this.PlayerSkeleton.AniName == ZRSJZ_ANI.Attack_Idle_Q2) {
                this.PlayAni(ZRSJZ_ANI.Attack_Move_Q2);
            }
        }
    }

    ChangeSkin() {
        this.PlayerSkeleton.SetSkin(ZRSJZ_GameData.Instance.CurSkin[this.PlayerSkeleton.CurPlayerIndex]);
        for (let i = ZRSJZ_GameData.Instance.WeaponryID.length - 1; i >= 0; i--) {
            if (ZRSJZ_GameData.Instance.WeaponryID[i]) {
                this.PlayerSkeleton.ShowEquipment(ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[i]].Name);
            }
        }
    }

}


