/** 单个等级的表现和数值配置。 */
export interface WZSJZ_MaterialLevelConfig {
    /** 游戏内显示等级，从1开始。 */
    Level: number;
    /** 当前等级图片路径，WZSJZ_Incident 会自动补 /spriteFrame。 */
    SpritePath: string;
    /** 开始游戏后，每秒产生的对应资源数量。 */
    ProductionPerSecond: number;
}

/** 一类可合成物资的完整配置。 */
export interface WZSJZ_MaterialConfig {
    Name: string;
    /** 该物资产出会增加到哪一种玩家资源。 */
    ResourceType: "money" | "food";
    /** 总等级数。 */
    MaxLevel: number;
    /** 从1级升到满级一共可以升级多少次。 */
    UpgradeTimes: number;
    /** 当前玩法为两个相同等级物资合成。 */
    MergeSameLevelCount: number;
    Levels: WZSJZ_MaterialLevelConfig[];
}

export class WZSJZ_Constant {
    public static readonly Panel = {
        LoadingPanel: "Panel/LoadingPanel",
    };

    /**
     * 物资的等级、图片和产出都集中在这里调整。
     * 数组下标0对应1级，下标5对应6级。
     */
    public static readonly MaterialConfigs: Record<string, WZSJZ_MaterialConfig> = {
        "钞票": {
            Name: "钞票",
            ResourceType: "money",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "Sprites/游戏内/钞票/0", ProductionPerSecond: 1 },
                { Level: 2, SpritePath: "Sprites/游戏内/钞票/1", ProductionPerSecond: 2 },
                { Level: 3, SpritePath: "Sprites/游戏内/钞票/2", ProductionPerSecond: 4 },
                { Level: 4, SpritePath: "Sprites/游戏内/钞票/3", ProductionPerSecond: 8 },
                { Level: 5, SpritePath: "Sprites/游戏内/钞票/4", ProductionPerSecond: 16 },
                { Level: 6, SpritePath: "Sprites/游戏内/钞票/5", ProductionPerSecond: 32 },
            ],
        },
        "食物": {
            Name: "食物",
            ResourceType: "food",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "Sprites/游戏内/食物/0", ProductionPerSecond: 1 },
                { Level: 2, SpritePath: "Sprites/游戏内/食物/1", ProductionPerSecond: 2 },
                { Level: 3, SpritePath: "Sprites/游戏内/食物/2", ProductionPerSecond: 4 },
                { Level: 4, SpritePath: "Sprites/游戏内/食物/3", ProductionPerSecond: 8 },
                { Level: 5, SpritePath: "Sprites/游戏内/食物/4", ProductionPerSecond: 16 },
                { Level: 6, SpritePath: "Sprites/游戏内/食物/5", ProductionPerSecond: 32 },
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
}
