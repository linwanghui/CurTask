import { _decorator, Component, Director, director, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_SKIN_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PlayerSkeleton')
export class ZRSJZ_PlayerSkeleton extends ZRSJZ_Skeleton {

    CurPlayerIndex: number = 0;

    AttackX: number = 0;
    AttackY: number = 0;
    HasDirection: boolean = false;
    Facing: number = 1;
    IsKnife: boolean = false;
    private _mzBone: sp.spine.Bone = null;
    private _baseScale = new Vec3();

    protected onLoad(): void {
        super.onLoad();
        this._mzBone = this.Skeleton?.findBone('mz');
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

        if (this.IsKnife) return;
        // BEFORE_DRAW 在 Spine 动画的 postUpdate 之后执行，避免坐标被动画覆盖。
        // 节点镜像后，IK 目标使用角色本地朝前方向，避免 X 方向被翻转两次。
        this._mzBone.x = this.AttackX * this.Facing * distance;
        this._mzBone.y = this.AttackY * distance;

        // 重新计算 IK 和所有骨骼世界坐标
        this.Skeleton._skeleton.updateWorldTransform();
    }

}


