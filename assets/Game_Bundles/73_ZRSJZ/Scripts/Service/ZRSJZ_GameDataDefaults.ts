import {
    ZRSJZ_AMMO_MAX_COUNT,
    ZRSJZ_ACHIEVEMENT_CONFIG,
    ZRSJZ_GridData,
    ZRSJZ_INVENTORY,
    ZRSJZ_MAIN_TASK_CONFIG,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PropData,
} from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_SIDE_TASK_LINES } from '../ZRSJZ_TaskLines';
import { MigrateLegacyEnhancement } from '../ZRSJZ_EnhancementConfig';

/** 新存档初始化和旧存档迁移。此类不触发事件，也不主动写盘。 */
export class ZRSJZ_GameDataDefaults {
    public static Initialize(data: ZRSJZ_GameData): void {
        data.Gold = 100000;
        data.CurMap = "新手村";
        data.BossExtractionCompleted = {};
        data.Grade = 1;
        data.CurExp = 0;
        data.PendingExperience = 0;
        data.MainTaskExperienceAwards = {};
        this.InitializePlayerKnife(data, 0);
        this.InitializePlayerKnife(data, 1);

        const task = ZRSJZ_MAIN_TASK_CONFIG.get("初入禁区");
        data.MainTaskExperienceAwards[task.TaskName] = task.TaskAwards.find(
            award => award.TaskAwardName === "经验",
        )?.TaskAwardCount ?? 0;
        data.CurMainTask = {
            TaskName: task.TaskName,
            TaskTargetName: task.TaskTargets[0].TaskTargetName,
            CurCount: 0
        }
        this.InitializeTaskLines(data);
        data.Versions = ZRSJZ_GameData.Versions;
    }

    public static Migrate(data: ZRSJZ_GameData, savedData: any): boolean {
        // 逐级补充缺失字段，不覆盖玩家已有数据；版本4→5增加独立支线进度。
        let flag = false;
        if (data.Versions == 0) {
            data.Versions++;
            if (savedData.IsTutorial === undefined) data.IsTutorial = false;
        }

        const loadData = () => {
            (this.DataDefaults.get(data.Versions) ?? []).forEach(item => {
                if (savedData[item.Key] === undefined) data[item.Key] = item.DefaultVaule;
            });
            if (data.Versions === 4) this.InitializeTaskLines(data);
            // 版本5→6：已领取最终主线奖励的老玩家补齐安全箱容量，不重复累加。
            if (data.Versions === 5 && data.MainTaskComplete?.includes('北境终局')) {
                data.InventoryRow ??= {};
                data.InventoryRow[ZRSJZ_INVENTORY.保险箱] = Math.max(3, data.InventoryRow[ZRSJZ_INVENTORY.保险箱] ?? 2);
            }
            if (data.Versions === 8) {
                const progress = MigrateLegacyEnhancement(savedData);
                data.EnhancementLevel = progress.Level;
                data.EnhancementSpecials = progress.Specials;
            }
            if (data.Versions === 15) {
                // 已达标进度和已经领取过的成就补入完成记录，不重复发奖。
                data.AchievementCompleted ??= [];
                for (const item of ZRSJZ_ACHIEVEMENT_CONFIG) {
                    if ((data.AchievementClaimed?.includes(item.id)
                        || (data.AchievementProgress?.[item.id] ?? 0) >= item.target)
                        && !data.AchievementCompleted.includes(item.id)) {
                        data.AchievementCompleted.push(item.id);
                    }
                }
            }
            data.Versions++;
        }

        // 版本18→19：一次性转换旧称号名，配置中不再维护别名。
        if (data.Versions < 19) {
            const legacyNames: Record<string, string> = {
                '王者之师': '王者之姿', '战场精英': '不败战神', '万能兵王': '荣耀之巅',
            };
            data.OwnedTitles = [...new Set((data.OwnedTitles ?? []).map(name => legacyNames[name] ?? name))];
            data.EquippedTitle = legacyNames[data.EquippedTitle] ?? data.EquippedTitle ?? '';
        }
        while (data.Versions < ZRSJZ_GameData.Versions) {
            loadData();
            flag = true;
        }

        if (!data.OwnedTitles?.includes('勇者')) {
            data.OwnedTitles = ['勇者', ...(data.OwnedTitles ?? [])];
            flag = true;
        }
        if (!data.EquippedTitle || !data.OwnedTitles.includes(data.EquippedTitle)) {
            data.EquippedTitle = '勇者';
            flag = true;
        }
        data.DefeatedTitleBosses ??= [];
        if (!data.OwnedAvatarFrames?.includes('1')) {
            data.OwnedAvatarFrames = ['1', ...(data.OwnedAvatarFrames ?? [])];
            flag = true;
        }
        if (!data.CurrentAvatarFrame || !data.OwnedAvatarFrames.includes(data.CurrentAvatarFrame)) {
            data.CurrentAvatarFrame = '1'; flag = true;
        }
        data.AvatarFrameBossDifficulties ??= [];
        data.AvatarFrameNormalKills ??= 0;

        // 新增装备撤回定价：同时恢复此前已经按临时价格保存的实例。
        const revertedEquipment = new Set([
            '兔月盔', '竹月盔', '萌龙盔', '裂光盔', '弑神盔', '光明盔', '冥辉盔',
            '兔萌甲', '玄竹甲', '绿龙甲', '星轨甲', '赤锋甲', '圣翎甲', '噬星甲',
            '兔绒包', '云竹包', '恐仔囊', '天穹包', '赤辉囊', '烬菱包', '虚空匣',
            '霜月狼', '裂海鲨', '焚天龙',
        ]);
        for (const prop of Object.values(data.PropData ?? {})) {
            const config = ZRSJZ_PROP_CONFIG.get(prop.Name);
            if (revertedEquipment.has(prop.Name) && config?.UnitPrice === 0 && prop.UnitPrice !== 0) {
                prop.UnitPrice = 0;
                flag = true;
            }
        }
        return flag;
    }

