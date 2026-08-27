import { _decorator, EventTouch, find, Label, Node, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AMMO_MAX_COUNT, ZRSJZ_ASSIST_FIGHTING_GIFT_CONFIG, ZRSJZ_AssistFightingGiftConfig, ZRSJZ_MAP_CONFIG, ZRSJZ_PANEL, } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_AssistFightingPanel')
export class ZRSJZ_AssistFightingPanel extends ZRSJZ_Panel {

    WeaponIcon: Sprite = null;
    WeaponName: Label = null;
    Icon_T: Sprite = null;
    Name_T: Label = null;
    Icon_J: Sprite = null;
    Name_J: Label = null;
    Icon_B: Sprite = null;
    Name_B: Label = null;
    Icon_DY: Sprite = null;
    Name_DY: Label = null;
    Count_DY: Label = null;

    private _gift: Readonly<ZRSJZ_AssistFightingGiftConfig> = null;
    private _continueAction: (() => void) | null = null;
    private _isClaiming: boolean = false;
    private _showVersion: number = 0;

    protected onLoad(): void {
        this.WeaponIcon = find("Panel/WeaponIcon", this.node).getComponent(Sprite);
        this.WeaponName = find("Panel/WeaponName", this.node).getComponent(Label);
        this.Icon_T = find("Panel/头/Icon", this.node).getComponent(Sprite);
        this.Name_T = find("Panel/头/Name", this.node).getComponent(Label);
        this.Icon_J = find("Panel/甲/Icon", this.node).getComponent(Sprite);
        this.Name_J = find("Panel/甲/Name", this.node).getComponent(Label);
        this.Icon_B = find("Panel/包/Icon", this.node).getComponent(Sprite);
        this.Name_B = find("Panel/包/Name", this.node).getComponent(Label);
        this.Icon_DY = find("Panel/弹药/Icon", this.node).getComponent(Sprite);
        this.Name_DY = find("Panel/弹药/Name", this.node).getComponent(Label);
        this.Count_DY = find("Panel/弹药/Count", this.node).getComponent(Label);
    }

    protected onDestroy(): void {
        this._showVersion++;
    }

    Show(...args: any[]): void {
        const mapKey = typeof args[0] === "string" ? args[0] : ZRSJZ_GameData.Instance.CurMap;
        const difficulty = ZRSJZ_MAP_CONFIG.get(mapKey)?.Difficulty ?? 1;
        this._gift = ZRSJZ_ASSIST_FIGHTING_GIFT_CONFIG.get(difficulty)
            ?? ZRSJZ_ASSIST_FIGHTING_GIFT_CONFIG.get(1);
        this._continueAction = typeof args[1] === "function" ? args[1] : null;
        this._isClaiming = false;
        super.Show(() => void this.RefreshGift());
    }

    OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.助战礼包弹窗);
                this.startGame();
                break;
            case "免费领取":
                Banner.Instance.ShowVideoAd(() => {
                    this.ClaimGift();
                })
                break;
        }
    }

    private async RefreshGift(): Promise<void> {
        const gift = this._gift;
        if (!gift) return;
        const showVersion = ++this._showVersion;
        this.WeaponName.string = gift.WeaponName;
        this.Name_T.string = gift.HelmetName;
        this.Name_J.string = gift.ArmorName;
        this.Name_B.string = gift.BackpackName;
        this.Name_DY.string = `${gift.AmmoName}`;
        this.Count_DY.string = ` x${ZRSJZ_AMMO_MAX_COUNT * gift.AmmoStackCount}`;


        const spriteFrames = await Promise.all([
            ZRSJZ_UIManager.Instance.GetPropUI(gift.WeaponName),
            ZRSJZ_UIManager.Instance.GetPropUI(gift.HelmetName),
            ZRSJZ_UIManager.Instance.GetPropUI(gift.ArmorName),
            ZRSJZ_UIManager.Instance.GetPropUI(gift.BackpackName),
            ZRSJZ_UIManager.Instance.GetPropUI(gift.AmmoName),
        ]);
        if (showVersion !== this._showVersion || !this.node.active) return;
        [this.WeaponIcon, this.Icon_T, this.Icon_J, this.Icon_B, this.Icon_DY]
            .forEach((sprite, index) => sprite.spriteFrame = spriteFrames[index]);
    }

    private ClaimGift(): void {
        if (this._isClaiming || !this._gift) return;
        this._isClaiming = true;
        const playerIndexes = ZRSJZ_GameData.Instance.CurModel === "2p" ? [0, 1] : [0];
        const success = playerIndexes.every(playerIndex =>
            ZRSJZ_InventoryService.ApplyAssistFightingGift(this._gift, playerIndex)
        );
        if (!success) {
            this._isClaiming = false;
            void ZRSJZ_UIManager.Instance.ShowTip("助战礼包配置错误，领取失败");
            return;
        }

        this.startGame();
    }

    private startGame() {
        const continueAction = this._continueAction;
        this._continueAction = null;
        this._showVersion++;
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.助战礼包弹窗);
        continueAction?.();
    }

}


