import { ZRSJZ_PROP_CONFIG } from './ZRSJZ_Constant';

export type ZRSJZ_ForgeCategory = '枪械' | '头盔' | '防弹衣' | '背包' | '近战';

export type ZRSJZ_ForgeMaterial = {
    name: string,
    count: number,
};

export type ZRSJZ_ForgeRecipe = {
    itemName: string,
    category: ZRSJZ_ForgeCategory,
    propType: string,
    quality: string,
    value: number,
    goldCost: number,
    durationHours: number,
    materials: readonly ZRSJZ_ForgeMaterial[],
    ordinaryMaterialValue: number,
};

export const ZRSJZ_FORGE_CATEGORIES: readonly ZRSJZ_ForgeCategory[] = [
    '枪械',
    '头盔',
    '防弹衣',
    '背包',
    '近战',
];

const CATEGORY_BY_PROP_TYPE: Readonly<Record<string, ZRSJZ_ForgeCategory>> = {
    '枪': '枪械',
    '头盔': '头盔',
    '防弹衣': '防弹衣',
    '背包': '背包',
    '刀': '近战',
};

const BLUEPRINT_BY_CATEGORY: Readonly<Record<ZRSJZ_ForgeCategory, string>> = {
    '枪械': '枪蓝图',
    '头盔': '头盔蓝图',
    '防弹衣': '防弹衣蓝图',
    '背包': '背包蓝图',
    '近战': '刀蓝图',
};

const COMMON_MATERIALS = [
    '切割刀', '黑色手表', '哑铃', '水泥石砖', '工业图纸', '量子U盘',
    '剪刀', '手套', '无线便携电钻', '高精数显卡尺', '电动马达',
];

const MATERIAL_POOLS: Readonly<Record<ZRSJZ_ForgeCategory, readonly string[]>> = {
    '枪械': ['脑机数据', '军用电话', '汽车燃油', '协议箱', '磁轴键盘',
        '实验数据', '高速阵列', '终端', '炮弹', '155炮弹', '无人机', '显卡',
        '供能单元', '装甲车电池', '动力电池组', '刀片服务器', '反应炉',
        '军用雷达', '步战车', '火箭燃料', '坦克', '浮力机器设备'],
    '头盔': ['镜子', '怀表', '脑机数据', '军用电话', '协议箱', '实验数据',
        '高速阵列', '高科技护目镜', '军用电台', '信息终端', '云存储',
        '终端', '显卡', '外星人笔记本', '卫星锅', '摄影机',
        '军用雷达', '飞行记录仪', '笔记本电脑', '医疗机器人'],
    '防弹衣': ['沙袋', '水泥', '油漆桶', '汽车燃油', '机器人', '金条',
        '化石', '玄武', '装甲车电池', '动力电池组', '反应炉', '绿瓦斯罐',
        '呼吸机', '半身像', '勇士半身像', '步战车', 'ECMO', '碳纤维', '坦克'],
    '背包': ['地图', '沙袋', '太阳能板', '协议箱', '吸尘器', '高档座椅',
        '磁轴键盘', '扫地机器', '军用地图匣', '八音盒', '无人机',
        '各种红蛋', '幸运修勾', '快乐小熊', '魔术兔子', '嘟嘟骑士',
        '信息大终端', '浮力机器设备', '飞行记录仪', '碳纤维', '医疗机器人'],
    '近战': ['古玩钱币', '油漆桶', '怀表', '金玫瑰', '化石', '金条',
        '万金泪冠', '曼德尔', '万金', '155炮弹', '各种红蛋', '天圆地方',
        '反应炉', '半身像', '黄金鳄鱼头', '勇士半身像', '火箭燃料', '碳纤维'],
};

// Endgame rifles use distinct, hand-tuned material sets; blueprint is added below.
const SPECIAL_WEAPON_MATERIALS: Readonly<Record<string, readonly ZRSJZ_ForgeMaterial[]>> = {
    '霜月狼': [
        { name: '军用雷达', count: 1 }, { name: '高速阵列', count: 3 },
        { name: '供能单元', count: 2 }, { name: '脑机数据', count: 4 },
    ],
    '裂海鲨': [
        { name: '无人机', count: 3 }, { name: '刀片服务器', count: 3 },
        { name: '动力电池组', count: 2 }, { name: '实验数据', count: 2 },
    ],
    '焚天龙': [
        { name: '火箭燃料', count: 1 }, { name: '反应炉', count: 3 },
        { name: '155炮弹', count: 3 }, { name: '装甲车电池', count: 2 },
    ],
};

function GetDurationHours(value: number): number {
    if (value < 250000) return 1;
    if (value < 500000) return 2;
    if (value < 1000000) return 3;
    if (value < 2000000) return 4;
    if (value < 5000000) return 6;
    return 8;
}

