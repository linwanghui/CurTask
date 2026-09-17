import { _decorator, Button, Enum, EventTouch, Label, Node, Sprite, UITransform, instantiate, isValid } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_MerchantService as Merchant } from '../Service/ZRSJZ_MerchantService';
import { ZRSJZ_AccountService } from '../Service/ZRSJZ_AccountService';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Currency } from '../UI/ZRSJZ_Currency';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MysteriousMerchantPanel')
export class ZRSJZ_MysteriousMerchantPanel extends ZRSJZ_Panel {
    @property({ type: Enum(ZRSJZ_PANEL) })
    PanelName: ZRSJZ_PANEL = ZRSJZ_PANEL.神秘商人弹窗;
    private slots: Node[] = [];
    private renderVersion = 0;
    private buying = false;
    private displayedRemaining = -1;
    private dateCheckElapsed = 0;

    protected update(dt: number): void {
        this.dateCheckElapsed += dt;
        if (this.dateCheckElapsed < 1) return;
        this.dateCheckElapsed = 0;
        if (this.Panel && Merchant.Remaining() !== this.displayedRemaining) this.Render();
    }

    Show(): void {
        this.PlayerIndex = -1;
        this.Panel = this.node.getChildByName('Panel');
        const background = this.Panel.getChildByName('神秘商店弹版')?.getComponent(UITransform);
        if (background) this.Panel.getComponent(UITransform).setContentSize(background.contentSize);
        this.EnsureSlots();
        super.Show();
        this.Render();
    }

    private EnsureSlots(): void {
        if (this.slots.length) return;
        const template = this.Panel.getChildByName('售卖框');
        const origin = template.position.clone();
        // 仅拷贝编辑器里现成的节点、图片和组件，不用代码绘制界面。
        for (let i = 0; i < 8; i++) {
            const slot = i === 0 ? template : instantiate(template);
            if (i !== 0) { slot.name = '售卖框' + (i + 1); slot.parent = this.Panel; }
            slot.setPosition(origin.x + (i % 4) * 190, origin.y - Math.floor(i / 4) * 290, origin.z);
            const purchase = slot.getChildByName('购买');
            purchase.getComponent(Button).clickEvents = [];
            purchase.on(Button.EventType.CLICK, () => { void this.Buy(i); }, this);
            slot.getChildByName('道具图').on(Node.EventType.TOUCH_END, () => {
                const goods = Merchant.Goods[i];
                if (goods && !this.buying) ZRSJZ_UIManager.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗, 0, goods.Name, 0);
            }, this);
            this.slots.push(slot);
        }
    }

    private Render(): void {
        const remaining = Merchant.Remaining();
        this.displayedRemaining = remaining;
        const limitLabel = this.Panel.getChildByName('限购次数')?.getComponent(Label);
        if (limitLabel) limitLabel.string = `今日剩余购买次数：${remaining}/${Merchant.DailyLimit}`;
        const version = ++this.renderVersion;
        this.slots.forEach((slot, index) => {
            const goods = Merchant.Goods[index];
            slot.active = Merchant.Visible && !!goods;
            if (!goods) return;
            slot.getChildByName('道具名').getComponent(Label).string = goods.Name;
            slot.getChildByName('数量').getComponent(Label).string = '×' + goods.Count;
            slot.getChildByName('价格').getComponent(Label).string = ZRSJZ_Currency.FormatAmount(goods.Price);
            slot.getChildByName('售罄遮罩').active = goods.Sold;
            const purchase = slot.getChildByName('购买');
            purchase.active = !goods.Sold;
            purchase.getComponent(Button).interactable = remaining > 0 && !this.buying && !goods.Buying;
            const icon = slot.getChildByName('道具图').getComponent(Sprite);
            icon.spriteFrame = null;
            ZRSJZ_UIManager.Instance.GetPropUI(goods.Name)?.then(asset => {
                if (!asset || !isValid(this.node) || version !== this.renderVersion || !isValid(icon)) return;
                icon.spriteFrame = asset;
                icon.sizeMode = Sprite.SizeMode.CUSTOM;
                const size = asset.originalSize;
                const scale = Math.min(120 / Math.max(1, size.width), 100 / Math.max(1, size.height));
                icon.getComponent(UITransform).setContentSize(size.width * scale, size.height * scale);
            }).catch(error => console.warn('[神秘商人] 道具图片加载失败', error));
        });
    }

    private async Buy(index: number): Promise<void> {
        const goods = Merchant.Goods[index];
        if (!ZRSJZ_UIManager.ZRSJZ_DLC || !Merchant.Visible || !goods || goods.Sold || goods.Buying || this.buying) return;
        if (Merchant.Remaining() <= 0) {
            ZRSJZ_UIManager.Instance.ShowTip('今日购买次数已用完，明天再来吧');
            this.Render();
            return;
        }
        if (ZRSJZ_GameData.Instance.Gold < goods.Price) {
            ZRSJZ_UIManager.Instance.ShowTip('金币不足');
            return;
        }
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        const purchaseDate = Merchant.ReservePurchase();
        if (!purchaseDate) return;
        this.buying = goods.Buying = true;
        this.Render();
        ZRSJZ_AccountService.ChangeGold(-goods.Price);
        try {
            const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards([{ PropName: goods.Name, Count: goods.Count }]);
            if (result.InvalidAwards.length) throw new Error('商品发放失败');
            goods.Sold = true;
            ZRSJZ_UIManager.Instance.ShowTip(result.MailID ? '购买成功，仓库已满，商品已发送邮件' : '购买成功');
        } catch (error) {
            Merchant.CancelPurchase(purchaseDate);
            ZRSJZ_AccountService.ChangeGold(goods.Price);
            console.error('[神秘商人] 购买失败', error);
            ZRSJZ_UIManager.Instance.ShowTip('购买失败，金币已退回');
        } finally {
            this.buying = goods.Buying = false;
            if (isValid(this.node)) this.Render();
        }
    }

    public OnButtonClick(event: EventTouch): void {
        if (this.buying) return;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        if (event.getCurrentTarget().name === 'Mask' || event.getCurrentTarget().name === '关闭') {
            ZRSJZ_UIManager.Instance.HidePanel(this.PanelName);
        }
    }
}
