import { ZRSJZ_DouyinRanking } from './ZRSJZ_DouyinRanking';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_GradeService } from './ZRSJZ_GradeService';

export type ZRSJZ_RankingType = 'wealth' | 'raid' | 'recharge';
export interface ZRSJZ_RankingEntry {
    userId: string;
    /** 抖音昵称，数据适配层应传平台昵称，不能用 openid 或抖音号代替。 */
    nickname: string;
    /** 兼容抖音排行榜 nick_name 和用户信息 nickName 字段。 */
    nick_name?: string;
    nickName?: string;
    /** 财富/跑刀单位为游戏价值；充值单位为人民币分。 */
    value: number;
    skin?: string;
    avatar?: string;
    avatarFrame?: string;
    weapon?: string;
    weaponSkin?: string;
}
export interface ZRSJZ_RankingResult {
    entries: ZRSJZ_RankingEntry[];
    self: ZRSJZ_RankingEntry;
    /** 0 表示未上榜，null 表示尚未取得排名。 */
    selfRank: number | null;
    status?: string;
}
export type ZRSJZ_RankingProvider = (type: ZRSJZ_RankingType, limit: number) => Promise<ZRSJZ_RankingResult>;

/** UI 与数据源隔离：服务端/抖音开放数据域适配层通过 SetProvider 接入。 */
export class ZRSJZ_RankingService {
    public static readonly Limit = 10;
    private static provider: ZRSJZ_RankingProvider | null = null;
    // 仅在本次运行中保留昵称，不把授权信息写入游戏存档。
    private static douyinNickname = '';
    private static nicknameRequest: Promise<void> | null = null;

    private static GetDouyinAPI(): any { return (globalThis as any).tt; }

    private static DisplayName(entry?: { nick_name?: string; nickName?: string; nickname?: string }): string {
        for (const value of [entry?.nick_name, entry?.nickName, entry?.nickname]) {
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
        return '抖音玩家';
    }

    /** 在排行榜页面获取本人抖音昵称；授权由宿主提示，拒绝后仍可使用排行榜。 */
    public static RefreshDouyinNickname(): Promise<void> {
        if (this.nicknameRequest) return this.nicknameRequest;
        const api = this.GetDouyinAPI();
        this.douyinNickname = '';
        if (typeof api?.login !== 'function' || typeof api?.getUserInfo !== 'function') return Promise.resolve();
        const request = new Promise<void>(resolve => {
            let settled = false;
            const finish = (nickname = '') => {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                this.douyinNickname = nickname;
                resolve();
            };
            const timeout = setTimeout(() => finish(), 8000);
            try {
                api.login({
                    force: false,
                    success: (login: any) => {
                        if (settled) return;
                        if (login?.isLogin === false) { finish(); return; }
                        try {
                            api.getUserInfo({
                                withCredentials: false,
                                withRealNameAuthenticationInfo: false,
                                success: (result: any) => {
                                    const name = result?.userInfo?.nickName;
                                    finish(typeof name === 'string' ? name.trim() : '');
                                },
                                fail: () => finish(),
                            });
                        } catch { finish(); }
                    },
                    fail: () => finish(),
                });
            } catch { finish(); }
        });
        this.nicknameRequest = request;
        request.then(() => { if (this.nicknameRequest === request) this.nicknameRequest = null; });
        return request;
    }

    public static SetProvider(provider: ZRSJZ_RankingProvider | null): void { this.provider = provider; }

    public static GetLocalSelf(type: ZRSJZ_RankingType): ZRSJZ_RankingEntry {
        const data = ZRSJZ_GameData.Instance;
        const value = type === 'wealth' ? ZRSJZ_GradeService.GetTotalAssetValue()
            : type === 'raid' ? data.OptimumEvacuation : (data.RankingHasVerifiedRecharge ? data.RankingVerifiedRechargeFen : data.RankingLocalPaidFen);
        return {
            userId: 'local', nickname: this.douyinNickname || '抖音玩家', value: this.SafeValue(value),
            skin: data.CurSkin?.[0] || '威蓝', avatar: data.CurrentAvatar || '威蓝',
            avatarFrame: data.CurrentAvatarFrame || '1',
            weapon: data.PropData?.[data.WeaponryID?.[0]]?.Name || data.PropData?.[data.WeaponryID?.[4]]?.Name || '',
            weaponSkin: data.CurWeaponSkin?.[data.PropData?.[data.WeaponryID?.[0]]?.Name] || '',
        };
    }

    /** 仅由已验签、已去重并处理退款的服务端账本回传累计实付，传绝对值。 */
    public static ApplyVerifiedRecharge(totalFen: number): void {
        if (!Number.isSafeInteger(totalFen) || totalFen < 0) throw new Error('累计充值金额必须是非负整数分');
        ZRSJZ_GameData.Instance.RankingVerifiedRechargeFen = totalFen;
        ZRSJZ_GameData.Instance.RankingHasVerifiedRecharge = true;
        ZRSJZ_GameData.SaveData();
        void ZRSJZ_DouyinRanking.Upload(true);
    }

    public static async Get(type: ZRSJZ_RankingType): Promise<ZRSJZ_RankingResult> {
        const nickname = this.RefreshDouyinNickname();
        if (!this.provider) {
            await nickname;
            return { entries: [], self: this.GetLocalSelf(type), selfRank: null, status: '全服榜单待接入' };
        }
        const [result] = await Promise.all([this.provider(type, this.Limit), nickname]);
        const seen = new Set<string>();
        const entries = (result.entries || []).filter(entry => {
            if (!entry?.userId || seen.has(entry.userId) || !Number.isFinite(entry.value) || entry.value < 0) return false;
            seen.add(entry.userId); return true;
        }).map(entry => ({ ...entry, nickname: this.DisplayName(entry), value: this.SafeValue(entry.value) }))
            .sort((a, b) => b.value - a.value).slice(0, this.Limit);
        const self = result.self ? { ...result.self,
            nickname: this.douyinNickname || this.DisplayName(result.self) } : this.GetLocalSelf(type);
        return { ...result, entries, self,
            selfRank: result.selfRank === null ? null : Math.max(0, Math.floor(result.selfRank || 0)) };
    }

    public static SafeValue(value: number): number {
        return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }
}
