import { _decorator } from 'cc';
import { ZRSJZ_Skeleton } from './ZRSJZ_Skeleton';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PlayerSwitchButton } from '../UI/ZRSJZ_PlayerSwitchButton';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ANI, ZRSJZ_KNIFE, ZRSJZ_WEAPONRY_TYPE } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_WarehouseSkeleton')
export class ZRSJZ_WarehouseSkeleton extends ZRSJZ_Skeleton {

    private _weaponType: "枪" | "刀" = "枪";

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
        this._weaponType = ZRSJZ_InventoryService.GetWeaponryIDs()[0] ? "枪" : "刀";
        this.ShowAllEquipment();
        this.RefreshWeaponAnimation();
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
        void this.ShowEquipment(equipmentName, isEquipment);
        const changedType = this.GetWeaponType(equipmentName);
        if (changedType && isEquipment) {
            this._weaponType = changedType;
        } else if (changedType === this._weaponType && !isEquipment) {
            const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs();
            this._weaponType = weaponryIDs[0] ? "枪" : "刀";
        }
        this.RefreshWeaponAnimation();
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

    private RefreshWeaponAnimation(): void {
        const weaponryIDs = ZRSJZ_InventoryService.GetWeaponryIDs();
        if (this._weaponType === "枪" && !weaponryIDs[0]) this._weaponType = "刀";
        if (this._weaponType === "刀" && !weaponryIDs[4] && weaponryIDs[0]) this._weaponType = "枪";
        this.PlayAni(this._weaponType === "枪" ? ZRSJZ_ANI.Idle_Q : ZRSJZ_ANI.Idle_D1);
    }

    private GetWeaponType(equipmentName: string): "枪" | "刀" | null {
        for (const weaponNames of ZRSJZ_WEAPONRY_TYPE.values()) {
            if (weaponNames.includes(equipmentName)) return "枪";
        }
        return ZRSJZ_KNIFE.includes(equipmentName) ? "刀" : null;
    }

}


