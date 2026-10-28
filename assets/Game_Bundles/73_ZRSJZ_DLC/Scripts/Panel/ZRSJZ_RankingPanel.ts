import { ZRSJZ_RankingAvatar } from '../../../73_ZRSJZ/Scripts/UI/ZRSJZ_RankingAvatar';
import { ZRSJZ_DouyinRanking as NativeRanking } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_DouyinRanking';
import { BakeRankingPortraits, BakeRankingAnimation } from '../../../73_ZRSJZ/Scripts/UI/ZRSJZ_RankingBake';
import { _decorator, Button, Color, find, isValid, Label, Node, ScrollView, sp, Sprite, SpriteFrame, UITransform, assetManager } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_SKIN_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_Tools } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Tools';
import { ZRSJZ_RankingService as Service, ZRSJZ_RankingType, ZRSJZ_RankingEntry, ZRSJZ_RankingResult } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_RankingService';
import { ZRSJZ_KNIFE, ZRSJZ_WEAPONRY_TYPE } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { RANKING_CATALOG as RankCatalog } from '../../../73_ZRSJZ/Scripts/ZRSJZ_RankingCatalog';
import { ZRSJZ_AvatarFrameFit } from '../../../73_ZRSJZ/Scripts/UI/ZRSJZ_AvatarFrameFit';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_RankingPanel')
export class ZRSJZ_RankingPanel extends ZRSJZ_Panel {
    @property({ tooltip: '仅用于美术预览；开启后明确显示示例数据，不参与真实排名。' })
    public previewData = false;
    private type: ZRSJZ_RankingType = 'wealth';
    private requestVersion = 0;
    private showing = false;
    private nativeRanking = false;
    private nativeHidden = new Map<Node, boolean>();
    /** 编辑器重新生成开放域角色姿态，来源仅为本地美术资源。 */
    public ExportOpenDataPortraits(): any {
        return BakeRankingPortraits(this.Get('前三名/第1名/角色').getComponent(sp.Skeleton).skeletonData);
    }
    public ExportOpenDataFrame(uuid: string): Promise<any> {
        return new Promise((resolve, reject) => assetManager.loadAny<sp.SkeletonData>(uuid, (error, data) => {
            if (error) reject(error); else { try { resolve(BakeRankingPortraits(data, true).skins.frame); } catch (error) { reject(error); } }
        }));
    }
    public ExportRankingAnimation(mode: string, skin: string): any {
        if (mode !== 'frame') return BakeRankingAnimation(this.Get('前三名/第1名/角色').getComponent(sp.Skeleton).skeletonData, skin, mode);
        return new Promise((resolve, reject) => assetManager.loadAny<sp.SkeletonData>(skin, (error, data) => {
            if (error) reject(error); else { try { resolve(BakeRankingAnimation(data, '', 'frame')); } catch (error) { reject(error); } }
        }));
    }
    private SetNative(active: boolean): void {
        if (active && !this.nativeRanking) {
            const paths = ['榜单列表', '我的排名', '状态', '空榜'];
            for (let i = 1; i <= 3; i++) paths.push('前三名/第'+i+'名/角色', '前三名/第'+i+'名/名字');
            for (const path of paths) { const node = this.Get(path); this.nativeHidden.set(node, node.active); node.active = false; }
        } else if (!active && this.nativeRanking) {
            this.nativeHidden.forEach((wasActive, node) => { if (isValid(node)) node.active = wasActive; });
            this.nativeHidden.clear(); NativeRanking.Hide();
        }
        this.nativeRanking = active;
        this.Get('开放数据榜单').active = active;
        this.Get('滚动触摸区').active = active;
    }
    private readonly avatarCache = new Map<string, Promise<SpriteFrame>>();

    protected onLoad(): void {
        this.Panel = find('Panel', this.node);
        this.Get('关闭').on(Button.EventType.CLICK, this.Close, this);
        for (const type of ['wealth', 'raid', 'recharge'] as const) {
            this.Get('页签/' + type).on(Button.EventType.CLICK, () => this.Select(type), this);
        }
        this.Get('刷新').on(Button.EventType.CLICK, () => this.nativeRanking ? NativeRanking.Refresh() : this.Select(this.type), this);
        this.Get('滚动触摸区').on(Node.EventType.TOUCH_MOVE, (event: any) => {
            if (this.nativeRanking) NativeRanking.Scroll(event.getUIDelta().y);
        }, this);
    }
    protected onEnable(): void {
        if (!this.showing) this.Select(this.type, true);
    }
    protected onDisable(): void {
        ++this.requestVersion;
        this.SetNative(false);
        this.roleModes.clear();
        this.avatarVisuals.forEach(visual => visual.Suspend());
        for (const name of ['颁奖台', '灯光']) {
            const skeleton = this.Get('前三名/' + name)?.getComponent(sp.Skeleton);
            if (isValid(skeleton)) skeleton.clearTracks();
        }
    }

