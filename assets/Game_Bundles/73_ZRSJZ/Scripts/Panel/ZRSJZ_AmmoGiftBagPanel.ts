import { _decorator, EventTouch, find, Label, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_MAP_CONFIG, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_AmmoGiftBagPanel')
export class ZRSJZ_AmmoGiftBagPanel extends ZRSJZ_Panel {
    private static readonly AMMO_COUNT = 120;

    private readonly _icons: Sprite[] = [];
    private readonly _names: Label[] = [];
    private readonly _counts: Label[] = [];
    private _ammoNames: string[] = [];
    private _playerIndex: number = 0;
    private _isClaiming: boolean = false;
    private _showVersion: number = 0;

    protected onLoad(): void {
        for (let index = 1; index <= 3; index++) {
            const root = find(`Panel/弹药${index}`, this.node);
            this._icons.push(root?.getChildByName("Icon")?.getComponent(Sprite) ?? null);
            this._names.push(root?.getChildByName("Name")?.getComponent(Label) ?? null);
            this._counts.push(root?.getChildByName("Count")?.getComponent(Label) ?? null);
        }
    }

    protected onDestroy(): void {
        this._showVersion++;
    }

    Show(...args: any[]): void {
        const argPlayerIndex = typeof args[0] === "number" ? args[0] : 0;
        this._playerIndex = this.PlayerIndex >= 0
            ? (this.PlayerIndex === 1 ? 1 : 0)
            : (argPlayerIndex === 1 ? 1 : 0);
        this._ammoNames = this.GetAmmoNamesByDifficulty();
        this._isClaiming = false;
        super.Show(() => void this.RefreshGift());
    }

    OnButtonClick(event: EventTouch): void {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                this.Close();
                break;
            case "免费领取":
                Banner.Instance.ShowVideoAd(() => this.ClaimGift());
                break;
        }
    }

    private GetAmmoNamesByDifficulty(): string[] {
        const difficulty = Math.max(
            1,
            Math.min(6, Math.floor(ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap)?.Difficulty ?? 1)),
        );
        // 在 1~6 级中选取以当前难度为中心的三个连续等级；
        // 边界难度固定为 1/2/3 或 4/5/6，确保始终是三种不同弹药。
        const firstLevel = Math.max(1, Math.min(4, difficulty - 1));
        return [0, 1, 2].map(offset => `${firstLevel + offset}级子弹`);
    }

    private async RefreshGift(): Promise<void> {
        const showVersion = ++this._showVersion;
        for (let index = 0; index < 3; index++) {
            if (this._names[index]) this._names[index].string = this._ammoNames[index];
            if (this._counts[index]) this._counts[index].string = `${ZRSJZ_AmmoGiftBagPanel.AMMO_COUNT}`;
        }

        const spriteFrames = await Promise.all(
            this._ammoNames.map(name => ZRSJZ_UIManager.Instance.GetPropUI(name)),
        );
        if (showVersion !== this._showVersion || !this.node.active) return;
        this._icons.forEach((icon, index) => {
            if (icon) icon.spriteFrame = spriteFrames[index];
        });
    }

    private ClaimGift(): void {
        if (this._isClaiming || this._ammoNames.length !== 3) return;
        this._isClaiming = true;
        const success = ZRSJZ_InventoryService.ApplyAmmoGift(
            this._ammoNames,
            ZRSJZ_AmmoGiftBagPanel.AMMO_COUNT,
            this._playerIndex,
        );
        if (!success) {
            this._isClaiming = false;
            void ZRSJZ_UIManager.Instance.ShowTip("弹药大礼包领取失败");
            return;
        }

        // 领取后立即为触发礼包的玩家装填弹夹，不向另一名玩家发送换弹事件。
        const player = ZRSJZ_Game.Instance?.GetPlayer(this._playerIndex);
        player?.Reload(0, false, this._playerIndex);
        player?.Reload(1, false, this._playerIndex);
        this.Close();
    }

    private Close(): void {
        this._showVersion++;
        ZRSJZ_UIManager.Instance.HidePlayerPanel(
            ZRSJZ_PANEL.弹药大礼包弹窗,
            this._playerIndex,
        );
    }

}


