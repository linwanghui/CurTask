import { ZRSJZ_WEAPON_SKIN } from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";
import { ZRSJZ_PlayerSwitchButton } from "../UI/ZRSJZ_PlayerSwitchButton";
import { ZRSJZ_InventoryService } from "./ZRSJZ_InventoryService";

/** 账号、签到、角色与皮肤相关业务。存档字段本身仍由 ZRSJZ_GameData 持有。 */
export class ZRSJZ_AccountService {
    public static GetSignInClaimedCount(): number {
        return Math.max(0, Math.min(7, Math.floor(ZRSJZ_GameData.Instance.SignInClaimedCount ?? 0)));
    }

    public static IsSignInCompleted(): boolean {
        return this.GetSignInClaimedCount() >= 7;
    }

    public static CanClaimSignInReward(): boolean {
        const data = ZRSJZ_GameData.Instance;
        return !this.IsSignInCompleted() && data.SignInLastClaimDate !== this.GetLocalDateKey();
    }

    /** 领取下一天签到奖励，成功时返回 0～6 的奖励索引。 */
    public static ClaimSignInReward(): number {
        if (!this.CanClaimSignInReward()) return -1;
        const data = ZRSJZ_GameData.Instance;
        const dayIndex = this.GetSignInClaimedCount();
        data.SignInClaimedCount = dayIndex + 1;
        data.SignInLastClaimDate = this.GetLocalDateKey();
        ZRSJZ_GameData.SaveData();
        return dayIndex;
    }

    public static ChangeGold(gold: number): void {
        ZRSJZ_GameData.Instance.Gold += gold;
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        ZRSJZ_GameData.SaveData();
    }

    public static AddSkin(role: string, skin: string): void {
        const data = ZRSJZ_GameData.Instance;
        data.HaveSkin.push(skin);
        if (role === skin) {
            data.HaveRole.push(role);
            this.SetCurSkin(role, skin);
        } else {
            ZRSJZ_GameData.SaveData();
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
        }
    }

    public static SetCurSkin(role: string, skin: string): void {
        const data = ZRSJZ_GameData.Instance;
        const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer === "1p" ? 0 : 1;
        data.CurRole[roleIndex] = role;
        data.CurSkin[roleIndex] = skin;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHANGE_SKIN, roleIndex);
    }

    public static HasWeaponSkin(weaponName: string, skinName: string): boolean {
        const skins = ZRSJZ_WEAPON_SKIN.get(weaponName);
        if (!skins?.some(skin => skin.Name === skinName)) return false;
        return skinName === skins[0].Name || (ZRSJZ_GameData.Instance.HaveWeaponSkin ?? []).includes(skinName);
    }

    public static AddWeaponSkin(weaponName: string, skinName: string): boolean {
        if (!ZRSJZ_WEAPON_SKIN.get(weaponName)?.some(skin => skin.Name === skinName)) return false;
        const data = ZRSJZ_GameData.Instance;
        if (!data.HaveWeaponSkin) data.HaveWeaponSkin = [];
        if (!data.HaveWeaponSkin.includes(skinName)) {
            data.HaveWeaponSkin.push(skinName);
            ZRSJZ_GameData.SaveData();
        }
        return true;
    }

    public static GetWeaponSkin(weaponName: string): string {
        const skins = ZRSJZ_WEAPON_SKIN.get(weaponName);
        if (!skins?.length) return weaponName;
        const currentSkin = ZRSJZ_GameData.Instance.CurWeaponSkin?.[weaponName];
        return currentSkin && this.HasWeaponSkin(weaponName, currentSkin) ? currentSkin : skins[0].Name;
    }

    public static SetWeaponSkin(weaponName: string, skinName: string): boolean {
        if (!this.HasWeaponSkin(weaponName, skinName)) return false;
        const data = ZRSJZ_GameData.Instance;
        if (!data.CurWeaponSkin) data.CurWeaponSkin = {};
        if (this.GetWeaponSkin(weaponName) === skinName) return true;
        data.CurWeaponSkin[weaponName] = skinName;
        ZRSJZ_GameData.SaveData();
        const equippedGunName = data.PropData?.[ZRSJZ_InventoryService.GetWeaponryIDs()[0]]?.Name;
        if (equippedGunName === weaponName) {
            ZRSJZ_EventManager.EmitPersist(
                ZRSJZ_MyEvent.ZRSJZ_SHOW_EQUIPMENT,
                weaponName,
                true,
                ZRSJZ_InventoryService.GetActivePlayerIndex(),
            );
        }
        return true;
    }

    private static GetLocalDateKey(): string {
        const now = new Date();
        return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
    }
}
