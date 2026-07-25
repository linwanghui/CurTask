import { _decorator, Component, EventHandler, EventTouch, find, Label, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PlayerSwitchButton } from '../UI/ZRSJZ_PlayerSwitchButton';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_SkinItem } from '../UI/ZRSJZ_SkinItem';
import { ZRSJZ_Skeleton } from '../Controller/ZRSJZ_Skeleton';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_RolePanel')
export class ZRSJZ_RolePanel extends ZRSJZ_Panel {

    Skeleton: ZRSJZ_Skeleton = null;

    RoleName: Label = null;
    RoleDesc: Label = null;
    SkillDesc: Label = null;
    SkinContent: Node = null;

    GoldButton: Node = null;
    VideoButton: Node = null;
    AppearedButton: Node = null;
    AppearButton: Node = null;

    GoldPrice: Label = null;

    private _curRoleData: {
        Name: string,
        Skin: string[],
    } = null;
    private _roleSkins: ZRSJZ_SkinItem[] = [];
    private _curRoleSkinIndex: number = 0;
    protected onLoad(): void {
        this.Skeleton = find("Panel/Skin", this.node).getComponent(ZRSJZ_Skeleton);

        this.RoleName = find("Panel/详情/RoleName", this.node).getComponent(Label);
        this.RoleDesc = find("Panel/详情/RoleDesc", this.node).getComponent(Label);
        this.SkillDesc = find("Panel/详情/SkillDesc", this.node).getComponent(Label);
        this.SkinContent = find("Panel/详情/SkinDesc/View/Content", this.node);

        this.GoldButton = find("Panel/状态/金币购买", this.node);
        this.VideoButton = find("Panel/状态/视频获取", this.node);
        this.AppearedButton = find("Panel/状态/已出场", this.node);
        this.AppearButton = find("Panel/状态/上场", this.node);

        this.GoldPrice = find("Panel/状态/金币购买/Price", this.node).getComponent(Label);
    }

    protected start(): void {
        this.ShowRoleDesc(ZRSJZ_GameData.Instance.CurRole[0]);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.ShowRoleDesc, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.ShowRoleDesc, this);
    }

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.角色界面);
                break;
            case "金币购买":
                const price: number = ZRSJZ_SKIN_CONFIG.get(this._curRoleData.Skin[this._curRoleSkinIndex]).UnlockPrice;
                if (ZRSJZ_GameData.Instance.Gold >= price) {
                    ZRSJZ_GameData.Instance.ChangeGold(-price);
                    ZRSJZ_GameData.Instance.AddSkin(this._curRoleData.Name, this._curRoleData.Skin[this._curRoleSkinIndex]);
                    this.ShowButton();
                } else {
                    //金币不足
                    ZRSJZ_UIManager.Instance.ShowTip("金币不足");
                }
                break;
            case "视频获取":
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_GameData.Instance.AddSkin(this._curRoleData.Name, this._curRoleData.Skin[this._curRoleSkinIndex]);
                    this.ShowButton();
                })
                break;
            case "上场":
                ZRSJZ_GameData.Instance.SetCurSkin(this._curRoleData.Name, this._curRoleData.Skin[this._curRoleSkinIndex]);
                this.ShowButton();
                break;
            default:
                const roleSkinIndex = Number(event.getCurrentTarget().name);
                if (roleSkinIndex == this._curRoleSkinIndex) return;
                this.SwitchSkin(roleSkinIndex);
                break;
        }
    }

    ShowRoleDesc(roleName: string) {
        if (this._curRoleData && this._curRoleData.Name == roleName) return;
        this._curRoleData = ZRSJZ_ROLE_CONFIG.get(roleName);
        this._curRoleSkinIndex = 0;
        this._roleSkins = [];
        this.RoleName.string = roleName;
        this.ShowRoleSkin(this._curRoleData.Skin);
        this.ShowButton();
        this.Skeleton.SetSkin(this._curRoleData.Skin[this._curRoleSkinIndex]);
    }

    ShowRoleSkin(skins: string[]) {
        for (let i = this.SkinContent.children.length - 1; i >= 0; i--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.SkinContent.children[i]);
        }
        skins.forEach(async (skinName, idnex) => {
            const skinItem: Node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/SkinItem")
            skinItem.parent = this.SkinContent;
            skinItem.name = idnex.toString();
            const skinItemTs = skinItem.getComponent(ZRSJZ_SkinItem);
            skinItemTs.Init(skinName);
            skinItemTs.Checked.active = idnex == this._curRoleSkinIndex;
            //添加点击事件
            const clickEventHandler = new EventHandler();
            clickEventHandler.target = this.node; // 这个 node 节点是你的事件处理代码组件所属的节点
            clickEventHandler.component = "ZRSJZ_RolePanel";// 这个是脚本类名
            clickEventHandler.handler = "OnButtonClick";
            skinItemTs.Button.clickEvents = [];
            skinItemTs.Button?.clickEvents.push(clickEventHandler);
            this._roleSkins.push(skinItemTs);
        })
    }

    SwitchSkin(skinIndex: number) {
        this._roleSkins[this._curRoleSkinIndex].Checked.active = false;
        this._curRoleSkinIndex = skinIndex;
        this._roleSkins[this._curRoleSkinIndex].Checked.active = true;
        this.Skeleton.SetSkin(this._curRoleData.Skin[this._curRoleSkinIndex]);
        this.ShowButton();
    }

    ShowButton() {
        const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1;
        if (ZRSJZ_GameData.Instance.CurRole[roleIndex] == this._curRoleData.Name && ZRSJZ_GameData.Instance.CurSkin[roleIndex] == this._curRoleData.Skin[this._curRoleSkinIndex]) {
            this.AppearedButton.active = true;
            this.AppearButton.active = false
        } else {
            this.AppearedButton.active = false;
            this.AppearButton.active = ZRSJZ_GameData.Instance.HaveRole.includes(this._curRoleData.Name) && ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]);
        }

        this.VideoButton.active = !ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]) && ZRSJZ_SKIN_CONFIG.get(this._curRoleData.Skin[this._curRoleSkinIndex]).UnlockType == "视频";
        if (!ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]) && ZRSJZ_SKIN_CONFIG.get(this._curRoleData.Skin[this._curRoleSkinIndex]).UnlockType == "金币") {
            this.GoldButton.active = true;
            this.GoldPrice.string = ZRSJZ_SKIN_CONFIG.get(this._curRoleData.Skin[this._curRoleSkinIndex]).UnlockPrice.toString();
        } else {
            this.GoldButton.active = false;
        }
    }
}


