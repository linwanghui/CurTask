import { _decorator, BlockInputEvents, Button, EventTouch, find, instantiate, isValid, Label, Layout, Node, Prefab, sp, Sprite, UITransform } from 'cc';
import { ZRSJZ_InventoryService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_InventoryService';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_EventManager';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PET_CONFIG, ZRSJZ_PET_SKIN_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_PetService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
import { ZRSJZ_PetItem } from '../ZRSJZ_PetItem';
import { ZRSJZ_Tools } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Tools';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_FragmentService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_FragmentService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PetPanel')
export class ZRSJZ_PetPanel extends ZRSJZ_Panel {
    @property(Prefab)
    PetItemPrefab: Prefab = null;

    @property(sp.SkeletonData)
    SkeletonDatas: sp.SkeletonData[] = [];

    private _selectedPet: string = "";
    private _petPlayerIndex = 0;

    private OnPetPlayerChange(index: number): void {
        this._petPlayerIndex = index === 1 ? 1 : 0;
        this._selectedPet = ZRSJZ_PetService.GetBattlePet(this._petPlayerIndex) || ZRSJZ_PET_CONFIG.keys().next().value || "";
        this.CloseSkillInfo();
        this.Refresh();
    }
    private readonly _items: ZRSJZ_PetItem[] = [];
    private _eventNode: Node = null;
    private _selectedSkill = -1;
    private _skillIconRequest = 0;

