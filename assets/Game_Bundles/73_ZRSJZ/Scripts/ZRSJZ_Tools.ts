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
        // 所有进入仓库的道具默认只放在“全部”。分类由玩家在仓库界面手动整理。
        return ZRSJZ_INVENTORY.仓库_全部;
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
            inventory == ZRSJZ_INVENTORY.仓库_物品 || inventory == ZRSJZ_INVENTORY.仓库_装备 || inventory == ZRSJZ_INVENTORY.保险箱 ||
            inventory == ZRSJZ_INVENTORY.物资 || inventory == ZRSJZ_INVENTORY.背包;
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

    public static GetDate(): string {
        const date = new Date();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
        return `${date.getFullYear()}.${month}.${day}`;
    }

    /** 返回指定日期到今天已经过去的自然日数；今天或未来日期返回 0。 */
    public static GetDaysSince(date: string): number {
        const match = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(date?.trim() ?? "");
        if (!match) return 0;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const inputDate = new Date(Date.UTC(year, month - 1, day));
        if (
            inputDate.getUTCFullYear() !== year
            || inputDate.getUTCMonth() !== month - 1
            || inputDate.getUTCDate() !== day
        ) {
            return 0;
        }

        const now = new Date();
        const todayTimestamp = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        const elapsedDays = Math.floor((todayTimestamp - inputDate.getTime()) / 86_400_000);
        return Math.max(0, elapsedDays);
    }



}
