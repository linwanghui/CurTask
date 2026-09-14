import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, Component, isValid, sp, Texture2D } from 'cc';
import { ZRSJZ_KNIFE, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from "../ZRSJZ_Tools";
const { ccclass } = _decorator;

/** 角色统一使用一套完整 Spine，皮肤、动画和全部装备均操作同一个 Skeleton。 */
@ccclass('ZRSJZ_Skeleton')
export class ZRSJZ_Skeleton extends Component {

    Skeleton: sp.Skeleton = null;
    SkinName: string = null;
    AniName: string = "";
    WeaponryName: string = "";

    /**
     * Cocos 3.8.6 的 Android JSB 会在 getAttachment/getAttachmentByName 查询不到
     * attachment 时解引用空指针。这里直接从 SkeletonData 的 JSON 建立索引，所有
     * “附件是否存在、属于哪个槽位”的判断都留在 JS 层完成。
     */
    private readonly _attachmentSlotsBySkin = new Map<string, Map<string, string[]>>();
    private _activeSpineSkinName: string = 'default';
    private _requestedSkinName: string = '威蓝';
    private _dlcSkeletonReady = false;
    private _dlcSkeletonLoading = false;
    private readonly _equipmentAppearance = new Map<string, boolean>();

    /** 敌人复用基础骨骼操作，但不参与玩家 DLC 外观切换。 */
    protected get UsesPlayerDLCAppearance(): boolean {
        return true;
    }

    protected get HasFullAppearance(): boolean {
        return !this.UsesPlayerDLCAppearance || (ZRSJZ_UIManager.ZRSJZ_DLC && this._dlcSkeletonReady);
    }

    /** 子类可按自己的玩家索引返回装备栏。 */
    protected GetEquippedWeaponryIDs(): string[] {
        return ZRSJZ_GameData.Instance.WeaponryID;
    }

    protected onLoad(): void {
        this.Skeleton = this.getComponent(sp.Skeleton);
        if (!this.Skeleton) {
            console.error(`[${this.constructor.name}] 当前节点缺少 sp.Skeleton 组件`);
            return;
        }
        this.BuildAttachmentSlotIndex();
        if (!this.UsesPlayerDLCAppearance) return;
        this.ApplyRequestedSkin();
    }

    protected start(): void {
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_DLC, this.LoadDLCSkeleton, this);
        this.LoadDLCSkeleton();
    }

    protected onDestroy(): void {
        if (!this.UsesPlayerDLCAppearance) return;
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_DLC, this.LoadDLCSkeleton, this);
    }

    private LoadDLCSkeleton(): void {
        if (!this.UsesPlayerDLCAppearance) return;
        if (ZRSJZ_UIManager.ZRSJZ_DLC && !this._dlcSkeletonReady && !this._dlcSkeletonLoading) {
            this._dlcSkeletonLoading = true;
            ZRSJZ_Tools.LoadSkeletonDataByBundle("73_ZRSJZ_DLC", "Spine/玩家/1").then((data) => {
                if (!isValid(this, true) || !isValid(this.Skeleton, true) || !ZRSJZ_UIManager.ZRSJZ_DLC) return;

                // onEnable 已可能设置皮肤、装备和动画；替换资源前保存当前显示状态。
                const weaponName = this.WeaponryName;
                const tracks: { index: number; name: string; loop: boolean; time: number }[] = [];
                for (let index = 0; index < 2; index++) {
                    const entry = this.Skeleton.getCurrent(index);
                    if (entry?.animation) tracks.push({ index, name: entry.animation.name, loop: entry.loop, time: entry.trackTime });
                }

                // 加载结果是 Cocos 资源，setSkeletonData 接收的则是 Spine 运行时数据。
                this.Skeleton.skeletonData = data;
                this._dlcSkeletonReady = true;
                this.BuildAttachmentSlotIndex();
                this.SetSkin(this._requestedSkinName);
                this.OnSkeletonDataChanged();
                for (const track of tracks) {
                    if (!this.Skeleton.findAnimation(track.name)) continue;
                    const entry = this.Skeleton.setAnimation(track.index, track.name, track.loop);
                    if (entry) entry.trackTime = track.time;
                }
                // 本地模式下未显示的衣装，也要在 DLC 就绪后按最新请求恢复。
                const equipmentRequests: { name: string; equipped: boolean }[] = [];
                this._equipmentAppearance.forEach((equipped, name) => equipmentRequests.push({ name, equipped }));
                for (const { name, equipped } of equipmentRequests) {
                    void this.ShowEquipment(name, equipped).catch(error => console.error('[ZRSJZ_Skeleton] 恢复装备外观失败', error));
                }
                if (weaponName) void this.ShowEquipment(weaponName).catch(error => console.error('[ZRSJZ_Skeleton] 恢复当前武器失败', error));
            }).catch(error => {
                console.error('[ZRSJZ_Skeleton] 加载或应用 DLC 骨骼失败', error);
            }).finally(() => {
                this._dlcSkeletonLoading = false;
            });
        }
    }

    /** 替换资源会重建运行时骨骼，子类在这里更新缓存。 */
    protected OnSkeletonDataChanged(): void { }

    SetSkin(skinName: string): void {
        if (!this.UsesPlayerDLCAppearance) {
            const skinConfig = ZRSJZ_SKIN_CONFIG.get(skinName);
            if (!skinConfig || !this.Skeleton) return;
            this.SkinName = skinName;
            this._activeSpineSkinName = skinConfig.Skin;
            this.Skeleton.setSkin(skinConfig.Skin);
            return;
        }
        this._requestedSkinName = skinName;
        this.ApplyRequestedSkin();
        this.LoadDLCSkeleton();
    }

    private ApplyRequestedSkin(): void {
        const requestedConfig = ZRSJZ_SKIN_CONFIG.get(this._requestedSkinName);
        // 本地包保留蓝狼角色的多套皮肤；只有其他角色需要回退到威蓝。
        const isDefaultRoleSkin = requestedConfig?.Skin.startsWith('js/ll')
            || requestedConfig?.Skin.startsWith('角色/蓝狼/');
        const displayName = this.HasFullAppearance || isDefaultRoleSkin ? this._requestedSkinName : '威蓝';
        const skinConfig = ZRSJZ_SKIN_CONFIG.get(displayName);
        if (!skinConfig || !this.Skeleton) return;

        this.SkinName = displayName;
        // 兼容旧版 js/* 和新版 Spine 的角色目录命名。
        const candidates = [skinConfig.Skin,
        skinConfig.Skin.replace('js/ll', '角色/蓝狼/ll').replace('js/m', '角色/麦小温/m').replace('js/w', '角色/左亚/w'),
            '角色/蓝狼/ll1', 'js/ll1', 'default'];
        this._activeSpineSkinName = candidates.find(name => this._attachmentSlotsBySkin.has(name)) ?? 'default';
        this.Skeleton.setSkin(this._activeSpineSkinName);
        if (!this.HasFullAppearance) this.HideNonWeaponEquipment();
    }

    private HideNonWeaponEquipment(): void {
        for (const slotName of ['t', 'j', 'b']) this.Skeleton.findSlot(slotName)?.setAttachment(null);
    }

    protected CanShowEquipment(equipmentName: string, isEquipment: boolean): boolean {
        // 重复切回某件装备时也更新顺序，DLC 就绪后以最后一次选择为准。
        this._equipmentAppearance.delete(equipmentName);
        this._equipmentAppearance.set(equipmentName, isEquipment);
        if (this.HasFullAppearance) return true;
        this.HideNonWeaponEquipment();
        if (ZRSJZ_KNIFE.includes(equipmentName)) return true;
        return !!this.GetGunSlotName(equipmentName);
    }

    protected GetGunSlotName(equipmentName: string): string | null {
        let slotName: string = null;
        // 使用 forEach，避免快游戏降级构建将 Map 迭代器当成数组而跳过武器。
        ZRSJZ_WEAPONRY_TYPE.forEach((weaponNames, name) => {
            if (weaponNames.includes(equipmentName)) slotName = name;
        });
        return slotName;
    }

    /** 返回当前皮肤（其次 default 皮肤）中 attachment 所属的有效槽位。 */
    protected FindAttachmentSlotName(attachmentName: string): string | null {
        if (!attachmentName || !this.Skeleton) return null;
        if (this._attachmentSlotsBySkin.size === 0) this.BuildAttachmentSlotIndex();

        const skinNames = this._activeSpineSkinName === 'default'
            ? ['default']
            : [this._activeSpineSkinName, 'default'];

        for (const skinName of skinNames) {
            const slotNames = this._attachmentSlotsBySkin.get(skinName)?.get(attachmentName);
            if (!slotNames) continue;
            for (const slotName of slotNames) {
                if (this.Skeleton.findSlot(slotName)) return slotName;
            }
        }
        return null;
    }

    /** 判断指定皮肤/default 数据中是否明确存在这组槽位与附件。 */
    protected HasAttachmentForSlot(slotName: string, attachmentName: string): boolean {
        if (!slotName || !attachmentName) return false;
        if (this._attachmentSlotsBySkin.size === 0) this.BuildAttachmentSlotIndex();

        const skinNames = this._activeSpineSkinName === 'default'
            ? ['default']
            : [this._activeSpineSkinName, 'default'];
        return skinNames.some(skinName =>
            this._attachmentSlotsBySkin.get(skinName)?.get(attachmentName)?.includes(slotName) === true,
        );
    }

    private BuildAttachmentSlotIndex(): void {
        this._attachmentSlotsBySkin.clear();

        let json: any = this.Skeleton?.skeletonData?.skeletonJson as any;
        if (typeof json === 'string') {
            try {
                json = JSON.parse(json);
            } catch (error) {
                console.error('[ZRSJZ_Skeleton] Spine JSON 解析失败', error);
                return;
            }
        }

        const skins = json?.skins;
        if (!skins) return;

        const addSkin = (skinName: string, attachments: any): void => {
            if (!attachments || typeof attachments !== 'object') return;
            const attachmentMap = new Map<string, string[]>();

            for (const slotName of Object.keys(attachments)) {
                const slotAttachments = attachments[slotName];
                if (!slotAttachments || typeof slotAttachments !== 'object') continue;

                for (const attachmentName of Object.keys(slotAttachments)) {
                    const slotNames = attachmentMap.get(attachmentName) ?? [];
                    if (!slotNames.includes(slotName)) slotNames.push(slotName);
                    attachmentMap.set(attachmentName, slotNames);
                }
            }
            this._attachmentSlotsBySkin.set(skinName || 'default', attachmentMap);
        };

        // Spine 3.8 导出为数组；同时兼容旧版以皮肤名为 key 的对象格式。
        if (Array.isArray(skins)) {
            for (const skin of skins) addSkin(skin?.name ?? 'default', skin?.attachments);
        } else {
            for (const skinName of Object.keys(skins)) addSkin(skinName, skins[skinName]?.attachments ?? skins[skinName]);
        }
    }

    PlayAni(aniName: string, loop: boolean = true, cb: Function = null): void {
        if (!this.Skeleton) return;
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        this.Skeleton.setCompleteListener(() => {
            if (cb) cb();
        });
    }

    /**
     * 按当前玩家的 WeaponryID 完整重建角色装备外观。
     * 装备事件可能发生在角色节点隐藏期间，因此不能只增量设置新附件：这里先恢复
     * 皮肤槽位并清空五类装备槽，再从最新数据重新应用，避免残留旧装备。
     */
    public RefreshEquipmentAppearance(): void {
        if (!this.Skeleton?._skeleton) return;

        this._equipmentAppearance.clear();
        this.Skeleton._skeleton.setSlotsToSetupPose();
        // vivo RPK 的构建转换不会正确展开 Map.keys()：
        // `[...map.keys()]` 会把 MapIterator 本身塞进数组，传给 Spine findSlot 后
        // 在 wasm 绑定层触发 "Cannot pass non-string to std::string"。
        // 使用 Map.forEach + 普通数组/下标循环，兼容 APK、浏览器和快游戏运行时。
        const equipmentSlots: string[] = ['dao', 't', 'j', 'b'];
        ZRSJZ_WEAPONRY_TYPE.forEach((_weaponNames, gunSlotName) => {
            if (typeof gunSlotName === 'string' && equipmentSlots.indexOf(gunSlotName) < 0) {
                equipmentSlots.push(gunSlotName);
            }
        });
        for (let index = 0; index < equipmentSlots.length; index++) {
            const slotName = equipmentSlots[index];
            this.Skeleton.findSlot(slotName)?.setAttachment(null);
        }

        const weaponryIDs = this.GetEquippedWeaponryIDs();
        for (let index = weaponryIDs.length - 1; index >= 0; index--) {
            const prop = ZRSJZ_GameData.Instance.PropData[weaponryIDs[index]];
            if (prop) void this.ShowEquipment(prop.Name);
        }
    }

    /** 只同步实际可见的衣装附件，不传库存 ID 或装备数值。空字符串表示脱下。 */
    public GetOnlineOutfit(): { [slot: string]: string } {
        if (!this.HasFullAppearance) return { t: '', j: '', b: '' };
        const slots = ['t', 'j', 'b'];
        for (const name of ZRSJZ_SKIN_CONFIG.get(this.SkinName)?.Headset ?? []) {
            const slot = this.FindAttachmentSlotName(name);
            if (slot && !slots.includes(slot)) slots.push(slot);
        }
        const result: { [slot: string]: string } = {};
        for (const name of slots) result[name] = this.Skeleton?.findSlot(name)?.getAttachment()?.name || '';
        return result;
    }

    async ShowEquipment(equipmentName: string, isEquipment: boolean = true): Promise<void> {
        if (!equipmentName || !this.Skeleton?._skeleton) return;
        if (!this.CanShowEquipment(equipmentName, isEquipment)) return;

        const gunType = this.GetGunSlotName(equipmentName);
        if (gunType) {

            ZRSJZ_WEAPONRY_TYPE.forEach((_weaponNames, otherGunType) => {
                this.Skeleton.findSlot(otherGunType)?.setAttachment(null);
            });

            if (isEquipment) {
                this.WeaponryName = equipmentName;
                this.Skeleton.findSlot('dao')?.setAttachment(null);
                this.Skeleton.setAttachment(gunType, gunType);
                const weaponSkin = ZRSJZ_AccountService.GetWeaponSkin(equipmentName);
                const texture: Texture2D = await ZRSJZ_UIManager.Instance.GetWeaponryUI(weaponSkin);
                if (isValid(this, true) && isValid(this.Skeleton, true) && texture && this.WeaponryName === equipmentName) {
                    this.Skeleton.setSlotTexture(gunType, texture, true);
                }
            } else {
                this.WeaponryName = "";
                const knifeID = this.GetEquippedWeaponryIDs()[4];
                const knifeName = ZRSJZ_GameData.Instance.PropData[knifeID]?.Name;
                if (knifeName) this.Skeleton.setAttachment('dao', knifeName);
            }
            return;
        }

        const slotName = this.FindAttachmentSlotName(equipmentName);
        const targetSlot = slotName ? this.Skeleton.findSlot(slotName) : null;
        if (slotName && targetSlot) {

            if (slotName === 'dao' && isEquipment) {
                this.WeaponryName = equipmentName;
                ZRSJZ_WEAPONRY_TYPE.forEach((_weaponNames, gunType) => {
                    this.Skeleton.findSlot(gunType)?.setAttachment(null);
                });
            }

            if (slotName === 't') {
                const headsets = ZRSJZ_SKIN_CONFIG.get(this.SkinName)?.Headset;
                headsets?.filter(Boolean).forEach(headsetName => {
                    const headsetSlotName = this.FindAttachmentSlotName(headsetName);
                    const headsetSlot = headsetSlotName ? this.Skeleton.findSlot(headsetSlotName) : null;
                    if (!headsetSlotName || !headsetSlot) return;

                    if (isEquipment) headsetSlot.setAttachment(null);
                    else this.Skeleton.setAttachment(headsetSlotName, headsetName);
                });
            }

            targetSlot.setAttachment(null);
            if (isEquipment) this.Skeleton.setAttachment(slotName, equipmentName);
            return;
        }

        console.error(`[ZRSJZ_PlayerSpine] Equipment attachment not found: ${equipmentName}`);
    }
}
