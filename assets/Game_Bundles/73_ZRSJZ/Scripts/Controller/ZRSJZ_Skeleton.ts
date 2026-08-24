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

    /** 子类可按自己的玩家索引返回装备栏。 */
    protected GetEquippedWeaponryIDs(): string[] {
        return ZRSJZ_GameData.Instance.WeaponryID;
    }

    protected onLoad(): void {
        this.Skeleton = this.getComponent(sp.Skeleton);
        if (!this.Skeleton) {
            console.error(`[${this.constructor.name}] 当前节点缺少 sp.Skeleton 组件`);
        }
    }

    SetSkin(skinName: string): void {
        const skinConfig = ZRSJZ_SKIN_CONFIG.get(skinName);
        if (!skinConfig || !this.Skeleton) return;

        this.SkinName = skinName;
        this.Skeleton.setSkin(skinConfig.Skin);
    }

    PlayAni(aniName: string, loop: boolean = true, cb: Function = null): void {
        if (!this.Skeleton) return;
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        this.Skeleton.setCompleteListener(() => {
            if (cb) cb();
        });
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

        const skeleton = this.Skeleton._skeleton;
        for (let slotIndex = 0; slotIndex < skeleton.slots.length; slotIndex++) {
            if (!skeleton.getAttachment(slotIndex, equipmentName)) continue;

            const targetSlot = skeleton.slots[slotIndex];
            const slotName = targetSlot.data.name;

            if (slotName === 'dao' && isEquipment) {
                this.WeaponryName = equipmentName;
                for (const gunType of ZRSJZ_WEAPONRY_TYPE.keys()) {
                    this.Skeleton.findSlot(gunType)?.setAttachment(null);
                }
            }

            if (slotName === 't') {
                const headsets = ZRSJZ_SKIN_CONFIG.get(this.SkinName)?.Headset;
                headsets?.filter(Boolean).forEach(headsetName => {
                    for (let headsetSlotIndex = 0; headsetSlotIndex < skeleton.slots.length; headsetSlotIndex++) {
                        if (!skeleton.getAttachment(headsetSlotIndex, headsetName)) continue;
                        const headsetSlot = skeleton.slots[headsetSlotIndex];
                        if (isEquipment) headsetSlot.setAttachment(null);
                        else this.Skeleton.setAttachment(headsetSlot.data.name, headsetName);
                        break;
                    }
                });
            }

            targetSlot.setAttachment(null);
            if (isEquipment) this.Skeleton.setAttachment(slotName, equipmentName);
            return;
        }

        console.error(`[ZRSJZ_PlayerSpine] Equipment attachment not found: ${equipmentName}`);
    }
}
