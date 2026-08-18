import { _decorator, Component, Director, director, error, Node, sp, Texture2D, Vec3 } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_ANI, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PlayerSkeleton')
export class ZRSJZ_PlayerSkeleton extends ZRSJZ_Skeleton {

    @property({ tooltip: "补偿 Spine 持枪约束的初始角度偏差" })
    AimAngleOffset: number = 17;

    @property({
        displayName: "移动射击动画混合时间",
        tooltip: "普通持枪移动与移动射击互相切换时的姿势混合时间（秒）。",
        min: 0,
        max: 0.5,
        step: 0.01,
    })
    MoveShootMixDuration: number = 0.12;

    CurPlayerIndex: number = 0;
    QKBone: sp.spine.Bone = null;
    GunType: string = "";
    /** 开枪/挥刀期间锁住手部，普通全身动画只能更新身体 Spine。 */
    HandAttackAnimationLocked: boolean = false;

    AttackX: number = 0;
    AttackY: number = 0;
    HasDirection: boolean = true;
    Facing: number = 1;
    IsKnife: boolean = false;
    // IsLockEnemy: boolean = false;
    private _mzBone: sp.spine.Bone = null;
    private _mzBone_Hand: sp.spine.Bone = null;
    private _baseScale = new Vec3();

    protected GetEquippedWeaponryIDs(): string[] {
        return ZRSJZ_InventoryService.GetWeaponryIDs(this.CurPlayerIndex);
    }

    protected onLoad(): void {
        super.onLoad();
        if (this.node.parent?.name === "Player2" || this.node.parent?.name === "玩家2") {
            this.CurPlayerIndex = 1;
        }
        this._mzBone = this.Skeleton?.findBone('mz');
        this._mzBone_Hand = this.HandSkeleton?.findBone('mz');
        this._baseScale.set(this.node.scale.x, this.node.scale.y, this.node.scale.z);
    }