    private static InitializeTaskLines(data: ZRSJZ_GameData): void {
        data.TaskLines ??= {};
        ZRSJZ_SIDE_TASK_LINES.forEach(line => {
            data.TaskLines[line.ID] ??= { index: 0, accepted: false, count: 0 };
        });
        // 主线字段和 InventoryRow 原样保留，不回溯发奖励，也不重置已有容量。
    }

    private static CreateProp(data: ZRSJZ_GameData, propName: string, count: number): string {
        const config = ZRSJZ_PROP_CONFIG.get(propName);
        data.PropID++;
        const propID = `ZRSJZ_PropID_${data.PropID}`;
        const prop = new ZRSJZ_PropData();
        prop.InstanceID = propID;
        prop.Name = propName;
        prop.PropType = config.PropType;
        prop.CurInventory = ZRSJZ_INVENTORY.仓库_全部;
        prop.OwnerPlayerIndex = -1;
        prop.UnitPrice = config.UnitPrice;
        prop.MaxCount = config.MaxCount;
        prop.CurCount = count;
        prop.Width = Number(config.GridType[2]);
        prop.Height = Number(config.GridType[0]);
        prop.GridData = [this.CreateGridData(), this.CreateGridData()];
        data.PropData[propID] = prop;
        return propID;
    }

    /** 为指定玩家创建独立的初始战术匕首，避免两个玩家引用同一个道具实例。 */
    public static InitializePlayerKnife(data: ZRSJZ_GameData, playerIndex: number): void {
        const knifeID = this.CreateProp(data, "战术匕首", 1);
        const weaponryIDs = playerIndex === 1 ? data.Player2WeaponryID : data.WeaponryID;
        weaponryIDs[4] = knifeID;
        this.PlaceProp(data, knifeID, ZRSJZ_INVENTORY.武器_刀, 1, 0, 0, playerIndex);
    }

    private static PlaceProp(
        data: ZRSJZ_GameData,
        propID: string,
        inventory: ZRSJZ_INVENTORY,
        gridIndex: number,
        x: number,
        y: number,
        playerIndex: number = 0,
    ): void {
        const prop = data.PropData[propID];
        prop.CurInventory = inventory;
        prop.OwnerPlayerIndex = playerIndex;
        prop.GridData[gridIndex].GridX = x;
        prop.GridData[gridIndex].GridY = y;
    }

    private static CreateGridData(): ZRSJZ_GridData {
        const gridData = new ZRSJZ_GridData();
        gridData.IsRotate = false;
        gridData.GridX = -1;
        gridData.GridY = -1;
        return gridData;
    }

    //需要更新的数据 
    private static readonly DataDefaults: Map<number, { Key: string, DefaultVaule: any }[]> = new Map([
        [17, [{ Key: 'EquippedTitle', DefaultVaule: '' }]],
        [16, [{ Key: 'OwnedTitles', DefaultVaule: [] }]],
        [15, [
            { Key: 'AchievementCompleted', DefaultVaule: [] },
        ]],
        [14, [
            { Key: 'AchievementProgress', DefaultVaule: {} },
            { Key: 'AchievementClaimed', DefaultVaule: [] },
            { Key: 'AchievementMilestonesClaimed', DefaultVaule: [] },
            { Key: 'AchievementEvacuationStreak', DefaultVaule: 0 },
        ]],
        [13, [
            { Key: "CurrentAvatar", DefaultVaule: "威蓝" },
            { Key: "CurrentAvatarFrame", DefaultVaule: "1" },
            { Key: "OwnedAvatarFrames", DefaultVaule: ["1"] },
        ]],
        [12, [{ Key: "NoticeClosedDate", DefaultVaule: "" }]],
        [11, [
            { Key: "MerchantPurchaseDate", DefaultVaule: "" },
            { Key: "MerchantPurchaseCount", DefaultVaule: 0 },
        ]],
        [10, [
            { Key: "SupplyLastClaimTime", DefaultVaule: 0 },
            { Key: "SupplyOffer", DefaultVaule: -1 },
            { Key: "SupplyFailurePending", DefaultVaule: false },
        ]],
        [1, [
            { Key: "InventoryRow", DefaultVaule: {} }
        ]],
        [2, [
            { Key: "MailData", DefaultVaule: {} },
            { Key: "MailID", DefaultVaule: 0 }
        ]],
        [3, [
            { Key: "PetData", DefaultVaule: {} },
            { Key: "CurPet", DefaultVaule: "" },
            { Key: "Player2Pet", DefaultVaule: "" },
            { Key: "CurPetSkin", DefaultVaule: "" },
        ]],
        [6, [
            { Key: "PetFragments", DefaultVaule: 0 },
            { Key: "PetFragmentClaimDate", DefaultVaule: "" },
            { Key: "PetFragmentClaimCount", DefaultVaule: 0 },
        ]],
        [9, [
            { Key: "HeroFragments", DefaultVaule: 0 },
            { Key: "HeroFragmentClaimDate", DefaultVaule: "" },
            { Key: "HeroFragmentClaimCount", DefaultVaule: 0 },
        ]],
        [7, [
            { Key: "BossExtractionCompleted", DefaultVaule: {} },
        ]]
    ])
}
