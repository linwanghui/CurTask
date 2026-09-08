import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_PET_CONFIG, ZRSJZ_PET_SKIN_CONFIG, ZRSJZ_PROP_CONFIG } from "../ZRSJZ_Constant";
import { ZRSJZ_InventoryService } from "./ZRSJZ_InventoryService";
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from "../Manager/ZRSJZ_EventManager";

export class ZRSJZ_PetService {
    public static AddPet(petName: string): boolean {
        const config = ZRSJZ_PET_CONFIG.get(petName);
        const data = ZRSJZ_GameData.Instance;
        if (!data || !config || this.CheckPet(petName)) return false;
        if (!data.PetData) data.PetData = {};
        data.PetData[petName] = { Skins: [config.PetSkins[0] ?? petName], Level: 1 };
        ZRSJZ_GameData.SaveData();
        return true;
    }

    public static GetPetGrade(petName: string): number {
        return this.CheckPet(petName) ? ZRSJZ_GameData.Instance.PetData[petName].Level : 0;
    }

    public static CheckPet(petName: string): boolean {
        const pets = ZRSJZ_GameData.Instance?.PetData;
        return !!pets && Object.prototype.hasOwnProperty.call(pets, petName) && !!pets[petName];
    }

    public static CheckPetSkin(petName: string, skinName: string): boolean {
        return this.CheckPet(petName) && ZRSJZ_GameData.Instance.PetData[petName].Skins.includes(skinName);
    }

    public static SetBattlePet(petName: string): boolean {
        if (!ZRSJZ_PET_CONFIG.has(petName) || !this.CheckPet(petName)) return false;
        const data = ZRSJZ_GameData.Instance;
        if (data.CurPet === petName) return true;
        if (this.CheckPet(data.CurPet)) {
            data.PetData[data.CurPet].CurrentSkin = this.GetCurrentSkin(data.CurPet);
        }
        const skinName = this.GetCurrentSkin(petName);
        data.CurPet = petName;
        data.CurPetSkin = skinName;
        data.PetData[petName].CurrentSkin = skinName;
        ZRSJZ_GameData.SaveData();
        return true;
    }

    public static GetCurrentSkin(petName: string): string {
        if (!this.CheckPet(petName)) return "";
        const data = ZRSJZ_GameData.Instance;
        const saved = data.PetData[petName].CurrentSkin
            || (data.CurPet === petName ? data.CurPetSkin : "");
        const skins = ZRSJZ_PET_CONFIG.get(petName)?.PetSkins ?? [];
        if (skins.includes(saved) && this.CheckPetSkin(petName, saved)) return saved;
        return skins.find(skin => this.CheckPetSkin(petName, skin)) ?? "";
    }

    public static UseSkin(petName: string, skinName: string): boolean {
        if (!ZRSJZ_PET_CONFIG.get(petName)?.PetSkins.includes(skinName)
            || !this.CheckPetSkin(petName, skinName)) return false;
        const data = ZRSJZ_GameData.Instance;
        data.PetData[petName].CurrentSkin = skinName;
        if (data.CurPet === petName) data.CurPetSkin = skinName;
        ZRSJZ_GameData.SaveData();
        return true;
    }

    public static GetSkinUnlock(skinName: string): { resource: string; label: string; count: number } {
        const condition = ZRSJZ_PET_SKIN_CONFIG.get(skinName)?.PetSkinUnlock ?? "";
        if (!condition) return { resource: "", label: "免费获取", count: 0 };
        const separator = condition.indexOf("x");
        const resource = (separator < 0 ? condition : condition.slice(0, separator)).trim();
        const label = separator < 0 ? "" : condition.slice(separator + 1).trim();
        return { resource, label, count: Number(label) };
    }

    public static TryUnlockSkin(petName: string, skinName: string, videoRewarded: boolean = false): string {
        if (!this.CheckPet(petName)) return "请先解锁宠物";
        if (!ZRSJZ_PET_CONFIG.get(petName)?.PetSkins.includes(skinName)
            || !ZRSJZ_PET_SKIN_CONFIG.has(skinName)) return "宠物皮肤配置不存在";
        if (this.CheckPetSkin(petName, skinName)) return "";
        const { resource, count } = this.GetSkinUnlock(skinName);
        const data = ZRSJZ_GameData.Instance;
        if (resource === "视频") {
            if (!videoRewarded) return "请完整观看视频后解锁";
        } else if (resource) {
            if (!Number.isSafeInteger(count) || count <= 0) return "皮肤解锁数量配置不正确";
            if (resource === "金币") {
                if (data.Gold < count) return "金币不足";
                data.Gold -= count;
            } else {
                if (!ZRSJZ_PROP_CONFIG.has(resource)) return "皮肤解锁道具配置不存在";
                if (!ZRSJZ_InventoryService.ConsumeProp(resource, count)) return `${resource}不足`;
            }
        }
        data.PetData[petName].Skins.push(skinName);
        ZRSJZ_GameData.SaveData();
        if (resource === "金币") ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        return "";
    }

    public static GetUnlockLabel(petName: string): string {
        const config = ZRSJZ_PET_CONFIG.get(petName);
        if (!config) return "无法解锁";
        if (config.PetUnlock === "金币解锁") return `${config.PetUnlockValue ?? 0}金币解锁`;
        if (config.PetUnlock === "等级解锁") return `${config.PetUnlockValue ?? 0}级解锁`;
        return config.PetUnlock || "免费解锁";
    }

    /** 视频奖励只能由广告成功回调传入；条件不足和未知配置均不发放宠物。 */
    public static TryUnlockPet(petName: string, videoRewarded: boolean = false): string {
        const config = ZRSJZ_PET_CONFIG.get(petName);
        const data = ZRSJZ_GameData.Instance;
        if (!config || !data) return "宠物配置不存在";
        if (this.CheckPet(petName)) return "";
        let cost = 0;
        switch (config.PetUnlock) {
            case "视频解锁":
                if (!videoRewarded) return "请完整观看视频后解锁";
                break;
            case "金币解锁":
            case "等级解锁": {
                const value = config.PetUnlockValue;
                if (!Number.isInteger(value) || value <= 0) return "宠物解锁条件配置不完整";
                if (config.PetUnlock === "金币解锁") {
                    if (data.Gold < value) return "金币不足";
                    cost = value;
                } else if (data.Grade < value) return `账号达到${value}级后解锁`;
                break;
            }
            case "":
            case "免费解锁":
                break;
            default:
                return `尚未满足解锁条件：${config.PetUnlock}`;
        }
        // 扣费与宠物写入同一次存档，重复回调不会重复扣费或重置等级。
        data.Gold -= cost;
        this.AddPet(petName);
        if (cost > 0) ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        return "";
    }
}
