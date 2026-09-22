import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_GridData, ZRSJZ_INVENTORY, ZRSJZ_PropData, ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_QUALITY as Quality } from '../ZRSJZ_Constant';

/** 曼德尔砖是独立抽奖余额，与仓库中的红色战利品“曼德尔”无关。 */
export class ZRSJZ_MandellService {
    public static readonly DailyLimit = 3;
    public static readonly FreeCount = 5;
    public static readonly Rates = [
        { quality: Quality.紫色, rate: 0.75, animation: '1shishi' },
        { quality: Quality.金色, rate: 0.18, animation: '2chuanshuo' },
        { quality: Quality.红色, rate: 0.07, animation: '3shenhua' },
    ];
    public static get Balance(): number { return Math.max(0, Math.floor(ZRSJZ_GameData.Instance.MandellBricks || 0)); }
    public static get Pending() { return ZRSJZ_GameData.Instance.MandellPending; }
    public static Pool(quality?: Quality) {
        const excludedTypes = new Set(['枪', '刀', '头盔', '防弹衣', '背包', '弹药']);
        return Array.from(ZRSJZ_PROP_CONFIG.values()).filter(p => p.UnitPrice > 0
            && !excludedTypes.has(p.PropType)
            && this.Rates.some(r => r.quality === p.Quality) && (!quality || p.Quality === quality));
    }
    public static Roll(count: number, random: () => number = Math.random): string[] {
        if (count !== 1 && count !== 10) throw new Error('开启次数无效');
        const pools = this.Rates.map(r => this.Pool(r.quality));
        if (pools.some(pool => pool.length === 0)) throw new Error('奖池配置不完整');
        const pick = (index: number) => pools[index][Math.min(pools[index].length - 1, Math.floor(random() * pools[index].length))].Name;
        const names = Array.from({ length: count }, () => { const roll = random(); return pick(roll < .75 ? 0 : roll < .93 ? 1 : 2); });
        // 十连全部为紫色时，将最后一件提升为金色；保底不额外提高红色概率。
        if (count === 10 && names.every(name => ZRSJZ_PROP_CONFIG.get(name).Quality === Quality.紫色)) names[9] = pick(1);
        return names;
    }
    public static Begin(count: number): void {
        if (this.Pending) throw new Error('请先领取上次开启的奖励');
        if ((count !== 1 && count !== 10) || this.Balance < count) throw new Error('曼德尔砖不足');
        const names = this.Roll(count);
        const data = ZRSJZ_GameData.Instance;
        data.MandellBricks = this.Balance - count;
        data.MandellPending = { names, propIDs: [], granted: false };
        ZRSJZ_GameData.SaveData();
    }
    /** 一次同步提交道具实例与发奖标记，中断后按同一批实例继续入库，不重新抽取或扣款。 */
    public static Materialize(): void {
        const pending = this.Pending;
        if (!pending || pending.granted) return;
        const configs = pending.names.map(name => ZRSJZ_PROP_CONFIG.get(name));
        if (configs.some(config => !config)) throw new Error('奖励配置不存在');
        const data = ZRSJZ_GameData.Instance;
        for (const config of configs) {
            const id = `ZRSJZ_PropID_${++data.PropID}`;
            const prop = new ZRSJZ_PropData();
            prop.InstanceID = id; prop.Name = config.Name; prop.PropType = config.PropType;
            prop.UnitPrice = config.UnitPrice; prop.MaxCount = config.MaxCount; prop.CurCount = 1;
            prop.CurInventory = ZRSJZ_INVENTORY.仓库_全部;
            const [height, width] = config.GridType.split('_').map(Number);
            prop.Width = width; prop.Height = height;
            prop.GridData = [0, 1].map(() => { const grid = new ZRSJZ_GridData(); grid.IsRotate = false; grid.GridX = -1; grid.GridY = -1; return grid; });
            data.PropData[id] = prop;
            pending.propIDs.push(id);
        }
        pending.granted = true;
        ZRSJZ_GameData.SaveData();
    }
    public static Complete(): void { ZRSJZ_GameData.Instance.MandellPending = null; ZRSJZ_GameData.SaveData(); }
    public static Animation(names: readonly string[]): string {
        const rank = names.reduce((max, name) => Math.max(max, this.Rates.findIndex(r => r.quality === ZRSJZ_PROP_CONFIG.get(name)?.Quality)), 0);
        return this.Rates[rank].animation;
    }
    public static Remaining(): number {
        const now = new Date();
        const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const data = ZRSJZ_GameData.Instance;
        if (data.MandellFreeDate !== date) { data.MandellFreeDate = date; data.MandellFreeCount = 0; ZRSJZ_GameData.SaveData(); }
        return Math.max(0, this.DailyLimit - data.MandellFreeCount);
    }
    public static VideoReward(): () => boolean {
        let used = false;
        return () => {
            if (used || this.Remaining() <= 0) return false;
            used = true;
            const data = ZRSJZ_GameData.Instance;
            data.MandellBricks = this.Balance + this.FreeCount;
            data.MandellFreeCount++;
            ZRSJZ_GameData.SaveData();
            return true;
        };
    }
}
