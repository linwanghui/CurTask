import { ZRSJZ_MainReminderService } from './Service/ZRSJZ_MainReminderService';
import { ZRSJZ_InventoryService } from "./Service/ZRSJZ_InventoryService";
import { ZRSJZ_AccountService } from "./Service/ZRSJZ_AccountService";
import { _decorator, Button, Component, director, easing, EventTouch, Label, Node, sys, Tween, tween, UITransform, v3, Vec3, instantiate, Prefab, sp, isValid } from 'cc';
import { ZRSJZ_PetService } from './Service/ZRSJZ_PetService';
import { ZRSJZ_PET_SKIN_CONFIG } from './ZRSJZ_Constant';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_AMMO_MAX_COUNT, ZRSJZ_INVENTORY, ZRSJZ_MAIL_TYPE, ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from './ZRSJZ_GameData';
import { ProjectEvent, ProjectEventManager } from '../../../Scripts/Framework/Managers/ProjectEventManager';
import { ZRSJZ_GradeService } from "./Service/ZRSJZ_GradeService";
import { ZRSJZ_TaskService } from "./Service/ZRSJZ_TaskService";
import { ZRSJZ_MailService } from "./Service/ZRSJZ_MailService";
import { CombinationGameData, ZRSJZ_PropDataItem } from "db://assets/Scripts/CombinationGameData";
import { BundleManager } from "db://assets/Scripts/Framework/Managers/BundleManager";
import { Panel, UIManager } from "db://assets/Scripts/Framework/Managers/UIManager";
import { DataManager } from "db://assets/Scripts/Framework/Managers/DataManager";
import { ZRSJZ_GameDataDefaults } from "./Service/ZRSJZ_GameDataDefaults";
import Banner, { BannerMode } from "db://assets/Scripts/Banner";
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Start')
export class ZRSJZ_Start extends Component {

    @property(Node)
    SignBtn: Node = null;

    @property(Node)
    Player2: Node = null;

    @property(Node)
    TaskTip: Node = null;

    @property(Node)
    LoadPanel: Node = null;

    @property(Node)
    MailRed: Node = null;

    @property(Label)
    MailCount: Label = null;

    @property(Node)
    MoreGameBtn: Node = null;

    @property(Node)
    UIPanel: Node = null;

    protected start(): void {

        this.LoadPanel.active = !ZRSJZ_UIManager.ZRSJZ_UI;
        const cb: Function = () => {
            if (!ZRSJZ_GameData.Instance.IsTutorial) {
                if (Banner.Mode != BannerMode.测试包 && !sys.isBrowser) {
                    this.InitTutorial();
                    return;
                } else {
                    ZRSJZ_GameData.Instance.IsTutorial = true;
                    ZRSJZ_GameData.Instance.CurMap = "五号小镇_机密行动";
                    ZRSJZ_TaskService.CompleteTask("完成新手教程");
                }
            }
            //关闭所有面板
            ZRSJZ_UIManager.Instance.CloseAllPanelsImmediately();
            this.showRedTaskTip();
            this.showMoreGameBtnAni();
            this.LoadPanel.active = false;
            this.UIPanel.setScale(this.GetPanelScale());

            if (ZRSJZ_AccountService.CanClaimSignInReward()) {
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.签到弹窗);
            }
            this.SignBtn.active = !ZRSJZ_AccountService.IsSignInCompleted();
            ZRSJZ_AudioManager.Instance.PlayMusic("BGM", true, 0.3);
            this.ModelSwitch();
            this.RefreshMainTaskTip();
            this.RefreshMailTip();
            this.RefreshMainReminders();
            // 对局经验只在回到大厅、等级 UI 已注册事件后统一发放。
            ZRSJZ_GradeService.ClaimPendingExperience();

            this.GetCombinationGameData();
        }

