import { _decorator, EventTouch } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_InventoryBackpack } from '../UI/ZRSJZ_InventoryBackpack';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_BackpackExpansionPanel')
export class ZRSJZ_BackpackExpansionPanel extends ZRSJZ_Panel {
    private _playerIndex: number = 0;
    private _isClaiming: boolean = false;

    Show(...args: any[]): void {
        this._playerIndex = this.PlayerIndex >= 0
            ? (this.PlayerIndex === 1 ? 1 : 0)
            : (args[0] === 1 ? 1 : 0);
        this._isClaiming = false;
        super.Show();
    }

    OnButtonClick(event: EventTouch): void {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "关闭":
                this.Close();
                break;
            case "免费领取":
                Banner.Instance.ShowVideoAd(() => void this.Claim());
                break;
        }
    }

    private async Claim(): Promise<void> {
        if (this._isClaiming) return;
        this._isClaiming = true;

        try {
            if (!ZRSJZ_InventoryService.ExpandBackpack(this._playerIndex)) return;
            try {
                const backpackNode = await ZRSJZ_UIManager.Instance.GetInventory(
                    ZRSJZ_INVENTORY.背包,
                    this._playerIndex,
                    true,
                );
                await backpackNode?.getComponent(ZRSJZ_InventoryBackpack)?.RefreshCapacity();
            } catch (error) {
                // 本局扩容状态已经生效，下次打开背包时会按新容量重建。
                console.error(`[ZRSJZ_BackpackExpansionPanel] 玩家${this._playerIndex + 1}背包刷新失败`, error);
            }
            ZRSJZ_EventManager.EmitPersist(
                ZRSJZ_MyEvent.ZRSJZ_BACKPACK_EXPANDED,
                this._playerIndex,
            );
        } finally {
            this._isClaiming = false;
            this.Close();
        }
    }

    private Close(): void {
        ZRSJZ_UIManager.Instance.HidePlayerPanel(
            ZRSJZ_PANEL.背包扩容弹窗,
            this._playerIndex,
        );
    }

}


