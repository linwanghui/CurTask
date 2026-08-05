/** 单个等级的表现和数值配置。 */
export interface WZSJZ_MaterialLevelConfig {
    /** 游戏内显示等级，从1开始。 */
    Level: number;
    /** 当前等级图片路径，WZSJZ_Incident 会自动补 /spriteFrame。 */
    SpritePath: string;
    /** 场景中的额外显示图片，例如墙体大图。 */
    DisplaySpritePath?: string;
    /** 开始游戏后，每秒产生的对应资源数量。 */
    ProductionPerSecond: number;
    /** 围墙等战斗单位可使用；普通资源填0。 */
    MaxHealth: number;
}

/** 一类可合成物资的完整配置。 */
export interface WZSJZ_MaterialConfig {
    Name: string;
    /** 该物资产出会增加到哪一种玩家资源。 */
    ResourceType: "money" | "food" | "none";
    /** 购买物资时的随机权重。 */
    PurchaseWeight: number;
    /** 作为道具锁默认物资时的随机权重。 */
    ItemLockWeight: number;
    /** 离开备战框后允许放置的战斗区域。 */
    BattlePlacement: "formation" | "wall" | "none";
    /** 总等级数。 */
    MaxLevel: number;
    /** 从1级升到满级一共可以升级多少次。 */
    UpgradeTimes: number;
    /** 当前玩法为两个相同等级物资合成。 */
    MergeSameLevelCount: number;
    Levels: WZSJZ_MaterialLevelConfig[];
}

export interface WZSJZ_LevelWeightStage {
    /** 达到该进度后使用这一组等级权重。 */
    MinProgress: number;
    /** 数组下标0～5分别代表1～6级。 */
    LevelWeights: number[];
}

export interface WZSJZ_RecycleReward {
    Money: number;
    Food: number;
}

export interface WZSJZ_EnemyConfig {
    MoveSpeed: number;
    AttackRange: number;
    AttackInterval: number;
    AttackDamage: number;
    MoveAnimation: string;
    AttackAnimation: string;
}

export class WZSJZ_Constant {
    public static readonly Panel = {
        LoadingPanel: "Panel/LoadingPanel",
    };

    public static readonly PreparationGrid = {
        Columns: 12,
        Rows: 2,
        InitialUnlockedCount: 3,
    };

    /** 拖动钥匙时，可解锁目标使用的柔和绿色半透明遮罩。 */
    public static readonly KeyUnlockHintColor = {
        R: 81,
        G: 227,
        B: 81,
        A: 100,
    };

    /** 敌人刷出与战斗参数。 */
    public static readonly EnemySpawn = {
        MinInterval: 2,
        MaxInterval: 3,
        EdgePadding: 45,
    };

    public static readonly EnemyConfigs: Record<string, WZSJZ_EnemyConfig> = {
        "哈夫克士兵": {
            MoveSpeed: 85,
            AttackRange: 80,
            AttackInterval: 1.2,
            AttackDamage: 8,
            MoveAnimation: "zuolu",
            AttackAnimation: "gongji",
        },
        "阿萨拉士兵": {
            MoveSpeed: 105,
            AttackRange: 75,
            AttackInterval: 1.5,
            AttackDamage: 10,
            MoveAnimation: "zuolu",
            AttackAnimation: "gongji",
        },
    };

    /** 购买价格每上涨一档后，对应的物资初始等级权重。 */
    public static readonly PurchaseLevelStages: WZSJZ_LevelWeightStage[] = [
        { MinProgress: 0, LevelWeights: [100, 0, 0, 0, 0, 0] },
        { MinProgress: 1, LevelWeights: [80, 20, 0, 0, 0, 0] },
        { MinProgress: 2, LevelWeights: [60, 30, 10, 0, 0, 0] },
        { MinProgress: 3, LevelWeights: [48, 32, 17, 3, 0, 0] },
        { MinProgress: 4, LevelWeights: [40, 32, 23, 5, 0, 0] },
        { MinProgress: 5, LevelWeights: [32, 33, 29, 6, 0, 0] },
    ];

