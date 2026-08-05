import { _decorator, Button, EventHandler, EventTouch, find, instantiate, Label, Node, Sprite, SpriteFrame, Tween, tween } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_PROPERTY, ZRSJZ_PROP_PROPERTY_MAX, ZRSJZ_PROP_QUALITY, ZRSJZ_SHOP_CONFIG, ZRSJZ_WEAPON_SKIN } from '../ZRSJZ_Constant';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_ShopItem } from '../UI/ZRSJZ_ShopItem';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_ShopStats } from '../UI/ZRSJZ_ShopStats';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ShowPanel')
export class ZRSJZ_ShowPanel extends ZRSJZ_Panel {

    @property(SpriteFrame)
    SkineTypeSFs: SpriteFrame[] = [];

    public CheckedNode: Node = null;
    public ShopTypeNode: Node = null;
    public ShopItemContent: Node = null;
    public ShopIcon: Sprite = null;
    public ShopName: Label = null;
    public ShopLeft: Node = null;
    public ShopRight: Node = null;
    public Shop: Node = null;
    public ShopPurchase: Node = null;
    public ShopUse: Node = null;
    public ShopUsing: Node = null;
    public ShopPrice: Label = null;
    public ShopCurrency: Node = null;
    public ShopDesc: Label = null;
    public ShopProperty: Node = null;
    public ShopSkin: Node = null;

    private _shopPropertyMap: Map<string, ZRSJZ_ShopStats> = new Map<string, ZRSJZ_ShopStats>();
    private _shopType: string = "";
    private _curShop: string = "";
    private _curShops: string[] = [];
    private _curShopsTs: ZRSJZ_ShopItem[] = [];
    private _curShowIndex: number = 0;
    private _shopPrice: number = 0;
    private _scale: number = 2;
    private _selectedWeaponSkin: string = null;
    private _isWeaponSkinOperation: boolean = false;
    private _weaponSkinNodes: Node[] = [];
    private _shopListVersion: number = 0;
    private _shopDisplayVersion: number = 0;

    protected onLoad(): void {
        this.CheckedNode = find("Panel/商品类型/Checked", this.node);
        this.ShopTypeNode = find("Panel/商品类型/武器", this.node);
        this.ShopItemContent = find("Panel/商品/view/Content", this.node);
        this.ShopIcon = find("Panel/展示/Icon", this.node).getComponent(Sprite);
        this.ShopName = find("Panel/展示/Name", this.node).getComponent(Label);
        this.ShopLeft = find("Panel/展示/上一个", this.node);
        this.ShopRight = find("Panel/展示/下一个", this.node);
        this.Shop = find("Panel/商品", this.node);
        this.ShopPurchase = find("Panel/购买", this.node);
        this.ShopUse = find("Panel/使用", this.node);
        this.ShopUsing = find("Panel/使用中", this.node);
        const useButton = this.ShopUse.getComponent(Button) ?? this.ShopUse.addComponent(Button);
        const useClickEvent = new EventHandler();
        useClickEvent.target = this.node;
        useClickEvent.component = "ZRSJZ_ShowPanel";
        useClickEvent.handler = "OnButtonClick";
        useButton.clickEvents = [useClickEvent];
        this.ShopPrice = find("Panel/购买/Price", this.node).getComponent(Label);
        this.ShopCurrency = find("Panel/购买/金币", this.node);
        this.ShopDesc = find("Panel/详情/描述/Desc", this.node).getComponent(Label);
        this.ShopProperty = find("Panel/详情/属性", this.node);
        this.ShopSkin = find("Panel/详情/皮肤", this.node);

        this.ShopProperty.children.forEach(child => {
            const shopStats = child.getComponent(ZRSJZ_ShopStats);
            shopStats.Init();
            this._shopPropertyMap.set(child.name, shopStats);
        });
    }

