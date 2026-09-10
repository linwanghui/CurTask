import { _decorator, EventTouch, find, instantiate, Label, Layout, Node, Prefab, Sprite, SpriteFrame, UITransform } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PANEL, ZRSJZ_PET_CONFIG, ZRSJZ_PET_SKIN_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_PetService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
import { ZRSJZ_PetSkinItem } from '../ZRSJZ_PetSkinItem';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PetSkinPanel')
export class ZRSJZ_PetSkinPanel extends ZRSJZ_Panel {
    @property(Prefab)
    PetSkinItem: Prefab = null;
    @property(SpriteFrame)
    GoldSF: SpriteFrame = null;
    @property(SpriteFrame)
    VideoSF: SpriteFrame = null;
    @property(SpriteFrame)
    FragmentSF: SpriteFrame = null;

    SkinsContent: Node = null;
    UseBtn: Node = null;
    UsedBtn: Node = null;
    UnlockBtn: Node = null;
    UnlockIcon: Sprite = null;
    UnlockLabel: Label = null;
    private _petName: string = "";
    private _petPlayerIndex = 0;
    private _selectedSkin: string = "";
    private _iconRequest: number = 0;
    private readonly _items: ZRSJZ_PetSkinItem[] = [];

    protected onLoad(): void {
        this.SkinsContent = find("Panel/Skins/View/Content", this.node);
        this.UseBtn = find("Panel/使用", this.node);
        this.UsedBtn = find("Panel/使用中", this.node);
        this.UnlockBtn = find("Panel/解锁", this.node);
        this.UnlockIcon = find("Panel/解锁/Layout/UnlockIcon", this.node).getComponent(Sprite);
        this.UnlockLabel = find("Panel/解锁/Layout/UnlockLabel", this.node).getComponent(Label);
    }

    Show(petName: string, playerIndex: number = 0): void {
        this._petPlayerIndex = playerIndex === 1 ? 1 : 0;
        super.Show();
        // UIManager 缓存弹窗；每次打开使用传入宠物重新生成，避免残留上只宠物的列表。
        this._petName = petName;
        this._selectedSkin = ZRSJZ_PetService.GetCurrentSkin(petName, this._petPlayerIndex);
        for (const item of this._items) {
            item.node.removeFromParent();
            item.node.destroy();
        }
        this._items.length = 0;
        const skins = ZRSJZ_PET_CONFIG.get(petName)?.PetSkins ?? [];
        if (this.PetSkinItem && ZRSJZ_PetService.CheckPet(petName)) {
            for (const skinName of skins) {
                if (!ZRSJZ_PET_SKIN_CONFIG.has(skinName)) continue;
                const node = instantiate(this.PetSkinItem);
                const item = node.getComponent(ZRSJZ_PetSkinItem);
                if (!item) {
                    node.destroy();
                    console.error("[ZRSJZ_PetSkinPanel] PetSkinItem 缺少 ZRSJZ_PetSkinItem");
                    continue;
                }
                node.setParent(this.SkinsContent);
                item.Init(petName, skinName, name => {
                    ZRSJZ_AudioManager.Instance.PlaySound("点击");
                    this._selectedSkin = name;
                    this.Refresh();
                });
                this._items.push(item);
            }
        }
        if (!this._selectedSkin) this._selectedSkin = skins[0] ?? "";
        this.SkinsContent.getComponent(Layout)?.updateLayout();
        this.Refresh();
    }

    private Refresh(): void {
        const valid = ZRSJZ_PetService.CheckPet(this._petName)
            && !!ZRSJZ_PET_CONFIG.get(this._petName)?.PetSkins.includes(this._selectedSkin)
            && ZRSJZ_PET_SKIN_CONFIG.has(this._selectedSkin);
        const owned = valid && ZRSJZ_PetService.CheckPetSkin(this._petName, this._selectedSkin);
        const used = owned && ZRSJZ_PetService.GetCurrentSkin(this._petName, this._petPlayerIndex) === this._selectedSkin;
        this.UseBtn.active = owned && !used;
        this.UsedBtn.active = used;
        this.UnlockBtn.active = valid && !owned;
        this._items.forEach(item => item.Refresh(this._selectedSkin));
        this.RefreshUnlockIcon();
    }

    private async RefreshUnlockIcon(): Promise<void> {
        const request = ++this._iconRequest;
        const { resource, label } = ZRSJZ_PetService.GetSkinUnlock(this._selectedSkin);
        this.UnlockLabel.string = label;
        this.UnlockIcon.spriteFrame = null;
        this.UnlockIcon.node.active = false;
        if (!this.UnlockBtn.active || !resource) return;
        try {
            const frame = resource === "金币" ? this.GoldSF
                : resource === "视频" ? this.VideoSF
                    : resource === "宠物碎片" ? this.FragmentSF
                    : await ZRSJZ_UIManager.Instance.GetPropUI(resource);
            if (!this.isValid || request !== this._iconRequest || !frame) return;
            this.UnlockIcon.sizeMode = Sprite.SizeMode.CUSTOM;
            this.UnlockIcon.spriteFrame = frame;
            this.UnlockIcon.node.setScale(1, 1, 1);
            const { width, height } = frame.originalSize;
            const scale = Math.min(60 / Math.max(1, width), 60 / Math.max(1, height));
            this.UnlockIcon.getComponent(UITransform).setContentSize(width * scale, height * scale);
            this.UnlockIcon.node.active = true;
            this.UnlockIcon.node.parent.getComponent(Layout)?.updateLayout();
        } catch (error) {
            console.warn("[ZRSJZ_PetSkinPanel] 解锁图标加载失败", error);
        }
    }

    private UnlockSelectedSkin(): void {
        const petName = this._petName;
        const skinName = this._selectedSkin;
        if (ZRSJZ_PetService.CheckPetSkin(petName, skinName)) return;
        const unlock = (videoRewarded: boolean) => {
            const message = ZRSJZ_PetService.TryUnlockSkin(petName, skinName, videoRewarded);
            if (message) ZRSJZ_UIManager.Instance.ShowTip(message);
            if (this.isValid && this.node.activeInHierarchy) this.Refresh();
        };
        if (ZRSJZ_PetService.GetSkinUnlock(skinName).resource === "视频") {
            Banner.Instance.ShowVideoAd(() => unlock(true));
        } else {
            unlock(false);
        }
    }

    public OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.宠物皮肤弹窗);
                break;
            case "使用":
                ZRSJZ_PetService.UseSkin(this._petName, this._selectedSkin, this._petPlayerIndex);
                this.Refresh();
                break;
            case "解锁":
                this.UnlockSelectedSkin();
                break;
        }
    }
}