    /** 已解锁备战格越多，新出现的道具锁物资等级越高。 */
    public static readonly ItemLockLevelStages: WZSJZ_LevelWeightStage[] = [
        { MinProgress: 3, LevelWeights: [80, 20, 0, 0, 0, 0] },
        { MinProgress: 6, LevelWeights: [55, 35, 10, 0, 0, 0] },
        { MinProgress: 9, LevelWeights: [40, 38, 19, 3, 0, 0] },
        { MinProgress: 12, LevelWeights: [30, 38, 27, 5, 0, 0] },
        { MinProgress: 16, LevelWeights: [22, 36, 35, 7, 0, 0] },
        { MinProgress: 20, LevelWeights: [15, 32, 45, 8, 0, 0] },
    ];

    /** 回收不同物资、不同等级时返还的少量资源，下标0对应1级。 */
    public static readonly RecycleRewards: Record<string, WZSJZ_RecycleReward[]> = {
        "钞票": [
            { Money: 2, Food: 0 }, { Money: 4, Food: 0 }, { Money: 8, Food: 0 },
            { Money: 16, Food: 0 }, { Money: 32, Food: 0 }, { Money: 64, Food: 0 },
        ],
        "食物": [
            { Money: 0, Food: 2 }, { Money: 0, Food: 4 }, { Money: 0, Food: 8 },
            { Money: 0, Food: 16 }, { Money: 0, Food: 32 }, { Money: 0, Food: 64 },
        ],
        "围墙": [
            { Money: 1, Food: 1 }, { Money: 2, Food: 2 }, { Money: 4, Food: 4 },
            { Money: 8, Food: 8 }, { Money: 16, Food: 16 }, { Money: 32, Food: 32 },
        ],
    };

