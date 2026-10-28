import {
    ZRSJZ_AMMO_MAX_COUNT,
    ZRSJZ_ACTION_CONFIG,
    ZRSJZ_ACTION_MAX_EQUIPPED,
    ZRSJZ_ACHIEVEMENT_CONFIG,
    ZRSJZ_GridData,
    ZRSJZ_INVENTORY,
    ZRSJZ_MAIN_TASK_CONFIG,
    ZRSJZ_MAIN_TASK_ORDER,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_SHOP_CONFIG,
    ZRSJZ_PropData,
} from "../ZRSJZ_Constant";
import { ZRSJZ_GameData } from "../ZRSJZ_GameData";
import { ZRSJZ_SIDE_TASK_LINES } from '../ZRSJZ_TaskLines';
import { MigrateLegacyEnhancement } from '../ZRSJZ_EnhancementConfig';
import { CreateBattlePassState } from '../ZRSJZ_BattlePassConfig';
import { CreateMidAutumnState } from './ZRSJZ_MidAutumnService';
import { CreateMatrixState } from '../ZRSJZ_MatrixState';

/** 新存档初始化和旧存档迁移。此类不触发事件，也不主动写盘。 */
export class ZRSJZ_GameDataDefaults {
    /** 修复旧配置的乱码键；保留接取进度、领奖记录和发布时的经验快照。 */
    private static RepairMainTaskNames(data: ZRSJZ_GameData): boolean {
        const legacy = '\uFFFD'.repeat(6) + '补给';
        const name = '弹药补给';
        let changed = false;
        if (data.NewMainTask === legacy) { data.NewMainTask = name; changed = true; }
        if (data.CurMainTask?.TaskName === legacy) { data.CurMainTask.TaskName = name; changed = true; }
        if (data.MainTaskComplete?.includes(legacy)) {
            data.MainTaskComplete = Array.from(new Set(data.MainTaskComplete.map(task => task === legacy ? name : task)));
            changed = true;
        }
        const awards = data.MainTaskExperienceAwards;
        if (awards && Object.prototype.hasOwnProperty.call(awards, legacy)) {
            if (awards[name] === undefined) awards[name] = awards[legacy];
            delete awards[legacy];
            changed = true;
        }
        return changed;
    }

    /** 同版本存档也可能缺少有效任务入口；只修复指针，不重置进度或补发奖励。 */
    private static RepairMainTaskProgress(data: ZRSJZ_GameData): boolean {
        if (data.Versions > ZRSJZ_GameData.Versions) return false;
        let changed = false;
        if (!Array.isArray(data.MainTaskComplete)) {
            data.MainTaskComplete = [];
            changed = true;
        }
        const current = data.CurMainTask;
        if (current && !ZRSJZ_MAIN_TASK_CONFIG.has(current.TaskName)) {
            // 旧任务名称失效时，只有目标能唯一对应现有任务才继承原计数。
            const matches = ZRSJZ_MAIN_TASK_ORDER.filter(name =>
                ZRSJZ_MAIN_TASK_CONFIG.get(name)?.TaskTargets[0]?.TaskTargetName === current.TaskTargetName);
            if (matches.length === 1 && !data.MainTaskComplete.includes(matches[0])) {
                data.CurMainTask = { ...current, TaskName: matches[0] };
                const awards = data.MainTaskExperienceAwards;
                if (awards?.[matches[0]] === undefined && awards?.[current.TaskName] !== undefined) {
                    awards[matches[0]] = awards[current.TaskName];
                }
            } else {
                // 无法识别的旧任务保留在读取器的原始存档备份中，不猜测完成或领奖状态。
                data.CurMainTask = null;
            }
            changed = true;
        }
        if (data.CurMainTask && data.MainTaskComplete.includes(data.CurMainTask.TaskName)) {
            data.CurMainTask = null;
            changed = true;
        }
        const next = data.CurMainTask ? ''
            : ZRSJZ_MAIN_TASK_CONFIG.has(data.NewMainTask) && !data.MainTaskComplete.includes(data.NewMainTask)
                ? data.NewMainTask
                : ZRSJZ_MAIN_TASK_ORDER.find(name => !data.MainTaskComplete.includes(name)) ?? '';
        if (data.NewMainTask !== next) {
            data.NewMainTask = next;
            changed = true;
        }
        return changed;
    }

