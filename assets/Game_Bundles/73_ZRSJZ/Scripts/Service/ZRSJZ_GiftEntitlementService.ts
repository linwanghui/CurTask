import type { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_PET_CONFIG } from '../ZRSJZ_Constant';

/** 礼包永久外观权益；恢复旧存档时不重复发金币、道具或充值金额。 */
export class ZRSJZ_GiftEntitlementService {
    public static UnlockAllAppearances(data: ZRSJZ_GameData): boolean {
        const before = JSON.stringify([data.HaveRole, data.HaveSkin, data.PetData]);
        // 构建转换会把 [...map.keys()] 变成 concat(MapIterator)，必须直接遍历 Map。
        const roles = (Array.isArray(data.HaveRole) ? data.HaveRole : []).filter(name => typeof name === 'string' && ZRSJZ_ROLE_CONFIG.has(name));
        const skins = (Array.isArray(data.HaveSkin) ? data.HaveSkin : []).filter(name => typeof name === 'string' && ZRSJZ_SKIN_CONFIG.has(name));
        ZRSJZ_ROLE_CONFIG.forEach((_config, name) => { if (!roles.includes(name)) roles.push(name); });
        ZRSJZ_SKIN_CONFIG.forEach((_config, name) => { if (!skins.includes(name)) skins.push(name); });
        data.HaveRole = Array.from(new Set(roles));
        data.HaveSkin = Array.from(new Set(skins));
        data.PetData ??= {};
        ZRSJZ_PET_CONFIG.forEach((config, name) => {
            const owned = data.PetData[name];
            const petSkins = (Array.isArray(owned?.Skins) ? owned.Skins : []).filter(skin => typeof skin === 'string');
            config.PetSkins.forEach(skin => { if (!petSkins.includes(skin)) petSkins.push(skin); });
            data.PetData[name] = { ...owned, Skins: petSkins, Level: owned?.Level ?? 0 };
        });
        return before !== JSON.stringify([data.HaveRole, data.HaveSkin, data.PetData]);
    }

    public static Restore(data: ZRSJZ_GameData): boolean {
        if (data.PurchasedGifts?.['豪华礼包'] !== true && data.PurchasedGifts?.['至尊礼包'] !== true) return false;
        return this.UnlockAllAppearances(data);
    }
}
