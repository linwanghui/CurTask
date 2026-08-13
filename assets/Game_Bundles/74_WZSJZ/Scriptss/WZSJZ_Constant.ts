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
    /** 攻击型物资使用；非攻击单位可不填。 */
    AttackDamage?: number;
    AttackInterval?: number;
    AttackRange?: number;
    BulletSpeed?: number;
    /** 范围武器的爆炸半径；单体武器可不填。 */
    AreaRadius?: number;
    /** 地雷等接近触发单位使用。 */
    TriggerRadius?: number;
}
//物理层级
export enum WZSJZ_TIER {
    地形 = 1 << 0,
    玩家 = 1 << 1,
    敌人 = 1 << 2,
    场景物 = 1 << 3,
    玩家子弹 = 1 << 4,
    敌人子弹 = 1 << 5,
};
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
    /** 名字单位可通过经验升级，并在单独存在时播放待机动画。 */
    IsNameUnit?: boolean;
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

/** 横向名字组合配方；数组顺序同时决定文字顺序和重叠配方优先级。 */
export interface WZSJZ_NameCombinationConfig {
    Name: string;
    Parts: string[];
    PrefabPath: string;
    /** 配方文字默认都能喂养；这里可声明额外允许喂养该角色的文字。 */
    FeedNames?: string[];
}

export interface WZSJZ_SkillConfig {
    Id: string;
    OwnerName: string;
    ButtonPrefabPath: string;
    Cooldown: number;
    Duration: number;
    EffectType: "wall_invincible";
    EffectName: string;
    EffectPrefabPath: string;
    EffectPrewarm: number;
}

export interface WZSJZ_EnemyConfig {
    MaxHealth: number;
    MoveSpeed: number;
    /** 与城墙外边缘之间的攻击距离，单位为世界坐标像素。 */
    AttackRange: number;
    /** 在攻击范围基础上的微调；正值远离围墙，负值靠近围墙。 */
    AttackPositionOffset: number;
    AttackInterval: number;
    AttackDamage: number;
    MoveAnimation: string;
    AttackAnimation: string;
    HitAnimation: string;
    /** 受击硬直时间，期间不移动也不攻击。 */
    HitDuration: number;
    DeathAnimation: string;
    DeathDuration: number;
}

