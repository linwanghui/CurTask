import { _decorator, Component, Node, sp } from 'cc';
import { ZRSJZ_ANI, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Skeleton')
export class ZRSJZ_Skeleton extends Component {

    Skeleton: sp.Skeleton = null;
    SkinName: string = null;
    AniName: string = "";
    WeaponryName: string = "";
    HandSkeleton: sp.Skeleton = null;

    protected onLoad(): void {
        this.Skeleton = this.getComponent(sp.Skeleton);
        this.HandSkeleton = this.node.getChildByName("Hand").getComponent(sp.Skeleton);
    }

    SetSkin(skinName: string) {
        const skinConfig = ZRSJZ_SKIN_CONFIG.get(skinName);
        if (!skinConfig) {
            return;
        }

        this.SkinName = skinName;
        this.Skeleton.setSkin(skinConfig.Skin);
        this.HandSkeleton.setSkin(skinConfig.Skin);
    }

    PlayAni(aniName: string, loop: boolean = true, cb: Function = null) {
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        this.HandSkeleton.setAnimation(0, aniName, loop);
        this.Skeleton.setCompleteListener(() => {
            if (cb) cb();
        });
    }


    //显示装备
    async ShowEquipment(equipmentName: string, isEquipment: boolean = true) {
        if (!equipmentName || !this.Skeleton?._skeleton || !this.HandSkeleton?._skeleton) {
            return;
        }

        //枪的穿戴
        let isWeaponry = false;
        for (let key of ZRSJZ_WEAPONRY_TYPE.keys()) {
            if (ZRSJZ_WEAPONRY_TYPE.get(key).includes(equipmentName)) {
                isWeaponry = true;
            }
        }
        if (isWeaponry) {
            for (let key of ZRSJZ_WEAPONRY_TYPE.keys()) {
                const flag = ZRSJZ_WEAPONRY_TYPE.get(key).includes(equipmentName);
                if (flag) {
                    isWeaponry = true;
                    if (isEquipment) {
                        this.WeaponryName = equipmentName;
                        const weaponSkin = ZRSJZ_GameData.Instance.GetWeaponSkin(equipmentName);
                        ZRSJZ_UIManager.Instance.GetWeaponryUI(weaponSkin).then(texture => {
                            if (!texture) {
                                console.error(`武器纹理不存在: ${weaponSkin}`);
                                return;
                            }
                            this.HandSkeleton?.findSlot('dao').setAttachment(null);
                            this.HandSkeleton?.setAttachment(key, key);
                            this.HandSkeleton?.setSlotTexture(key, texture, true);
                        });
                        this.PlayAni(ZRSJZ_ANI.Idle_Q);
                    } else {
                        this.WeaponryName = "";
                        this.HandSkeleton.findSlot(key)?.setAttachment(null);
                        this.HandSkeleton.setAttachment('dao', ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[4]].Name);
                        this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => {
                            this.PlayAni(ZRSJZ_ANI.Idle_D1);
                        })
                    }
                } else {
                    this.HandSkeleton.findSlot(key)?.setAttachment(null);
                }
            }
            return;
        }

        const handSkeleton = this.HandSkeleton._skeleton;
        // Find the owning slot by attachment name instead of hard-coding slot names.
        for (let slotIndex = 0; slotIndex < handSkeleton.slots.length; slotIndex++) {
            if (!handSkeleton.getAttachment(slotIndex, equipmentName)) {
                continue;
            }

            const targetSlot = handSkeleton.slots[slotIndex];
            const slotName = targetSlot.data.name;

            // The gun and knife use different slots, so hide the other weapon slot.
            if (slotName === 'dao') {
                //装备
                if (isEquipment) {
                    this.WeaponryName = equipmentName;
                    for (let key of ZRSJZ_WEAPONRY_TYPE.keys()) {
                        this.HandSkeleton.findSlot(key)?.setAttachment(null);
                    }
                    this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => {
                        this.PlayAni(ZRSJZ_ANI.Idle_D1);
                    })
                }
            }
            targetSlot.setAttachment(null);
            if (isEquipment) {
                this.HandSkeleton.setAttachment(slotName, equipmentName);
            }
            return;
        }


        const skeleton = this.Skeleton._skeleton;
        // Find the owning slot by attachment name instead of hard-coding slot names.
        for (let slotIndex = 0; slotIndex < skeleton.slots.length; slotIndex++) {
            if (!skeleton.getAttachment(slotIndex, equipmentName)) {
                continue;
            }

            const targetSlot = skeleton.slots[slotIndex];
            const slotName = targetSlot.data.name;

            if (slotName === 't') {
                const headsets = ZRSJZ_SKIN_CONFIG.get(this.SkinName)?.Headset;
                headsets?.filter(headsetName => !!headsetName).forEach(headsetName => {
                    for (let headsetSlotIndex = 0; headsetSlotIndex < skeleton.slots.length; headsetSlotIndex++) {
                        if (!skeleton.getAttachment(headsetSlotIndex, headsetName)) {
                            continue;
                        }

                        const headsetSlot = skeleton.slots[headsetSlotIndex];

                        if (isEquipment) {
                            // Wearing a helmet hides the accessories on the head.
                            headsetSlot.setAttachment(null);
                        } else {
                            // Removing the helmet restores the accessories for the current skin.
                            this.Skeleton.setAttachment(headsetSlot.data.name, headsetName);
                        }
                        break;
                    }
                });
            }

            targetSlot.setAttachment(null);
            if (isEquipment) {
                this.Skeleton.setAttachment(slotName, equipmentName);
            }
            return;
        }
        console.error(`[ZRSJZ_PlayerSpine] Equipment attachment not found: ${equipmentName}`);

    }

}


