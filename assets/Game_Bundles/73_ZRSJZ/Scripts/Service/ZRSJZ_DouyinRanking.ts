import { ZRSJZ_RankingOriginalAssets } from './ZRSJZ_RankingOriginalAssets';
import { Component, Node } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_GradeService } from './ZRSJZ_GradeService';
import { ZRSJZ_AccountService } from './ZRSJZ_AccountService';
import { RANKING_CATALOG as Catalog } from '../ZRSJZ_RankingCatalog';

/** 抖音托管榜：主域只上传本人数据，其他玩家数据始终留在开放域。 */
export class ZRSJZ_DouyinRanking {
    private static owner: Component | null = null;
    private static loginAt = 0;
    private static logging: Promise<boolean> | null = null;
    private static uploading = false;
    private static nextAttempt = 0;
    private static signatures: Record<string, string> = {};
    private static generation = 0;
    private static syncTick = () => { void this.Upload(); };
    public static get Available(): boolean {
        const api = (globalThis as any).tt;
        return typeof api?.getOpenDataContext === 'function' && typeof api?.setImRankData === 'function';
    }
    private static Post(command: string, args: Record<string, string | number | boolean> = {}): void {
        if (!this.Available) return;
        try { (globalThis as any).tt.getOpenDataContext().postMessage({ ranking: true, command, ...args }); }
        catch (error) { console.warn('[排行榜] 开放数据域未就绪', error); }
    }
    private static visualLoading: Promise<void> | null = null;
    /** 复用玩法资源：只传原始美术和已下载路径，不加载额外动画分包。 */
    public static EnsureVisualAssets(): Promise<void> {
        if (!this.Available) return Promise.resolve();
        if (this.visualLoading) return this.visualLoading;
        const task = Promise.resolve().then(() => ZRSJZ_RankingOriginalAssets.Send((globalThis as any).tt.getOpenDataContext()));
        this.visualLoading = task;
        task.catch(error => {
            if (this.visualLoading === task) this.visualLoading = null;
            this.Post('uploadError', { text: '外观加载失败：' + String(error?.message || error).slice(0, 48) });
            console.warn('[排行榜] 原始美术加载失败', error);
        });
        return task;
    }

