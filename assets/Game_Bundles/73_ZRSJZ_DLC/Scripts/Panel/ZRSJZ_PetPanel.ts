import { _decorator, EventTouch, find, instantiate, Label, Layout, Node, Prefab } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PET_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_PetService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
import { ZRSJZ_PetItem } from '../ZRSJZ_PetItem';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PetPanel')
export class ZRSJZ_PetPanel extends ZRSJZ_Panel {
    @property(Prefab)
    PetItemPrefab: Prefab = null;

    private _selectedPet: string = "";
    private readonly _items: ZRSJZ_PetItem[] = [];

    Show(): void {
        super.Show();
        this.BuildItems();
        if (!ZRSJZ_PET_CONFIG.has(this._selectedPet)) {
            const current = ZRSJZ_GameData.Instance.CurPet;
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
                ZRSJZ_AudioManager.Instance.PlaySound("点击");
                this._selectedPet = name;
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

    private SetActive(path: string, active: boolean): void {
        const node = find(path, this.node);
        if (node) node.active = active;
    }

    private Refresh(): void {
        const config = ZRSJZ_PET_CONFIG.get(this._selectedPet);
        const owned = ZRSJZ_PetService.CheckPet(this._selectedPet);
        const deployed = owned && ZRSJZ_GameData.Instance.CurPet === this._selectedPet;
        this._items.forEach(item => item.Refresh(this._selectedPet));
        this.SetActive("Panel/皮肤", owned);
        this.SetActive("Panel/基因", owned);
        this.SetActive("Panel/PetDesc", !!config);
        if (!config) return;
        this.SetLabel("Panel/PetDesc/PetName", config.PetName);
        this.SetLabel("Panel/PetDesc/Harm", String(config.PetHarmony));
        this.SetLabel("Panel/PetDesc/HP", String(config.PetHP));
        this.SetLabel("Panel/PetDesc/Armor", String(config.PetArmor));
        this.SetLabel("Panel/PetDesc/Packsack", `+${config.PetBackpack}`);
        this.SetLabel("Panel/PetDesc/Tip5", `${config.PetDesc}`);
        this.SetActive("Panel/PetDesc/出战", owned && !deployed);
        this.SetActive("Panel/PetDesc/已出战", deployed);
        this.SetActive("Panel/PetDesc/解锁", !owned);
        this.SetLabel("Panel/PetDesc/解锁/Layout/UnlockLabel", ZRSJZ_PetService.GetUnlockLabel(this._selectedPet));
        // 原预制体放的是金币图标，其他条件通过文字完整展示。
        this.SetActive("Panel/PetDesc/解锁/Layout/UnlockIcon", config.PetUnlock === "金币解锁");
        const skills = find("Panel/PetSkill", this.node);
        skills?.children.forEach((skill, index) => {
            const name = config.PetSkills[index];
            skill.active = !!name;
            const label = skill.getChildByName("SkillName")?.getComponent(Label);
            if (label) label.string = name ?? "";
            const lock = skill.getChildByName("Lock");
            if (lock) lock.active = !owned;
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
                    ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.宠物皮肤弹窗, this._selectedPet);
                }
                break;
            case "基因":
                break;
            case "出战":
                ZRSJZ_PetService.SetBattlePet(this._selectedPet);
                this.Refresh();
                break;
            case "解锁":
                this.UnlockSelectedPet();
                break;
        }
    }
}
