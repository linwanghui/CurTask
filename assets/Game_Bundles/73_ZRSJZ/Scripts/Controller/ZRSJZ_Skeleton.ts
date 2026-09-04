import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, Component, sp, Texture2D } from 'cc';
import { ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
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
    }

    SetSkin(skinName: string): void {
        const skinConfig = ZRSJZ_SKIN_CONFIG.get(skinName);
        if (!skinConfig || !this.Skeleton) return;

        this.SkinName = skinName;
        this._activeSpineSkinName = skinConfig.Skin;
        this.Skeleton.setSkin(skinConfig.Skin);
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

    async ShowEquipment(equipmentName: string, isEquipment: boolean = true): Promise<void> {
        if (!equipmentName || !this.Skeleton?._skeleton) return;

        for (const [gunType, weaponNames] of ZRSJZ_WEAPONRY_TYPE) {
            if (!weaponNames.includes(equipmentName)) continue;

            for (const otherGunType of ZRSJZ_WEAPONRY_TYPE.keys()) {
                this.Skeleton.findSlot(otherGunType)?.setAttachment(null);
            }

            if (isEquipment) {
                this.WeaponryName = equipmentName;
                this.Skeleton.findSlot('dao')?.setAttachment(null);
                this.Skeleton.setAttachment(gunType, gunType);
                const weaponSkin = ZRSJZ_AccountService.GetWeaponSkin(equipmentName);
                const texture: Texture2D = await ZRSJZ_UIManager.Instance.GetWeaponryUI(weaponSkin);
                if (texture && this.WeaponryName === equipmentName) {
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
                for (const gunType of ZRSJZ_WEAPONRY_TYPE.keys()) {
                    this.Skeleton.findSlot(gunType)?.setAttachment(null);
                }
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
