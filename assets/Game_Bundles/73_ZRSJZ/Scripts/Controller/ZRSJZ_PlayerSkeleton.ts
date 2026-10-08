import { _decorator, Director, director, sp, Vec3 } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

/** Track 0 移动，Track 1 攻击，Track 2 只叠加乌鲁炮架及发射特效。 */
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
    public OnlineAttackSerial = 0;

    private _afterAimAttack: (() => void) = null;

    private _mzBone: sp.spine.Bone = null;
    private _baseScale = new Vec3();
    private readonly _trackCompleteCallbacks = new Map<number, Function>();
    private _uluSkillEntry: sp.spine.TrackEntry = null;
    private _uluSkillSerial = 0;
    private _uluSkillCompleted = false;
    private _uluLaunch: (name: string, start: Vec3, direction: Vec3) => void = null;
    private _uluCanContinue: () => boolean = null;
    private _uluPaused: () => boolean = null;
    private readonly _pendingUluEvents: string[] = [];
    private readonly _firedUluEvents = new Set<string>();

    public get IsUluSkillPlaying(): boolean { return this._uluSkillEntry !== null; }

    protected GetEquippedWeaponryIDs(): string[] {
        // 外观刷新只应用当前持有的武器，避免先显示刀后被枪覆盖。
        const ids = [...ZRSJZ_InventoryService.GetWeaponryIDs(this.CurPlayerIndex)];
        ids[this.IsKnife ? 0 : 4] = "";
        return ids;
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

    protected OnSkeletonDataChanged(): void {
        this.ClearUluSkill();
        this._mzBone = this.Skeleton.findBone('mz');
        this.QKBone = this.GunType ? this.Skeleton.findBone(this.GunType + '枪口') : null;
        this.Skeleton.setCompleteListener(this.OnAnimationComplete);
    }

    protected onEnable(): void {
        this.Show();
        director.on(Director.EVENT_BEFORE_DRAW, this.UpdateAimAndAttack, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_LOADOUT_CHANGE, this.OnLoadoutChanged, this);
    }

    protected onDisable(): void {
        director.off(Director.EVENT_BEFORE_DRAW, this.UpdateAimAndAttack, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_LOADOUT_CHANGE, this.OnLoadoutChanged, this);
        this.ClearAttackAnimation();
        this.ClearUluSkill();
        this._trackCompleteCallbacks.clear();
    }

    Show(): void {
        this.SetSkin(ZRSJZ_GameData.Instance.CurSkin[this.CurPlayerIndex]);
        this.RefreshEquipmentAppearance();
    }

    private OnEquipmentChanged(
        equipmentName: string,
        isEquipment: boolean = true,
        playerIndex?: number,
    ): void {
        if (playerIndex !== undefined && playerIndex !== this.CurPlayerIndex) return;
        this.RefreshEquipmentAppearance();
    }

    private OnLoadoutChanged(playerIndex: number): void {
        if (playerIndex !== this.CurPlayerIndex) return;
        this.RefreshEquipmentAppearance();
    }

    /** 技能动画只含炮架/特效时间线，不覆盖 Track 0/1 的人体和持枪姿势。 */
    public PlayUluSkill(
        launch: (name: string, start: Vec3, direction: Vec3) => void,
        canContinue: () => boolean,
        paused: () => boolean,
    ): boolean {
        if (!this.Skeleton?.findAnimation('技能_乌鲁') || this.IsUluSkillPlaying) return false;
        this._uluLaunch = launch;
        this._uluCanContinue = canContinue;
        this._uluPaused = paused;
        this._uluSkillCompleted = false;
        this._pendingUluEvents.length = 0;
        this._firedUluEvents.clear();
        const entry = this.Skeleton.setAnimation(2, '技能_乌鲁', false);
        this._uluSkillEntry = entry;
        // WASM 每次回调可能返回新的 TrackEntry 包装对象，用施放序号识别同一轮。
        const serial = ++this._uluSkillSerial;
        this.Skeleton.setTrackEventListener(entry, (track, event) => {
            if (serial !== this._uluSkillSerial || !this._uluSkillEntry || typeof event === 'number') return;
            const name = event.data.name;
            if (!/^p[1-4]$/.test(name) || this._firedUluEvents.has(name)) return;
            this._firedUluEvents.add(name);
            this._pendingUluEvents.push(name);
        });
        this.Skeleton.setTrackCompleteListener(entry, () => {
            if (serial === this._uluSkillSerial && this._uluSkillEntry) this._uluSkillCompleted = true;
        });
        return true;
    }

    public ClearUluSkill(): void {
        const hadSkill = this.IsUluSkillPlaying;
        this._uluSkillSerial++;
        this._uluSkillEntry = null;
        this._uluLaunch = null;
        this._uluCanContinue = null;
        this._uluPaused = null;
        this._uluSkillCompleted = false;
        this._pendingUluEvents.length = 0;
        this._firedUluEvents.clear();
        if (!hadSkill || !this.Skeleton) return;
        this.Skeleton.clearTrack(2);
        // 中途打断时只复位技能自己的炮架和槽位，不能复位整个人物骨骼。
        const json = this.Skeleton.skeletonData?.skeletonJson as {
            animations?: { [name: string]: { slots?: object; bones?: object } };
        };
        const animation = json?.animations?.['技能_乌鲁'];
        for (const name of Object.keys(animation?.slots ?? {})) this.Skeleton.findSlot(name)?.setToSetupPose();
        for (const name of Object.keys(animation?.bones ?? {})) this.Skeleton.findBone(name)?.setToSetupPose();
    }

    protected update(): void {
        if (!this._uluSkillEntry) return;
        if (!this._uluCanContinue?.()) { this.ClearUluSkill(); return; }
        this._uluSkillEntry.timeScale = this._uluPaused?.() ? 0 : 1;
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
        this.OnlineAttackSerial++;
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
        this._afterAimAttack = null;
        this._trackCompleteCallbacks.delete(1);
        this.Skeleton?.clearTrack(1);
        // clearTrack 不会复位附件；中途死亡会跳过刀光动画末尾的隐藏帧。
        // 只清理攻击特效槽，保留实际武器 dao、服装和角色皮肤。
        for (const slotName of [
            "images/skill/slj/tc_add/tc_0001",
            "images/skill/tybg_add/tybg_01",
            "images/skill/zuihouyiji/dtcg_add/dtcg_0001",
            "images/skill/zuihouyiji/twtd/twtd_0001",
            "images/skill/zuihouyiji/twtd/twtd_1",
            "images/skill/zuihouyiji/twtd/twtd_2",
            "images/skill/tybg_add/tybg_1",
            "images/skill/baodian_add/js_5_normal/js_5_0001",
            "images/skill/baodian_add/js_5_normal/js_5_1",
            "images/effect/xuanfeng/xuanfeng_00045",
            "images/effect/xuanfeng/xuanfeng_45",
            "dao1",
        ]) {
            this.Skeleton?.findSlot(slotName)?.setAttachment(null);
        }
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

    /** 动画事件只排队，待骨骼姿态与本帧绘制一致后执行。 */
    QueueAttackAfterAim(callback: () => void): void { this._afterAimAttack = callback; }

    private UpdateAimAndAttack(): void {
        this.ApplyAimDirection();
        const attack = this._afterAimAttack;
        this._afterAimAttack = null;
        attack?.();
        if (!this._uluSkillEntry) return;
        if (!this._uluCanContinue?.()) { this.ClearUluSkill(); return; }
        if (this._uluPaused?.()) return;
        for (const name of this._pendingUluEvents.splice(0)) {
            const bone = this.Skeleton.findBone(name);
            if (!bone) continue;
            const start = new Vec3(bone.worldX, bone.worldY, 0);
            const forward = new Vec3(bone.worldX + bone.a, bone.worldY + bone.c, 0);
            Vec3.transformMat4(start, start, this.node.worldMatrix);
            Vec3.transformMat4(forward, forward, this.node.worldMatrix);
            this._uluLaunch?.(name, start, Vec3.subtract(forward, forward, start));
        }
        if (this._uluSkillCompleted) this.ClearUluSkill();
    }

    private ApplyAimDirection(): void {
        // this.ApplyWeaponHandSlots();
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

    /**
     * 部分角色皮肤的刀动画没有给对应手部槽写隐藏关键帧，镜像后的玩家2最明显，
     * 会同时显示持枪手和持刀手。每帧绘制前按当前武器姿态兜底，只保留正确手部。
     */
    private ApplyWeaponHandSlots(): void {
        const skeleton = this.Skeleton?._skeleton;
        if (!skeleton) return;

        for (let slotIndex = 0; slotIndex < skeleton.slots.length; slotIndex++) {
            const slot = skeleton.slots[slotIndex];
            const slotName = slot.data.name;
            const isGunHand = slotName.includes("左手3拿枪手1");
            const isKnifeHand = slotName.includes("左手3拿枪手2");
            if (!isGunHand && !isKnifeHand) continue;

            const shouldHide = this.IsKnife ? isKnifeHand : isGunHand;

            if (shouldHide) {
                slot.setAttachment(null);
            } else if (this.HasAttachmentForSlot(slotName, slotName)) {
                this.Skeleton.setAttachment(slotName, slotName);
            }
        }
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

        if (this.FindAttachmentSlotName(equipmentName) === 'dao' && isEquipment) {
            this.GunType = "";
            this.QKBone = null;
        }
        await super.ShowEquipment(equipmentName, isEquipment);
    }
}
