import { _decorator, Component, Node } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_ANI, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_SkinSkeleton')
export class ZRSJZ_SkinSkeleton extends ZRSJZ_Skeleton {

    SetSkin(skinName: string) {
        super.SetSkin(skinName);
        this.ShowEquipment("突击步枪");
    }

    //显示装备
    async ShowEquipment(equipmentName: string, isEquipment: boolean = true) {
        if (!equipmentName || !this.Skeleton?._skeleton) {
            return;
        }
        //枪的穿戴
        let isWeaponry = false;
        for (let key of ZRSJZ_WEAPONRY_TYPE.keys()) {
            const flag = ZRSJZ_WEAPONRY_TYPE.get(key).includes(equipmentName);
            if (flag) {
                isWeaponry = true;
                if (isEquipment) {
                    const texture = await ZRSJZ_UIManager.Instance.GetWeaponryUI(equipmentName);
                    if (!texture) {
                        console.error(`武器纹理不存在: ${equipmentName}`);
                        return;
                    }
                    this.Skeleton.findSlot('dao').setAttachment(null);
                    this.Skeleton.setAttachment(key, key);
                    this.Skeleton.setSlotTexture(key, texture, true);
                    const ani = Math.random() > 0.5 ? ZRSJZ_ANI.Appear1 : ZRSJZ_ANI.Appear2;
                    this.PlayAni(ani, false, () => {
                        this.PlayAni(ZRSJZ_ANI.Idle_Q)
                    })
                }
            } else {
                this.Skeleton.findSlot(key)?.setAttachment(null);
            }
        }


    }
}