export class WZSJZ_Constant {
    public static readonly Panel = {
        LoadingPanel: "Panel/LoadingPanel",
        IntroducePanel: "Panel/IntroducePanel"
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

    /** 购买生成和二合一升级时的物资弹出动画。 */
    public static readonly MaterialPopAnimation = {
        StartScale: 0.25,
        Duration: 0.22,
        Easing: "backOut",
    };

    /** 单击查看与拖拽之间的手势判定，以及攻击范围显示规则。 */
    public static readonly NodeInteraction = {
        /** 手指移动超过该UI像素距离后才进入拖拽，避免单击时物体抖动。 */
        DragThreshold: 12,
        /** 99999等“全场范围”按该可视半径封顶，避免生成超大UI节点。 */
        MaxDisplayedAttackRange: 1500,
    };

    /** 拖拽落点预览的素材和尺寸。 */
    public static readonly DragIndicator = {
        OriginSpritePath: "Sprites/游戏内/拖拽指示/起点圆环",
        DashSpritePath: "Sprites/游戏内/拖拽指示/路径虚线",
        TargetSpritePath: "Sprites/游戏内/拖拽指示/目的地框",
        AttackRangeSpritePath: "Sprites/游戏内/攻击范围",
        OriginSize: 150,
        TargetSize: 150,
        DashWidth: 14,
        DashHeight: 30,
        DashSpacing: 48,
        MaxDashCount: 36,
        MaxDisplayedAttackRange: 1500,
    };

    /** 名字单位与多格名字组合的统一规则。 */
    public static readonly NameUnit = {
        FormationColumns: 5,
        /** 下标0对应1级升2级；满级不会再读取经验需求。 */
        ExperienceToNextLevel: [10, 20, 40, 80, 160],
        /** 喂给组合角色时，按被消耗文字等级，给予每一个组成文字的经验。 */
        FeedExperiencePerUnitByLevel: [5, 12, 28, 64, 144, 320],
    };

    /** 后续新增组合角色只需在这里继续添加配方，并补齐角色数值配置和预制体。 */
    public static readonly NameCombinations: WZSJZ_NameCombinationConfig[] = [
        {
            Name: "盾哥",
            Parts: ["盾", "哥"],
            PrefabPath: "Prefabs/节点/盾哥",
        },
    ];

    /** 角色技能配置；同一个角色可以配置多条技能。 */
    public static readonly CharacterSkills: WZSJZ_SkillConfig[] = [
        {
            Id: "绝对防线",
            OwnerName: "盾哥",
            ButtonPrefabPath: "Prefabs/UI/技能按钮/绝对防线",
            Cooldown: 30,
            Duration: 5,
            EffectType: "wall_invincible",
            EffectName: "技能绝对防线特效",
            EffectPrefabPath: "Prefabs/特效/技能绝对防线特效",
            EffectPrewarm: 2,
        },
    ];

    /** 敌人刷出与战斗参数。 */
    public static readonly EnemySpawn = {
        MinInterval: 2,
        MaxInterval: 3,
        EdgePadding: 45,
    };

    /** 高频生成节点的对象池预热数量；不足时仍会按需扩容。 */
    public static readonly ObjectPool = {
        EnemyPrewarmPerType: 5,
        GunBulletPrewarm: 20,
        CannonBulletPrewarm: 12,
        MinePrewarm: 16,
        KnifeEffectPrewarm: 10,
        ShieldProjectilePrewarm: 10,
        BlueExplosionPrewarm: 10,
        CellMoveEffectPrewarm: 8,
        CellUpgradeEffectPrewarm: 8,
    };

    /** 防止单位停在攻击范围临界点时因浮点误差反复进入移动状态。 */
    public static readonly EnemyCombat = {
        AttackPositionTolerance: 2,
    };

    /** Inspector 未绑定时使用这些Bundle内路径自动加载。 */
    public static readonly EnemyPrefabPaths: string[] = [
        "Prefabs/单位/哈夫克士兵",
        "Prefabs/单位/阿萨拉士兵",
    ];

    public static readonly EnemyConfigs: Record<string, WZSJZ_EnemyConfig> = {
        "哈夫克士兵": {
            MaxHealth: 60,
            MoveSpeed: 85,
            AttackRange: 0,
            AttackPositionOffset: 0,
            AttackInterval: 1.2,
            AttackDamage: 8,
            MoveAnimation: "zuolu",
            AttackAnimation: "gongji",
            HitAnimation: "shouji",
            HitDuration: 0.34,
            DeathAnimation: "siwang",
            DeathDuration: 1,
        },
        "阿萨拉士兵": {
            MaxHealth: 80,
            MoveSpeed: 105,
            AttackRange: 0,
            AttackPositionOffset: 0,
            AttackInterval: 1.5,
            AttackDamage: 10,
            MoveAnimation: "zuolu",
            AttackAnimation: "gongji",
            HitAnimation: "shouji",
            HitDuration: 0.34,
            DeathAnimation: "siwang",
            DeathDuration: 1,
        },
    };

    public static readonly GunBullet = {
        PrefabPath: "Prefabs/投掷物/枪子弹",
        HitDistance: 18,
        HitEffectDuration: 0.25,
        AimHeight: 55,
    };

    public static readonly KnifeEffect = {
        PrefabPath: "Prefabs/投掷物/刀特效",
        Duration: 0.25,
        PositionOffsetX: 0,
        PositionOffsetY: 55,
    };

    public static readonly CannonBullet = {
        PrefabPath: "Prefabs/投掷物/炮子弹",
        HitDistance: 22,
        /** 炮弹飞行轨迹相对直线抬高的最大高度。 */
        ArcHeight: 260,
        /** 动画资源缺少时使用的回收兜底时长。 */
        HitEffectDuration: 0.6,
    };

    public static readonly Mine = {
        PrefabPath: "Prefabs/投掷物/地雷",
        Lifetime: 30,
        HitEffectDuration: 0.3,
        MinDistanceFromWall: 100,
        VerticalPadding: 45,
        FarEdgePadding: 45,
    };

    /** 可被不同武器复用的通用表现。 */
    public static readonly CommonEffect = {
        BlueExplosion: {
            PrefabPath: "Prefabs/特效/蓝色爆炸特效",
            FallbackDuration: 0.35,
        },
    };

    /** 盾哥的直线盾牌投掷参数；最大飞行距离约为半张地图。 */
    public static readonly ShieldProjectile = {
        PrefabPath: "Prefabs/投掷物/盾牌",
        MaxTravelDistance: 960,
        HitRadius: 55,
        KnockbackDistance: 35,
        AimHeight: 55,
        KillExperience: 1,
        AttackAnimation: "gongji",
        IdleAnimation: "daiji",
    };

    public static readonly CellEffect = {
        MovePrefabPath: "Prefabs/特效/移动特效",
        UpgradePrefabPath: "Prefabs/特效/升级特效",
        AnimationName: "animation",
        MoveFallbackDuration: 0.8,
        UpgradeFallbackDuration: 0.97,
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
        "枪": [
            { Money: 2, Food: 1 }, { Money: 4, Food: 2 }, { Money: 8, Food: 4 },
            { Money: 16, Food: 8 }, { Money: 32, Food: 16 }, { Money: 64, Food: 32 },
        ],
        "刀": [
            { Money: 2, Food: 1 }, { Money: 4, Food: 2 }, { Money: 8, Food: 4 },
            { Money: 16, Food: 8 }, { Money: 32, Food: 16 }, { Money: 64, Food: 32 },
        ],
        "炮": [
            { Money: 3, Food: 2 }, { Money: 6, Food: 4 }, { Money: 12, Food: 8 },
            { Money: 24, Food: 16 }, { Money: 48, Food: 32 }, { Money: 96, Food: 64 },
        ],
        "雷": [
            { Money: 2, Food: 3 }, { Money: 4, Food: 6 }, { Money: 8, Food: 12 },
            { Money: 16, Food: 24 }, { Money: 32, Food: 48 }, { Money: 64, Food: 96 },
        ],
        "钥匙": [
            { Money: 1, Food: 1 },
        ],
        "盾": [
            { Money: 2, Food: 2 }, { Money: 4, Food: 4 }, { Money: 8, Food: 8 },
            { Money: 16, Food: 16 }, { Money: 32, Food: 32 }, { Money: 64, Food: 64 },
        ],
        "哥": [
            { Money: 2, Food: 2 }, { Money: 4, Food: 4 }, { Money: 8, Food: 8 },
            { Money: 16, Food: 16 }, { Money: 32, Food: 32 }, { Money: 64, Food: 64 },
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
        "枪": {
            Name: "枪",
            ResourceType: "none",
            PurchaseWeight: 12,
            ItemLockWeight: 8,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 10, AttackInterval: 1, AttackRange: 1000, BulletSpeed: 1400 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 18, AttackInterval: 0.9, AttackRange: 1050, BulletSpeed: 1520 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 32, AttackInterval: 0.8, AttackRange: 1100, BulletSpeed: 1640 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 55, AttackInterval: 0.7, AttackRange: 1150, BulletSpeed: 1800 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 90, AttackInterval: 0.6, AttackRange: 1200, BulletSpeed: 2000 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 150, AttackInterval: 0.5, AttackRange: 1300, BulletSpeed: 2300 },
            ],
        },
        "刀": {
            Name: "刀",
            ResourceType: "none",
            PurchaseWeight: 12,
            ItemLockWeight: 8,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 12, AttackInterval: 1, AttackRange: 500 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 22, AttackInterval: 0.9, AttackRange: 600 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 40, AttackInterval: 0.8, AttackRange: 650 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 70, AttackInterval: 0.7, AttackRange: 700 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 140, AttackInterval: 0.6, AttackRange: 750 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 280, AttackInterval: 0.5, AttackRange: 800 },
            ],
        },
        "炮": {
            Name: "炮",
            ResourceType: "none",
            PurchaseWeight: 8,
            ItemLockWeight: 5,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 12, AttackInterval: 2.8, AttackRange: 1100, BulletSpeed: 800, AreaRadius: 150 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 22, AttackInterval: 2.6, AttackRange: 1160, BulletSpeed: 850, AreaRadius: 165 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 40, AttackInterval: 2.4, AttackRange: 1220, BulletSpeed: 900, AreaRadius: 180 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 70, AttackInterval: 2.2, AttackRange: 1280, BulletSpeed: 960, AreaRadius: 195 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 140, AttackInterval: 2, AttackRange: 1340, BulletSpeed: 1030, AreaRadius: 210 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 280, AttackInterval: 1.8, AttackRange: 1400, BulletSpeed: 1100, AreaRadius: 225 },
            ],
        },
        "雷": {
            Name: "雷",
            ResourceType: "none",
            PurchaseWeight: 7,
            ItemLockWeight: 4,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 45, AttackInterval: 4.5, AttackRange: 99999, AreaRadius: 170, TriggerRadius: 55 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 75, AttackInterval: 4.2, AttackRange: 99999, AreaRadius: 185, TriggerRadius: 58 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 125, AttackInterval: 3.9, AttackRange: 99999, AreaRadius: 200, TriggerRadius: 62 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 205, AttackInterval: 3.6, AttackRange: 99999, AreaRadius: 220, TriggerRadius: 66 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 330, AttackInterval: 3.2, AttackRange: 99999, AreaRadius: 240, TriggerRadius: 70 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 520, AttackInterval: 2.8, AttackRange: 99999, AreaRadius: 260, TriggerRadius: 75 },
            ],
        },
        "盾": {
            Name: "盾",
            ResourceType: "none",
            PurchaseWeight: 6,
            ItemLockWeight: 4,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "哥": {
            Name: "哥",
            ResourceType: "none",
            PurchaseWeight: 6,
            ItemLockWeight: 4,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "盾哥": {
            Name: "盾哥",
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 35, AttackInterval: 4, AttackRange: 960, BulletSpeed: 800 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 55, AttackInterval: 3.8, AttackRange: 960, BulletSpeed: 830 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 75, AttackInterval: 3.6, AttackRange: 960, BulletSpeed: 860 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 100, AttackInterval: 3.4, AttackRange: 960, BulletSpeed: 900 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 150, AttackInterval: 3.2, AttackRange: 960, BulletSpeed: 940 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 220, AttackInterval: 3, AttackRange: 960, BulletSpeed: 980 },
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

    public static GetNameUnitExperienceRequirement(level: number): number {
        const index = Math.max(0, Math.floor(level) - 1);
        return this.NameUnit.ExperienceToNextLevel[index] || 0;
    }

    public static GetCombinedNameUnitLevel(levels: number[]): number {
        if (!levels || levels.length === 0) {
            return 1;
        }
        const totalLevel = levels.reduce((total, level) => total + Math.max(1, level), 0);
        return Math.max(1, Math.floor(totalLevel / levels.length));
    }

    public static GetNameUnitFeedExperience(feedLevel: number): number {
        const values = this.NameUnit.FeedExperiencePerUnitByLevel;
        const index = Math.max(0, Math.min(Math.floor(feedLevel) - 1, values.length - 1));
        return values[index] || 0;
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
