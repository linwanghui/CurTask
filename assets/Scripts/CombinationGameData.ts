import { _decorator, sys } from 'cc';
const { ccclass } = _decorator;

export interface ZRSJZ_PropDataItem {
    Name: string;
    Num: number;
}

@ccclass('CombinationGameData')
export class CombinationGameData {
    private static readonly SaveKey: string = "CombinationGameData";
    private static _instance: CombinationGameData = null;

    public static get Instance(): CombinationGameData {
        if (!this._instance) this.ReadDate();
        return this._instance;
    }

    /** 真人三角洲道具（道具名、持有数量）。 */
    public ZRSJZ_PropData: ZRSJZ_PropDataItem[] = [];

    /** 增加联动道具；同名道具只累加数量，并在成功后立即保存。 */
    public AddZRSJZProp(name: string, amount: number = 1): ZRSJZ_PropDataItem | null {
        const safeName = typeof name === "string" ? name.trim() : "";
        const safeAmount = Number.isFinite(amount)
            ? Math.max(0, Math.floor(amount))
            : 0;
        if (!safeName || safeAmount <= 0) return null;

        this.NormalizePropData();
        let prop = this.ZRSJZ_PropData.find((item) => item.Name === safeName);
        if (prop) {
            prop.Num += safeAmount;
        } else {
            prop = { Name: safeName, Num: safeAmount };
            this.ZRSJZ_PropData.push(prop);
        }
        CombinationGameData.DateSave();
        return prop;
    }

    public static DateSave(): void {
        const data = CombinationGameData.Instance;
        const json = JSON.stringify({
            ZRSJZ_PropData: data.ZRSJZ_PropData,
        });
        sys.localStorage.setItem(this.SaveKey, json);
        console.log("联动数据存档");
    }

    public static ReadDate(): void {
        const savedJson = sys.localStorage.getItem(this.SaveKey);
        this._instance = new CombinationGameData();
        if (savedJson) {
            try {
                Object.assign(this._instance, JSON.parse(savedJson));
                console.log("联动数据读取");
            } catch (error) {
                console.warn("联动数据读取失败，已使用新存档", error);
            }
        } else {
            console.log("新建联动数据");
        }
        this._instance.NormalizePropData();
    }

    /** 清理异常数据并合并旧存档里可能存在的同名项。 */
    private NormalizePropData(): void {
        const merged = new Map<string, number>();
        const source = Array.isArray(this.ZRSJZ_PropData) ? this.ZRSJZ_PropData : [];
        source.forEach((item) => {
            const name = typeof item?.Name === "string" ? item.Name.trim() : "";
            const num = Number.isFinite(item?.Num)
                ? Math.max(0, Math.floor(item.Num))
                : 0;
            if (name && num > 0) merged.set(name, (merged.get(name) || 0) + num);
        });
        this.ZRSJZ_PropData = Array.from(merged, ([Name, Num]) => ({ Name, Num }));
    }
}


