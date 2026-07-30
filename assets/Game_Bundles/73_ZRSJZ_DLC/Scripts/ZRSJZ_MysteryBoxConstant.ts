import { ZRSJZ_PROP_QUALITY } from '../../73_ZRSJZ/Scripts/ZRSJZ_Constant';

export type ZRSJZ_MysteryBoxType = "普通箱" | "精品箱" | "极品箱";

export type ZRSJZ_MysteryBoxConfig = {
    price: number,
    columns: number,
    rows: number,
    minFillRate: number,
    maxFillRate: number,
};

export const ZRSJZ_MYSTERY_BOX_CONFIG: Record<
    ZRSJZ_MysteryBoxType,
    ZRSJZ_MysteryBoxConfig
> = {
    "普通箱": {
        price: 1000000,
        columns: 4,
        rows: 4,
        minFillRate: 0.50,
        maxFillRate: 1,
    },
    "精品箱": {
        price: 3000000,
        columns: 5,
        rows: 4,
        minFillRate: 0.60,
        maxFillRate: 1,
    },
    "极品箱": {
        price: 5000000,
        columns: 5,
        rows: 5,
        minFillRate: 0.70,
        maxFillRate: 1,
    },
};

export const ZRSJZ_MYSTERY_BOX_CELL_SIZE = 132;
export const ZRSJZ_MYSTERY_BOX_FRAME_PADDING = 96;
export const ZRSJZ_MYSTERY_BOX_AUDIO_LEAD_TIME = 0.35;
export const ZRSJZ_MYSTERY_BOX_SEARCH_RADIUS =
    ZRSJZ_MYSTERY_BOX_CELL_SIZE * 0.28 * 0.6;
export const ZRSJZ_MYSTERY_BOX_SEARCH_ROUND_DURATION = 0.4 / 0.6;
export const ZRSJZ_MYSTERY_BOX_ITEM_POP_DURATION = 0.22;
export const ZRSJZ_MYSTERY_BOX_ITEM_POP_SCALE = 1.16;
export const ZRSJZ_MYSTERY_BOX_SPINE_EFFECT_ANI_NAME = "animation";
export const ZRSJZ_MYSTERY_BOX_SPINE_EFFECT_SCALE = 0.5;

export const ZRSJZ_MYSTERY_BOX_REVEAL_DURATION: Record<string, number> = {
    [ZRSJZ_PROP_QUALITY.白色]: 0.6,
    [ZRSJZ_PROP_QUALITY.绿色]: 0.8,
    [ZRSJZ_PROP_QUALITY.蓝色]: 1.2,
    [ZRSJZ_PROP_QUALITY.紫色]: 1.6,
    [ZRSJZ_PROP_QUALITY.金色]: 2.2,
    [ZRSJZ_PROP_QUALITY.红色]: 3,
};

export const ZRSJZ_MYSTERY_BOX_QUALITY_RANK: Record<string, number> = {
    [ZRSJZ_PROP_QUALITY.白色]: 1,
    [ZRSJZ_PROP_QUALITY.绿色]: 2,
    [ZRSJZ_PROP_QUALITY.蓝色]: 3,
    [ZRSJZ_PROP_QUALITY.紫色]: 4,
    [ZRSJZ_PROP_QUALITY.金色]: 5,
    [ZRSJZ_PROP_QUALITY.红色]: 6,
};

export function FormatMysteryBoxValue(value: number): string {
    const safeValue = Math.max(0, Math.floor(value));
    if (safeValue < 10000) return safeValue.toString();

    const wan = safeValue / 10000;
    return `${wan >= 100 ? wan.toFixed(0) : wan.toFixed(1).replace(/\.0$/, "")}万`;
}
