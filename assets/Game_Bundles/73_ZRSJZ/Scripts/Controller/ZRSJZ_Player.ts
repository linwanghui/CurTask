import { _decorator, Component, director, Director, RigidBody2D, sp, v2, Vec3 } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ANI } from '../ZRSJZ_Constant';
import { ZRSJZ_PlayerSkeleton } from './ZRSJZ_PlayerSkeleton';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Bullet } from './ZRSJZ_Bullet';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Player')
export class ZRSJZ_Player extends Component {

    RigidBody: RigidBody2D = null;
    Skeleton: sp.Skeleton = null;
    WeaponType: string = "枪";

    PlayerSkeleton: ZRSJZ_PlayerSkeleton = null;

    private _moveSpeed: number = 3000;
    private _moveX: number = 0;
    private _moveY: number = 0;
    private _moveRadius: number = 0;
    private _aniName: string = "";
    private _attackX: number = 0;
    private _attackY: number = 0;
    private _isFireing: boolean = false;

    protected onLoad(): void {
        this.RigidBody = this.getComponent(RigidBody2D);
        this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this.PlayerSkeleton = this.Skeleton.node.getComponent(ZRSJZ_PlayerSkeleton);
    }

    protected start(): void {
        this.WeaponType = ZRSJZ_GameData.Instance.WeaponryID[0] != "" ? "枪" : "刀";
        this.PlayerSkeleton.IsKnife = this.WeaponType === "刀";
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
        this._attackX = x;
        this._attackY = y;
        if (x === 0 && y === 0) {
            this.WeaponType === "枪" ? this.PlayAni(ZRSJZ_ANI.Idle_Q) : this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => { this.PlayAni(ZRSJZ_ANI.Idle_D1) });
            this.PlayerSkeleton.HasDirection = false;
            if (this._isFireing) {
                this._isFireing = false;
                this.unschedule(this.Fire);
            }
            return;
        }
        if (this.WeaponType === "枪") {
            this._moveX == 0 && this._moveY == 0 ? this.PlayAni(ZRSJZ_ANI.Attack_Idle_Q) : this.PlayAni(ZRSJZ_ANI.Attack_Move_Q);
            if (!this._isFireing) {
                this._isFireing = true;
                this.schedule(this.Fire, 0.1);
            }
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

    async Fire() {
        const bullet = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/PlayerBullet");
        bullet.parent = this.node;
        bullet.active = true;
        bullet.getComponent(ZRSJZ_Bullet).Show(this.node.worldPosition, this._attackX, this._attackY, 1000);
    }

}


