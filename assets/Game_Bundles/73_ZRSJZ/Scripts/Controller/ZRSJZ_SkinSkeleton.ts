import { _decorator } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_ANI, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
const { ccclass } = _decorator;

/** 皮肤预览同样使用一套完整 Spine。 */
@ccclass('ZRSJZ_SkinSkeleton')
export class ZRSJZ_SkinSkeleton extends ZRSJZ_Skeleton {

    SetSkin(skinName: string): void {
        this.node.active = true;
        super.SetSkin(skinName);
        void this.ShowEquipment("DX9-冲锋枪");
        this.ShowEntranceAnis([...ZRSJZ_SKIN_CONFIG.get(skinName)?.EntranceAnis]);
    }

    async ShowEquipment(equipmentName: string, isEquipment: boolean = true): Promise<void> {
        await super.ShowEquipment(equipmentName, isEquipment);
        const isGun = Array.from(ZRSJZ_WEAPONRY_TYPE.values())
            .some(weaponNames => weaponNames.includes(equipmentName));
        if (!isGun || !isEquipment) return;
    }

    ShowEntranceAnis(anis: string[]) {
        if (anis.length == 0) {
            this.PlayAni(ZRSJZ_ANI.Idle_Q);
        } else {
            this.PlayAni(anis.shift(), false, () => { this.ShowEntranceAnis([...anis]) });
        }
    }
}
