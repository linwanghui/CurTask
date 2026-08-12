import { _decorator, Component, Director, director, error, Node, sp, Texture2D, Vec3 } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_ANI, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PlayerSkeleton')
export class ZRSJZ_PlayerSkeleton extends ZRSJZ_Skeleton {

    @property({ tooltip: "补偿 Spine 持枪约束的初始角度偏差" })
    AimAngleOffset: number = 17;

    CurPlayerIndex: number = 0;
    QKBone: sp.spine.Bone = null;
    GunType: string = "";

    AttackX: number = 0;
    AttackY: number = 0;
    HasDirection: boolean = true;
    Facing: number = 1;
    IsKnife: boolean = false;
    IsLockEnemy: boolean = false;
    private _mzBone: sp.spine.Bone = null;
    private _mzBone_Hand: sp.spine.Bone = null;
    private _baseScale = new Vec3();

    protected onLoad(): void {
        super.onLoad();
        this._mzBone = this.Skeleton?.findBone('mz');
        this._mzBone_Hand = this.HandSkeleton?.findBone('mz');
        this._baseScale.set(this.node.scale.x, this.node.scale.y, this.node.scale.z);
    }

    protected start(): void {
        this.SetSkin(ZRSJZ_GameData.Instance.CurSkin[this.CurPlayerIndex]);
        for (let i = ZRSJZ_GameData.Instance.WeaponryID.length - 1; i >= 0; i--) {
            if (ZRSJZ_GameData.Instance.WeaponryID[i]) {
                this.ShowEquipment(ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[i]].Name);
            }
        }
    }

    protected onEnable(): void {
        director.on(Director.EVENT_BEFORE_DRAW, this.ApplyAimDirection, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.ShowEquipment, this);
    }

    protected onDisable(): void {
        director.off(Director.EVENT_BEFORE_DRAW, this.ApplyAimDirection, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.ShowEquipment, this);
    }

    PlayAni(aniName: string, loop: boolean = true, cb: Function = null) {
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        // if()
        this.HandSkeleton.setAnimation(0, aniName, loop);
        this.Skeleton.setCompleteListener(() => {
            if (cb) cb();
        });
    }

    SetPlayerDir(x: number) {
        this.node.setScale(
            Math.abs(this._baseScale.x) * x,
            this._baseScale.y,
            this._baseScale.z,
        );
    }

    //玩家转向
    private ApplyAimDirection(): void {
        if (!this._mzBone || !this.HasDirection) {
            return;
        }

        const distance = 1000;

        if (this.AttackX !== 0) {
            this.Facing = this.AttackX > 0 ? 1 : -1;
        }

        // 美术原始朝向为右；向左时只做水平镜像，保持 Y 轴方向不变。
        this.SetPlayerDir(this.Facing);

        if (this.IsKnife || !this.IsLockEnemy) return;
        // BEFORE_DRAW 在 Spine 动画的 postUpdate 之后执行，避免坐标被动画覆盖。
        // 节点镜像后，IK 目标使用角色本地朝前方向，避免 X 方向被翻转两次。
        const localDirX = this.AttackX * this.Facing;
        const localDirY = this.AttackY;
        const offsetRadian = this.AimAngleOffset * Math.PI / 180;
        const cos = Math.cos(offsetRadian);
        const sin = Math.sin(offsetRadian);

        // Spine 的 qqq 约束自带 -17.1° 旋转，这里将 IK 目标反向预补偿。
        // 使用角色镜像后的本地方向计算，左右朝向都能获得相同的世界射击方向。
        this._mzBone.x = (localDirX * cos - localDirY * sin) * distance;
        this._mzBone.y = (localDirX * sin + localDirY * cos) * distance;

        this._mzBone_Hand.x = (localDirX * cos - localDirY * sin) * distance;
        this._mzBone_Hand.y = (localDirX * sin + localDirY * cos) * distance;

        // 重新计算 IK 和所有骨骼世界坐标
        this.Skeleton._skeleton.updateWorldTransform();
        this.HandSkeleton._skeleton.updateWorldTransform();
    }

    //显示装备
    async ShowEquipment(equipmentName: string, isEquipment: boolean = true) {
        if (!equipmentName || !this.Skeleton?._skeleton) {
            return;
        }
        super.ShowEquipment(equipmentName, isEquipment);

        //枪的穿戴
        for (let key of ZRSJZ_WEAPONRY_TYPE.keys()) {
            const flag = ZRSJZ_WEAPONRY_TYPE.get(key).includes(equipmentName);
            if (flag) {
                if (isEquipment) {
                    this.QKBone = this.Skeleton.findBone(key + "枪口");
                    this.GunType = key;
                }
            }
        }

    }



}


