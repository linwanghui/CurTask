import { ZRSJZ_FragmentService } from "../Service/ZRSJZ_FragmentService";
import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, Button, EventHandler, EventTouch, find, instantiate, Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';
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
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_RolePanel')
export class ZRSJZ_RolePanel extends ZRSJZ_Panel {

    @property(SpriteFrame)
    SkillIconSFs: SpriteFrame[] = [];

    /** 名字底品质图：依次为稀有、史诗、传说，直接绑定预制体资源。 */
    @property([SpriteFrame])
    NameQualitySFs: SpriteFrame[] = [];
    private _nameQualitySprite: Sprite = null;
    private _defaultNameQualityFrame: SpriteFrame = null;

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
    private _signInOnlyTip: Node = null;

    private _curRoleData: Readonly<ZRSJZ_RoleConfig> = null;
    private _roleSkins: ZRSJZ_SkinItem[] = [];
    private _curRoleSkinIndex: number = 0;
    private _skinQualityFrames: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    private _skillIconMap: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();
    private _skinListVersion: number = 0;
    private _initialized: boolean = false;
    private _fragmentEventNode: Node = null;
    private _fragmentGlow: Node = null;

    private RefreshFragments(): void {
        const count = find("Panel/英雄碎片/Num", this.node)?.getComponent(Label);
        if (count) count.string = String(ZRSJZ_FragmentService.GetCount('英雄碎片'));
        const remaining = ZRSJZ_FragmentService.GetRemaining('英雄碎片');
        const label = find("Panel/免费获取英雄碎片/剩余次数", this.node)?.getComponent(Label);
        if (label) label.string = '剩余次数：' + remaining;
        const dot = find("Panel/免费获取英雄碎片/红点", this.node);
        if (dot) dot.active = remaining > 0;
        this.ShowButton();
    }