    protected onLoad(): void {
        const fragments = find("Panel/免费获取宠物碎片", this.node);
        if (fragments) {
            const button = fragments.getComponent(Button) ?? fragments.addComponent(Button);
            button.clickEvents = [];
            fragments.on(Button.EventType.CLICK, this.OpenFragments, this);
        }
        this.SetupSkillUI();
        this.CloseSkillInfo();
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_LOADOUT_PLAYER_CHANGE, this.OnPetPlayerChange, this);
        this.node.on(Node.EventType.TOUCH_START, this.OnPanelTouch, this, true);
        this._eventNode = ZRSJZ_UIManager.Instance?.node ?? null;
        this._eventNode?.on(ZRSJZ_MyEvent.ZRSJZ_PET_GENE_CHANGE, this.Refresh, this);
        this._eventNode?.on(ZRSJZ_MyEvent.ZRSJZ_PET_SKIN_CHANGE, this.Refresh, this);
        this._eventNode?.on(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.RefreshFragments, this);
        this.RefreshFragments();
        this.schedule(this.RefreshFragments, 1);
        this.RefreshSpine();
    }

    protected onDisable(): void {
        this.unschedule(this.RefreshFragments);
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_LOADOUT_PLAYER_CHANGE, this.OnPetPlayerChange, this);
        ++this._skillIconRequest;
        if (isValid(this.node, true)) this.node.off(Node.EventType.TOUCH_START, this.OnPanelTouch, this, true);
        this.CloseSkillInfo();
        if (isValid(this._eventNode, true)) {
            this._eventNode.off(ZRSJZ_MyEvent.ZRSJZ_PET_GENE_CHANGE, this.Refresh, this);
            this._eventNode.off(ZRSJZ_MyEvent.ZRSJZ_PET_SKIN_CHANGE, this.Refresh, this);
            this._eventNode.off(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.RefreshFragments, this);
        }
        this._eventNode = null;
    }

    Show(): void {
        super.Show();
        this.CloseSkillInfo();
        this.BuildItems();
        this._petPlayerIndex = ZRSJZ_InventoryService.GetActivePlayerIndex();
        this._selectedPet = ZRSJZ_PetService.GetBattlePet(this._petPlayerIndex);
        if (!ZRSJZ_PET_CONFIG.has(this._selectedPet)) {
            const current = ZRSJZ_PetService.GetBattlePet(this._petPlayerIndex);
            this._selectedPet = ZRSJZ_PET_CONFIG.has(current) && ZRSJZ_PetService.CheckPet(current)
                ? current : ZRSJZ_PET_CONFIG.keys().next().value ?? "";
        }
        this.Refresh();
    }

    private BuildItems(): void {
        if (this._items.length > 0) return;
        const content = find("Panel/Pets/View/Content", this.node);
        if (!content || !this.PetItemPrefab) {
            console.error("[ZRSJZ_PetPanel] 缺少宠物列表节点或 PetItemPrefab");
            return;
        }
        for (const petName of ZRSJZ_PET_CONFIG.keys()) {
            const node = instantiate(this.PetItemPrefab);
            const item = node.getComponent(ZRSJZ_PetItem);
            if (!item) {
                node.destroy();
                console.error("[ZRSJZ_PetPanel] PetItemPrefab 缺少 ZRSJZ_PetItem");
                continue;
            }
            node.setParent(content);
            item.Init(petName, name => {
                if (this._selectedPet === name) return;
                ZRSJZ_AudioManager.Instance.PlaySound("点击");
                this._selectedPet = name;
                this.CloseSkillInfo();
                this.Refresh();
            });
            this._items.push(item);
        }
        content.getComponent(Layout)?.updateLayout();
    }

    private SetLabel(path: string, text: string): void {
        const label = find(path, this.node)?.getComponent(Label);
        if (label) label.string = text;
    }

    private RefreshFragments(): void {
        const remaining = ZRSJZ_FragmentService.GetRemaining();
        this.SetActive("Panel/免费获取宠物碎片/红点", remaining > 0);
        this.SetLabel("Panel/宠物碎片/Num", String(ZRSJZ_FragmentService.GetCount()));
        this.SetLabel("Panel/免费获取宠物碎片/剩余次数", `剩余次数：${remaining}`);
    }

    private OpenFragments(): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        this.RefreshFragments();
        if (ZRSJZ_FragmentService.GetRemaining() <= 0) {
            ZRSJZ_UIManager.Instance.ShowTip("今日免费次数已用完");
            return;
        }
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.宠物碎片弹窗);
    }

    private SetActive(path: string, active: boolean): void {
        const node = find(path, this.node);
        if (node) node.active = active;
    }

    private Refresh(): void {
        this.RefreshFragments();
        const iconRequest = ++this._skillIconRequest;
        this.RefreshSpine();
        const config = ZRSJZ_PET_CONFIG.get(this._selectedPet);
        const owned = ZRSJZ_PetService.CheckPet(this._selectedPet);
        const deployed = owned && ZRSJZ_PetService.GetBattlePet(this._petPlayerIndex) === this._selectedPet;
        this._items.forEach(item => item.Refresh(this._selectedPet, this._petPlayerIndex));
        this.SetActive("Panel/皮肤", owned);
        this.SetActive("Panel/基因", owned);
        this.SetActive("Panel/PetDesc", !!config);
        this.SetLabel("Panel/等级/Desc", owned ? `lv.${ZRSJZ_PetService.GetPetGrade(this._selectedPet)}` : "lv.0");
        if (!config) return;
        this.SetLabel("Panel/PetDesc/PetName", config.PetName);
        const stats = ZRSJZ_PetService.GetPetStats(this._selectedPet, this._petPlayerIndex);
        this.SetLabel("Panel/PetDesc/Harm", String(stats.Attack));
        this.SetLabel("Panel/PetDesc/HP", String(stats.HP));
        this.SetLabel("Panel/PetDesc/Armor", String(stats.Defense));
        this.SetLabel("Panel/PetDesc/Packsack", `+${stats.Backpack}`);
        this.SetLabel("Panel/PetDesc/Tip5", `${config.PetDesc}`);
        this.SetActive("Panel/PetDesc/出战", owned && !deployed);
        this.SetActive("Panel/PetDesc/已出战", deployed);
        this.SetActive("Panel/PetDesc/解锁", !owned);
        const unlockWithFragments = config.PetUnlock === "宠物碎片解锁";
        this.SetLabel("Panel/PetDesc/解锁/Layout/UnlockLabel", unlockWithFragments
            ? String(config.PetUnlockValue ?? 0) : ZRSJZ_PetService.GetUnlockLabel(this._selectedPet));
        // 复用预制体上配置的宠物碎片图标。
        this.SetActive("Panel/PetDesc/解锁/Layout/UnlockIcon", unlockWithFragments);
        find("Panel/PetDesc/解锁/Layout", this.node)?.getComponent(Layout)?.updateLayout();
        const skills = find("Panel/PetSkill", this.node);
        skills?.children.forEach((skill, index) => {
            const name = config.PetSkills[index];
            skill.active = !!name;
            void this.RefreshSkillIcon(skill.getChildByName("SkillIcon")?.getComponent(Sprite), index, iconRequest);
            const label = skill.getChildByName("SkillName")?.getComponent(Label);
            if (label) label.string = ZRSJZ_PetService.GetSkill(this._selectedPet, index)?.Name ?? "";
            const lock = skill.getChildByName("Lock");
            if (lock) lock.active = !owned || !stats.Skills.includes(name);
        });
        if (this._selectedSkill >= 0) this.ShowSkillInfo(this._selectedSkill);
    }

    private async RefreshSkillIcon(icon: Sprite, index: number, request: number): Promise<void> {
        if (!icon) return;
        icon.sizeMode = Sprite.SizeMode.CUSTOM;
        icon.spriteFrame = null;
        const skill = ZRSJZ_PetService.GetSkill(this._selectedPet, index);
        if (!skill) return;
        const path = `Sprites/宠物/技能/${this._selectedPet}/${skill.Name}`;
        try {
            const frame = await ZRSJZ_Tools.LoadSpriteByBundle("73_ZRSJZ_DLC", path);
            if (isValid(this, true) && isValid(icon, true) && request === this._skillIconRequest) {
                icon.spriteFrame = frame;
            }
        } catch (error) { console.warn(`[ZRSJZ_PetPanel] 技能图标加载失败：${path}`, error); }
    }

    private RefreshSpine(): void {
        const skeleton = find("Panel/Spine", this.node)?.getComponent(sp.Skeleton);
        if (!skeleton) return;
        const skinName = ZRSJZ_PetService.GetCurrentSkin(this._selectedPet, this._petPlayerIndex)
            || ZRSJZ_PET_CONFIG.get(this._selectedPet)?.PetSkins[0];
        const spineName = ZRSJZ_PET_SKIN_CONFIG.get(skinName)?.PetSkinSpineName || this._selectedPet;
        const data = this.SkeletonDatas.find(item => item?.name === spineName);
        skeleton.node.active = !!data;
        if (!data) return;
        if (skeleton.skeletonData !== data) skeleton.skeletonData = data;
        skeleton.setSkin(ZRSJZ_PET_SKIN_CONFIG.get(skinName)?.PetSkinSpineSkin || "default");
        skeleton.setSlotsToSetupPose();
        skeleton.paused = false;
        skeleton.loop = true;
        skeleton.setAnimation(0, "daiji", true);
    }

    private SetupSkillUI(): void {
        const skills = find("Panel/PetSkill", this.node);
        for (const node of skills?.children ?? []) {
            const button = node.getComponent(Button) ?? node.addComponent(Button);
            button.clickEvents = [];
            node.off(Button.EventType.CLICK, this.OnSkillClick, this);
            node.on(Button.EventType.CLICK, this.OnSkillClick, this);
        }
        const info = find("Panel/技能介绍", this.node);
        if (!info) return;
        if (!info.getComponent(BlockInputEvents)) info.addComponent(BlockInputEvents);
        info.getComponent(UITransform)?.setContentSize(702, 290);
        info.setSiblingIndex(info.parent.children.length - 1);
        const desc = info.getChildByName("Desc")?.getComponent(Label);
        if (desc) {
            desc.overflow = Label.Overflow.SHRINK;
            desc.fontSize = 30;
            desc.lineHeight = 35;
            desc.node.setPosition(-325, -6, 0);
            desc.getComponent(UITransform).setContentSize(650, 180);
        }
        let unlock = info.getChildByName("视频解锁");
        if (!unlock) {
            unlock = new Node("视频解锁");
            unlock.layer = info.layer;
            unlock.setParent(info);
            const sprite = unlock.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = find("Panel/PetDesc/解锁", this.node)?.getComponent(Sprite)?.spriteFrame ?? null;
            unlock.getComponent(UITransform).setContentSize(280, 70);
            unlock.setPosition(0, -105, 0);
            unlock.addComponent(Button);
            const text = new Node("文字");
            text.layer = info.layer;
            text.setParent(unlock);
            const label = text.addComponent(Label);
            label.string = "视频解锁";
            label.font = desc?.font ?? null;
            label.fontSize = 30;
            label.lineHeight = 34;
        }
        unlock.off(Button.EventType.CLICK, this.UnlockVideoSkill, this);
        unlock.on(Button.EventType.CLICK, this.UnlockVideoSkill, this);
    }

    private OnSkillClick(button: Button): void {
        const index = Number(button.node.name.replace("Skill", "")) - 1;
        if (index < 0 || index > 3) return;
        ZRSJZ_AudioManager.Instance?.PlaySound("点击");
        this.ShowSkillInfo(index);
    }

    private ShowSkillInfo(index: number): void {
        const skill = ZRSJZ_PetService.GetSkill(this._selectedPet, index);
        const info = find("Panel/技能介绍", this.node);
        if (!skill || !info) return;
        this._selectedSkill = index;
        info.active = true;
        this.SetLabel("Panel/技能介绍/Desc", `${skill.Name} · ${skill.Kind}\n${skill.Description}\n${ZRSJZ_PetService.GetSkillUnlockText(this._selectedPet, index)}`);
        const video = info.getChildByName("视频解锁");
        if (video) video.active = skill.Unlock === "视频" && !ZRSJZ_PetService.IsSkillUnlocked(this._selectedPet, index);
    }

    private CloseSkillInfo(): void {
        this._selectedSkill = -1;
        const info = find("Panel/技能介绍", this.node);
        if (isValid(info, true)) info.active = false;
    }

    private OnPanelTouch(event: EventTouch): void {
        // 捕获阶段检查目标，按钮即使停止冒泡，点击其他区域也能关闭介绍。
        const info = find("Panel/技能介绍", this.node);
        const skills = find("Panel/PetSkill", this.node);
        let target = event.target as Node;
        while (target && target !== this.node) {
            if (target === info || target === skills) return;
            target = target.parent;
        }
        this.CloseSkillInfo();
    }

    private UnlockVideoSkill(): void {
        const petName = this._selectedPet;
        if (!ZRSJZ_PetService.CheckPet(petName)) {
            ZRSJZ_UIManager.Instance?.ShowTip("请先购买宠物");
            return;
        }
        if (ZRSJZ_PetService.IsSkillUnlocked(petName, 3)) return;
        Banner.Instance.ShowVideoAd(() => {
            // 捕获宠物名，广告期间切换选择不会给另一只宠物解锁。
            const error = ZRSJZ_PetService.TryUnlockVideoSkill(petName, true);
            ZRSJZ_UIManager.Instance?.ShowTip(error || "第四技能已永久解锁");
            if (isValid(this, true) && this.node.activeInHierarchy) this.Refresh();
        });
    }

    private UnlockSelectedPet(): void {
        // 捕获本次操作的宠物，广告期间切换选中项不会给另一只宠物发奖。
        const petName = this._selectedPet;
        const config = ZRSJZ_PET_CONFIG.get(petName);
        if (!config || ZRSJZ_PetService.CheckPet(petName)) return;
        const unlock = (videoRewarded: boolean) => {
            const message = ZRSJZ_PetService.TryUnlockPet(petName, videoRewarded);
            if (message) ZRSJZ_UIManager.Instance.ShowTip(message);
            if (this.isValid && this.node.activeInHierarchy) this.Refresh();
        };
        if (config.PetUnlock === "视频解锁") {
            Banner.Instance.ShowVideoAd(() => unlock(true));
        } else {
            unlock(false);
        }
    }

    public OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.宠物界面);
                break;
            case "皮肤":
                if (ZRSJZ_PetService.CheckPet(this._selectedPet)) {
                    ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.宠物皮肤弹窗, this._selectedPet, this._petPlayerIndex);
                }
                break;
            case "基因":
                if (ZRSJZ_PetService.CheckPet(this._selectedPet)) {
                    ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.宠物基因弹窗, this._selectedPet);
                }
                break;
            case "出战":
                ZRSJZ_PetService.SetBattlePet(this._selectedPet, this._petPlayerIndex);
                this.Refresh();
                break;
            case "解锁":
                this.UnlockSelectedPet();
                break;
        }
    }
}
