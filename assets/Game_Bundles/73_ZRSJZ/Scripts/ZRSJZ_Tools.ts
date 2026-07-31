import { Prefab, SpriteFrame, UITransform, Node, AudioClip, Texture2D } from "cc";
import { BundleManager } from "db://assets/Scripts/Framework/Managers/BundleManager";
import { ZRSJZ_INVENTORY } from "./ZRSJZ_Constant";

export class ZRSJZ_Tools {

    public static LoadPrefab(path: string): Promise<Prefab> {
        return new Promise((resolve, reject) => {
            BundleManager.GetBundle("73_ZRSJZ").load(path, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    reject(err);
                    console.error(`加载 Bundle: 73_ZRSJZ Prefab 加载失败 Path: ${path}`);
                } else {
                    resolve && resolve(prefab);
                }
            });
        });
    }

    public static LoadSprites(path: string): Promise<SpriteFrame[]> {
        return new Promise((resolve, reject) => {
            BundleManager.GetBundle("73_ZRSJZ").loadDir(path, SpriteFrame, (err: any, sprites: SpriteFrame[]) => {
                if (err) {
                    reject(err);
                    console.error(`加载 Bundle: 73_ZRSJZ SpriteFrame 加载失败 Path: ${path}`);
                    return;
                }
                resolve && resolve(sprites);
            });
        });
    }

    public static LoadAudioClips(bundlePath: string, resPath: string): Promise<AudioClip[]> {
        return new Promise((resolve, reject) => {
            BundleManager.GetBundle(bundlePath).loadDir(resPath, AudioClip, (err: any, sprites: AudioClip[]) => {
                if (err) {
                    reject(err);
                    console.error(`加载 Bundle: 73_ZRSJZ AudioBuffer 加载失败 Path: ${resPath}`);
                    return;
                }
                resolve && resolve(sprites);
            });
        });
    }

    /** 根据枚举值找key*/
    public static GetEnumKeyByValue(enumObj: any, value: any): string | undefined {
        // 遍历枚举对象的键和值
        for (let key in enumObj) {
            if (enumObj[key] === value) {
                return key;
            }
        }
        return undefined; // 如果没有找到匹配的值，返回undefined
    }

    public static GetInventoryByPropType(propType: string): ZRSJZ_INVENTORY {
        switch (propType) {
            case "头盔":
            case "防弹衣":
            case "背包":
                return ZRSJZ_INVENTORY.仓库_装备;
            case "枪":
            case "刀":
                return ZRSJZ_INVENTORY.仓库_武器;
            case "弹药":
                return ZRSJZ_INVENTORY.仓库_弹药;
            case "门禁卡":
            case "物品":
                return ZRSJZ_INVENTORY.仓库_物品;
        }
    }

    public static GetWeaponryIndexByInventory(inventory: ZRSJZ_INVENTORY): number {
        switch (inventory) {
            case ZRSJZ_INVENTORY.武器_枪:
                return 0;
            case ZRSJZ_INVENTORY.武器_头盔:
                return 1;
            case ZRSJZ_INVENTORY.武器_防弹衣:
                return 2;
            case ZRSJZ_INVENTORY.武器_背包:
                return 3;
            case ZRSJZ_INVENTORY.武器_刀:
                return 4;

        }
    }

    public static GetWeaponryIndexByType(propType: string): number {
        switch (propType) {
            case "枪":
                return 0;
            case "头盔":
                return 1;
            case "防弹衣":
                return 2;
            case "背包":
                return 3;
            case "刀":
                return 4;
        }
    }

    //能否滑动
    public static IsSlide(inventory: ZRSJZ_INVENTORY): boolean {
        return inventory == ZRSJZ_INVENTORY.仓库_全部 || inventory == ZRSJZ_INVENTORY.仓库_弹药 || inventory == ZRSJZ_INVENTORY.仓库_武器 ||
            inventory == ZRSJZ_INVENTORY.仓库_物品 || inventory == ZRSJZ_INVENTORY.仓库_装备 || inventory == ZRSJZ_INVENTORY.保险箱;
    }

    public static ScaleNodeToFit(targetNode: Node, parentWidth: number, parentHeight: number): void {
        if (!targetNode) {
            return;
        }

        const targetUITransform = targetNode.getComponent(UITransform);
        if (!targetUITransform) {
            return;
        }


        const targetWidth = targetUITransform.width;
        const targetHeight = targetUITransform.height;

        if (parentWidth <= 0 || parentHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
            return;
        }

        const scaleX = parentWidth / targetWidth;
        const scaleY = parentHeight / targetHeight;
        const scale = Math.floor(Math.min(scaleX, scaleY) * 100);

        targetNode.setScale(scale / 100, scale / 100, 1);
    }

}