    protected onEnable(): void {
        this.SwitchButton(this.ShopTypeNode);
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        switch (event.getCurrentTarget().name) {
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.商店界面);
                break;
            case "购买":
                this.OnPurchase();
                break;
            case "使用":
                this.OnUseWeaponSkin();
                break;
            case "使用中":
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
                if (event.getCurrentTarget().name.startsWith("WeaponSkin_")) {
                    const skinIndex = Number(event.getCurrentTarget().name.replace("WeaponSkin_", ""));
                    const skins = ZRSJZ_WEAPON_SKIN.get(this._curShop);
                    if (skins?.[skinIndex]) {
                        this._selectedWeaponSkin = skins[skinIndex].Name;
                        this._isWeaponSkinOperation = true;
                        this.ShowShopPreview(this._selectedWeaponSkin);
                        this.RefreshWeaponSkinState();
                        this.RefreshPurchaseState();
                    }
                    break;
                }
                const clickIndex = Number(event.getCurrentTarget().name);
                if (clickIndex == this._curShowIndex) {
                    this._isWeaponSkinOperation = false;
                    this._selectedWeaponSkin = ZRSJZ_GameData.Instance.GetWeaponSkin(this._curShop);
                    this.ShowShopPreview(this._curShop);
                    this.RefreshWeaponSkinState();
                    this.RefreshPurchaseState();
                    break;
                }
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
        const version = ++this._shopListVersion;
        const shops = ZRSJZ_SHOP_CONFIG.get(this._shopType) ?? [];
        this._curShops = shops;
        this._curShowIndex = 0;
        this.RemoveShopItem();
        this._curShopsTs = [];
        const shopItems = await Promise.all(shops.map(async (shopName, index) => {
            const shopItem: Node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/ShopItem");
            shopItem.name = index.toString();
            await shopItem.getComponent(ZRSJZ_ShopItem).Init(shopName);
            const clickEventHandler = new EventHandler();
            clickEventHandler.target = this.node;
            clickEventHandler.component = "ZRSJZ_ShowPanel";
            clickEventHandler.handler = "OnButtonClick";
            const button = shopItem.getComponent(Button);
            if (button) button.clickEvents = [clickEventHandler];
            return shopItem;
        }));

        if (version !== this._shopListVersion) {
            shopItems.forEach(shopItem => ZRSJZ_PoolManager.Instance.PutNode(shopItem));
            return;
        }
        shopItems.forEach(shopItem => shopItem.parent = this.ShopItemContent);
        this._curShopsTs = shopItems.map(shopItem => shopItem.getComponent(ZRSJZ_ShopItem));
        if (this._curShopsTs.length > 0) this.ShowShop();

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
        const version = ++this._shopDisplayVersion;
        this.ShowShopButton();
        this._curShop = this._curShops[this._curShowIndex];
        this._selectedWeaponSkin = null;
        this._isWeaponSkinOperation = false;
        this.ClearWeaponSkinNodes();
        this.ShopSkin.active = false;
        this.ShopName.string = this._curShop;
        const shopIcon = await ZRSJZ_UIManager.Instance.GetPropUI(this._curShop);
        if (version !== this._shopDisplayVersion) return;
        this.ShopIcon.spriteFrame = shopIcon;
        const shopData = ZRSJZ_PROP_CONFIG.get(this._curShop);
        this._shopPrice = shopData.UnitPrice * shopData.MaxCount;
        this.ShopPrice.string = `${this._shopPrice}`;
        this._curShopsTs[this._curShowIndex].Chekcked.active = true;
        ZRSJZ_Tools.ScaleNodeToFit(this.ShopIcon.node, 500, 200);
        this.ShopIcon.node.setScale(this._scale, this._scale, 1);
        this.ShowShopDesc(this._curShop);
        this.RefreshPurchaseState();
    }

    ShowShopDesc(shopName: string) {
        //显示商品描述
        this.ShopDesc.string = ZRSJZ_PROP_CONFIG.get(shopName).Description;

        //显示商品属性
        if (ZRSJZ_PROP_PROPERTY.has(shopName)) {
            this.ShopProperty.active = true;
            const shopProperty = ZRSJZ_PROP_PROPERTY.get(shopName);
            for (const [key, shopStats] of this._shopPropertyMap) {
                if (shopProperty.hasOwnProperty(key)) {
                    shopStats.Show(shopProperty[key], ZRSJZ_PROP_PROPERTY_MAX.get(key))
                } else {
                    shopStats.Hide();
                }
            }
        } else {
            this.ShopProperty.active = false;
        }

        this.ShowWeaponSkins(shopName);
    }

