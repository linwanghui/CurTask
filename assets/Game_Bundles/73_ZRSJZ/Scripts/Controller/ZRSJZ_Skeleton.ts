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

    protected onLoad(): void {
        this.Skeleton = this.getComponent(sp.Skeleton);
    }

    SetSkin(skinName: string) {
        const skinConfig = ZRSJZ_SKIN_CONFIG.get(skinName);
        if (!skinConfig) {
            return;
        }

        this.SkinName = skinName;
        this.Skeleton.setSkin(skinConfig.Skin);
    }

    PlayAni(aniName: string, loop: boolean = true, cb: Function = null) {
        this.AniName = aniName;
        this.Skeleton.setAnimation(0, aniName, loop);
        this.Skeleton.setCompleteListener(() => {
            if (cb) cb();
        });
    }


    //显示装备
    async ShowEquipment(equipmentName: string, isEquipment: boolean = true) {
        if (!equipmentName || !this.Skeleton?._skeleton) {
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
                        const weaponSkin = ZRSJZ_GameData.Instance.GetWeaponSkin(equipmentName);
                        ZRSJZ_UIManager.Instance.GetWeaponryUI(weaponSkin).then(texture => {
                            if (!texture) {
                                console.error(`武器纹理不存在: ${weaponSkin}`);
                                return;
                            }
                            this.Skeleton.findSlot('dao').setAttachment(null);
                            this.Skeleton.setAttachment(key, key);
                            this.Skeleton.setSlotTexture(key, texture, true);
                        });
                        this.PlayAni(ZRSJZ_ANI.Idle_Q);
                    } else {
                        this.Skeleton.findSlot(key)?.setAttachment(null);
                        this.Skeleton.setAttachment('dao', ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[4]].Name);
                        console.error(this.node.parent.name);
                        this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => {
                            this.PlayAni(ZRSJZ_ANI.Idle_D1);
                        })
                    }
                } else {
                    this.Skeleton.findSlot(key)?.setAttachment(null);
                }
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

            // The gun and knife use different slots, so hide the other weapon slot.
            if (slotName === 'dao') {
                //装备
                if (isEquipment) {
                    for (let key of ZRSJZ_WEAPONRY_TYPE.keys()) {
                        this.Skeleton.findSlot(key)?.setAttachment(null);
                    }
                    this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => {
                        this.PlayAni(ZRSJZ_ANI.Idle_D1);
                    })
                }
            } else if (slotName === 't') {
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

    // //显示装备
    // ShowEquipment(equipmentName: string, isEquipment: boolean = true) {
    //     if (!equipmentName || !this.Skeleton?._skeleton) {
    //         return;
    //     }

    //     const skeleton = this.Skeleton._skeleton;

    //     // Find the owning slot by attachment name instead of hard-coding slot names.
    //     for (let slotIndex = 0; slotIndex < skeleton.slots.length; slotIndex++) {
    //         if (!skeleton.getAttachment(slotIndex, equipmentName)) {
    //             continue;
    //         }

    //         const targetSlot = skeleton.slots[slotIndex];
    //         const slotName = targetSlot.data.name;

    //         // The gun and knife use different slots, so hide the other weapon slot.
    //         if (slotName === '狙击枪') {
    //             //装备
    //             if (isEquipment) {
    //                 const otherWeaponSlot = skeleton.findSlot('dao');
    //                 otherWeaponSlot?.setAttachment(null);
    //                 this.PlayAni(ZRSJZ_ANI.Idle_Q);
    //             } else {
    //                 //卸下装备
    //                 skeleton.findSlot('wq1')?.setAttachment(null);
    //                 this.Skeleton.setAttachment('dao', ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[4]].Name);
    //                 this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => {
    //                     this.PlayAni(ZRSJZ_ANI.Idle_D1);
    //                 })
    //                 return;
    //             }
    //         } else if (slotName === 'dao') {
    //             //装备
    //             if (isEquipment) {
    //                 const otherWeaponSlot = skeleton.findSlot('wq1');
    //                 otherWeaponSlot?.setAttachment(null);
    //                 this.PlayAni(ZRSJZ_ANI.Idle_D2, false, () => {
    //                     this.PlayAni(ZRSJZ_ANI.Idle_D1);
    //                 })
    //             }
    //         } else if (slotName === 't') {
    //             const headsets = ZRSJZ_SKIN_CONFIG.get(this.SkinName)?.Headset;
    //             headsets?.filter(headsetName => !!headsetName).forEach(headsetName => {
    //                 for (let headsetSlotIndex = 0; headsetSlotIndex < skeleton.slots.length; headsetSlotIndex++) {
    //                     if (!skeleton.getAttachment(headsetSlotIndex, headsetName)) {
    //                         continue;
    //                     }

    //                     const headsetSlot = skeleton.slots[headsetSlotIndex];

    //                     if (isEquipment) {
    //                         // Wearing a helmet hides the accessories on the head.
    //                         headsetSlot.setAttachment(null);
    //                     } else {
    //                         // Removing the helmet restores the accessories for the current skin.
    //                         this.Skeleton.setAttachment(headsetSlot.data.name, headsetName);
    //                     }
    //                     break;
    //                 }
    //             });
    //         }

    //         targetSlot.setAttachment(null);
    //         if (isEquipment) {
    //             this.Skeleton.setAttachment(slotName, equipmentName);
    //         }
    //         return;
    //     }
    //     console.error(`[ZRSJZ_PlayerSpine] Equipment attachment not found: ${equipmentName}`);

    // }

}


