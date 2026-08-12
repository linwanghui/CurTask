import { _decorator, EventHandler, EventTouch, find, instantiate, Label, Node, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PROP_QUALITY, ZRSJZ_ROLE_CONFIG, ZRSJZ_RoleConfig, ZRSJZ_SKIN_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_PlayerSwitchButton } from '../UI/ZRSJZ_PlayerSwitchButton';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_SkinItem } from '../UI/ZRSJZ_SkinItem';
import { ZRSJZ_Skeleton } from '../Controller/ZRSJZ_Skeleton';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_RoleItem } from '../UI/ZRSJZ_RoleItem';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_RolePanel')
export class ZRSJZ_RolePanel extends ZRSJZ_Panel {

    @property(SpriteFrame)
    SkillIconSFs: SpriteFrame[] = [];

    Skeleton: ZRSJZ_Skeleton = null;

    RoleName: Label = null;
    RoleDesc: Label = null;
    SkillIcon: Sprite = null;
    SkillDesc: Label = null;
    RoleContent: Node = null;
    SkinContent: Node = null;

    GoldButton: Node = null;
    VideoButton: Node = null;
    AppearedButton: Node = null;
    AppearButton: Node = null;

    GoldPrice: Label = null;

    private _curRoleData: Readonly<ZRSJZ_RoleConfig> = null;
    private _roleSkins: ZRSJZ_SkinItem[] = [];
    private _curRoleSkinIndex: number = 0;
    private _skinQualityFrames: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    private _skillIconMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    private _skinListVersion: number = 0;
    protected onLoad(): void {
        this.Skeleton = find("Panel/Skin", this.node).getComponent(ZRSJZ_Skeleton);

        this.RoleName = find("Panel/角色名字底/RoleName", this.node).getComponent(Label);
        this.RoleDesc = find("Panel/详情/RoleDesc", this.node).getComponent(Label);
        this.SkillIcon = find("Panel/详情/SkillIcon", this.node).getComponent(Sprite);
        this.SkillDesc = find("Panel/详情/SkillDesc", this.node).getComponent(Label);
        this.RoleContent = find("Panel/所有角色/View/Content", this.node);
        this.SkinContent = find("Panel/详情/SkinDesc/View/Content", this.node);

        this.GoldButton = find("Panel/状态/金币购买", this.node);
        this.VideoButton = find("Panel/状态/视频获取", this.node);
        this.AppearedButton = find("Panel/状态/已出场", this.node);
        this.AppearButton = find("Panel/状态/上场", this.node);

        this.GoldPrice = find("Panel/状态/金币购买/Price", this.node).getComponent(Label);
    }

