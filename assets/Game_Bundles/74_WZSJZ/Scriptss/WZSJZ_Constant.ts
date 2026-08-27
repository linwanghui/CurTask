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
    /** 播放攻击动画后延迟多少秒产生实际攻击；不需要前摇时填0。 */
    AttackFireDelay: number;
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
    /** Spine待机动画名；未填写时使用 daiji。 */
    IdleAnimation?: string;
    /** Spine攻击动画名；未填写时使用 attack。 */
    AttackAnimation?: string;
    /** 跳过攻击动画开头没有有效动作的时间，单位：秒。 */
    AttackAnimationStartTime?: number;
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
    EffectType: "wall_invincible" | "wall_heal" | "block_bridge_dog_artillery"
    | "sonic_trap" | "adjacent_overclock" | "shock_pulse" | "self_attack_speed"
    | "electromagnetic_blind" | "boomerang_blades" | "electromagnetic_field";
    EffectName?: string;
    EffectPrefabPath?: string;
    EffectPrewarm?: number;
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
    /** 不填时随机出生；Boss 通常使用敌方区域中心。 */
    SpawnPositionMode?: "random" | "center";
}

/** 所有Boss共用的韧性配置；专属攻击配置仍放在各Boss自己的常量中。 */
export interface WZSJZ_BossConfig {
    MaxTenacity: number;
    TenacityDamageScale: number;
    TenacityRecoveryDelay: number;
}

export class WZSJZ_Constant {
    public static readonly Panel = {
        LoadingPanel: "Panel/LoadingPanel",
        IntroducePanel: "Panel/IntroducePanel",
        CheatPanel: "Panel/CheatPanel",
        GetPhysicalPowerPanel: "Panel/GetPhysicalPowerPanel",
        GetDiamondPanel: "Panel/GetDiamondPanel",
        ShopPanel: "Panel/ShopPanel",
        SignInPanel: "Panel/SignInPanel",
        /** 兼容旧脚本属性名。 */
        SignInPanelPanel: "Panel/SignInPanel",
        HookPanel: "Panel/HookPanel"
    };

    /** 首页体力与钻石配置。时间全部使用真实时间戳，不受游戏倍速影响。 */
    public static readonly HomeResource = {
        InitialPhysicalPower: 15,
        MaxPhysicalPower: 30,
        StartGamePhysicalPowerCost: 5,
        PhysicalPowerRecoveryIntervalSeconds: 3 * 60,
        PhysicalPowerAdReward: 10,
        InitialDiamond: 300,
        DiamondAdReward: 100,
    };

    /** 商店商品配置；数量、售价和广告奖励均从这里调整。 */
    public static readonly Shop = {
        VideoDiamondReward: 100,
        RecruitCardPrice: 25,
        RecruitCardAmount: 1,
        KeyPrice: 50,
        KeyAmount: 1,
    };

    /** 每日挂机宝箱：领取当前档后才开始下一档倒计时。 */
    public static readonly Hook = {
        ChestDurationSeconds: 5 * 60,
        DiamondRewards: [50, 100, 150, 200, 300] as ReadonlyArray<number>,
    };

    /** 七日签到按顺序领取；第七项领完后的下一个自然日重置。 */
    public static readonly SignIn = {
        Rewards: [
            { Type: "diamond", Amount: 100 },
            { Type: "diamond", Amount: 300 },
            { Type: "diamond", Amount: 100 },
            { Type: "physical_power", Amount: 50 },
            { Type: "diamond", Amount: 200 },
            { Type: "physical_power", Amount: 100 },
            { Type: "diamond", Amount: 1000 },
        ] as ReadonlyArray<{
            Type: "diamond" | "physical_power";
            Amount: number;
        }>,
    };

    public static readonly Cheat = {
        AddResourceAmount: 9990000,
        AddKeyAmount: 999,
        DefaultUnitLevel: 1,
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
        SkillDragMinimumDistance: 12,
        SkillRangeColor: { R: 255, G: 72, B: 72, A: 150 },
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
        {
            Name: "堵桥狗",
            Parts: ["堵桥", "狗"],
            PrefabPath: "Prefabs/节点/堵桥狗",
        },
        {
            Name: "老黑",
            Parts: ["老", "黑"],
            PrefabPath: "Prefabs/节点/老黑",
        },
        {
            Name: "哈基蜂",
            Parts: ["哈", "基蜂"],
            PrefabPath: "Prefabs/节点/哈基蜂",
        },
        {
            Name: "老板",
            Parts: ["老", "板"],
            PrefabPath: "Prefabs/节点/老板",
        },
        {
            Name: "威虫",
            Parts: ["威", "虫"],
            PrefabPath: "Prefabs/节点/威虫",
        },
        {
            Name: "红狗",
            Parts: ["红", "狗"],
            PrefabPath: "Prefabs/节点/红狗",
        },
        {
            Name: "疯狗",
            Parts: ["疯", "狗"],
            PrefabPath: "Prefabs/节点/疯狗",
        },
        {
            Name: "麦小鼠",
            Parts: ["麦", "小鼠"],
            PrefabPath: "Prefabs/节点/麦小鼠",
        },
        {
            Name: "幽默男",
            Parts: ["幽默", "男"],
            PrefabPath: "Prefabs/节点/幽默男",
        },
    ];