    /**
     * 物资的等级、图片和产出都集中在这里调整。
     * 数组下标0对应1级，下标5对应6级。
     */
    public static readonly MaterialConfigs: Record<string, WZSJZ_MaterialConfig> = {
        "钞票": {
            Name: "钞票",
            ResourceType: "money",
            PurchaseWeight: 45,
            ItemLockWeight: 45,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "Sprites/游戏内/钞票/0", ProductionPerSecond: 1, MaxHealth: 0 },
                { Level: 2, SpritePath: "Sprites/游戏内/钞票/1", ProductionPerSecond: 2, MaxHealth: 0 },
                { Level: 3, SpritePath: "Sprites/游戏内/钞票/2", ProductionPerSecond: 4, MaxHealth: 0 },
                { Level: 4, SpritePath: "Sprites/游戏内/钞票/3", ProductionPerSecond: 8, MaxHealth: 0 },
                { Level: 5, SpritePath: "Sprites/游戏内/钞票/4", ProductionPerSecond: 16, MaxHealth: 0 },
                { Level: 6, SpritePath: "Sprites/游戏内/钞票/5", ProductionPerSecond: 32, MaxHealth: 0 },
            ],
        },
        "食物": {
            Name: "食物",
            ResourceType: "food",
            PurchaseWeight: 45,
            ItemLockWeight: 45,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "Sprites/游戏内/食物/0", ProductionPerSecond: 1, MaxHealth: 0 },
                { Level: 2, SpritePath: "Sprites/游戏内/食物/1", ProductionPerSecond: 2, MaxHealth: 0 },
                { Level: 3, SpritePath: "Sprites/游戏内/食物/2", ProductionPerSecond: 4, MaxHealth: 0 },
                { Level: 4, SpritePath: "Sprites/游戏内/食物/3", ProductionPerSecond: 8, MaxHealth: 0 },
                { Level: 5, SpritePath: "Sprites/游戏内/食物/4", ProductionPerSecond: 16, MaxHealth: 0 },
                { Level: 6, SpritePath: "Sprites/游戏内/食物/5", ProductionPerSecond: 32, MaxHealth: 0 },
            ],
        },
        "围墙": {
            Name: "围墙",
            ResourceType: "none",
            PurchaseWeight: 10,
            ItemLockWeight: 10,
            BattlePlacement: "wall",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "Sprites/游戏内/围墙/0", DisplaySpritePath: "Sprites/游戏内/显示围墙/0", ProductionPerSecond: 0, MaxHealth: 100 },
                { Level: 2, SpritePath: "Sprites/游戏内/围墙/1", DisplaySpritePath: "Sprites/游戏内/显示围墙/1", ProductionPerSecond: 0, MaxHealth: 200 },
                { Level: 3, SpritePath: "Sprites/游戏内/围墙/2", DisplaySpritePath: "Sprites/游戏内/显示围墙/2", ProductionPerSecond: 0, MaxHealth: 400 },
                { Level: 4, SpritePath: "Sprites/游戏内/围墙/3", DisplaySpritePath: "Sprites/游戏内/显示围墙/3", ProductionPerSecond: 0, MaxHealth: 800 },
                { Level: 5, SpritePath: "Sprites/游戏内/围墙/4", DisplaySpritePath: "Sprites/游戏内/显示围墙/4", ProductionPerSecond: 0, MaxHealth: 1600 },
                { Level: 6, SpritePath: "Sprites/游戏内/围墙/5", DisplaySpritePath: "Sprites/游戏内/显示围墙/5", ProductionPerSecond: 0, MaxHealth: 3200 },
            ],
        },
        "钥匙": {
            Name: "钥匙",
            ResourceType: "none",
            PurchaseWeight: 3,
            ItemLockWeight: 0,
            BattlePlacement: "none",
            MaxLevel: 1,
            UpgradeTimes: 0,
            MergeSameLevelCount: 0,
            Levels: [
                { Level: 1, SpritePath: "Sprites/游戏内/钥匙", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
    };

    public static GetMaterialConfig(name: string): WZSJZ_MaterialConfig | null {
        return this.MaterialConfigs[name] || null;
    }

    public static GetMaterialLevelConfig(
        name: string,
        level: number
    ): WZSJZ_MaterialLevelConfig | null {
        const material = this.GetMaterialConfig(name);
        if (!material) {
            return null;
        }
        const safeLevel = Math.max(1, Math.min(level, material.MaxLevel));
        return material.Levels[safeLevel - 1] || null;
    }

    public static GetPurchaseMaterialLevel(priceStage: number): number {
        return this.RollLevel(this.GetLevelWeights(this.PurchaseLevelStages, priceStage));
    }

    public static GetItemLockMaterialLevel(unlockedCellCount: number): number {
        return this.RollLevel(this.GetLevelWeights(this.ItemLockLevelStages, unlockedCellCount));
    }

    public static GetRecycleReward(name: string, level: number): WZSJZ_RecycleReward {
        const rewards = this.RecycleRewards[name];
        if (!rewards || rewards.length === 0) {
            return { Money: 0, Food: 0 };
        }
        const index = Math.max(0, Math.min(Math.floor(level) - 1, rewards.length - 1));
        return rewards[index];
    }

    public static GetEnemyConfig(name: string): WZSJZ_EnemyConfig | null {
        return this.EnemyConfigs[name] || null;
    }

    private static GetLevelWeights(
        stages: WZSJZ_LevelWeightStage[],
        progress: number
    ): number[] {
        let result = stages[0].LevelWeights;
        for (const stage of stages) {
            if (progress < stage.MinProgress) {
                break;
            }
            result = stage.LevelWeights;
        }
        return result;
    }

    private static RollLevel(weights: number[]): number {
        const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
        if (totalWeight <= 0) {
            return 1;
        }

        let random = Math.random() * totalWeight;
        for (let index = 0; index < weights.length; index++) {
            random -= Math.max(0, weights[index]);
            if (random < 0) {
                return index + 1;
            }
        }
        return 1;
    }
}
