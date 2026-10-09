import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { CreateMatrixState, MatrixState } from '../../../73_ZRSJZ/Scripts/ZRSJZ_MatrixState';
import { ZRSJZ_INVENTORY, ZRSJZ_PROP_CONFIG, ZRSJZ_PropData, ZRSJZ_GridData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_EventManager';

export const MATRIX_CONFIG = {
    maxCards: 20, baseHours: 24, dailyBuyLimit: 5,
    minPrice: 120000, maxPrice: 320000, historyDays: 14,
};
export interface MatrixCandle { day: number; open: number; close: number; high: number; low: number; }

/** 同步扣款、产出和落盘；DLC 业务代码不被主包反向引用。 */
export class ZRSJZ_MatrixService {
    private static readonly Hour = 3600000;
    public static Day(now = Date.now()): number {
        const date = new Date(now);
        return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    }
    private static Int(value: number, max = Number.MAX_SAFE_INTEGER): number {
        return Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
    }
    public static get State(): MatrixState {
        const data = ZRSJZ_GameData.Instance;
        return data.Matrix ?? (data.Matrix = CreateMatrixState());
    }
    public static Hours(cards = this.State.cards): number { return MATRIX_CONFIG.baseHours - cards; }
    /** 只在开始使用该功能时启动计时，不向旧玩家追溯赠送历史产出。 */
    public static Settle(now = Date.now()): MatrixState {
        const s = this.State;
        const before = JSON.stringify(s);
        s.cards = this.Int(s.cards, MATRIX_CONFIG.maxCards);
        s.slots = Array.from({ length: MATRIX_CONFIG.maxCards }, (_, i) =>
            Array.isArray(s.slots) ? s.slots[i] === true : i < s.cards);
        s.cards = s.slots.filter(Boolean).length;
        s.coins = this.Int(s.coins); s.pending = this.Int(s.pending);
        s.progress = Number.isFinite(s.progress) ? Math.min(1 - Number.EPSILON, Math.max(0, s.progress)) : 0;
        s.lastTime = this.Int(s.lastTime);
        s.purchaseDay = this.Int(s.purchaseDay); s.purchased = this.Int(s.purchased, MATRIX_CONFIG.dailyBuyLimit);
        // 时间回拨不额外产出，也不反复恢复购买次数。
        if (!s.lastTime) s.lastTime = now;
        if (now > s.lastTime) {
            const progress = s.progress + (now - s.lastTime) / (this.Hours(s.cards) * this.Hour);
            const count = Math.floor(progress);
            s.pending = this.Int(s.pending + count);
            s.progress = progress - count;
            s.lastTime = now;
        }
        const day = this.Day(now);
        if (day > s.purchaseDay) { s.purchaseDay = day; s.purchased = 0; }
        if (JSON.stringify(s) !== before) ZRSJZ_GameData.SaveData();
        return s;
    }
    /** 不每帧写存档；界面仅用投影计算倒计时，交易前再结算落盘。 */
    public static Preview(now = Date.now()): { pending: number; progress: number; seconds: number } {
        const s = this.State;
        const total = s.progress + Math.max(0, now - s.lastTime) / (this.Hours() * this.Hour);
        const progress = total - Math.floor(total);
        return { pending: s.pending + Math.floor(total), progress,
            seconds: Math.ceil((1 - progress) * this.Hours() * 3600) };
    }
    private static Warehouse(inventory: ZRSJZ_INVENTORY): boolean {
        return [ZRSJZ_INVENTORY.仓库_全部, ZRSJZ_INVENTORY.仓库_物品, ZRSJZ_INVENTORY.仓库_武器,
            ZRSJZ_INVENTORY.仓库_装备, ZRSJZ_INVENTORY.仓库_弹药].includes(inventory);
    }
    public static CardsAvailable(): number {
        return Object.values(ZRSJZ_GameData.Instance.PropData).reduce((n, p) =>
            n + (p.Name === '显卡' && this.Warehouse(p.CurInventory) ? this.Int(p.CurCount) : 0), 0);
    }
    public static Install(now = Date.now(), slot = -1): string {
        const s = this.Settle(now);
        if (s.cards >= MATRIX_CONFIG.maxCards) return '显卡已装满（20/20）';
        if (slot < 0) slot = s.slots.indexOf(false);
        if (!Number.isInteger(slot) || slot >= MATRIX_CONFIG.maxCards || s.slots[slot]) return '该槽位已安装显卡';
        const data = ZRSJZ_GameData.Instance;
        const id = Object.keys(data.PropData).find(id => {
            const p = data.PropData[id];
            return p.Name === '显卡' && p.CurCount >= 1 && this.Warehouse(p.CurInventory);
        });
        if (!id) return '仓库显卡不足';
        const removed = --data.PropData[id].CurCount === 0;
        if (removed) delete data.PropData[id];
        // 先按旧周期结算，装卡后保留本轮完成比例，不能追溯提高离线产量。
        s.cards++;
        s.slots[slot] = true;
        ZRSJZ_GameData.SaveData();
        if (removed) ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SELL_PROP, id);
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        return '';
    }
    public static Claim(now = Date.now()): number {
        const s = this.Settle(now), amount = s.pending;
        if (!amount) return 0;
        s.coins += amount; s.pending = 0;
        ZRSJZ_GameData.SaveData();
        return amount;
    }
    /** 先保存仓库实例与拆卡结果，再由 UI 进行格子摆放/邮件兜底，不二次生成道具。 */
    public static Remove(slot: number, now = Date.now()): { error: string; id: string } {
        const s = this.Settle(now);
        if (!Number.isInteger(slot) || slot < 0 || slot >= MATRIX_CONFIG.maxCards || !s.slots[slot])
            return { error: '该槽位没有显卡', id: '' };
        const config = ZRSJZ_PROP_CONFIG.get('显卡');
        if (!config) return { error: '显卡配置不存在', id: '' };
        const data = ZRSJZ_GameData.Instance, prop = new ZRSJZ_PropData();
        data.PropID = Math.max(0, data.PropID || 0);
        do { prop.InstanceID = `ZRSJZ_PropID_${++data.PropID}`; } while (data.PropData[prop.InstanceID]);
        prop.Name = config.Name; prop.PropType = config.PropType; prop.UnitPrice = config.UnitPrice;
        prop.CurCount = 1; prop.MaxCount = config.MaxCount;
        prop.CurInventory = ZRSJZ_INVENTORY.仓库_全部; prop.OwnerPlayerIndex = -1;
        [prop.Height, prop.Width] = config.GridType.split('_').map(Number);
        prop.GridData = [0, 1].map(() => { const grid = new ZRSJZ_GridData(); grid.IsRotate = false; grid.GridX = -1; grid.GridY = -1; return grid; });
        data.PropData[prop.InstanceID] = prop;
        s.slots[slot] = false; s.cards--;
        ZRSJZ_GameData.SaveData();
        return { error: '', id: prop.InstanceID };
    }
    /** 固定日种子生成虚拟游戏行情；开关界面、重启和更换存档不改变当天价格。 */
    private static Random(day: number, salt: number): number {
        let x = (day ^ salt) >>> 0;
        x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
        x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
        return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
    }
    public static Price(day = this.Day()): number {
        const c = MATRIX_CONFIG;
        // 奇偶日使用交错的百元档位，保证相邻两天不会抽到完全相同的价格。
        const steps = Math.floor((c.maxPrice - c.minPrice - 100) / 200) + 1;
        return c.minPrice + Math.floor(this.Random(day, 7391) * steps) * 200 + (day % 2) * 100;
    }
    public static History(day = this.Day()): MatrixCandle[] {
        return Array.from({ length: MATRIX_CONFIG.historyDays }, (_, i) => {
            const d = day - MATRIX_CONFIG.historyDays + i + 1;
            const open = this.Price(d - 1), close = this.Price(d);
            const wick = Math.round(2000 + this.Random(d, 2718) * 10000);
            return { day: d, open, close, high: Math.max(open, close) + wick, low: Math.max(1, Math.min(open, close) - wick) };
        });
    }
    public static Buy(now = Date.now()): string {
        const s = this.Settle(now);
        if (this.Day(now) < s.purchaseDay) return '设备日期异常，请恢复正确时间';
        if (s.purchased >= MATRIX_CONFIG.dailyBuyLimit) return '已达今日购买上限！';
        const data = ZRSJZ_GameData.Instance, price = this.Price(this.Day(now));
        if (!Number.isFinite(data.Gold) || data.Gold < price) return '货币不足';
        data.Gold -= price; s.coins++; s.purchased++;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        return '';
    }
    public static Sell(all = false, now = Date.now()): { error: string; count: number; gold: number } {
        const s = this.Settle(now), data = ZRSJZ_GameData.Instance;
        if (this.Day(now) < s.purchaseDay) return { error: '设备日期异常，请恢复正确时间', count: 0, gold: 0 };
        const count = all ? s.coins : Math.min(1, s.coins);
        if (!count) return { error: '加密货币不足，请先领取产出', count: 0, gold: 0 };
        const gold = count * this.Price(this.Day(now));
        if (!Number.isSafeInteger(gold) || !Number.isFinite(data.Gold) || data.Gold + gold > Number.MAX_SAFE_INTEGER)
            return { error: '货币余额已达上限', count: 0, gold: 0 };
        s.coins -= count; data.Gold += gold;
        ZRSJZ_GameData.SaveData();
        ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE);
        return { error: '', count, gold };
    }
}
