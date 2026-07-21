import { _decorator, Button, Component, easing, EventHandler, EventTouch, find, Label, Node, Prefab, Sprite, Tween, tween, UIOpacity, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG, ZRSJZ_SHOP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_ShopItem } from '../UI/ZRSJZ_ShopItem';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ShowPanel')
export class ZRSJZ_ShowPanel extends ZRSJZ_Panel {

    public CheckedNode: Node = null;
    public ShopTypeNode: Node = null;
    public ShopItemContent: Node = null;
    public ShopIcon: Sprite = null;
    public ShopName: Label = null;
    public ShopLeft: Node = null;
    public ShopRight: Node = null;
    public Shop: Node = null;
    public ShopPrice: Label = null;
    public ShopDesc: Label = null;

    private _shopType: string = "";
    private _curShop: string = "";
    private _curShops: string[] = [];
    private _curShopsTs: ZRSJZ_ShopItem[] = [];
    private _curShowIndex: number = 0;
    private _shopPrice: number = 0;
    private _scale: number = 2;

    protected onLoad(): void {
        this.CheckedNode = find("Panel/商品类型/Checked", this.node);
        this.ShopTypeNode = find("Panel/商品类型/武器", this.node);
        this.ShopItemContent = find("Panel/商品/view/Content", this.node);
        this.ShopIcon = find("Panel/展示/Icon", this.node).getComponent(Sprite);
        this.ShopName = find("Panel/展示/Name", this.node).getComponent(Label);
        this.ShopLeft = find("Panel/展示/上一个", this.node);
        this.ShopRight = find("Panel/展示/下一个", this.node);
        this.Shop = find("Panel/商品", this.node);
        this.ShopPrice = find("Panel/购买/Price", this.node).getComponent(Label);
    }

    protected onEnable(): void {
        this.SwitchButton(this.ShopTypeNode);
    }

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.商店界面);
                break;
            case "购买":

                break;
            case "上一个":
                this._curShopsTs[this._curShowIndex].Chekcked.active = false;
                this._curShowIndex--;
                this.ShowShop();
                this.TweenShop();
                break;
            case "下一个":
                this._curShopsTs[this._curShowIndex].Chekcked.active = false;
                this._curShowIndex++;
                this.ShowShop();
                this.TweenShop();
                break;
            case "武器":
            case "头盔":
            case "防弹衣":
            case "背包":
            case "匕首":
            case "弹药":
            case "房卡":
                this._scale = event.getCurrentTarget().name == "防弹衣" || event.getCurrentTarget().name == "背包" ? 1 : 2;
                this.SwitchButton(event.getCurrentTarget());
                break;
            default:
                const clickIndex = Number(event.getCurrentTarget().name);
                if (clickIndex == this._curShowIndex) break;
                this._curShopsTs[this._curShowIndex].Chekcked.active = false;
                this._curShowIndex = clickIndex;
                this.ShowShop();
                break;
        }
    }

    SwitchButton(shopTypeNode: Node) {
        const shopType = shopTypeNode.name;
        if (this._shopType == shopType) return;
        this._shopType = shopType;
        Tween.stopAllByTarget(this.CheckedNode);
        tween(this.CheckedNode)
            .to(0.2, { position: shopTypeNode.position.clone() }, { easing: 'backOut' })
            .call(() => {
                this.ShowShopItem();
            })
            .start();
    }

    async ShowShopItem() {
        this._curShops = ZRSJZ_SHOP_CONFIG.get(this._shopType);
        this._curShowIndex = 0;
        this.RemoveShopItem();
        this._curShopsTs = [];
        this._curShops.forEach(async (shopName, index) => {
            const shopItem: Node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/ShopItem");
            shopItem.parent = this.ShopItemContent;
            shopItem.name = index.toString();
            shopItem.getComponent(ZRSJZ_ShopItem).Init(shopName);
            const clickEventHandler = new EventHandler();
            clickEventHandler.target = this.node; // 这个 node 节点是你的事件处理代码组件所属的节点
            clickEventHandler.component = "ZRSJZ_ShowPanel";// 这个是脚本类名
            clickEventHandler.handler = "OnButtonClick";
            shopItem.getComponent(Button)?.clickEvents.push(clickEventHandler);
            this._curShopsTs.push(shopItem.getComponent(ZRSJZ_ShopItem));
            if (index == 0) this.ShowShop();
        });

    }

    RemoveShopItem() {
        for (let index: number = this.ShopItemContent.children.length - 1; index >= 0; index--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.ShopItemContent.children[index]);
        }
    }

    ShowShopButton() {
        this.ShopLeft.active = this._curShowIndex > 0;
        this.ShopRight.active = this._curShowIndex < this._curShops.length - 1;
    }

    async ShowShop() {
        this.ShowShopButton();
        this._curShop = this._curShops[this._curShowIndex];
        this.ShopName.string = this._curShop;
        this.ShopIcon.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropUI(this._curShop);
        const shopData = ZRSJZ_PROP_CONFIG.get(this._curShop);
        this._shopPrice = shopData.UnitPrice * shopData.MaxCount;
        this.ShopPrice.string = `${this._shopPrice}`;
        this._curShopsTs[this._curShowIndex].Chekcked.active = true;
        ZRSJZ_Tools.ScaleNodeToFit(this.ShopIcon.node, 500, 200);
        this.ShopIcon.node.setScale(this._scale, this._scale, 1);
    }

    TweenShop() {
        Tween.stopAllByTarget(this.ShopItemContent);
        const offset: number = this.Shop.worldPosition.x - this.ShopItemContent.children[this._curShowIndex].worldPosition.x;
        tween(this.ShopItemContent)
            .to(0.3, { x: this.ShopItemContent.x + offset }, { easing: 'backOut' })
            .start();
    }
}