    private async ShowWeaponSkins(weaponName: string): Promise<void> {
        this.ClearWeaponSkinNodes();
        const skins = ZRSJZ_WEAPON_SKIN.get(weaponName);
        this.ShopSkin.active = !!skins?.length;
        if (!skins?.length) return;

        const template = this.ShopSkin.getChildByName("WeaponSkin");
        if (!template) return;

        for (let index = 0; index < skins.length; index++) {
            // ShowShop 可能在图片加载期间切换到了其他商品，旧列表不再继续创建。
            if (weaponName !== this._curShop) return;
            const skinConfig = skins[index];
            const skinName = skinConfig.Name;
            const skinNode = instantiate(template);
            skinNode.name = `WeaponSkin_${index}`;
            skinNode.active = true;
            skinNode.parent = this.ShopSkin;
            const iconSpriteFrame = await ZRSJZ_UIManager.Instance.GetPropUI(skinName);
            const icon = skinNode.getChildByName("Icon")?.getComponent(Sprite);
            if (icon) icon.spriteFrame = iconSpriteFrame;
            const qualitySprite = skinNode.getComponent(Sprite);
            if (qualitySprite) qualitySprite.spriteFrame = this.GetSkinQualitySpriteFrame(skinConfig.Quality);
            if (weaponName !== this._curShop) {
                skinNode.destroy();
                return;
            }

            const nameLabel = skinNode.getChildByName("Name")?.getComponent(Label);
            if (nameLabel) nameLabel.string = skinName;

            const button = skinNode.getComponent(Button) ?? skinNode.addComponent(Button);
            const clickEventHandler = new EventHandler();
            clickEventHandler.target = this.node;
            clickEventHandler.component = "ZRSJZ_ShowPanel";
            clickEventHandler.handler = "OnButtonClick";
            button.clickEvents = [clickEventHandler];
            this._weaponSkinNodes.push(skinNode);
        }
        if (!this._isWeaponSkinOperation) {
            this._selectedWeaponSkin = ZRSJZ_GameData.Instance.GetWeaponSkin(weaponName);
        }
        this.RefreshWeaponSkinState();
        this.RefreshPurchaseState();
    }

    private ClearWeaponSkinNodes(): void {
        this._weaponSkinNodes.forEach(node => node?.isValid && node.destroy());
        this._weaponSkinNodes = [];
    }

    private async ShowShopPreview(spriteName: string): Promise<void> {
        const shopName = this._curShop;
        const spriteFrame = await ZRSJZ_UIManager.Instance.GetPropUI(spriteName);
        if (shopName !== this._curShop) return;
        if (this._isWeaponSkinOperation && spriteName !== this._selectedWeaponSkin) return;
        if (!this._isWeaponSkinOperation && spriteName !== shopName) return;

        this.ShopIcon.spriteFrame = spriteFrame;
        ZRSJZ_Tools.ScaleNodeToFit(this.ShopIcon.node, 500, 200);
        this.ShopIcon.node.setScale(this._scale, this._scale, 1);
    }

    /** SkineTypeSFs 顺序：白、蓝、紫、金、红；绿色暂无专用资源，回退到白色框。 */
    private GetSkinQualitySpriteFrame(quality: ZRSJZ_PROP_QUALITY): SpriteFrame {
        const indexMap: Partial<Record<ZRSJZ_PROP_QUALITY, number>> = {
            [ZRSJZ_PROP_QUALITY.白色]: 0,
            [ZRSJZ_PROP_QUALITY.绿色]: 0,
            [ZRSJZ_PROP_QUALITY.蓝色]: 1,
            [ZRSJZ_PROP_QUALITY.紫色]: 2,
            [ZRSJZ_PROP_QUALITY.金色]: 3,
            [ZRSJZ_PROP_QUALITY.红色]: 4,
        };
        return this.SkineTypeSFs[indexMap[quality] ?? 0] ?? this.SkineTypeSFs[0] ?? null;
    }

