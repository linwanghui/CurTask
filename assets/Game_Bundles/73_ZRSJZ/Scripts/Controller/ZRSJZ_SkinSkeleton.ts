import { _decorator, Component, Node } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_ANI } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_SkinSkeleton')
export class ZRSJZ_SkinSkeleton extends ZRSJZ_Skeleton {

    SetSkin(skinName: string) {
        super.SetSkin(skinName);
        this.ShowEquipment("突击步枪");
        const ani = Math.random() > 0.5 ? ZRSJZ_ANI.Appear1 : ZRSJZ_ANI.Appear2;
        this.PlayAni(ani, false, () => {
            this.PlayAni(ZRSJZ_ANI.Idle_Q)
        })
    }
}