    protected async start(): Promise<void> {
        await this.InitSkinQualityFrames();
        this.SkillIconSFs.forEach(sf => this._skillIconMap.set(sf.name, sf));
        const savedRole = ZRSJZ_GameData.Instance.CurRole[0];
        const defaultRole = ZRSJZ_ROLE_CONFIG.has(savedRole)
            ? savedRole
            : Array.from(ZRSJZ_ROLE_CONFIG.keys())[0];
        if (defaultRole) this.ShowRoleDesc(defaultRole);
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.ShowRoleDesc, this);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.ShowRoleDesc, this);
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
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
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_MAIN_CHANGE_SKIN);
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
        const roleData = ZRSJZ_ROLE_CONFIG.get(roleName);
        if (!roleData) return;
        this._curRoleData = roleData;
        const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1;
        const currentSkin = ZRSJZ_GameData.Instance.CurRole[roleIndex] === roleName
            ? ZRSJZ_GameData.Instance.CurSkin[roleIndex]
            : null;
        this._curRoleSkinIndex = Math.max(0, this._curRoleData.Skin.indexOf(currentSkin));
        this._roleSkins = [];
        this.RoleName.string = this._curRoleData.Name;
        this.RoleDesc.string = this._curRoleData.RoleDesc;
        this.SkillDesc.string = this._curRoleData.SkillDesc;
        this.ShowRoleSkin(this._curRoleData.Skin);
        this.ShowButton();
        this.Skeleton.SetSkin(this._curRoleData.Skin[this._curRoleSkinIndex]);
        this.SkillIcon.spriteFrame = this._skillIconMap.get(this._curRoleData.SkillName) ?? null;
    }

    async ShowRoleSkin(skins: string[]): Promise<void> {
        const version = ++this._skinListVersion;
        for (let i = this.SkinContent.children.length - 1; i >= 0; i--) {
            this.RecycleSkinItem(this.SkinContent.children[i]);
        }
        const skinItems = await Promise.all(skins.map(async (skinName, index) => {
            const skinItem: Node = await ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/SkinItem");
            skinItem.name = index.toString();
            skinItem.active = true;
            const skinItemTs = skinItem.getComponent(ZRSJZ_SkinItem);
            const skinConfig = ZRSJZ_SKIN_CONFIG.get(skinName);
            skinItemTs.Init(skinName, this.GetSkinQualityFrame(skinConfig?.Quality));
            skinItemTs.Checked.active = index == this._curRoleSkinIndex;
            const clickEventHandler = new EventHandler();
            clickEventHandler.target = this.node;
            clickEventHandler.component = "ZRSJZ_RolePanel";
            clickEventHandler.handler = "OnButtonClick";
            if (skinItemTs.Button) skinItemTs.Button.clickEvents = [clickEventHandler];
            return skinItemTs;
        }));

        if (version !== this._skinListVersion) {
            skinItems.forEach(item => this.RecycleSkinItem(item.node));
            return;
        }
        skinItems.forEach(item => item.node.parent = this.SkinContent);
        this._roleSkins = skinItems;
    }

    private RecycleSkinItem(node: Node): void {
        if (!node?.isValid) return;
        if (!node.getComponent(ZRSJZ_SkinItem)) {
            node.removeFromParent();
            node.destroy();
            return;
        }
        node.name = "SkinItem";
        ZRSJZ_PoolManager.Instance.PutNode(node);
    }

    SwitchSkin(skinIndex: number) {
        if (!this._roleSkins[skinIndex]) return;
        this._roleSkins[this._curRoleSkinIndex].Checked.active = false;
        this._curRoleSkinIndex = skinIndex;
        this._roleSkins[this._curRoleSkinIndex].Checked.active = true;
        this.Skeleton.SetSkin(this._curRoleData.Skin[this._curRoleSkinIndex]);
        this.ShowButton();
    }

    ShowButton() {
        if (!this._curRoleData) return;
        const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1;
        if (ZRSJZ_GameData.Instance.CurRole[roleIndex] == this._curRoleData.Name && ZRSJZ_GameData.Instance.CurSkin[roleIndex] == this._curRoleData.Skin[this._curRoleSkinIndex]) {
            this.AppearedButton.active = true;
            this.AppearButton.active = false
        } else {
            this.AppearedButton.active = false;
            this.AppearButton.active = ZRSJZ_GameData.Instance.HaveRole.includes(this._curRoleData.Name) && ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]);
        }

        const skinConfig = ZRSJZ_SKIN_CONFIG.get(this._curRoleData.Skin[this._curRoleSkinIndex]);
        this.VideoButton.active = !ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]) && skinConfig?.UnlockType == "视频";
        if (!ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]) && skinConfig?.UnlockType == "金币") {
            this.GoldButton.active = true;
            this.GoldPrice.string = skinConfig.UnlockPrice.toString();
        } else {
            this.GoldButton.active = false;
        }
    }

    private async InitSkinQualityFrames(): Promise<void> {
        try {
            const spriteFrames = await ZRSJZ_Tools.LoadSprites("Sprites/皮肤框");
            spriteFrames.forEach(spriteFrame => this._skinQualityFrames.set(spriteFrame.name, spriteFrame));
        } catch (error) {
            console.error("角色皮肤品质框加载失败", error);
        }
    }

    private GetSkinQualityFrame(quality?: ZRSJZ_PROP_QUALITY): SpriteFrame {
        const qualityNameMap: Partial<Record<ZRSJZ_PROP_QUALITY, string>> = {
            [ZRSJZ_PROP_QUALITY.白色]: "白",
            [ZRSJZ_PROP_QUALITY.绿色]: "白",
            [ZRSJZ_PROP_QUALITY.蓝色]: "蓝",
            [ZRSJZ_PROP_QUALITY.紫色]: "紫",
            [ZRSJZ_PROP_QUALITY.金色]: "金",
            [ZRSJZ_PROP_QUALITY.红色]: "红",
        };
        return this._skinQualityFrames.get(qualityNameMap[quality] ?? "白")
            ?? this._skinQualityFrames.get("白")
            ?? null;
    }

}