    private RefreshWeaponSkinState(): void {
        const skins = ZRSJZ_WEAPON_SKIN.get(this._curShop) ?? [];
        this._weaponSkinNodes.forEach((skinNode, index) => {
            const skinName = skins[index]?.Name;
            if (!skinName) return;
            const checked = skinNode.getChildByName("Checked");
            if (checked) checked.active = skinName === this._selectedWeaponSkin;
        });
    }

    private RefreshPurchaseState(): void {
        if (!this._isWeaponSkinOperation || !this._selectedWeaponSkin) {
            this.ShopPurchase.active = true;
            this.ShopUse.active = false;
            this.ShopUsing.active = false;
            this.ShopCurrency.active = true;
            this.ShopPrice.string = `${this._shopPrice}`;
            return;
        }

        const owned = ZRSJZ_GameData.Instance.HasWeaponSkin(this._curShop, this._selectedWeaponSkin);
        const using = ZRSJZ_GameData.Instance.GetWeaponSkin(this._curShop) === this._selectedWeaponSkin;
        const price = ZRSJZ_WEAPON_SKIN.get(this._curShop)
            ?.find(skin => skin.Name === this._selectedWeaponSkin)?.Price;
        this.ShopPurchase.active = !owned;
        this.ShopUse.active = owned && !using;
        this.ShopUsing.active = using;
        this.ShopCurrency.active = true;
        this.ShopPrice.string = price === undefined ? "未定价" : `${price}`;
    }

    private async OnPurchase(): Promise<void> {
        if (this._isWeaponSkinOperation && this._selectedWeaponSkin) {
            const owned = ZRSJZ_GameData.Instance.HasWeaponSkin(this._curShop, this._selectedWeaponSkin);
            if (owned) {
                this.RefreshPurchaseState();
                return;
            }

            const price = ZRSJZ_WEAPON_SKIN.get(this._curShop)
                ?.find(skin => skin.Name === this._selectedWeaponSkin)?.Price;
            if (price === undefined) {
                await ZRSJZ_UIManager.Instance.ShowTip("皮肤价格未配置");
                return;
            }
            if (ZRSJZ_GameData.Instance.Gold < price) {
                await ZRSJZ_UIManager.Instance.ShowTip("金币不足");
                return;
            }
            ZRSJZ_GameData.Instance.ChangeGold(-price);
            ZRSJZ_GameData.Instance.AddWeaponSkin(this._curShop, this._selectedWeaponSkin);
            this.RefreshWeaponSkinState();
            this.RefreshPurchaseState();
            await ZRSJZ_UIManager.Instance.ShowTip("皮肤购买成功");
            return;
        }

        if (ZRSJZ_GameData.Instance.Gold < this._shopPrice) {
            await ZRSJZ_UIManager.Instance.ShowTip("金币不足");
            return;
        }
        ZRSJZ_GameData.Instance.ChangeGold(-this._shopPrice);
        const count = ZRSJZ_PROP_CONFIG.get(this._curShop)?.MaxCount ?? 1;
        ZRSJZ_GameData.Instance.AddPropByName(this._curShop, count);
        await ZRSJZ_UIManager.Instance.ShowTip("购买成功");
    }

    private async OnUseWeaponSkin(): Promise<void> {
        if (!this._isWeaponSkinOperation || !this._selectedWeaponSkin) return;
        if (!ZRSJZ_GameData.Instance.HasWeaponSkin(this._curShop, this._selectedWeaponSkin)) {
            this.RefreshPurchaseState();
            return;
        }
        if (!ZRSJZ_GameData.Instance.SetWeaponSkin(this._curShop, this._selectedWeaponSkin)) {
            await ZRSJZ_UIManager.Instance.ShowTip("皮肤使用失败");
            return;
        }
        this.RefreshWeaponSkinState();
        this.RefreshPurchaseState();
        await ZRSJZ_UIManager.Instance.ShowTip("皮肤使用成功");
    }

    TweenShop() {
        Tween.stopAllByTarget(this.ShopItemContent);
        const offset: number = this.Shop.worldPosition.x - this.ShopItemContent.children[this._curShowIndex].worldPosition.x;
        tween(this.ShopItemContent)
            .to(0.3, { x: this.ShopItemContent.x + offset }, { easing: 'backOut' })
            .start();
    }
}