    protected onEnable(): void {
        this.Show();
        director.on(Director.EVENT_BEFORE_DRAW, this.ApplyAimDirection, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
    }

    protected onDisable(): void {
        director.off(Director.EVENT_BEFORE_DRAW, this.ApplyAimDirection, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
    }

    Show() {
        this.SetSkin(ZRSJZ_GameData.Instance.CurSkin[this.CurPlayerIndex]);
        const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs(this.CurPlayerIndex);
        for (let i = weaponryIDs.length - 1; i >= 0; i--) {
            const prop = ZRSJZ_GameData.Instance.PropData[weaponryIDs[i]];
            if (prop) this.ShowEquipment(prop.Name);
        }
    }

    private OnEquipmentChanged(
        equipmentName: string,
        isEquipment: boolean = true,
        playerIndex?: number,
    ): void {
        if (playerIndex !== undefined && playerIndex !== this.CurPlayerIndex) return;
        this.ShowEquipment(equipmentName, isEquipment);
    }

    PlayAni(aniName: string, loop: boolean = true, cb: Function = null) {
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        if (!this.HandAttackAnimationLocked) {
            this.HandSkeleton.timeScale = 1;
            this.HandSkeleton.setAnimation(0, aniName, loop);
            this.HandSkeleton.setCompleteListener(null);
        }
        this.Skeleton.setCompleteListener(() => {
            if (cb) cb();
        });
    }

    /** 只更新身体 Spine，供持枪时的待机/移动动画使用。 */
    PlayBodyAni(aniName: string, loop: boolean = true, cb: Function = null) {
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        this.Skeleton.setCompleteListener(() => {
            if (cb) cb();
        });
    }

    /** 只更新手部 Spine，避免开枪动作覆盖身体的移动状态。 */
    PlayHandAni(aniName: string, loop: boolean = true, cb: Function = null) {
        this.HandSkeleton.timeScale = 1;
        aniName = this.GetHandAnimationName(aniName);
        const previousAnimation = this.HandSkeleton.getCurrent(0)?.animation?.name ?? "";
        this.SetMoveShootMix(this.HandSkeleton, previousAnimation, aniName);
        this.HandSkeleton.setAnimation(0, aniName, loop);
        this.HandSkeleton.setCompleteListener(() => {
            if (!loop) this.HandSkeleton.setCompleteListener(null);
            if (cb) cb();
        });
    }

    /** 切换身体移动动画时继承当前循环进度，并允许微调动画相位。 */
    PlayBodyAniKeepingProgress(aniName: string, loop: boolean = true) {
        const previousEntry = this.Skeleton.getCurrent(0);
        const previousAnimation = previousEntry?.animation?.name ?? "";
        const previousDuration = previousEntry?.animation?.duration ?? 0;
        const normalizedTime = previousDuration > 0
            ? (previousEntry.trackTime % previousDuration) / previousDuration
            : 0;
        this.SetMoveShootMix(this.Skeleton, previousAnimation, aniName);
        const nextEntry = this.Skeleton.setAnimation(0, aniName, loop);
        const nextDuration = nextEntry?.animation?.duration ?? 0;
        if (nextDuration > 0) {
            nextEntry.trackTime = normalizedTime * nextDuration;
        }
        this.AniName = aniName;
        this.Skeleton.setCompleteListener(null);
    }

    /** 根据“每分钟发数”调整一轮开枪动画时长，使每轮事件严格对应一发子弹。 */
    PlayGunHandAni(aniName: string, roundsPerMinute: number, cb: Function = null) {
        aniName = this.GetHandAnimationName(aniName);
        const animationDuration = this.HandSkeleton.findAnimation(aniName)?.duration ?? 0;
        const safeRoundsPerMinute = Math.max(1, roundsPerMinute);
        this.HandSkeleton.timeScale = animationDuration > 0
            ? Math.max(0.01, animationDuration * safeRoundsPerMinute / 60)
            : 1;
        const previousAnimation = this.HandSkeleton.getCurrent(0)?.animation?.name ?? "";
        this.SetMoveShootMix(this.HandSkeleton, previousAnimation, aniName);
        this.HandSkeleton.setAnimation(0, aniName, false);
        this.HandSkeleton.setCompleteListener(() => {
            this.HandSkeleton.setCompleteListener(null);
            this.HandSkeleton.timeScale = 1;
            if (cb) cb();
        });
    }

    ResetHandAnimationSpeed(): void {
        this.HandSkeleton.timeScale = 1;
    }

    private GetHandAnimationName(aniName: string): string {
        if (aniName == "gj_qiang") {
            return "gj_qiang2";
        } else if (aniName == "gj_jjq") {
            return "gj_jjq2";
        }
        return aniName;
    }

    /** 只为持枪移动与移动射击配置混合，避免影响换弹、近战及死亡等一次性动画。 */
    private SetMoveShootMix(
        skeleton: sp.Skeleton,
        fromAnimation: string,
        toAnimation: string,
    ): void {
        if (
            !skeleton
            || !fromAnimation
            || fromAnimation === toAnimation
            || this.MoveShootMixDuration <= 0
            || !this.IsMoveShootTransition(fromAnimation, toAnimation)
        ) {
            return;
        }
        skeleton.setMix(fromAnimation, toAnimation, this.MoveShootMixDuration);
    }

    private IsMoveShootTransition(fromAnimation: string, toAnimation: string): boolean {
        const moveAnimation = ZRSJZ_ANI.Walk_Q;
        const movingShootAnimations: string[] = [
            ZRSJZ_ANI.Attack_Move_Q,
            ZRSJZ_ANI.Attack_Move_Q2,
        ];
        return (
            fromAnimation === moveAnimation
            && movingShootAnimations.includes(toAnimation)
        ) || (
                toAnimation === moveAnimation
                && movingShootAnimations.includes(fromAnimation)
            );
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