function GetTargetMaterialRatio(value: number): number {
    const progress = Math.min(1, Math.max(0, Math.log10(Math.max(1, value / 100000)) / 2));
    return 0.34 + progress * 0.11;
}

function AddMaterial(
    materials: ZRSJZ_ForgeMaterial[],
    name: string,
    count: number,
): void {
    if (count <= 0) return;
    const existing = materials.find(item => item.name === name);
    if (existing) existing.count += count;
    else materials.push({ name, count });
}

/** Stable per-equipment selection; no Math.random or dependency on catalog ordering. */
function MaterialHash(text: string): number {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    }
    return hash >>> 0;
}

function BuildOrdinaryMaterials(
    category: ZRSJZ_ForgeCategory,
    itemValue: number,
    itemName: string,
): ZRSJZ_ForgeMaterial[] {
    const target = Math.round(itemValue * GetTargetMaterialRatio(itemValue));
    const candidates = Array.from(new Set([...MATERIAL_POOLS[category], ...COMMON_MATERIALS]))
        .map(name => ({ name, value: ZRSJZ_PROP_CONFIG.get(name)?.UnitPrice ?? 0 }))
        .filter(item => item.value > 0);
    const materials: ZRSJZ_ForgeMaterial[] = [];
    // Core, secondary, support and finishing materials. Blueprint + four kinds = five slots.
    [0.40, 0.30, 0.20, 0.10].forEach((share, slot) => {
        const budget = Math.floor(target * share);
        const affordable = candidates.filter(item => item.value <= budget
            && !materials.some(material => material.name === item.name));
        const practical = affordable.filter(item => item.value >= budget / 8);
        const pool = practical.length ? practical : affordable;
        pool.sort((a, b) => MaterialHash(itemName + ':' + slot + ':' + a.name)
            - MaterialHash(itemName + ':' + slot + ':' + b.name)
            || a.name.localeCompare(b.name));
        const selected = pool[0];
        if (selected) AddMaterial(materials, selected.name, Math.max(1, Math.floor(budget / selected.value)));
    });
    // Fill the rounding gap with already selected kinds; never introduce a sixth ingredient.
    const selected = materials.map(material => ({
        material, value: ZRSJZ_PROP_CONFIG.get(material.name)!.UnitPrice,
    })).sort((a, b) => b.value - a.value);
    let total = selected.reduce((sum, item) => sum + item.value * item.material.count, 0);
    for (const item of selected) {
        const extra = Math.max(0, Math.floor((target - total) / item.value));
        item.material.count += extra;
        total += extra * item.value;
    }
    const cheapest = selected[selected.length - 1];
    if (cheapest && total < target && total + cheapest.value <= itemValue * 0.5) {
        cheapest.material.count++;
    }
    return materials;
}

function BuildRecipes(): ZRSJZ_ForgeRecipe[] {
    const recipes: ZRSJZ_ForgeRecipe[] = [];
    ZRSJZ_PROP_CONFIG.forEach(config => {
        const category = CATEGORY_BY_PROP_TYPE[config.PropType];
        const value = config.UnitPrice;
        if (!category || value <= 100000) return;

        const ordinaryMaterials = SPECIAL_WEAPON_MATERIALS[config.Name]?.map(material => ({ ...material }))
            ?? BuildOrdinaryMaterials(category, value, config.Name);
        const ordinaryMaterialValue = ordinaryMaterials.reduce(
            (sum, material) => sum
                + (ZRSJZ_PROP_CONFIG.get(material.name)?.UnitPrice ?? 0) * material.count,
            0,
        );
        recipes.push({
            itemName: config.Name,
            category,
            propType: config.PropType,
            quality: config.Quality,
            value,
            goldCost: Math.max(10000, Math.round(value * 0.08 / 1000) * 1000),
            durationHours: GetDurationHours(value),
            materials: [
                { name: BLUEPRINT_BY_CATEGORY[category], count: 1 },
                ...ordinaryMaterials,
            ],
            ordinaryMaterialValue,
        });
    });

    return recipes.sort((a, b) => {
        const categoryDifference = ZRSJZ_FORGE_CATEGORIES.indexOf(a.category)
            - ZRSJZ_FORGE_CATEGORIES.indexOf(b.category);
        return categoryDifference || a.value - b.value;
    });
}

export const ZRSJZ_FORGE_RECIPES: readonly ZRSJZ_ForgeRecipe[] = BuildRecipes();

export function GetForgeRecipe(itemName: string): ZRSJZ_ForgeRecipe | null {
    return ZRSJZ_FORGE_RECIPES.find(recipe => recipe.itemName === itemName) ?? null;
}
