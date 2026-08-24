import { _decorator } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_ANI, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
const { ccclass } = _decorator;

/** 皮肤预览同样使用一套完整 Spine。 */
@ccclass('ZRSJZ_SkinSkeleton')
export class ZRSJZ_SkinSkeleton extends ZRSJZ_Skeleton {

    SetSkin(skinName: string): void {
        super.SetSkin(skinName);
        void this.ShowEquipment("DX9-冲锋枪");
    }

    async ShowEquipment(equipmentName: string, isEquipment: boolean = true): Promise<void> {
        await super.ShowEquipment(equipmentName, isEquipment);
        const isGun = Array.from(ZRSJZ_WEAPONRY_TYPE.values())
            .some(weaponNames => weaponNames.includes(equipmentName));
        if (!isGun || !isEquipment) return;

        const appearAnimation = Math.random() > 0.5 ? ZRSJZ_ANI.Appear1 : ZRSJZ_ANI.Appear2;
        this.PlayAni(appearAnimation, false, () => this.PlayAni(ZRSJZ_ANI.Idle_Q));
    }
}
