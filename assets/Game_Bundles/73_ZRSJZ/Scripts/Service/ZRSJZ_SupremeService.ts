import type { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { HasSupremeAccess } from './ZRSJZ_PurchaseState';
import { ZRSJZ_GRADE_MAX_LEVEL, ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPON_SKIN,
    ZRSJZ_AVATAR_FRAME_UNLOCK, ZRSJZ_TITLE_CONFIG, ZRSJZ_ACTION_CONFIG, ZRSJZ_INVENTORY, ZRSJZ_INVENTORY_CONFIG,
    ZRSJZ_PET_CONFIG, ZRSJZ_PET_GENE_CONFIG, ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_QUALITY,
    ZRSJZ_ACHIEVEMENT_CONFIG, ZRSJZ_MAP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_SIDE_TASK_LINES } from '../ZRSJZ_TaskLines';
import { CreateBattlePassState, ZRSJZ_BATTLE_PASS_CONFIG } from '../ZRSJZ_BattlePassConfig';
import { ZRSJZ_ENHANCEMENT_MAX_LEVEL, ZRSJZ_ENHANCEMENT_NODES } from '../ZRSJZ_EnhancementConfig';
import { GetBoxroomAttribute, GetBoxroomBonusBasisPoint, ZRSJZ_BOXROOM_LEVEL_COST } from '../ZRSJZ_BoxroomConfig';

/** 只合并权限与完成进度，不创建物品、不重复发任务/成就/战令奖励。 */
export class ZRSJZ_SupremeService {
    public static Apply(data: ZRSJZ_GameData, taskBackup?: Pick<ZRSJZ_GameData, 'MainTaskComplete' | 'TaskLines'>): boolean {
        if (!HasSupremeAccess(data)) return false;
        const before = JSON.stringify(data);
        const union = <T>(owned: T[], all: Iterable<T>): T[] => Array.from(new Set([...(owned ?? []), ...all]));
        data.InfiniteGold = true;
        data.AllPermissionsPending = false;
        if (data.SupremeEntitlementVersion === 1 && taskBackup) {
            // v1把完成和领奖合并写入；仅从购买已存在、尚未应用v1的可靠备份恢复。
            data.MainTaskComplete = [...taskBackup.MainTaskComplete];
            data.TaskLines = JSON.parse(JSON.stringify(taskBackup.TaskLines ?? {}));
        }
        data.SupremeEntitlementVersion = 3;
        data.SupremeTaskRewardsClaimed ??= [];
        data.UnlockedActions = union(data.UnlockedActions, ZRSJZ_ACTION_CONFIG.map(action => action.Name));
        data.Grade = ZRSJZ_GRADE_MAX_LEVEL;
        data.CurExp = 0; data.PendingExperience = 0;
        data.HaveRole = union(data.HaveRole, ZRSJZ_ROLE_CONFIG.keys());
        data.HaveSkin = union(data.HaveSkin, ZRSJZ_SKIN_CONFIG.keys());
        data.HaveWeaponSkin = union(data.HaveWeaponSkin,
            Array.from(ZRSJZ_WEAPON_SKIN.values()).flatMap(skins => skins.map(skin => skin.Name)));
        data.OwnedAvatarFrames = union(data.OwnedAvatarFrames, Object.keys(ZRSJZ_AVATAR_FRAME_UNLOCK));
        data.OwnedTitles = union(data.OwnedTitles, ZRSJZ_TITLE_CONFIG.map(title => title.name));

        // 只完成任务条件，不写领奖记录，也不预先发放扩容奖励。
        data.CurMainTask = null; data.NewMainTask = '';
        data.TaskLines ??= {};
        for (const line of ZRSJZ_SIDE_TASK_LINES) {
            data.TaskLines[line.ID] ??= { index: 0, count: 0, accepted: false };
            data.UnlockedWarehouses = union(data.UnlockedWarehouses, [line.Warehouse]);
        }

        if (data.SupremeWarehouseExpansionGranted !== true) {
            data.InventoryRow ??= {};
            for (const inventory of [ZRSJZ_INVENTORY.仓库_全部, ZRSJZ_INVENTORY.仓库_装备,
                ZRSJZ_INVENTORY.仓库_武器, ZRSJZ_INVENTORY.仓库_弹药, ZRSJZ_INVENTORY.仓库_物品]) {
                const base = ZRSJZ_INVENTORY_CONFIG.get(inventory)?.Row ?? 0;
                data.InventoryRow[inventory] = Math.max(base, data.InventoryRow[inventory] ?? base) + 2;
                data.UnlockedWarehouses = union(data.UnlockedWarehouses, [inventory]);
            }
            data.SupremeWarehouseExpansionGranted = true;
        }

        const petMax = Math.max(0, ...ZRSJZ_PET_GENE_CONFIG.map(gene => gene.Level));
        data.PetData ??= {};
        for (const [name, pet] of ZRSJZ_PET_CONFIG) {
            const existing = data.PetData[name];
            data.PetData[name] = { ...existing, Level: petMax,
                Skins: union(existing?.Skins, pet.PetSkins), VideoSkillUnlocked: true };
        }
        data.BattlePass ??= CreateBattlePassState();
        data.BattlePass.advancedUnlocked = true;
        data.BattlePass.exp = ZRSJZ_BATTLE_PASS_CONFIG.maxLevel * ZRSJZ_BATTLE_PASS_CONFIG.expPerLevel;
        for (const period of ['daily', 'weekly'] as const) {
            const progress = data.BattlePass[period]?.progress;
            if (progress) for (const task of ZRSJZ_BATTLE_PASS_CONFIG[period]) {
                if (data.BattlePass[period].taskIds.includes(task.id)) progress[task.id] = task.target;
            }
        }
        data.AchievementCompleted = union(data.AchievementCompleted, ZRSJZ_ACHIEVEMENT_CONFIG.map(item => item.id));
        data.AchievementProgress ??= {};
        for (const item of ZRSJZ_ACHIEVEMENT_CONFIG) {
            data.AchievementProgress[item.id] = Math.max(item.target, data.AchievementProgress[item.id] ?? 0);
        }
        data.EnhancementLevel = ZRSJZ_ENHANCEMENT_MAX_LEVEL;
        data.EnhancementSpecials = union(data.EnhancementSpecials,
            ZRSJZ_ENHANCEMENT_NODES.filter(node => node.Special).map(node => node.ID));

        data.BoxroomPropLevel ??= {};
        const props = Array.from(ZRSJZ_PROP_CONFIG.values())
            .filter(prop => prop.PropType === '物品' && prop.Quality === ZRSJZ_PROP_QUALITY.红色);
        const maxCollectionLevel = ZRSJZ_BOXROOM_LEVEL_COST.length;
        const bonus: Record<string, number> = { '生命': 0, '近战伤害': 0, '枪械伤害': 0 };
        for (const prop of props) {
            data.BoxroomPropLevel[prop.Name] = maxCollectionLevel;
            bonus[GetBoxroomAttribute(prop.Name)] += GetBoxroomBonusBasisPoint(maxCollectionLevel, props.length);
        }
        data.BoxroomAttributeBonusBasisPoint = bonus;
        data.BossExtractionCompleted ??= {};
        for (const map of ZRSJZ_MAP_CONFIG.keys()) data.BossExtractionCompleted[map] = true;
        return before !== JSON.stringify(data);
    }
}
