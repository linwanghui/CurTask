import { Button, Color, instantiate, isValid, Label, Node, Sprite, UITransform } from 'cc';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_MidAutumnService as Moon } from '../Service/ZRSJZ_MidAutumnService';
import { ZRSJZ_UIManager as UI } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';

/** 活动页控制器：所有可见节点来自预制体，仅复制兑换格模板。 */
export class ZRSJZ_MidAutumnPage {
    public busy = false;
    private slots: Node[] = [];
    private names: string[] = [];
    private lastAd = 0;
    private iconRequests = new WeakMap<Sprite, string>();
    constructor(private page: Node) {
        Moon.Ensure();
        const template = page.getChildByName('兑换格模板');
        for (let i = 0; i < 6; i++) {
            const slot = i === 0 ? template : instantiate(template);
            if (i) { slot.name = '兑换格' + (i + 1); slot.parent = page; }
            slot.setPosition(-870 + (i % 3) * 290, 210 - Math.floor(i / 3) * 365);
            this.Bind(slot.getChildByName('兑换'), () => { void this.Exchange(i); });
            this.Bind(slot.getChildByName('详情'), () => {
                const offer = Moon.State.offers[i];
                if (offer) UI.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗, 0, offer.name, 0);
            });
            this.slots.push(slot);
        }
        this.Bind(page.getChildByName('刷新'), () => {
            if (this.busy) return;
            UI.Instance.ShowTip(Moon.Refresh() || '兑换商品已刷新'); this.Render();
        });
        this.Bind(page.getChildByName('制作'), () => {
            if (this.busy) return;
            UI.Instance.ShowTip(Moon.Craft() || '制作成功，获得1个月饼'); this.Render();
        });
        this.Bind(page.getChildByName('广告领取'), () => {
            if (Date.now() - this.lastAd < 1500) return;
            if (Moon.Remaining() <= 0) { UI.Instance.ShowTip('今日免费次数已用完'); return; }
            this.lastAd = Date.now();
            const reward = Moon.VideoReward();
            Banner.Instance.ShowVideoAd(() => {
                if (reward()) UI.Instance.ShowTip('获得2个月饼');
                if (isValid(this.page)) this.Render();
            });
        });
        Moon.Materials.forEach(name => {
            const slot = page.getChildByPath('材料栏/' + name);
            this.Icon(slot.getChildByName('图标').getComponent(Sprite), name);
            this.Bind(slot, () => UI.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗, 0, name, 0));
        });
    }
    private Bind(node: Node, callback: () => void): void {
        node.getComponent(Button).clickEvents = [];
        node.on(Button.EventType.CLICK, callback);
    }
    private Text(node: Node, name: string, value: string): void { node.getChildByName(name).getComponent(Label).string = value; }
    private Icon(sprite: Sprite, name: string): void {
        this.iconRequests.set(sprite, name);
        sprite.spriteFrame = null;
        UI.Instance.GetPropUI(name)?.then(asset => {
            if (!asset || !isValid(sprite) || this.iconRequests.get(sprite) !== name) return;
            sprite.spriteFrame = asset; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            const scale = Math.min(100 / Math.max(1, asset.originalSize.width), 100 / Math.max(1, asset.originalSize.height));
            sprite.getComponent(UITransform).setContentSize(asset.originalSize.width * scale, asset.originalSize.height * scale);
        }).catch(error => console.warn('[中秋活动] 图标加载失败', name, error));
    }
    public Render(): void {
        if (!isValid(this.page)) return;
        const canCraft = Moon.CanCraft();
        const tabDot = this.page.parent.parent.getChildByPath('活动选项/月满金秋/红点');
        if (tabDot) tabDot.active = canCraft;
        const craftDot = this.page.getChildByPath('制作/红点');
        if (craftDot) craftDot.active = canCraft;
        this.Text(this.page, '月饼数量', '月饼数量：' + Moon.State.cakes);
        this.Text(this.page, '广告次数', '视频领2个月饼  今日剩余 ' + Moon.Remaining() + '/3');
        Moon.Materials.forEach(name => {
            const slot = this.page.getChildByPath('材料栏/' + name);
            const count = Moon.Count(name);
            this.Text(slot, '数量', count + '/1');
            slot.getChildByName('数量').getComponent(Label).color = count ? Color.WHITE : new Color(255, 85, 60);
            this.page.getChildByName('托盘' + name).active = count > 0;
        });
        this.slots.forEach((slot, i) => {
            const offer = Moon.State.offers[i];
            slot.active = !!offer;
            if (!offer) return;
            this.Text(slot, '名称', (offer.name === '英雄碎片' ? '角色碎片' : offer.name) + '×' + offer.count);
            this.Text(slot.getChildByName('兑换'), '价格', offer.cost + ' 月饼');
            slot.getChildByName('售罄').active = offer.sold;
            slot.getChildByName('兑换').active = !offer.sold;
            slot.getChildByName('兑换').getComponent(Button).interactable = !this.busy;
            if (this.names[i] !== offer.name) {
                this.names[i] = offer.name;
                this.Icon(slot.getChildByName('图标').getComponent(Sprite), offer.name);
            }
        });
    }
    public async Exchange(index?: number): Promise<void> {
        if (this.busy) return;
        if (index !== undefined) {
            const error = Moon.BeginExchange(index);
            if (error) { UI.Instance.ShowTip(error); return; }
        }
        const pending = Moon.State.pending;
        if (!pending) return;
        this.busy = true; this.Render();
        try {
            // 只继续摆放上次已生成但未入库的实例，掉线/关界面不重复扣款或发奖。
            const ids = pending.ids.filter(id => {
                const prop = ZRSJZ_GameData.Instance.PropData[id];
                return prop && !prop.GridData?.some(g => g.GridX >= 0 && g.GridY >= 0);
            });
            const mail = await UI.Instance.ReceiveExistingProps(ids);
            Moon.CompleteExchange();
            if (isValid(this.page)) {
                UI.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, {
                    Awards: [{ TaskAwardName: pending.name, TaskAwardCount: pending.count }], DisplayOnly: true,
                });
                if (mail.length) UI.Instance.ShowTip('仓库空间不足，奖励已发至邮箱');
            }
        } catch (error) {
            console.error('[中秋活动] 兑换奖励暂未入库', error);
            UI.Instance.ShowTip('奖励已保留，重新打开活动可继续领取');
        } finally { this.busy = false; this.Render(); }
    }
}
