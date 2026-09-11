import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_FACILITY_UPGRADE_CONFIG, ZRSJZ_UpgradeFacilityName, ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_QUALITY, ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_PET_SKIN_CONFIG, ZRSJZ_PET_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_FORGE_RECIPES } from '../ZRSJZ_ForgeConstant';
import { ZRSJZ_BOXROOM_LEVEL_COST } from '../../../73_ZRSJZ_DLC/Scripts/ZRSJZ_BoxroomConstant';
import { ZRSJZ_BoxroomService } from './ZRSJZ_BoxroomService';
import { ZRSJZ_FacilityService } from './ZRSJZ_FacilityService';
import { ZRSJZ_ForgeService } from './ZRSJZ_ForgeService';
import { ZRSJZ_PetService } from './ZRSJZ_PetService';
import { ZRSJZ_FragmentService } from './ZRSJZ_FragmentService';

/** 主页操作提醒，读取已有进度，不产生领取或解锁行为。 */
export class ZRSJZ_MainReminderService {
    public static GetReminders(dlcReady: boolean): Record<string, boolean> {
        const data = ZRSJZ_GameData.Instance;
        // 与材料消耗接口口径一致，一次汇总库存，避免每个候选项重复遍历。
        const counts = new Map<string, number>();
        for (const prop of Object.values(data.PropData ?? {})) {
            counts.set(prop.Name, (counts.get(prop.Name) ?? 0) + prop.CurCount);
        }
        const count = (name: string) => counts.get(name) ?? 0;
        const collection = dlcReady && Array.from(ZRSJZ_PROP_CONFIG.values()).some(prop => {
            if (prop.PropType !== '物品' || prop.Quality !== ZRSJZ_PROP_QUALITY.红色) return false;
            const cost = ZRSJZ_BOXROOM_LEVEL_COST[ZRSJZ_BoxroomService.GetBoxroomPropLevel(prop.Name)];
            return cost > 0 && count(prop.Name) >= cost;
        });
        const role = Array.from(ZRSJZ_ROLE_CONFIG.values()).some(config =>
            config.Skin.some(name => {
                const skin = ZRSJZ_SKIN_CONFIG.get(name);
                return !(data.HaveSkin ?? []).includes(name) && skin?.UnlockType === '金币'
                    && data.Gold >= skin.UnlockPrice;
            }));
        const upgrade = (Object.keys(ZRSJZ_FACILITY_UPGRADE_CONFIG) as ZRSJZ_UpgradeFacilityName[]).some(name => {
            const next = ZRSJZ_FACILITY_UPGRADE_CONFIG[name].Levels.find(
                level => level.Level === ZRSJZ_FacilityService.GetFacilityLevel(name) + 1);
            return !!next && data.Gold >= next.Gold
                && next.Materials.every(material => count(material.PropName) >= material.Count);
        });
        const task = ZRSJZ_ForgeService.GetTask();
        const forge = task ? ZRSJZ_ForgeService.IsReady(task) : ZRSJZ_FORGE_RECIPES.some(recipe =>
            data.Gold >= recipe.goldCost && recipe.materials.every(material => count(material.name) >= material.count));
        const fragments = ZRSJZ_FragmentService.GetCount();
        const pet = dlcReady && Array.from(ZRSJZ_PET_CONFIG.entries()).some(([name, config]) => {
            if (!ZRSJZ_PetService.CheckPet(name)) {
                const value = config.PetUnlockValue;
                switch (config.PetUnlock) {
                    case '': case '免费解锁': return true;
                    case '金币解锁': return Number.isInteger(value) && value > 0 && data.Gold >= value;
                    case '等级解锁': return Number.isInteger(value) && value > 0 && data.Grade >= value;
                    case '宠物碎片解锁': return Number.isSafeInteger(value) && value > 0 && fragments >= value;
                    default: return false;
                }
            }
            if (!ZRSJZ_PetService.GetGeneLearnError(name, ZRSJZ_PetService.GetPetGrade(name) + 1)) return true;
            return config.PetSkins.some(skin => {
                if (!ZRSJZ_PET_SKIN_CONFIG.has(skin) || ZRSJZ_PetService.CheckPetSkin(name, skin)) return false;
                const unlock = ZRSJZ_PetService.GetSkinUnlock(skin);
                if (!unlock.resource) return true;
                if (!Number.isSafeInteger(unlock.count) || unlock.count <= 0) return false;
                return unlock.resource === '金币' ? data.Gold >= unlock.count
                    : unlock.resource === '宠物碎片' ? fragments >= unlock.count
                    : unlock.resource === '视频' ? false : count(unlock.resource) >= unlock.count;
            });
        });
        return { 收藏室: collection, 角色: role, 强化: upgrade, 宠物: pet, 锻造台: forge };
    }
}