    public static StartSync(owner: Component): void {
        if (!this.Available || this.owner === owner) return;
        this.StopSync(); this.owner = owner;
        owner.schedule(this.syncTick, 5);
        void this.Upload();
    }
    public static StopSync(): void {
        ++this.generation;
        this.owner?.unschedule(this.syncTick); this.owner = null;
        this.loginAt = 0; this.signatures = {}; this.nextAttempt = 0;
    }
    private static Login(): Promise<boolean> {
        if (Date.now() - this.loginAt < 300000) return Promise.resolve(true);
        if (this.logging) return this.logging;
        const api = (globalThis as any).tt;
        const task = new Promise<boolean>(resolve => {
            let done = false;
            const finish = (ok: boolean) => {
                if (done) return; done = true; clearTimeout(timer);
                if (ok) this.loginAt = Date.now(); resolve(ok);
            };
            const timer = setTimeout(() => finish(false), 8000);
            try { api.login({ force: false, success: (r: any) => finish(r?.isLogin !== false && !!r?.code), fail: () => finish(false) }); }
            catch { finish(false); }
        });
        this.logging = task;
        task.then(() => { if (this.logging === task) this.logging = null; });
        return task;
    }
    public static Snapshot(): { extra: Record<string, number | string>; values: Record<string, number> } {
        const data = ZRSJZ_GameData.Instance;
        const weapon = data.PropData?.[data.WeaponryID?.[0]]?.Name || data.PropData?.[data.WeaponryID?.[4]]?.Name || '';
        const skin = data.CurSkin?.[0] || '威蓝';
        const safe = (n: number) => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
        const variants = Catalog.weaponSkins[weapon] || [];
        return {
            extra: { v: 1, a: Math.max(0, Catalog.skins.indexOf(data.CurrentAvatar)),
                f: Math.min(10, Math.max(1, Number(data.CurrentAvatarFrame) || 1)),
                s: Math.max(0, Catalog.skins.indexOf(skin)), w: Catalog.weapons.indexOf(weapon),
                p: Math.max(0, variants.indexOf(ZRSJZ_AccountService.GetWeaponSkin(weapon))) },
            values: { wealth: safe(ZRSJZ_GradeService.GetTotalAssetValue()), raid: safe(data.OptimumEvacuation),
                recharge: safe(data.RankingHasVerifiedRecharge ? data.RankingVerifiedRechargeFen : data.RankingLocalPaidFen) },
        };
    }
    /** 5秒检查变化，成功上传后去重；失败退避，充值只读取已确认累计实付字段。 */
    public static async Upload(immediate = false): Promise<void> {
        if (!this.Available || this.uploading || (!immediate && Date.now() < this.nextAttempt)) return;
        this.uploading = true;
        const generation = this.generation;
        try {
            if (!await this.Login()) { this.nextAttempt = Date.now() + 30000; return; }
            if (generation !== this.generation) return;
            const snapshot = this.Snapshot();
            for (const type of ['wealth', 'raid', 'recharge']) {
                const raw = snapshot.values[type];
                // 平台数值上限为int32。财富/跑刀固定按万计排名，完整金额在extra.q中展示。
                const score = Math.floor(raw / (type === 'recharge' ? 1 : 10000));
                if (!Number.isSafeInteger(raw) || score >= 2147483647) {
                    this.Post('uploadError', { text: '数值超过平台排行榜容量，未截断上传' }); continue;
                }
                const extra = JSON.stringify({ ...snapshot.extra, q: String(raw) });
                if (extra.length > 128) throw new Error('排行榜附加数据超过128字节');
                const signature = String(score) + extra;
                if (this.signatures[type] === signature) continue;
                await new Promise<void>((resolve, reject) => {
                    let done = false;
                    const finish = (error?: any) => { if (done) return; done = true; clearTimeout(timer); error ? reject(error) : resolve(); };
                    const timer = setTimeout(() => finish(new Error('上传超时')), 8000);
                    try { (globalThis as any).tt.setImRankData({ zoneId: 'zrsjz_' + type + '_v1', dataType: 0,
                        value: String(score), extra, success: () => finish(), fail: (e: any) => finish(e) }); }
                    catch (error) { finish(error); }
                });
                if (generation !== this.generation) return;
                this.signatures[type] = signature;
            }
            this.nextAttempt = Date.now() + 10000;
            this.Post('refresh', { local: JSON.stringify(this.Snapshot()) });
        } catch (error) {
            this.nextAttempt = Date.now() + 30000;
            this.Post('uploadError', { text: '上传失败，稍后自动重试' });
            console.warn('[排行榜] 上传失败', error);
        } finally { this.uploading = false; }
    }
    public static Show(root: Node, type: string): boolean {
        if (!this.Available) return false;
        const overlay = root.getChildByName('开放数据榜单');
        if (!overlay) return false;
        overlay.active = true;
        overlay.emit(Node.EventType.TRANSFORM_CHANGED);
        this.Post('show', { type, local: JSON.stringify(this.Snapshot()) });
        void this.EnsureVisualAssets();
        void this.Upload(true);
        return true;
    }
    public static Select(type: string): void { this.Post('select', { type }); }
    public static Refresh(): void { void this.EnsureVisualAssets(); this.Post('refresh'); void this.Upload(true); }
    public static Hide(): void { this.Post('hide'); }
    public static Scroll(delta: number): void { this.Post('scroll', { delta }); }
    public static UpdateViewport(root: Node): void { root.getChildByName('开放数据榜单')?.emit(Node.EventType.TRANSFORM_CHANGED); }
}
