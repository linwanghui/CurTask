import { _decorator, Component, director, Node, RigidBody2D, sp, v2, Vec3 } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ANI } from '../ZRSJZ_Constant';
import { ZRSJZ_PlayerSkeleton } from './ZRSJZ_PlayerSkeleton';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_Bullet } from './ZRSJZ_Bullet';
import { ZRSJZ_EnemyBase } from './ZRSJZ_EnemyBase';
import { ZRSJZ_HP } from '../UI/ZRSJZ_HP';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Player')
export class ZRSJZ_Player extends Component {

    RigidBody: RigidBody2D = null;
    Skeleton: sp.Skeleton = null;
    WeaponType: string = "枪";

    PlayerSkeleton: ZRSJZ_PlayerSkeleton = null;
    HP: ZRSJZ_HP = null;

    MaxHP: number = 100;
    CurHP: number = 100;

    TargetEnemy: Node = null;
    TargetRange: number = 1000;

    private _moveSpeed: number = 1000;
    private _moveX: number = 0;
    private _moveY: number = 0;
    private _moveRadius: number = 0;
    private _aniName: string = "";
    private _isFireing: boolean = false;

    protected onLoad(): void {
        this.RigidBody = this.getComponent(RigidBody2D);
        this.Skeleton = this.node.getChildByName("Spine").getComponent(sp.Skeleton);
        this.PlayerSkeleton = this.Skeleton.node.getComponent(ZRSJZ_PlayerSkeleton);
        this.HP = this.node.getChildByName("HP").getComponent(ZRSJZ_HP);
    }

    protected start(): void {
        this.WeaponType = ZRSJZ_GameData.Instance.WeaponryID[0] != "" ? "枪" : "刀";
        this.PlayerSkeleton.IsKnife = this.WeaponType === "刀";
        if (ZRSJZ_GameData.Instance.WeaponryID[0]) {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(ZRSJZ_ANI.Idle_D1);
        }

        this.Skeleton.setEventListener((trackEntry, event) => {

            if (typeof event !== "number" && (event.data.name === "kq" || event.data.name === "gj_jjq") && this._isFireing && this.WeaponType === "枪") {
                void this.Fire();
            } else if (typeof event !== "number" && event.data.name === "dao") {

            } else if (typeof event !== "number" && event.data.name === "hui") {

            }
        });

        this.HP.Init(this.MaxHP);
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
        this.FindTarget();
        this.AniSwitch();
        this.PlayerSkeleton.AttackX = this.TargetEnemy ? this.TargetEnemy.worldPositionX - this.node.worldPositionX : Math.sign(this._moveX) != 0 ? Math.sign(this._moveX) : this.PlayerSkeleton.AttackX;
        this.PlayerSkeleton.AttackY = this.TargetEnemy ? this.TargetEnemy.worldPositionY - this.node.worldPositionY : 0;
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
            // this.PlayerSkeleton.HasDirection = false;
            if (this._isFireing) {
                this._isFireing = false;
            }
            return;
        }
        if (this.WeaponType === "枪") {
            this._moveX == 0 && this._moveY == 0 ? this.PlayAni(ZRSJZ_ANI.Attack_Idle_Q) : this.PlayAni(ZRSJZ_ANI.Attack_Move_Q);
            if (!this._isFireing) {
                this._isFireing = true;
            }
        } else {
            this._moveX == 0 && this._moveY == 0 ? this.PlayAni(ZRSJZ_ANI.Attack_Idle_D2) : this.PlayAni(ZRSJZ_ANI.Attack_Move_D2);
        }
        // this.PlayerSkeleton.AttackX = this.TargetEnemy ? this.TargetEnemy.worldPositionX - this.node.worldPositionX : 0;
        // this.PlayerSkeleton.AttackY = this.TargetEnemy ? this.TargetEnemy.worldPositionY - this.node.worldPositionY : 0;
        // this.PlayerSkeleton.HasDirection = true;
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
        const qkBone = this.PlayerSkeleton?.QKBone;
        if (!qkBone) {
            console.warn("[ZRSJZ_Player] 找不到枪口骨骼 kaihuo/texiao");
            return;
        }

        const bullet = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/Unit/PlayerBullet");
        bullet.parent = ZRSJZ_Game.Instance.CurMap.BulletParent;
        bullet.active = true;

        // Bone.worldX/worldY 是 Spine 节点空间坐标。
        // 再经过 Spine 节点的世界矩阵，得到 Cocos 世界坐标。
        const boneLocalPos = new Vec3(qkBone.worldX, qkBone.worldY, 0);
        const muzzleWorldPos = new Vec3();
        Vec3.transformMat4(
            muzzleWorldPos,
            boneLocalPos,
            this.PlayerSkeleton.node.worldMatrix,
        );

        bullet.getComponent(ZRSJZ_Bullet).Show(
            muzzleWorldPos,
            this.PlayerSkeleton.AttackX,
            this.PlayerSkeleton.AttackY,
            1000,
        );
    }

    protected FindTarget() {
        if (this.TargetEnemy && !this.TargetEnemy.getComponent(ZRSJZ_EnemyBase).IsDead && Vec3.distance(this.TargetEnemy.worldPosition, this.node.worldPosition) <= this.TargetRange) {
            return;
        }

        let enemys = director.getScene()?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? [];
        const currentPosition = this.node.worldPosition;
        enemys = enemys.filter(enemy => !enemy.IsDead);
        enemys.sort((a, b) => (
            Vec3.distance(a.node.worldPosition, currentPosition)
            - Vec3.distance(b.node.worldPosition, currentPosition)
        ));
        this.TargetEnemy = enemys[0]?.node ?? null;
    }

    //受到打击
    BeHit(harm: number) {
        this.CurHP -= harm;
        if (this.CurHP <= 0) {
            console.error("玩家死亡");
        }
        this.HP.Show(this.CurHP);
    }

}