    public Show(type: ZRSJZ_RankingType = 'wealth'): void {
        // super.Show 会激活节点并触发 onEnable；由本次 Show 统一播放一次入场。
        this.showing = true;
        try { super.Show(); } finally { this.showing = false; }
        this.Select(['wealth', 'raid', 'recharge'].includes(type) ? type : 'wealth', true);
    }
    private Close(): void {
        if (ZRSJZ_UIManager.Instance) ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.排行榜界面);
        else this.node.active = false;
    }

    public async Select(type: ZRSJZ_RankingType, replayIntro = false): Promise<void> {
        const changed = this.type !== type;
        this.type = type;
        if (changed || replayIntro) this.PlayPodiumAnimations();
        const version = ++this.requestVersion;
        const title = { wealth: '总价值', raid: '单局最高价值', recharge: '累计充值' }[type];
        this.Text('表头/数值标题', title);
        this.Text('说明', { wealth: '财富榜 · 钞票、道具及收藏总价值', raid: '跑刀榜 · 成功撤离的单局最高价值', recharge: '氪金榜 · 累计充值金额' }[type]);
        for (const key of ['wealth', 'raid', 'recharge']) {
            this.Get(`页签/${key}/选中`).active = key === type;
            this.Get(`页签/${key}/文字`).getComponent(Label).color = key === type
                ? new Color(15, 15, 24) : Color.WHITE;
        }
        const alreadyNative = this.nativeRanking;
        const native = !this.previewData && NativeRanking.Available;
        this.SetNative(native);
        if (native) {
            if (alreadyNative) NativeRanking.Select(type); else NativeRanking.Show(this.Panel, type);
            this.scheduleOnce(() => { if (this.nativeRanking) NativeRanking.UpdateViewport(this.Panel); }, 0.35);
            return;
        }
        this.Get('榜单列表').getComponent(ScrollView).scrollToTop(0);
        this.Draw({ entries: [], self: Service.GetLocalSelf(type), selfRank: null, status: '加载中…' }, version);
        try {
            const result = this.previewData ? this.Preview() : await Service.Get(type);
            if (this.IsCurrent(version)) this.Draw(result, version);
        } catch (error) {
            if (this.IsCurrent(version)) this.Draw({ entries: [], self: Service.GetLocalSelf(type), selfRank: null, status: '加载失败，请点击刷新重试' }, version);
            console.warn('[ZRSJZ_RankingPanel]', error);
        }
    }

    private PlayPodiumAnimations(): void {
        for (const name of ['颁奖台', '灯光']) {
            const skeleton = this.Get('前三名/' + name)?.getComponent(sp.Skeleton);
            if (!skeleton?.skeletonData) continue;
            // 清除上次切榜的队列，并恢复初始姿态，支持入场过程中再次切换。
            skeleton.clearTracks();
            skeleton.setToSetupPose();
            if (!skeleton.findAnimation('1')) continue;
            skeleton.setAnimation(0, '1', false);
            // 使用 Spine 动画队列自动衔接，无需定时器或完成回调。
            if (name === '颁奖台' && skeleton.findAnimation('2')) {
                skeleton.addAnimation(0, '2', true, 0);
            }
        }
    }

    private Draw(result: ZRSJZ_RankingResult, version: number): void {
        const entries = result.entries.slice(0, Service.Limit);
        this.Get('榜单列表/View/Content').getComponent(UITransform).setContentSize(823, Math.max(600, entries.length * 128));
        for (let i = 0; i < Service.Limit; i++) {
            const row = this.Get('榜单列表/View/Content/名次' + (i + 1));
            row.active = i < entries.length;
            if (entries[i]) this.DrawEntry(row, entries[i], String(i + 1), version);
        }
        for (let i = 0; i < 3; i++) {
            const podium = this.Get('前三名/第' + (i + 1) + '名');
            const entry = entries[i];
            this.TextAt(podium, '名字', entry?.nickname || '虚位以待');
            podium.getChildByName('角色').active = !!entry;
            if (entry) {
                const skeleton = podium.getChildByName('角色').getComponent(sp.Skeleton);
                this.DrawRankingRole(skeleton, entry, version);
            }
        }
        const rank = result.selfRank === null ? '待同步' : result.selfRank > 0 ? String(result.selfRank) : '未上榜';
        this.DrawEntry(this.Get('我的排名'), result.self, rank, version);
        this.Text('状态', result.status || (entries.length ? '仅展示前 10 名 · 上滑查看更多' : '暂无上榜玩家'));
        this.Get('空榜').active = entries.length === 0;
        this.Text('空榜', result.status?.includes('待接入') ? '榜单数据待同步' : entries.length ? '' : '暂无排行数据');
    }

    private DrawEntry(row: Node, entry: ZRSJZ_RankingEntry, rank: string, version: number): void {
        this.TextAt(row, '名次', rank);
        this.TextAt(row, '名字', entry.nickname);
        this.TextAt(row, '数值', this.type === 'recharge' ? '¥' + (entry.value / 100).toFixed(2) : this.FormatRankingValue(entry.value));
        row.getChildByName('货币').active = this.type !== 'recharge';
        this.DrawRankingFrame(row, entry, version);
    }
    /** 显示最高单位的整数及单位，例如 180801亿7884万显示为180801亿。 */
    private FormatRankingValue(value: number): string {
        const amount = Service.SafeValue(value);
        const unit = amount >= 100000000 ? 100000000 : amount >= 10000 ? 10000 : 1;
        return String(Math.floor(amount / unit)) + (unit === 100000000 ? '亿' : unit === 10000 ? '万' : '');
    }

    private readonly roleModes = new Map<sp.Skeleton, boolean>();
    private readonly avatarVisuals = new Map<Node, ZRSJZ_RankingAvatar>();

    protected update(): void {
        if (this.nativeRanking) return;
        this.roleModes.forEach((knife, skeleton) => {
            if (isValid(skeleton) && skeleton.node.activeInHierarchy) this.ApplyRankingHands(skeleton, knife);
        });
    }
    private ApplyRankingHands(skeleton: sp.Skeleton, knife: boolean): void {
        for (const slot of skeleton._skeleton?.slots || []) {
            const name = slot.data.name, gunHand = name.includes('左手3拿枪手1'), knifeHand = name.includes('左手3拿枪手2');
            if (!gunHand && !knifeHand) continue;
            if (knife ? knifeHand : gunHand) slot.setAttachment(null);
            else if (!slot.getAttachment()) {
                const attachment = skeleton._skeleton.getAttachmentByName(name, name);
                if (attachment) slot.setAttachment(attachment);
            }
        }
    }
    private DrawRankingRole(skeleton: sp.Skeleton, entry: ZRSJZ_RankingEntry, version: number): void {
        if (!skeleton?.skeletonData) return;
        const weapon = entry.weapon || '', knife = !weapon || ZRSJZ_KNIFE.includes(weapon);
        skeleton.clearTracks();
        skeleton.setSkin(ZRSJZ_SKIN_CONFIG.get(entry.skin || '威蓝')?.Skin || ZRSJZ_SKIN_CONFIG.get('威蓝').Skin);
        skeleton.setToSetupPose();
        for (const slot of ['dao', 't', 'j', 'b']) skeleton.findSlot(slot)?.setAttachment(null);
        let gunSlot = '';
        ZRSJZ_WEAPONRY_TYPE.forEach((names, slot) => {
            skeleton.findSlot(slot)?.setAttachment(null);
            if (names.includes(weapon)) gunSlot = slot;
        });
        skeleton.paused = false;
        skeleton.setAnimation(0, knife ? 'daiji_dao1' : 'daiji_q', true);
        if (knife) {
            skeleton.setAnimation(1, 'daiji_dao1', true);
            if (weapon) skeleton.setAttachment('dao', weapon);
        } else if (gunSlot) {
            skeleton.setAttachment(gunSlot, gunSlot);
            const variants = RankCatalog.weaponSkins[weapon] || [];
            const textureName = variants.includes(entry.weaponSkin) ? entry.weaponSkin : variants[0] || weapon;
            void ZRSJZ_UIManager.Instance?.GetWeaponryUI(textureName).then(texture => {
                if (texture && this.IsCurrent(version) && isValid(skeleton)) skeleton.setSlotTexture(gunSlot, texture, true);
            }).catch(error => console.warn('[排行榜] 武器外观加载失败', error));
        }
        this.roleModes.set(skeleton, knife); this.ApplyRankingHands(skeleton, knife);
    }
    private DrawRankingFrame(row: Node, entry: ZRSJZ_RankingEntry, version: number): void {
        if (!this.IsCurrent(version)) return;
        let visual = this.avatarVisuals.get(row);
        if (!visual) { visual = new ZRSJZ_RankingAvatar(row); this.avatarVisuals.set(row, visual); }
        visual.Show(entry.avatar || entry.skin || '威蓝', entry.avatarFrame || '1');
    }
    protected onDestroy(): void {
        this.avatarVisuals.forEach(visual => visual.Dispose());
        this.avatarVisuals.clear();
    }

    private IsCurrent(version: number): boolean { return isValid(this.node) && this.node.activeInHierarchy && version === this.requestVersion; }
    private Get(path: string): Node { return find('Panel/' + path, this.node); }
    private Text(path: string, text: string): void { this.Get(path).getComponent(Label).string = text; }
    private TextAt(node: Node, path: string, text: string): void { node.getChildByName(path).getComponent(Label).string = text; }
    private Preview(): ZRSJZ_RankingResult {
        const names = ['威蓝', '泠汐', '凌魇'];
        return { entries: Array.from({ length: 10 }, (_, i) => ({ userId: 'preview-' + i, nickname: '玩家名字' + (i + 1),
            value: this.type === 'recharge' ? 268000 - i * 21000 : (268 - i * 21) * 100000000,
            skin: names[i % 3], avatar: names[i % 3], avatarFrame: String(6 + i % 5), weapon: i % 2 ? '熔岩剑' : 'CN8-突击步枪' })), self: Service.GetLocalSelf(this.type), selfRank: 0,
            status: '美术预览 · 示例数据' };
    }
}
