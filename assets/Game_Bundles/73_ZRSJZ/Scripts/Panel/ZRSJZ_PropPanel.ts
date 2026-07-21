import { _decorator, Component, EventTouch, find, Label, Node, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_ShopStats } from '../UI/ZRSJZ_ShopStats';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG, ZRSJZ_PROP_PROPERTY, ZRSJZ_PROP_PROPERTY_MAX } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PropPanel')
export class ZRSJZ_PropPanel extends ZRSJZ_Panel {
    Name: Label = null;
    PropGrid: Sprite = null;
    PropIcon: Sprite = null;
    Price: Label = null;
    PropDesc1: Node = null;
    PropDesc2: Node = null;
    PropProperty: Node = null;
    LoadBtn: Node = null;
    UnloadBtn: Node = null;
    ReplaceBtn: Node = null;
    SellBtn: Node = null;

    private _propPropertyMap: Map<string, ZRSJZ_ShopStats> = new Map<string, ZRSJZ_ShopStats>();

    protected onLoad(): void {
        this.Name = find("Panel/PropName", this.node).getComponent(Label);
        this.PropGrid = find("Panel/PropGrid", this.node).getComponent(Sprite);
        this.PropIcon = find("Panel/PropGrid/PropIcon", this.node).getComponent(Sprite);
        this.Price = find("Panel/PropPrice/Price", this.node).getComponent(Label);
        this.PropDesc1 = find("Panel/描述1", this.node);
        this.PropDesc2 = find("Panel/描述2", this.node);
        this.PropProperty = find("Panel/属性", this.node);
        this.LoadBtn = find("Panel/Buttons/装备", this.node);
        this.UnloadBtn = find("Panel/Buttons/卸下", this.node);
        this.ReplaceBtn = find("Panel/Buttons/替换", this.node);
        this.SellBtn = find("Panel/Buttons/出售", this.node);

        this.PropProperty.children.forEach(child => {
            const shopStats = child.getComponent(ZRSJZ_ShopStats);
            shopStats.Init();
            this._propPropertyMap.set(child.name, shopStats);
        });
    }

    Show(...args: any[]) {
        super.Show();
        this.ShowProp(args[0]);
    }

    async ShowProp(propID: string) {
        const propData = ZRSJZ_GameData.Instance.PropData[propID];
        const propConfig = ZRSJZ_PROP_CONFIG.get(propData.Name);
        if (!propData) {
            console.error("没找到Id:", propID);
            return;
        }
        this.Name.string = propData.Name;
        this.PropGrid.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropGridUI(`${propConfig.Quality}1_2`);
        this.PropIcon.spriteFrame = await ZRSJZ_UIManager.Instance.GetPropUI(`${propData.Name}`);
        ZRSJZ_Tools.ScaleNodeToFit(this.PropIcon.node, 269 - 30, 132 - 30);
        this.Price.string = `${propData.UnitPrice * propData.CurCount}`;
        if (ZRSJZ_PROP_PROPERTY.has(propData.Name)) {
            //有属性
            this.PropDesc1.active = true;
            this.PropDesc2.active = false;
            this.PropProperty.active = true;
            //显示desc
            find("Desc", this.PropDesc1).getComponent(Label).string = `${propConfig.Description}`;
            //显示属性
            const propProperty = ZRSJZ_PROP_PROPERTY.get(propData.Name);
            for (const [key, propStats] of this._propPropertyMap) {
                if (propProperty.hasOwnProperty(key)) {
                    propStats.Show(propProperty[key], ZRSJZ_PROP_PROPERTY_MAX.get(key))
                } else {
                    propStats.Hide();
                }
            }
        } else {
            this.PropDesc1.active = false;
            this.PropDesc2.active = true;
            this.PropProperty.active = false;
            find("Desc", this.PropDesc2).getComponent(Label).string = `${propConfig.Description}`;
        }
        //显示按钮
        if (propConfig.PropType == "物品" || propConfig.PropType == "弹药") {
            this.LoadBtn.active = false;
            this.UnloadBtn.active = false;
            this.ReplaceBtn.active = false;
            this.SellBtn.active = true;
        } else {
            if (propData.CurInventory == ZRSJZ_INVENTORY.武器_刀) {
                this.LoadBtn.active = false;
                this.UnloadBtn.active = false;
                this.ReplaceBtn.active = false;
                this.SellBtn.active = false;
            } else {
                const isLoading = ZRSJZ_GameData.Instance.WeaponryID.includes(propID);
                this.UnloadBtn.active = isLoading;
                const weaponIndex = ZRSJZ_Tools.GetWeaponryIndexByType(propConfig.PropType);
                const isHaveWeapon = ZRSJZ_GameData.Instance.WeaponryID[weaponIndex] != "";
                this.LoadBtn.active = !isLoading && !isHaveWeapon;
                this.ReplaceBtn.active = !isLoading && isHaveWeapon;
                this.SellBtn.active = true;
            }
        }
    }

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.道具弹窗);
                break;
            case "卸下":
                break;
            case "装备":
                break;
            case "替换":
                break;
            case "出售":
                break;
        }
    }

}


