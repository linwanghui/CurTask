import { ZRSJZ_FacilityService } from "../Service/ZRSJZ_FacilityService";
import { _decorator, CircleCollider2D, Collider2D, Component, Contact2DType, IPhysics2DContact, Node, RigidBody2D, v2 } from 'cc';
import { ZRSJZ_PlayerSkeleton } from './ZRSJZ_PlayerSkeleton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ANI, ZRSJZ_KNIFE, ZRSJZ_TIER, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
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

    protected onEnable(): void {
        this.Show();
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.Move, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, this.SwitchWeapon, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE, this.Slide, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHANGE_SKIN, this.ChangeSkin, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
        this.Collider.on(Contact2DType.BEGIN_CONTACT, this.BeginContact, this)
        this.Collider.on(Contact2DType.END_CONTACT, this.EndContact, this)
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_MOVE, this.Move, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON, this.SwitchWeapon, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE, this.Slide, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHANGE_SKIN, this.ChangeSkin, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
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

    Show() {
        this._moveSpeed *= 1 + ZRSJZ_FacilityService.GetGymMoveSpeedBonusRate();
        this._weaponType = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerSkeleton.CurPlayerIndex)[0]
            ? "枪"
            : "刀";
        this.ApplyWeaponType(this._weaponType);
        this.PlayerSkeleton.HasDirection = false;
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
        const targetID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerSkeleton.CurPlayerIndex)[targetIndex];
        if (!targetID || !ZRSJZ_GameData.Instance.PropData[targetID]) return;
        this._weaponType = targetType;
        this.ApplyWeaponType(targetType);
    }

    private ApplyWeaponType(weaponType: string): void {
        const targetIndex = weaponType === "枪" ? 0 : 4;
        const targetID = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerSkeleton.CurPlayerIndex)[targetIndex];
        const propData = ZRSJZ_GameData.Instance.PropData[targetID];
        if (!propData) return;

        this.PlayerSkeleton.IsKnife = weaponType === "刀";
        this.PlayerSkeleton.ShowEquipment(propData.Name);
        this._aniName = "";
        if (weaponType === "枪") {
            this.PlayerSkeleton.ClearAttackAnimation();
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(ZRSJZ_ANI.Idle_D1);
            this.PlayerSkeleton.PlayKnifeBaseAni(ZRSJZ_ANI.Idle_D1);
        }
    }

    /** 大厅滑铲没有冷却；仅等待当前滑铲动作结束即可再次使用。 */
    Slide(): void {
        if (this._isSliding) return;
        this._isSliding = true;
        this.PlayerSkeleton.ClearAttackAnimation();
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
            if (this._weaponType === "刀") {
                this.PlayerSkeleton.PlayKnifeBaseAni(
                    this._moveX == 0 ? ZRSJZ_ANI.Idle_D1 : ZRSJZ_ANI.Walk_D,
                );
            }
        });
    }


    //#region 碰撞检测
    BeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contract: IPhysics2DContact | null) {
        // if (this._targetBox) return;
        if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node != this.Target) {
            this.Target = otherCollider.node;
        }
    }

    EndContact(selfCollider: Collider2D, otherCollider: Collider2D, contract: IPhysics2DContact | null) {
        if (otherCollider.group === ZRSJZ_TIER.场景物 && otherCollider.node == this.Target) {
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
        const isMoving = this._moveX !== 0 || this._moveY !== 0;
        const animation = this._weaponType === "枪"
            ? (isMoving ? ZRSJZ_ANI.Walk_Q : ZRSJZ_ANI.Idle_Q)
            : (isMoving ? ZRSJZ_ANI.Walk_D : ZRSJZ_ANI.Idle_D1);
        this.PlayAni(animation);
        if (this._weaponType === "刀") this.PlayerSkeleton.PlayKnifeBaseAni(animation);
    }

    private OnEquipmentChanged(
        equipmentName: string,
        isEquipment: boolean = true,
        playerIndex?: number,
    ): void {
        if (playerIndex !== undefined && playerIndex !== this.PlayerSkeleton.CurPlayerIndex) return;
        const changedType = this.GetWeaponType(equipmentName);
        if (!changedType) return;

        const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerSkeleton.CurPlayerIndex);
        if (isEquipment) {
            this._weaponType = changedType;
        } else if (changedType === this._weaponType) {
            this._weaponType = weaponryIDs[0] ? "枪" : "刀";
        }

        const targetIndex = this._weaponType === "枪" ? 0 : 4;
        if (weaponryIDs[targetIndex] && ZRSJZ_GameData.Instance.PropData[weaponryIDs[targetIndex]]) {
            this.ApplyWeaponType(this._weaponType);
            return;
        }

        this.PlayerSkeleton.IsKnife = true;
        this.PlayerSkeleton.ClearAttackAnimation();
        this._aniName = "";
        this.PlayAni(ZRSJZ_ANI.Idle_D1);
        this.PlayerSkeleton.PlayKnifeBaseAni(ZRSJZ_ANI.Idle_D1);
    }

    private GetWeaponType(equipmentName: string): "枪" | "刀" | null {
        for (const weaponNames of ZRSJZ_WEAPONRY_TYPE.values()) {
            if (weaponNames.includes(equipmentName)) return "枪";
        }
        return ZRSJZ_KNIFE.includes(equipmentName) ? "刀" : null;
    }

    ChangeSkin(playerIndex?: number) {
        if (playerIndex !== undefined && playerIndex !== this.PlayerSkeleton.CurPlayerIndex) return;
        this.PlayerSkeleton.SetSkin(ZRSJZ_GameData.Instance.CurSkin[this.PlayerSkeleton.CurPlayerIndex]);
        const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs(this.PlayerSkeleton.CurPlayerIndex);
        for (let i = weaponryIDs.length - 1; i >= 0; i--) {
            const prop = ZRSJZ_GameData.Instance.PropData[weaponryIDs[i]];
            if (prop) this.PlayerSkeleton.ShowEquipment(prop.Name);
        }
    }

}