        if (ZRSJZ_UIManager.ZRSJZ_UI) cb();

        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_UI, () => {
            cb();
        });
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_AUDIO_INIT, () => {
            ZRSJZ_AudioManager.Instance.PlayMusic("BGM", true, 0.3);
        })
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MODEL_SWITCH, this.ModelSwitch, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW, this.RefreshMainTaskTip, this);
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_ADD, this.RefreshMainTaskTip, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_MAIL_CHANGE, this.RefreshMailTip, this);
        this.RefreshMailTip();
        this.schedule(this.RefreshMainReminders, 1);
    }

    protected onDisable(): void {
        this.unschedule(this.RefreshMainReminders);
        for (const tip of this._mainReminderNodes.values()) {
            if (isValid(tip, true)) {
                Tween.stopAllByTarget(tip);
                tip.active = false;
                tip.setScale(1, 1, 1);
            }
        }
        this._petPreviewVersion++;
        this._petPreviewKey = '';
        for (const node of this._petPreviews) if (isValid(node, true)) node.destroy();
        this._petPreviews = [];
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MODEL_SWITCH, this.ModelSwitch, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_SHOW, this.RefreshMainTaskTip, this);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_MAIN_TASK_ADD, this.RefreshMainTaskTip, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_MAIL_CHANGE, this.RefreshMailTip, this);
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "联机游戏":
                if (!ZRSJZ_UIManager.ZRSJZ_DLC) {
                    ZRSJZ_UIManager.Instance.ShowTip("联机资源正在加载，请稍后再试");
                    break;
                }
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.联机界面);
                break;
            case "Switch":
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SWITCH_WEAPON);
                break;
            case "Slide":
                ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SLIDE);
                break;
            case "商城":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.商店界面);
                break;
            case "仓库":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.仓库界面);
                break;
            case "角色":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.角色界面);
                break;
            case "收藏室":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.收藏室界面);
                break;
            case "盲盒":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.盲盒界面);
                break;
            case "强化":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.强化界面);
                break;
            case "增强针":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.增强针弹窗);
                break;
            case "开始游戏":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.选关界面);
                // ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.加载界面, "test");
                break;
            case "签到":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.签到弹窗);
                break;
            case "主线任务":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.主线任务界面);
                break;
            case "设置":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.设置界面);
                break;
            case "等级":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.等级弹窗);
                break;
            case "邮件":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.邮件界面);
                break;
            case "锻造台":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.锻造界面);
                break;
            case "宠物":
                ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.宠物界面);
                break;
            case "更多游戏":
                UIManager.ShowPanel(Panel.LoadingPanel, [DataManager.GetGameData("文字三角洲"), "WZSJZ_Start"]);
                ZRSJZ_UIManager.Recycle();
                break;
        }
    }

    InitTutorial() {
        //没通过新手教程就跳转新手教程场景
        ZRSJZ_GameData.Instance.CurMap = "新手村";

        //初始化装备
        if (ZRSJZ_GameData.Instance.WeaponryID[0] != "") {
            ZRSJZ_InventoryService.RemovePropID(ZRSJZ_GameData.Instance.WeaponryID[0]);
            ZRSJZ_GameData.Instance.WeaponryID[0] = "";
        }

        if (ZRSJZ_GameData.Instance.WeaponryID[4] === "") {
            ZRSJZ_GameDataDefaults.InitializePlayerKnife(ZRSJZ_GameData.Instance, 0);
        }

        //初始化弹药
        if (ZRSJZ_GameData.Instance.AmmoID[0] == "") {
            let propId = ZRSJZ_InventoryService.AddPropByName("1级子弹", ZRSJZ_AMMO_MAX_COUNT);
            ZRSJZ_GameData.Instance.AmmoID[0] = propId;
            ZRSJZ_InventoryService.MovePropToInventory(propId, ZRSJZ_INVENTORY.弹药, 1, 0, 0);
        } else if (ZRSJZ_GameData.Instance.AmmoID[1] == "") {
            let propId = ZRSJZ_InventoryService.AddPropByName("1级子弹", ZRSJZ_AMMO_MAX_COUNT);
            ZRSJZ_GameData.Instance.AmmoID[1] = propId;
            ZRSJZ_InventoryService.MovePropToInventory(propId, ZRSJZ_INVENTORY.弹药, 1, 0, 0);
        } else if (ZRSJZ_GameData.Instance.AmmoID[2] == "") {
            let propId = ZRSJZ_InventoryService.AddPropByName("1级子弹", ZRSJZ_AMMO_MAX_COUNT);
            ZRSJZ_GameData.Instance.AmmoID[2] = propId;
            ZRSJZ_InventoryService.MovePropToInventory(propId, ZRSJZ_INVENTORY.弹药, 1, 0, 0);
        }
        // director.loadScene("ZRSJZ_Tutorial");
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.加载界面, "ZRSJZ_Tutorial");
    }

    private _petPreviewKey = '';
    private _petPreviewVersion = 0;
    private _petPreviewTimer = 0;
    private _petPreviews: Node[] = [];

    protected update(dt: number): void {
        this._petPreviewTimer += dt;
        if (this._petPreviewTimer < 0.3) return;
        this._petPreviewTimer = 0;
        if (!ZRSJZ_GameData.Instance) return;
        const pets = [0, 1].map(index => ZRSJZ_PetService.GetBattlePet(index));
        const key = JSON.stringify([ZRSJZ_UIManager.ZRSJZ_DLC, ...pets,
        ...pets.map((name, index) => ZRSJZ_PetService.GetCurrentSkin(name, index))]);
        if (key === this._petPreviewKey) return;
        this._petPreviewKey = key;
        const version = ++this._petPreviewVersion;
        for (const node of this._petPreviews) if (isValid(node, true)) node.destroy();
        this._petPreviews = [];
        if (!ZRSJZ_UIManager.ZRSJZ_DLC) return;
        pets.forEach((pet, index) => {
            if (pet) void this.ShowPetPreview(pet, index, version).catch(error => {
                console.warn('[大厅宠物] 加载失败', pet, error);
                if (version === this._petPreviewVersion) this._petPreviewKey = '';
            });
        });
    }

    private async ShowPetPreview(petName: string, playerIndex: number, version: number): Promise<void> {
        const player = playerIndex === 1 ? this.Player2 : this.Player2?.parent?.getChildByName('Player1');
        const holder = player?.getChildByName('宠物');
        if (!holder || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
        const prefab = await new Promise<Prefab>((resolve, reject) => {
            BundleManager.GetBundle('73_ZRSJZ_DLC').load(`Prefabs/Unit/Pet/${petName}`, Prefab,
                (error, asset) => error ? reject(error) : resolve(asset));
        });
        if (!isValid(this, true) || !isValid(holder, true) || version !== this._petPreviewVersion
            || !ZRSJZ_UIManager.ZRSJZ_DLC || !this.node.activeInHierarchy) return;
        // 大厅只复制外观，避免启动战斗跟随、碰撞或技能脚本。
        const source = instantiate(prefab);
        source.active = false;
        const skeleton = source.getComponentInChildren(sp.Skeleton);
        if (!skeleton) { source.destroy(); return; }
        const visual = instantiate(skeleton.node);
        source.destroy();
        visual.setParent(holder);
        visual.setPosition(0, 0, 0);
        const spine = visual.getComponent(sp.Skeleton);
        const skin = ZRSJZ_PET_SKIN_CONFIG.get(ZRSJZ_PetService.GetCurrentSkin(petName, playerIndex));
        const skinName = skin?.PetSkinSpineSkin ?? 'default';
        const data = spine.skeletonData?.getRuntimeData();
        if (data) {
            spine.setSkin(data.findSkin(skinName) ? skinName : 'default');
            spine.setSlotsToSetupPose();
            if (data.findAnimation('daiji')) spine.setAnimation(0, 'daiji', true);
        }
        visual.active = true;
        this._petPreviews.push(visual);
    }

    ModelSwitch() {
        this.Player2.active = ZRSJZ_GameData.Instance.CurModel == "2p";
    }

    private _mainReminderNodes = new Map<string, Node>();

    private RefreshMainReminders(): void {
        if (!ZRSJZ_UIManager.ZRSJZ_UI || !isValid(this.UIPanel, true)) return;
        if (this._mainReminderNodes.size === 0) {
            const names = new Set(['宠物']);
            // 只匹配主页按钮，避免把同名宠物展示节点作为入口。
            for (const button of this.UIPanel.getComponentsInChildren(Button)) {
                const target = button.node;
                if (!names.has(target.name)) continue;
                // 使用场景中配置好的节点，位置由编辑器维护。
                const tip = target.getChildByName('红点');
                if (!tip) continue;
                tip.active = false;
                this._mainReminderNodes.set(target.name, tip);
            }
        }
        const reminders = ZRSJZ_MainReminderService.GetReminders(ZRSJZ_UIManager.ZRSJZ_DLC);
        for (const [name, tip] of this._mainReminderNodes) {
            if (!isValid(tip, true)) continue;
            const visible = reminders[name] === true;
            if (tip.active === visible) continue;
            Tween.stopAllByTarget(tip);
            tip.setScale(1, 1, 1);
            tip.active = visible;
            if (visible) {
                tween(tip)
                    .to(0.3, { scale: v3(1.5, 1.5, 1) })
                    .to(0.3, { scale: v3(1, 1, 1) })
                    .union().repeatForever().start();
            }
        }
    }

    private RefreshMainTaskTip(): void {
        if (this.TaskTip?.isValid) {
            this.TaskTip.active = ZRSJZ_TaskService.HasMainTaskReminder();
        }
    }

    private RefreshMailTip(): void {
        const unclaimedMailCount = ZRSJZ_MailService.GetUnclaimedMailCount();
        if (this.MailRed?.isValid) this.MailRed.active = unclaimedMailCount > 0;
        if (this.MailCount?.isValid) {
            this.MailCount.string = `${Math.min(99, unclaimedMailCount)}`;
        }
    }

    private showRedTaskTip() {
        Tween.stopAllByTarget(this.TaskTip);
        tween(this.TaskTip)
            .to(0.3, { scale: v3(1.5, 1.5, 1) })
            .to(0.3, { scale: v3(1, 1, 1) })
            .union()
            .repeatForever()
            .start();
    }

    private showMoreGameBtnAni() {
        Tween.stopAllByTarget(this.MoreGameBtn);
        tween(this.MoreGameBtn)
            .to(0.5, { scale: v3(1.1, 1.1, 1) })
            .to(0.5, { scale: v3(1, 1, 1) })
            .union()
            .repeatForever()
            .start();
    }

    //领取其他模式中获得的道具
    public async GetCombinationGameData() {
        if (CombinationGameData.Instance.ZRSJZ_PropData.length <= 0) return;
        const propAwards: { PropName: string, Count: number }[] = [];
        CombinationGameData.Instance.ZRSJZ_PropData.forEach((prpData: ZRSJZ_PropDataItem) => {
            propAwards.push({
                PropName: prpData.Name,
                Count: prpData.Num,
            });
        })
        CombinationGameData.Instance.ZRSJZ_PropData = [];
        CombinationGameData.DateSave();
        ZRSJZ_MailService.AddMail(ZRSJZ_MAIL_TYPE.其他模式中获取道具, propAwards,);
    }

    GetPanelScale(): Vec3 {
        const panelTransform = this.UIPanel?.getComponent(UITransform);
        const containerTransform = this.UIPanel.parent?.getComponent(UITransform)
            ?? this.node.getComponent(UITransform);
        if (!panelTransform || !containerTransform) return Vec3.ONE.clone();

        const panelWidth = panelTransform.contentSize.width;
        const panelHeight = panelTransform.contentSize.height;
        const containerWidth = containerTransform.contentSize.width;
        const containerHeight = containerTransform.contentSize.height;
        if (
            panelWidth <= 0 || panelHeight <= 0
            || containerWidth <= 0 || containerHeight <= 0
        ) {
            return Vec3.ONE.clone();
        }

        // 等比缩小到当前弹窗容器内。全屏模式通常保持 1，分屏模式下
        // 则会根据玩家 UI 容器的实际宽高自动缩小，避免内容越界。
        const scale = Math.min(
            containerWidth / panelWidth,
            containerHeight / panelHeight,
        );
        return v3(scale, scale, 1);
    }

}

