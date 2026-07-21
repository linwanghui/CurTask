import { _decorator, Component, Node } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PlayerSwitchButton } from '../UI/ZRSJZ_PlayerSwitchButton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ANI, ZRSJZ_SKIN_CONFIG } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_WarehouseSkeleton')
export class ZRSJZ_WarehouseSkeleton extends ZRSJZ_Skeleton {

    protected onEnable(): void {
        this.ShowSkin();
        this.ShowAllEquipment();
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.ShowEquipment, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.ShowEquipment, this);
    }

    ShowSkin() {
        this.SetSkin(ZRSJZ_GameData.Instance.CurSkin[ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1]);
    }

    ShowAllEquipment() {
        for (let i = ZRSJZ_GameData.Instance.WeaponryID.length - 1; i >= 0; i--) {
            if (ZRSJZ_GameData.Instance.WeaponryID[i]) {
                this.ShowEquipment(ZRSJZ_GameData.Instance.PropData[ZRSJZ_GameData.Instance.WeaponryID[i]].Name);
            }
        }
    }

}


