import { _decorator, Component, Node } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PlayerSwitchButton } from '../UI/ZRSJZ_PlayerSwitchButton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ANI, ZRSJZ_SKIN_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_WarehouseSkeleton')
export class ZRSJZ_WarehouseSkeleton extends ZRSJZ_Skeleton {

    protected GetEquippedWeaponryIDs(): string[] {
        return ZRSJZ_InventoryService.GetWeaponryIDs();
    }

    protected onEnable(): void {
        this.RefreshPlayerDisplay();
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_LOADOUT_PLAYER_CHANGE, this.RefreshPlayerDisplay, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT, this.OnEquipmentChanged, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_LOADOUT_PLAYER_CHANGE, this.RefreshPlayerDisplay, this);
    }

    private RefreshPlayerDisplay(): void {
        this.ShowSkin();
        this.Skeleton?._skeleton?.setSlotsToSetupPose();
        this.HandSkeleton?._skeleton?.setSlotsToSetupPose();
        this.ShowAllEquipment();
    }

    private OnEquipmentChanged(
        equipmentName: string,
        isEquipment: boolean = true,
        playerIndex?: number,
    ): void {
        if (
            playerIndex !== undefined
            && playerIndex !== ZRSJZ_InventoryService.GetActivePlayerIndex()
        ) return;
        this.ShowEquipment(equipmentName, isEquipment);
    }

    ShowSkin() {
        this.SetSkin(ZRSJZ_GameData.Instance.CurSkin[ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1]);
    }

    ShowAllEquipment() {
        const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs();
        for (let i = weaponryIDs.length - 1; i >= 0; i--) {
            const prop = ZRSJZ_GameData.Instance.PropData[weaponryIDs[i]];
            if (prop) this.ShowEquipment(prop.Name);
        }
    }

}


