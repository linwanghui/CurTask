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

const MATERIAL_POOLS: Readonly<Record<ZRSJZ_ForgeCategory, readonly string[]>> = {
    '枪械': ['装甲车电池', '供能单元', '脑机数据', '电动马达', '高精数显卡尺'],
    '头盔': ['装甲车电池', '高速阵列', '协议箱', '高精数显卡尺', '手套'],
    '防弹衣': ['各种红蛋', '高速阵列', '汽车燃油', '油漆桶', '水泥'],
    '背包': ['各种红蛋', '扫地机器', '磁轴键盘', '电动马达', '手套'],
    '近战': ['各种红蛋', '155炮弹', '金玫瑰', '电动马达', '无线便携电钻'],
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

function BuildOrdinaryMaterials(
    category: ZRSJZ_ForgeCategory,
    itemValue: number,
): ZRSJZ_ForgeMaterial[] {
    const target = Math.round(itemValue * GetTargetMaterialRatio(itemValue));
    const candidates = MATERIAL_POOLS[category]
        .map(name => ({ name, value: ZRSJZ_PROP_CONFIG.get(name)?.UnitPrice ?? 0 }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);
    const materials: ZRSJZ_ForgeMaterial[] = [];
    let total = 0;

    for (const candidate of candidates) {
        if (materials.length >= 4) break;
        const remaining = target - total;
        if (remaining <= 0) break;
        if (candidate.value > remaining * 1.12) continue;
        const count = Math.max(1, Math.min(8, Math.floor(remaining / candidate.value)));
        AddMaterial(materials, candidate.name, count);
        total += candidate.value * count;
    }

    const cheapest = candidates[candidates.length - 1];
    if (cheapest && total < target * 0.96) {
        const count = Math.max(1, Math.ceil((target - total) / cheapest.value));
        AddMaterial(materials, cheapest.name, count);
        total += cheapest.value * count;
    }

    const maxAllowed = itemValue * 0.50;
    const cheapestEntry = materials.find(item => item.name === cheapest?.name);
    while (cheapestEntry && cheapestEntry.count > 1 && total > maxAllowed) {
        cheapestEntry.count--;
        total -= cheapest.value;
    }

    return materials;
}

function BuildRecipes(): ZRSJZ_ForgeRecipe[] {
    const recipes: ZRSJZ_ForgeRecipe[] = [];
    ZRSJZ_PROP_CONFIG.forEach(config => {
        const category = CATEGORY_BY_PROP_TYPE[config.PropType];
        if (!category || config.UnitPrice <= 100000) return;

        const ordinaryMaterials = BuildOrdinaryMaterials(category, config.UnitPrice);
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
            value: config.UnitPrice,
            goldCost: Math.max(10000, Math.round(config.UnitPrice * 0.08 / 1000) * 1000),
            durationHours: GetDurationHours(config.UnitPrice),
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
