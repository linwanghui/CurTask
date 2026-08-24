import { _decorator, Director, director, sp, Vec3 } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

/** 玩家使用一套完整 Spine：Track 0 负责移动，Track 1 只叠加攻击。 */
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

    private _mzBone: sp.spine.Bone = null;
    private _baseScale = new Vec3();
    private readonly _trackCompleteCallbacks = new Map<number, Function>();

    protected GetEquippedWeaponryIDs(): string[] {
        return ZRSJZ_InventoryService.GetWeaponryIDs(this.CurPlayerIndex);
    }

    protected onLoad(): void {
        // 玩家使用整体 Spine，并在此处额外初始化瞄准及双轨道监听。
        super.onLoad();
        if (!this.Skeleton) {
            return;
        }
        if (this.node.parent?.name === "Player2" || this.node.parent?.name === "玩家2") {
            this.CurPlayerIndex = 1;
        }
        this._mzBone = this.Skeleton.findBone('mz');
        this._baseScale.set(this.node.scale.x, this.node.scale.y, this.node.scale.z);
        this.Skeleton.setCompleteListener(this.OnAnimationComplete);
    }

    protected onEnable(): void {
        this.Show();
        director.on(Director.EVENT_BEFORE_DRAW, this.ApplyAimDirection, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
    }

    protected onDisable(): void {
        director.off(Director.EVENT_BEFORE_DRAW, this.ApplyAimDirection, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
        this.ClearAttackAnimation();
        this._trackCompleteCallbacks.clear();
    }

    Show(): void {
        this.SetSkin(ZRSJZ_GameData.Instance.CurSkin[this.CurPlayerIndex]);
        const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs(this.CurPlayerIndex);
        for (let i = weaponryIDs.length - 1; i >= 0; i--) {
            const prop = ZRSJZ_GameData.Instance.PropData[weaponryIDs[i]];
            if (prop) void this.ShowEquipment(prop.Name);
        }
    }

    private OnEquipmentChanged(
        equipmentName: string,
        isEquipment: boolean = true,
        playerIndex?: number,
    ): void {
        if (playerIndex !== undefined && playerIndex !== this.CurPlayerIndex) return;
        void this.ShowEquipment(equipmentName, isEquipment);
    }

    /** Track 0：待机、移动、滑铲和死亡等基础全身状态。 */
    PlayAni(aniName: string, loop: boolean = true, cb: Function = null): void {
        if (!this.Skeleton) return;
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        this.SetTrackCompleteCallback(0, cb);
    }

    /** Track 1：枪械或刀的攻击动画，不会替换 Track 0 的移动状态。 */
    PlayAttackAni(aniName: string, loop: boolean = false, cb: Function = null): any {
        if (!this.Skeleton) return null;
        const entry = this.Skeleton.setAnimation(1, aniName, loop);
        this.SetTrackCompleteCallback(1, cb);
        return entry;
    }

    /** 刀未攻击时让 Track 1 与 Track 0 使用同一基础动画，保证刀具姿态持续同步。 */
    PlayKnifeBaseAni(aniName: string): void {
        if (!this.Skeleton) return;
        const currentEntry = this.Skeleton.getCurrent(1);
        if (currentEntry?.animation?.name === aniName && currentEntry.loop) return;
        this.Skeleton.setAnimation(1, aniName, true);
        this.SetTrackCompleteCallback(1, null);
    }

    /** 按射速调整 Track 1 的单次开枪动画，Track 0 的移动速度不受影响。 */
    PlayGunAttackAni(aniName: string, roundsPerMinute: number, cb: Function = null): void {
        if (!this.Skeleton) return;
        const animationDuration = this.Skeleton.findAnimation(aniName)?.duration ?? 0;
        const safeRoundsPerMinute = Math.max(1, roundsPerMinute);
        const entry = this.PlayAttackAni(aniName, false, cb);
        if (entry) {
            entry.timeScale = animationDuration > 0
                ? Math.max(0.01, animationDuration * safeRoundsPerMinute / 60)
                : 1;
        }
    }

    ClearAttackAnimation(): void {
        this._trackCompleteCallbacks.delete(1);
        this.Skeleton?.clearTrack(1);
    }

    ResetAttackAnimationSpeed(): void {
        const attackEntry = this.Skeleton?.getCurrent(1);
        if (attackEntry) attackEntry.timeScale = 1;
    }

    private SetTrackCompleteCallback(trackIndex: number, cb: Function): void {
        if (cb) this._trackCompleteCallbacks.set(trackIndex, cb);
        else this._trackCompleteCallbacks.delete(trackIndex);
    }

    private readonly OnAnimationComplete = (trackEntry: any): void => {
        const trackIndex = trackEntry?.trackIndex ?? 0;
        const cb = this._trackCompleteCallbacks.get(trackIndex);
        if (!trackEntry?.loop) this._trackCompleteCallbacks.delete(trackIndex);
        if (cb) cb();
    };

    SetPlayerDir(x: number): void {
        this.node.setScale(
            Math.abs(this._baseScale.x) * x,
            this._baseScale.y,
            this._baseScale.z,
        );
    }

    private ApplyAimDirection(): void {
        if (!this._mzBone || !this.HasDirection) return;
        const distance = 1000;

        if (this.AttackX !== 0) this.Facing = this.AttackX > 0 ? 1 : -1;
        this.SetPlayerDir(this.Facing);
        if (this.IsKnife) return;

        const localDirX = this.AttackX * this.Facing;
        const localDirY = this.AttackY;
        const offsetRadian = this.AimAngleOffset * Math.PI / 180;
        const cos = Math.cos(offsetRadian);
        const sin = Math.sin(offsetRadian);
        this._mzBone.x = (localDirX * cos - localDirY * sin) * distance;
        this._mzBone.y = (localDirX * sin + localDirY * cos) * distance;
        this.Skeleton._skeleton.updateWorldTransform();
    }

    async ShowEquipment(equipmentName: string, isEquipment: boolean = true): Promise<void> {
        if (!equipmentName || !this.Skeleton?._skeleton) return;

        for (const [gunType, weaponNames] of ZRSJZ_WEAPONRY_TYPE) {
            if (!weaponNames.includes(equipmentName)) continue;
            await super.ShowEquipment(equipmentName, isEquipment);
            if (isEquipment) {
                this.GunType = gunType;
                this.QKBone = this.Skeleton.findBone(gunType + "枪口");
            } else {
                this.GunType = "";
                this.QKBone = null;
            }
            return;
        }

        const skeleton = this.Skeleton._skeleton;
        for (let slotIndex = 0; slotIndex < skeleton.slots.length; slotIndex++) {
            if (!skeleton.getAttachment(slotIndex, equipmentName)) continue;
            if (skeleton.slots[slotIndex].data.name === 'dao' && isEquipment) {
                this.GunType = "";
                this.QKBone = null;
            }
            break;
        }
        await super.ShowEquipment(equipmentName, isEquipment);
    }
}