    /** 未在场景 MaterialPrefabs 数组中绑定的新物资，可在这里动态补充。 */
    public static readonly RuntimeMaterialPrefabPaths: string[] = [
        "Prefabs/节点/堵桥",
        "Prefabs/节点/狗",
        "Prefabs/节点/老",
        "Prefabs/节点/黑",
        "Prefabs/节点/哈",
        "Prefabs/节点/基蜂",
        "Prefabs/节点/板",
        "Prefabs/节点/威",
        "Prefabs/节点/虫",
        "Prefabs/节点/红",
        "Prefabs/节点/疯",
        "Prefabs/节点/麦",
        "Prefabs/节点/小鼠",
        "Prefabs/节点/幽默",
        "Prefabs/节点/男",
    ];

    /** 堵桥狗大招：动画本身表现从天而降，脚本只在落点定时结算范围伤害。 */
    public static readonly BlockBridgeDogUltimate = {
        PrefabPath: "Prefabs/投掷物/堵桥狗大招炮弹",
        ButtonPrefabPath: "Prefabs/UI/技能按钮/巡航火箭",
        StrikeCount: 3,
        Cooldown: 20,
        Damage: 120,
        DamageRadius: 120,
        /** 技能动画开始后多少秒触发伤害；按Spine落地爆炸帧调整这里。 */
        DamageTriggerDelay: 0.4,
        /** 动画开始后多少秒回到对象池，应晚于伤害触发时间。 */
        RecycleDelay: 1.0,
        RandomPositionPadding: 40,
        KillExperience: 1,
        AnimationName: "animation",
    };

    /** 老黑技能：连续三次声波脉冲，范围内敌人停止移动和攻击。 */
    public static readonly SonicTrap = {
        PrefabPath: "Prefabs/投掷物/声波陷阱",
        ButtonPrefabPath: "Prefabs/UI/技能按钮/声波陷阱",
        Cooldown: 35,
        Radius: 300,
        PulseCount: 3,
        /** 单次Spine动画约1.33秒；每隔这个时间重播并触发下一次脉冲。 */
        PulseInterval: 1.33,
        /** 每次脉冲施加的震颤时间，略大于脉冲间隔可形成连续控制。 */
        TremorDuration: 1.4,
        BossTenacityDamage: 60,
        RandomPositionPadding: 40,
        AnimationName: "animation",
    };

    /** 哈基蜂技能：按组合角色等级回复城墙生命值。 */
    public static readonly NanoRepair = {
        ButtonPrefabPath: "Prefabs/UI/技能按钮/纳米修复",
        Cooldown: 45,
        EffectName: "技能纳米修复特效",
        EffectPrefabPath: "Prefabs/特效/技能纳米修复特效",
        EffectDuration: 1.33,
        /** 数组下标0～5分别对应哈基蜂1～6级。 */
        HealByLevel: [40, 80, 160, 320, 640, 1280],
    };

    /** 老板技能：让自身占格外围一圈的攻击/收益单位获得临时超频。 */
    public static readonly OverclockCommand = {
        ButtonPrefabPath: "Prefabs/UI/技能按钮/超频指令",
        Cooldown: 40,
        Duration: 5,
        NeighborRange: 1,
        AttackDamageMultiplier: 1.5,
        ProductionMultiplier: 2,
        EffectName: "技能超频指令特效",
        EffectPrefabPath: "Prefabs/特效/技能超频指令特效",
    };

    /** 威虫技能：从发射点向前方三个角度发射非追踪震荡脉冲。 */
    public static readonly ShockPulse = {
        PrefabPath: "Prefabs/特效/技能震荡脉冲特效",
        ButtonPrefabPath: "Prefabs/UI/技能按钮/震荡脉冲",
        Cooldown: 50,
        AnglesDegrees: [15, 0, -15],
        /** 动画里的波移动到主要攻击区域后统一结算矩形范围。 */
        HitTriggerDelay: 0.5,
        EffectDuration: 0.9,
        KnockbackDistance: 300,
        StunDuration: 3,
        BossTenacityDamage: 100,
        AnimationName: "animation",
        SkillAnimation: "jineng",
        IdleAnimation: "daiji",
    };

    /** 红狗技能：短时间进入高速近战状态。 */
    public static readonly HuntProtocol = {
        ButtonPrefabPath: "Prefabs/UI/技能按钮/猎杀协议",
        Cooldown: 40,
        Duration: 10,
        AttackSpeedMultiplier: 3,
        EffectName: "技能猎杀协议特效",
        EffectPrefabPath: "Prefabs/特效/技能猎杀协议特效",
        SkillAnimation: "jineng",
        IdleAnimation: "daiji",
    };

    public static readonly RedDogAttackEffect = {
        PrefabPath: "Prefabs/特效/红狗普通攻击特效",
        Duration: 0.45,
        PositionOffsetX: 0,
        PositionOffsetY: 55,
        AnimationName: "animation",
        KillExperience: 1,
    };