    public static Initialize(data: ZRSJZ_GameData): void {
        data.UnlockedActions = ZRSJZ_ACTION_CONFIG.filter(item => item.Unlock.Type === 'default').map(item => item.Name);
        data.EquippedActions = data.UnlockedActions.slice(0, ZRSJZ_ACTION_MAX_EQUIPPED);
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
        let flag = this.RepairMainTaskNames(data);
        // 先归一化完成列表，供旧版本迁移中的 includes 使用。
        if (!Array.isArray(data.MainTaskComplete)) {
            data.MainTaskComplete = [];
            flag = true;
        }
        if (data.Versions == 0) {
            data.Versions++;
            if (savedData.IsTutorial === undefined) data.IsTutorial = false;
        }

        const loadData = () => {
            if (data.Versions === 30) {
                // 已接任务（包括完成待领奖）继续原目标；未接任务改为新顺序首个未领奖项。
                // 不修改完成记录、奖励快照、物品和安全箱容量，也不在迁移中发奖。
                data.NewMainTask = data.CurMainTask ? ''
                    : ZRSJZ_MAIN_TASK_ORDER.find(name => !data.MainTaskComplete.includes(name)) ?? '';
            }
            if (data.Versions === 29) {
                const names = new Set(ZRSJZ_ACTION_CONFIG.map(item => item.Name));
                const defaults = ZRSJZ_ACTION_CONFIG.filter(item => item.Unlock.Type === 'default').map(item => item.Name);
                const owned = Array.isArray(savedData.UnlockedActions) ? savedData.UnlockedActions : defaults;
                data.UnlockedActions = Array.from(new Set<string>([...owned.filter(name => names.has(name)), ...defaults]));
                const equipped = Array.isArray(savedData.EquippedActions) ? savedData.EquippedActions : defaults;
                data.EquippedActions = Array.from(new Set<string>(equipped.filter(name => data.UnlockedActions.includes(name))))
                    .slice(0, ZRSJZ_ACTION_MAX_EQUIPPED);
            }
            if (data.Versions === 28 && !savedData.FishingFestival) {
                data.FishingFestival = { points: 0, offers: [], pending: null };
            }
            if (data.Versions === 27) {
                // Only refresh cached prices; preserve ownership, inventory slots and counts.
                const repriced = new Set([...(ZRSJZ_SHOP_CONFIG.get('武器') ?? []), '霜月狼', '裂海鲨', '焚天龙']);
                for (const prop of Object.values(data.PropData ?? {})) {
                    const config = ZRSJZ_PROP_CONFIG.get(prop.Name);
                    if (repriced.has(prop.Name) && config?.PropType === '枪') prop.UnitPrice = config.UnitPrice;
                }
            }
            if (data.Versions === 26) {
                // 版本26→27：只更新商店枪械实例价格，保留实例ID、位置、数量和装备归属。
                // 品质与伤害始终从 Constant 读取，无须重建道具或改动锻造记录。
                const shopWeapons = new Set(ZRSJZ_SHOP_CONFIG.get('武器') ?? []);
                for (const prop of Object.values(data.PropData ?? {})) {
                    const config = ZRSJZ_PROP_CONFIG.get(prop.Name);
                    if (shopWeapons.has(prop.Name) && config?.PropType === '枪') prop.UnitPrice = config.UnitPrice;
                }
            }
            if (data.Versions === 25 && !savedData.Matrix) data.Matrix = CreateMatrixState();
            if (data.Versions === 24 && savedData.MandellFreeTenDate === undefined) data.MandellFreeTenDate = '';
            if (data.Versions === 23 && savedData.MidAutumn === undefined) data.MidAutumn = CreateMidAutumnState();
            if (data.Versions === 21) {
                if (savedData.MandellBricks === undefined) data.MandellBricks = 0;
                if (savedData.MandellFreeDate === undefined) data.MandellFreeDate = '';
                if (savedData.MandellFreeCount === undefined) data.MandellFreeCount = 0;
                if (savedData.MandellPending === undefined) data.MandellPending = null;
            }
            if (data.Versions === 22) {
                data.BattlePass ??= CreateBattlePassState();
                data.BattlePass.advancedClaimed ??= [];
                data.BattlePass.advancedUnlocked ??= false;
            }
            if (data.Versions === 21 && savedData.BattlePass === undefined) data.BattlePass = CreateBattlePassState();
            if (data.Versions === 17) {
                // 新活动从零开始，不用历史撤离统计追溯发奖，也不覆盖旧存档其他字段。
                if (savedData.ActivityExtractionValue === undefined) data.ActivityExtractionValue = 0;
                if (savedData.ActivityTaskClaimed === undefined) data.ActivityTaskClaimed = [];
                if (savedData.ActivityRewardClaimed === undefined) data.ActivityRewardClaimed = [];
            }
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
            data.OwnedTitles = Array.from(new Set((data.OwnedTitles ?? []).map(name => legacyNames[name] ?? name)));
            data.EquippedTitle = legacyNames[data.EquippedTitle] ?? data.EquippedTitle ?? '';
        }
        while (data.Versions < ZRSJZ_GameData.Versions) {
            loadData();
            flag = true;
        }
        flag = this.RepairMainTaskProgress(data) || flag;

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