    private OpenFragments(): void {
        if (ZRSJZ_FragmentService.GetRemaining('英雄碎片') <= 0) {
            ZRSJZ_UIManager.Instance.ShowTip("今日免费次数已用完");
            return;
        }
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.英雄碎片弹窗);
    }

    protected update(dt: number): void {
        if (this._fragmentGlow) this._fragmentGlow.angle = (this._fragmentGlow.angle - dt * 45) % 360;
    }

    protected onLoad(): void {
        const free = find("Panel/免费获取英雄碎片", this.node);
        if (free) {
            const button = free.getComponent(Button) ?? free.addComponent(Button);
            button.clickEvents = [];
            free.on(Button.EventType.CLICK, this.OpenFragments, this);
        }
        this._fragmentGlow = find("Panel/免费获取英雄碎片/碎片背光", this.node);
        this.Skeleton = find("Panel/Skin", this.node).getComponent(ZRSJZ_Skeleton);

        this.RoleName = find("Panel/角色名字底/RoleName", this.node).getComponent(Label);
        this._nameQualitySprite = find("Panel/角色名字底", this.node)?.getComponent(Sprite);
        this._defaultNameQualityFrame = this._nameQualitySprite?.spriteFrame ?? null;
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
        this._signInOnlyTip = new Node("签到解锁提示");
        this._signInOnlyTip.layer = this.GoldButton.layer;
        this._signInOnlyTip.parent = this.GoldButton.parent;
        this._signInOnlyTip.setPosition(this.GoldButton.position);
        this._signInOnlyTip.addComponent(UITransform).setContentSize(480, 70);
        const tip = this._signInOnlyTip.addComponent(Label);
        tip.string = "该皮肤只能签到获得";
        tip.font = this.GoldPrice.font;
        tip.fontSize = 32;
        tip.lineHeight = 40;
        tip.horizontalAlign = Label.HorizontalAlign.CENTER;
        tip.verticalAlign = Label.VerticalAlign.CENTER;
        this._signInOnlyTip.active = false;
    }

    protected async start(): Promise<void> {
        await this.InitSkinQualityFrames();
        this.SkillIconSFs.forEach(sf => this._skillIconMap.set(sf.name, sf));
        this._initialized = true;
        if (this.node.activeInHierarchy) this.SelectInitialRole();
    }

    protected onEnable(): void {
        // 预制体重新打开时允许当前角色重新初始化一次，之后再拦截重复点击。
        this._curRoleData = null;
        this.Skeleton.node.active = false;
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_DESC, this.ShowRoleDesc, this);
        if (this._initialized) this.SelectInitialRole();
        this._fragmentEventNode = ZRSJZ_UIManager.Instance?.node;
        this._fragmentEventNode?.on(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.RefreshFragments, this);
        this.RefreshFragments();
        this.schedule(this.RefreshFragments, 1);
    }

    protected onDisable(): void {
        this.unschedule(this.RefreshFragments);
        this._fragmentEventNode?.off(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.RefreshFragments, this);
        this._fragmentEventNode = null;
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
            case "视频获取":
                if (!this._curRoleData) return;
                const error = ZRSJZ_AccountService.UnlockSkinWithFragments(this._curRoleData.Name, this._curRoleData.Skin[this._curRoleSkinIndex]);
                ZRSJZ_UIManager.Instance.ShowTip(error || "解锁成功");
                this.RefreshFragments();
                break;
            case "上场":
                ZRSJZ_AccountService.SetCurSkin(this._curRoleData.Name, this._curRoleData.Skin[this._curRoleSkinIndex]);
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
        // DLC 未就绪时角色 Spine 只有威蓝，外部按钮发来的存档角色也统一回落到威蓝。
        if (!ZRSJZ_UIManager.ZRSJZ_DLC && roleName !== "威蓝") {
            roleName = "威蓝";
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, roleName);
        }
        // 当前角色已选中时，不重复生成皮肤列表和刷新角色详情。
        if (this._curRoleData?.Name === roleName) return;
        const roleData = ZRSJZ_ROLE_CONFIG.get(roleName);
        if (!roleData) return;
        this._curRoleData = roleData;
        const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1;
        const currentSkin = ZRSJZ_GameData.Instance.CurRole[roleIndex] === roleName
            ? ZRSJZ_GameData.Instance.CurSkin[roleIndex]
            : null;
        this._curRoleSkinIndex = Math.max(0, this._curRoleData.Skin.indexOf(currentSkin));
        this._roleSkins = [];
        this.RoleDesc.string = this._curRoleData.RoleDesc;
        this.SkillDesc.string = this._curRoleData.SkillDesc;
        this.ShowRoleSkin(this._curRoleData.Skin);
        this.ShowButton();
        this.Skeleton.SetSkin(this._curRoleData.Skin[this._curRoleSkinIndex]);
        this.RoleName.string = this._curRoleData.Skin[this._curRoleSkinIndex];
        this.SkillIcon.spriteFrame = this._skillIconMap.get(this._curRoleData.SkillName) ?? null;
    }

    private SelectInitialRole(): void {
        const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1;
        const savedRole = ZRSJZ_GameData.Instance.CurRole[roleIndex];
        const roleName = ZRSJZ_UIManager.ZRSJZ_DLC && ZRSJZ_ROLE_CONFIG.has(savedRole)
            ? savedRole
            : "威蓝";
        ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_SHOW_ROLE_ITEM, roleName);
        this.ShowRoleDesc(roleName);
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
        this.RoleName.string = this._curRoleData.Skin[this._curRoleSkinIndex];
        this.ShowButton();
    }

    private RefreshNameQuality(): void {
        if (!this._nameQualitySprite || !this._curRoleData) return;
        const skin = this._curRoleData.Skin[this._curRoleSkinIndex];
        const quality = ZRSJZ_SKIN_CONFIG.get(skin)?.Quality;
        const index = quality === ZRSJZ_PROP_QUALITY.白色 ? 0
            : quality === ZRSJZ_PROP_QUALITY.紫色 ? 1
                : quality === ZRSJZ_PROP_QUALITY.红色 ? 2 : -1;
        this._nameQualitySprite.sizeMode = Sprite.SizeMode.TRIMMED;
        this._nameQualitySprite.spriteFrame = this.NameQualitySFs[index] ?? this._defaultNameQualityFrame;
    }

    ShowButton() {
        if (!this._curRoleData) return;
        this.RefreshNameQuality();
        const roleIndex = ZRSJZ_PlayerSwitchButton.CurPlayer == "1p" ? 0 : 1;
        if (ZRSJZ_GameData.Instance.CurRole[roleIndex] == this._curRoleData.Name && ZRSJZ_GameData.Instance.CurSkin[roleIndex] == this._curRoleData.Skin[this._curRoleSkinIndex]) {
            this.AppearedButton.active = true;
            this.AppearButton.active = false
        } else {
            this.AppearedButton.active = false;
            this.AppearButton.active = ZRSJZ_GameData.Instance.HaveRole.includes(this._curRoleData.Name) && ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]);
        }

        const skinConfig = ZRSJZ_SKIN_CONFIG.get(this._curRoleData.Skin[this._curRoleSkinIndex]);
        const exclusiveTip = skinConfig?.UnlockType === "签到解锁" ? "该皮肤只能签到获得"
            : skinConfig?.UnlockType === "战令解锁" ? "该皮肤只能通过战令获得" : "";
        this._signInOnlyTip.getComponent(Label).string = exclusiveTip;
        this._signInOnlyTip.active = !!exclusiveTip
            && !ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]);
        this.VideoButton.active = false;
        if (!ZRSJZ_GameData.Instance.HaveSkin.includes(this._curRoleData.Skin[this._curRoleSkinIndex]) && skinConfig?.UnlockType == "英雄碎片") {
            this.GoldButton.active = true;
            this.GoldPrice.string = `${skinConfig.UnlockPrice} 解锁`;
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