    /** 疯狗普通攻击：和刀一样直接在目标处生成一次近战命中特效。 */
    public static readonly FengDogAttackEffect = {
        PrefabPath: "Prefabs/特效/疯狗普通攻击特效",
        Duration: 0.5,
        PositionOffsetX: 0,
        PositionOffsetY: 55,
        AnimationName: "animation",
        KillExperience: 1,
    };

    /** 疯狗技能：技能动作结束后，向最多五名敌人投放多段范围伤害飞刀。 */
    public static readonly ElectromagneticField = {
        PrefabPath: "Prefabs/特效/技能电磁力场特效",
        ButtonPrefabPath: "Prefabs/UI/技能按钮/电磁力场",
        Cooldown: 60,
        SkillAnimation: "jineng",
        IdleAnimation: "daiji",
        /** 无法从Spine读取jineng真实时长时使用的兜底等待时间。 */
        CastAnimationDuration: 1.1,
        MaxTargetCount: 5,
        Radius: 170,
        AnimationName: "animation",
        /** 飞刀动画开始后的每次范围伤害时间点，可增删以调整段数。 */
        DamageDelays: [0.65, 0.78, 0.91, 1.04],
        /** 数组下标0～5分别对应疯狗1～6级的每段伤害。 */
        DamagePerPulseByLevel: [8, 13, 21, 34, 55, 88],
        AnimationFallbackDuration: 1.25,
        KillExperience: 1,
    };

    /** 麦小鼠普通攻击使用自己的狙击子弹。 */
    public static readonly WheatMouseProjectile = {
        PrefabPath: "Prefabs/投掷物/麦小鼠子弹",
        LaunchNodeName: "子弹发射点位",
        AttackAnimation: "gongji",
        IdleAnimation: "daiji",
        HitDistance: 20,
        HitEffectDuration: 0.2,
        KillExperience: 1,
    };

    /** 麦小鼠技能：拖拽放置持续电磁区，周期伤害并刷新敌人的致盲时间。 */
    public static readonly ElectromagneticBlind = {
        PrefabPath: "Prefabs/特效/技能电磁致盲特效",
        ButtonPrefabPath: "Prefabs/UI/技能按钮/电磁致盲",
        Cooldown: 35,
        Radius: 150,
        EffectDuration: 3,
        DamageInterval: 0.5,
        /** 数组下标0～5分别对应麦小鼠1～6级的单次伤害。 */
        DamageByLevel: [5, 8, 13, 21, 34, 55],
        BlindDuration: 5,
        BlindEffectName: "致盲特效",
        BlindEffectPrefabPath: "Prefabs/特效/致盲特效",
        AnimationName: "animation",
        SkillAnimation: "jineng",
        IdleAnimation: "daiji",
        KillExperience: 1,
    };

    /** 幽默男技能：三枚飞刃随机散射，抵达最远点后原路返回。 */
    public static readonly BoomerangBlades = {
        PrefabPath: "Prefabs/特效/技能回旋飞刃特效",
        ButtonPrefabPath: "Prefabs/UI/技能按钮/回旋飞刃",
        Cooldown: 35,
        AnglesDegrees: [20, 0, -20],
        Speed: 900,
        MaxTravelDistance: 900,
        ReturnDistance: 20,
        /** 数组下标0～5分别对应幽默男1～6级的单段命中伤害。 */
        DamageByLevel: [40, 65, 105, 170, 275, 445],
        AnimationName: "animation",
        SkillAnimation: "jineng",
        IdleAnimation: "daiji",
        LaunchNodeName: "子弹发射点位",
        KillExperience: 1,
    };

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
            EffectPrewarm: 1,
        },
        {
            Id: "绝对防线",
            OwnerName: "堵桥狗",
            ButtonPrefabPath: WZSJZ_Constant.BlockBridgeDogUltimate.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.BlockBridgeDogUltimate.Cooldown,
            Duration: WZSJZ_Constant.BlockBridgeDogUltimate.RecycleDelay,
            EffectType: "block_bridge_dog_artillery",
        },
        {
            Id: "声波陷阱",
            OwnerName: "老黑",
            ButtonPrefabPath: WZSJZ_Constant.SonicTrap.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.SonicTrap.Cooldown,
            Duration: WZSJZ_Constant.SonicTrap.PulseCount
                * WZSJZ_Constant.SonicTrap.PulseInterval,
            EffectType: "sonic_trap",
        },
        {
            Id: "纳米修复",
            OwnerName: "哈基蜂",
            ButtonPrefabPath: WZSJZ_Constant.NanoRepair.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.NanoRepair.Cooldown,
            Duration: WZSJZ_Constant.NanoRepair.EffectDuration,
            EffectType: "wall_heal",
            EffectName: WZSJZ_Constant.NanoRepair.EffectName,
            EffectPrefabPath: WZSJZ_Constant.NanoRepair.EffectPrefabPath,
            EffectPrewarm: 1,
        },
        {
            Id: "超频指令",
            OwnerName: "老板",
            ButtonPrefabPath: WZSJZ_Constant.OverclockCommand.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.OverclockCommand.Cooldown,
            Duration: WZSJZ_Constant.OverclockCommand.Duration,
            EffectType: "adjacent_overclock",
            EffectName: WZSJZ_Constant.OverclockCommand.EffectName,
            EffectPrefabPath: WZSJZ_Constant.OverclockCommand.EffectPrefabPath,
            EffectPrewarm: 1,
        },
        {
            Id: "震荡脉冲",
            OwnerName: "威虫",
            ButtonPrefabPath: WZSJZ_Constant.ShockPulse.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.ShockPulse.Cooldown,
            Duration: WZSJZ_Constant.ShockPulse.StunDuration,
            EffectType: "shock_pulse",
        },
        {
            Id: "猎杀协议",
            OwnerName: "红狗",
            ButtonPrefabPath: WZSJZ_Constant.HuntProtocol.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.HuntProtocol.Cooldown,
            Duration: WZSJZ_Constant.HuntProtocol.Duration,
            EffectType: "self_attack_speed",
            EffectName: WZSJZ_Constant.HuntProtocol.EffectName,
            EffectPrefabPath: WZSJZ_Constant.HuntProtocol.EffectPrefabPath,
            EffectPrewarm: 1,
        },
        {
            Id: "电磁力场",
            OwnerName: "疯狗",
            ButtonPrefabPath: WZSJZ_Constant.ElectromagneticField.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.ElectromagneticField.Cooldown,
            Duration: WZSJZ_Constant.ElectromagneticField.CastAnimationDuration
                + WZSJZ_Constant.ElectromagneticField.AnimationFallbackDuration,
            EffectType: "electromagnetic_field",
        },
        {
            Id: "电磁致盲",
            OwnerName: "麦小鼠",
            ButtonPrefabPath: WZSJZ_Constant.ElectromagneticBlind.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.ElectromagneticBlind.Cooldown,
            Duration: WZSJZ_Constant.ElectromagneticBlind.EffectDuration,
            EffectType: "electromagnetic_blind",
            EffectName: WZSJZ_Constant.ElectromagneticBlind.BlindEffectName,
            EffectPrefabPath: WZSJZ_Constant.ElectromagneticBlind.BlindEffectPrefabPath,
            EffectPrewarm: 1,
        },
        {
            Id: "回旋飞刃",
            OwnerName: "幽默男",
            ButtonPrefabPath: WZSJZ_Constant.BoomerangBlades.ButtonPrefabPath,
            Cooldown: WZSJZ_Constant.BoomerangBlades.Cooldown,
            Duration: WZSJZ_Constant.BoomerangBlades.MaxTravelDistance
                / WZSJZ_Constant.BoomerangBlades.Speed * 2,
            EffectType: "boomerang_blades",
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
        EnemyPrewarmPerType: 1,
        GunBulletPrewarm: 1,
        CannonBulletPrewarm: 1,
        MinePrewarm: 1,
        KnifeEffectPrewarm: 1,
        ShieldProjectilePrewarm: 1,
        BlueExplosionPrewarm: 1,
        CellMoveEffectPrewarm: 1,
        CellUpgradeEffectPrewarm: 1,
        BossLaoSaiArrowPrewarm: 1,
        BossDianYuZhangSlashPrewarm: 1,
        EnemyCommonBulletPrewarm: 1,
        BossGongZiBombPrewarm: 1,
        BossLaoTaiTankPrewarm: 1,
        BossGuanTouShieldPrewarm: 1,
        BossHunLuanSkillPrewarm: 1,
        BlockBridgeDogBulletPrewarm: 1,
        BlockBridgeDogUltimatePrewarm: 1,
        SonicTrapPrewarm: 1,
        ShockPulsePrewarm: 1,
        RedDogAttackEffectPrewarm: 1,
        FengDogAttackEffectPrewarm: 1,
        ElectromagneticFieldPrewarm: 1,
        WheatMouseBulletPrewarm: 1,
        ElectromagneticBlindPrewarm: 1,
        BoomerangBladePrewarm: 1,
    };

    /** 防止单位停在攻击范围临界点时因浮点误差反复进入移动状态。 */
    public static readonly EnemyCombat = {
        AttackPositionTolerance: 2,
        /** 所有普通击退共用的平滑移动时间，使用减速曲线并受全局时间倍率影响。 */
        KnockbackDuration: 0.22,
    };

    /** Inspector 未绑定时使用这些Bundle内路径自动加载。 */
    public static readonly EnemyPrefabPaths: string[] = [
        "Prefabs/单位/哈夫克士兵",
        "Prefabs/单位/阿萨拉士兵",
    ];

    /** 包含手动召唤的敌人；是否自动刷新仍由 EnemyPrefabPaths 决定。 */
    public static readonly EnemyPrefabPathByName: Record<string, string> = {
        "哈夫克士兵": "Prefabs/单位/哈夫克士兵",
        "阿萨拉士兵": "Prefabs/单位/阿萨拉士兵",
        "牢赛": "Prefabs/单位/牢赛",
        "典狱长": "Prefabs/单位/典狱长",
        "公子": "Prefabs/单位/公子",
        "牢太": "Prefabs/单位/牢太",
        "光头": "Prefabs/单位/光头",
        "混乱": "Prefabs/单位/混乱",
    };

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
        "牢赛": {
            MaxHealth: 1200,
            MoveSpeed: 65,
            AttackRange: 360,
            AttackPositionOffset: 0,
            AttackInterval: 2.4,
            AttackDamage: 35,
            MoveAnimation: "zoulu",
            AttackAnimation: "gongji",
            HitAnimation: "shouji",
            HitDuration: 0.4,
            DeathAnimation: "siwang",
            DeathDuration: 1.5,
            SpawnPositionMode: "center",
        },
        "典狱长": {
            MaxHealth: 1800,
            MoveSpeed: 58,
            AttackRange: 20,
            AttackPositionOffset: 0,
            AttackInterval: 1.2,
            AttackDamage: 45,
            MoveAnimation: "zoulu",
            AttackAnimation: "gongji",
            HitAnimation: "shouji",
            HitDuration: 0.45,
            DeathAnimation: "siwang",
            DeathDuration: 1.6,
            SpawnPositionMode: "center",
        },
        "公子": {
            MaxHealth: 1500,
            MoveSpeed: 62,
            AttackRange: 400,
            AttackPositionOffset: 0,
            AttackInterval: 1.2,
            AttackDamage: 32,
            MoveAnimation: "zoulu",
            AttackAnimation: "gongji",
            HitAnimation: "shouji",
            HitDuration: 0.42,
            DeathAnimation: "siwang",
            DeathDuration: 1.5,
            SpawnPositionMode: "center",
        },
        "牢太": {
            MaxHealth: 1650,
            MoveSpeed: 60,
            AttackRange: 390,
            AttackPositionOffset: 0,
            AttackInterval: 2.35,
            AttackDamage: 34,
            MoveAnimation: "zoulu",
            AttackAnimation: "gongji",
            HitAnimation: "shouji",
            HitDuration: 0.44,
            DeathAnimation: "siwang",
            DeathDuration: 1.55,
            SpawnPositionMode: "center",
        },
        "光头": {
            MaxHealth: 1750,
            MoveSpeed: 58,
            AttackRange: 400,
            AttackPositionOffset: 0,
            AttackInterval: 1,
            AttackDamage: 36,
            MoveAnimation: "zoulu",
            AttackAnimation: "gongji",
            HitAnimation: "shouji",
            HitDuration: 0.44,
            DeathAnimation: "siwang",
            DeathDuration: 1.55,
            SpawnPositionMode: "center",
        },
        "混乱": {
            MaxHealth: 1800,
            MoveSpeed: 58,
            AttackRange: 410,
            AttackPositionOffset: 0,
            AttackInterval: 1.8,
            AttackDamage: 38,
            MoveAnimation: "zoulu",
            AttackAnimation: "gongji",
            HitAnimation: "shouji",
            HitDuration: 0.44,
            DeathAnimation: "siwang",
            DeathDuration: 1.55,
            SpawnPositionMode: "center",
        },
    };

    /** 所有Boss共用的状态条和破韧表现。 */
    public static readonly BossCommon = {
        HealthBarPrefabPath: "Prefabs/UI/血条",
        TenacityBarPrefabPath: "Prefabs/UI/韧性条",
        StatusBarTweenDuration: 0.3,
        TenacityBreakStunDuration: 3,
    };

    /** 牢赛专属战斗数值；动画内的具体发箭时间在其专属脚本顶部调整。 */
    public static readonly BossLaoSai = {
        ArrowPrefabPath: "Prefabs/投掷物/Boss_牢赛_弓箭",
        ArrowSpeed: 1050,
        ArrowHitDistance: 25,
        ArrowHitEffectDuration: 0,
        SkillMinInterval: 8,
        SkillMaxInterval: 15,
        SkillArrowDamage: 28,
        SkillAnimation: "jineng",
        MaxTenacity: 300,
        /** 伤害转换为韧性伤害的倍率。 */
        TenacityDamageScale: 1,
        /** 韧性清空并触发受击后，经过多少秒直接回满。 */
        TenacityRecoveryDelay: 5,
    };

    /** 典狱长：近战普通攻击，间隔释放一枚从右向左飞行的刀光。 */
    public static readonly BossDianYuZhang = {
        SkillEffectPrefabPath: "Prefabs/特效/典狱长技能特效",
        MaxTenacity: 450,
        TenacityDamageScale: 1,
        TenacityRecoveryDelay: 6,
        SkillMinInterval: 8,
        SkillMaxInterval: 13,
        SkillAnimation: "jineng",
        IdleAnimation: "daiji",
        /** 普通攻击动画开始后结算城墙伤害的时间。 */
        NormalDamageDelay: 0.45,
        NormalAnimationDuration: 1.05,
        /** 技能动画开始后生成刀光的时间。 */
        SkillSpawnDelay: 0.55,
        SkillAnimationDuration: 1.25,
        SkillDamage: 120,
        SkillEffectSpeed: 720,
        SkillEffectMaxDistance: 1100,
        SkillEffectHitDistance: 35,
        SkillEffectAnimation: "animation",
        SkillLaunchOffsetX: -40,
        SkillLaunchOffsetY: 65,
    };

    /** 无碰撞检测的敌方直线子弹，未来远程敌人可共同使用。 */
    public static readonly EnemyCommonBullet = {
        PrefabPath: "Prefabs/投掷物/敌对通用子弹",
        Speed: 1000,
        HitDistance: 20,
        HitEffectDuration: 0.25,
    };

    /** 公子：手枪普通攻击，技能向城墙抛掷炸弹；jineng2暂不使用。 */
    public static readonly BossGongZi = {
        BombPrefabPath: "Prefabs/特效/公子技能特效",
        MaxTenacity: 380,
        TenacityDamageScale: 1,
        TenacityRecoveryDelay: 6,
        IdleAnimation: "daiji",
        SkillAnimation: "jineng",
        NormalFireDelay: 0.1,
        NormalAnimationDuration: 0.5,
        SkillMinInterval: 9,
        SkillMaxInterval: 15,
        SkillThrowDelay: 0.5,
        SkillAnimationDuration: 1.15,
        BombDamage: 140,
        BombSpeed: 620,
        BombArcHeight: 240,
        BombSpinSpeed: 360,
        BombTargetOffsetY: 35,
        BombExplosionAnimation: "animation",
        /** 爆炸动画开始后延迟多少秒结算城墙伤害。 */
        BombDamageDelay: 0.1,
        BombExplosionFallbackDuration: 0.8,
        LaunchPointNames: ["子弹发射点位", "子弹发射点"],
    };

    /** 牢太：远程射击，并召唤上下两辆临时战车。 */
    public static readonly BossLaoTai = {
        TankPrefabPath: "Prefabs/投掷物/Boss_牢太_战车",
        MaxTenacity: 420,
        TenacityDamageScale: 1,
        TenacityRecoveryDelay: 6,
        IdleAnimation: "daiji",
        SkillAnimation: "jineng",
        NormalFireDelay: 0.34,
        NormalAnimationDuration: 0.95,
        SkillMinInterval: 10,
        SkillMaxInterval: 16,
        TankSummonDelay: 0.55,
        SkillAnimationDuration: 1.2,
        TankVerticalOffset: 200,
        TankSpawnEdgePadding: 40,
        TankAreaEdgePadding: 45,
        TankMoveSpeed: 420,
        TankArrivalDistance: 10,
        TankAttackDamage: 28,
        TankAttackInterval: 0.75,
        TankFireDelay: 0.28,
        TankAttackAnimationDuration: 0.72,
        TankAttackCount: 3,
        TankEnterAnimation: "chuchang",
        TankIdleAnimation: "yidong",
        TankAttackAnimation: "gongji",
        TankDeathAnimation: "siwang",
        TankDeathFallbackDuration: 0.9,
        LaunchPointNames: ["子弹发射点位", "子弹发射点"],
    };

    /** 光头：远程射击，技能期间由护罩提供生命与韧性双重无敌。 */
    public static readonly BossGuanTou = {
        ShieldPrefabPath: "Prefabs/特效/光头技能特效",
        MaxTenacity: 440,
        TenacityDamageScale: 1,
        TenacityRecoveryDelay: 6,
        IdleAnimation: "daiji",
        SkillAnimation: "jineng",
        NormalFireDelay: 0.12,
        NormalAnimationDuration: 0.35,
        SkillMinInterval: 10,
        SkillMaxInterval: 16,
        ShieldActivateDelay: 0.45,
        SkillAnimationDuration: 1.1,
        ShieldAnimation: "animation",
        /** 护罩动画循环完成这些次数后解除无敌。 */
        ShieldLoopCount: 5,
        /** Spine未能正常回调时解除护罩的总兜底时间。 */
        ShieldFallbackDuration: 10,
        LaunchPointNames: ["子弹发射点位", "子弹发射点"],
    };

    /** 混乱：远程射击，技能直接在城墙位置生成一次伤害特效。 */
    public static readonly BossHunLuan = {
        SkillEffectPrefabPath: "Prefabs/特效/混乱技能特效",
        MaxTenacity: 460,
        TenacityDamageScale: 1,
        TenacityRecoveryDelay: 6,
        IdleAnimation: "daiji",
        SkillAnimation: "jineng",
        NormalFireDelay: 0.2,
        NormalAnimationDuration: 0.7,
        SkillMinInterval: 10,
        SkillMaxInterval: 16,
        /** Boss技能动画开始后，多久在墙上生成特效。 */
        SkillEffectDelay: 0.5,
        /** 技能动画开始后，每一枚附加子弹的发射时间；可增删数组项。 */
        SkillBulletDelays: [0.75, 0.8, 0.85],
        SkillAnimationDuration: 1.15,
        SkillDamage: 150,
        SkillEffectAnimation: "animation",
        /** 特效出现后延迟多少秒伤害城墙。 */
        SkillDamageDelay: 0.1,
        SkillEffectFallbackDuration: 1.2,
        SkillEffectOffsetX: 0,
        SkillEffectOffsetY: 0,
        LaunchPointNames: ["子弹发射点位", "子弹发射点"],
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
        Stun: {
            EffectName: "眩晕特效",
            PrefabPath: "Prefabs/特效/眩晕特效",
            FallbackDuration: 3,
        },
    };

    /** 普通攻击骨骼动画同步参数。动画会在本次攻击间隔的该比例内播完，留少量待机过渡。 */
    public static readonly CombatAnimation = {
        CompletionRatio: 0.9,
        MinimumPlaybackScale: 1,
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

    public static readonly BlockBridgeDogProjectile = {
        PrefabPath: "Prefabs/投掷物/堵桥狗子弹",
        LaunchNodeName: "子弹发射点位",
        AttackAnimation: "gongji",
        IdleAnimation: "daiji",
        HitDistance: 20,
        HitEffectDuration: 0.2,
        KillExperience: 1,
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
        "堵桥": [
            { Money: 2, Food: 2 }, { Money: 4, Food: 4 }, { Money: 8, Food: 8 },
            { Money: 16, Food: 16 }, { Money: 32, Food: 32 }, { Money: 64, Food: 64 },
        ],
        "狗": [
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0.45,
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0,
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
            AttackFireDelay: 0.4,
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
        "堵桥": {
            Name: "堵桥",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "狗": {
            Name: "狗",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "堵桥狗": {
            Name: "堵桥狗",
            AttackFireDelay: 0.2,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 25, AttackInterval: 1, AttackRange: 950, BulletSpeed: 1050 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 42, AttackInterval: 0.8, AttackRange: 980, BulletSpeed: 1100 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 70, AttackInterval: 0.6, AttackRange: 1010, BulletSpeed: 1150 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 115, AttackInterval: 0.5, AttackRange: 1040, BulletSpeed: 1200 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 185, AttackInterval: 0.4, AttackRange: 1070, BulletSpeed: 1250 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 300, AttackInterval: 0.3, AttackRange: 1100, BulletSpeed: 1300 },
            ],
        },
        "老": {
            Name: "老",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "黑": {
            Name: "黑",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "老黑": {
            Name: "老黑",
            AttackFireDelay: 0.25,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 32, AttackInterval: 1.3, AttackRange: 950, BulletSpeed: 1050 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 52, AttackInterval: 1.15, AttackRange: 980, BulletSpeed: 1100 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 85, AttackInterval: 1, AttackRange: 1010, BulletSpeed: 1150 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 135, AttackInterval: 0.85, AttackRange: 1040, BulletSpeed: 1200 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 215, AttackInterval: 0.72, AttackRange: 1070, BulletSpeed: 1250 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 340, AttackInterval: 0.6, AttackRange: 1100, BulletSpeed: 1300 },
            ],
        },
        "哈": {
            Name: "哈",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "基蜂": {
            Name: "基蜂",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "哈基蜂": {
            Name: "哈基蜂",
            AttackFireDelay: 0.25,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 28, AttackInterval: 1.2, AttackRange: 950, BulletSpeed: 1050 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 46, AttackInterval: 1.08, AttackRange: 980, BulletSpeed: 1100 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 76, AttackInterval: 0.96, AttackRange: 1010, BulletSpeed: 1150 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 122, AttackInterval: 0.84, AttackRange: 1040, BulletSpeed: 1200 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 195, AttackInterval: 0.72, AttackRange: 1070, BulletSpeed: 1250 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 310, AttackInterval: 0.6, AttackRange: 1100, BulletSpeed: 1300 },
            ],
        },
        "板": {
            Name: "板",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "老板": {
            Name: "老板",
            AttackFireDelay: 0.25,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 24, AttackInterval: 1.4, AttackRange: 950, BulletSpeed: 1050 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 40, AttackInterval: 1.25, AttackRange: 980, BulletSpeed: 1100 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 66, AttackInterval: 1.1, AttackRange: 1010, BulletSpeed: 1150 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 108, AttackInterval: 0.95, AttackRange: 1040, BulletSpeed: 1200 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 175, AttackInterval: 0.8, AttackRange: 1070, BulletSpeed: 1250 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 280, AttackInterval: 0.68, AttackRange: 1100, BulletSpeed: 1300 },
            ],
        },
        "威": {
            Name: "威",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "虫": {
            Name: "虫",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "威虫": {
            Name: "威虫",
            AttackFireDelay: 0.25,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 26, AttackInterval: 1.3, AttackRange: 950, BulletSpeed: 1050 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 43, AttackInterval: 1.18, AttackRange: 980, BulletSpeed: 1100 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 72, AttackInterval: 1.05, AttackRange: 1010, BulletSpeed: 1150 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 118, AttackInterval: 0.92, AttackRange: 1040, BulletSpeed: 1200 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 190, AttackInterval: 0.78, AttackRange: 1070, BulletSpeed: 1250 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 305, AttackInterval: 0.65, AttackRange: 1100, BulletSpeed: 1300 },
            ],
        },
        "疯": {
            Name: "疯",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "红": {
            Name: "红",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "红狗": {
            Name: "红狗",
            AttackFireDelay: 0.25,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            AttackAnimation: "gongji",
            // gongji 的 0~0.333秒几乎是静止姿势，跳过后可消除每次起手的停顿感。
            AttackAnimationStartTime: 0.3,
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 28, AttackInterval: 1.15, AttackRange: 820 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 47, AttackInterval: 1.02, AttackRange: 870 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 78, AttackInterval: 0.9, AttackRange: 920 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 128, AttackInterval: 0.78, AttackRange: 980 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 205, AttackInterval: 0.66, AttackRange: 1040 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 330, AttackInterval: 0.55, AttackRange: 1200 },
            ],
        },
        "疯狗": {
            Name: "疯狗",
            AttackFireDelay: 0.25,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            AttackAnimation: "gongji",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 20, AttackInterval: 1.2, AttackRange: 500 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 36, AttackInterval: 1.08, AttackRange: 560 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 62, AttackInterval: 0.96, AttackRange: 620 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 105, AttackInterval: 0.84, AttackRange: 680 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 175, AttackInterval: 0.72, AttackRange: 740 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 290, AttackInterval: 0.6, AttackRange: 800 },
            ],
        },
        "麦": {
            Name: "麦",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "小鼠": {
            Name: "小鼠",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "麦小鼠": {
            Name: "麦小鼠",
            AttackFireDelay: 0.25,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            AttackAnimation: "gongji",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 40, AttackInterval: 1.8, AttackRange: 1200, BulletSpeed: 1500 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 66, AttackInterval: 1.65, AttackRange: 1240, BulletSpeed: 1550 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 108, AttackInterval: 1.5, AttackRange: 1280, BulletSpeed: 1600 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 176, AttackInterval: 1.35, AttackRange: 1320, BulletSpeed: 1650 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 285, AttackInterval: 1.2, AttackRange: 1360, BulletSpeed: 1700 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 460, AttackInterval: 1.05, AttackRange: 1400, BulletSpeed: 1750 },
            ],
        },
        "幽默": {
            Name: "幽默",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "男": {
            Name: "男",
            AttackFireDelay: 0,
            ResourceType: "none",
            PurchaseWeight: 5,
            ItemLockWeight: 3,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 2,
            IsNameUnit: true,
            IdleAnimation: "animation",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0 },
            ],
        },
        "幽默男": {
            Name: "幽默男",
            AttackFireDelay: 0.25,
            ResourceType: "none",
            PurchaseWeight: 0,
            ItemLockWeight: 0,
            BattlePlacement: "formation",
            MaxLevel: 6,
            UpgradeTimes: 5,
            MergeSameLevelCount: 0,
            IsNameUnit: true,
            IdleAnimation: "daiji",
            AttackAnimation: "gongji",
            Levels: [
                { Level: 1, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 30, AttackInterval: 1.25, AttackRange: 950, BulletSpeed: 1050 },
                { Level: 2, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 49, AttackInterval: 1.12, AttackRange: 980, BulletSpeed: 1100 },
                { Level: 3, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 80, AttackInterval: 1, AttackRange: 1010, BulletSpeed: 1150 },
                { Level: 4, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 130, AttackInterval: 0.88, AttackRange: 1040, BulletSpeed: 1200 },
                { Level: 5, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 210, AttackInterval: 0.76, AttackRange: 1070, BulletSpeed: 1250 },
                { Level: 6, SpritePath: "", ProductionPerSecond: 0, MaxHealth: 0, AttackDamage: 340, AttackInterval: 0.64, AttackRange: 1100, BulletSpeed: 1300 },
            ],
        },
    };

    public static GetMaterialConfig(name: string): WZSJZ_MaterialConfig | null {
        return this.MaterialConfigs[name] || null;
    }

    public static GetAttackFireDelay(name: string): number {
        return Math.max(0, this.GetMaterialConfig(name)?.AttackFireDelay || 0);
    }

    public static GetNanoRepairHeal(level: number): number {
        const index = Math.max(0, Math.min(
            this.NanoRepair.HealByLevel.length - 1,
            Math.floor(level) - 1,
        ));
        return Math.max(0, this.NanoRepair.HealByLevel[index] || 0);
    }

    public static GetElectromagneticBlindDamage(level: number): number {
        const index = Math.max(0, Math.min(
            this.ElectromagneticBlind.DamageByLevel.length - 1,
            Math.floor(level) - 1,
        ));
        return Math.max(0, this.ElectromagneticBlind.DamageByLevel[index] || 0);
    }

    public static GetBoomerangBladeDamage(level: number): number {
        const index = Math.max(0, Math.min(
            this.BoomerangBlades.DamageByLevel.length - 1,
            Math.floor(level) - 1,
        ));
        return Math.max(0, this.BoomerangBlades.DamageByLevel[index] || 0);
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
