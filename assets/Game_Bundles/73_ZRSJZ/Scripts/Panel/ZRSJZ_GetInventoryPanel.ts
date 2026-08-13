import { _decorator, EventTouch, find, Label } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import Banner from 'db://assets/Scripts/Banner';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GetInventoryPanel')
export class ZRSJZ_GetInventoryPanel extends ZRSJZ_Panel {
    private _nameLabel: Label = null;
    private _tipLabel: Label = null;
    private _warehouseName: string = "";
    private _inventory: ZRSJZ_INVENTORY = null;
    private _onUnlocked: () => void = null;
    private _isWatchingAd: boolean = false;

    protected onLoad(): void {
        this._nameLabel = find("Panel/PropName", this.node)?.getComponent(Label) ?? null;
        this._tipLabel = find("Panel/PropName-001", this.node)?.getComponent(Label) ?? null;
    }

    public Show(
        warehouseName: string,
        inventory: ZRSJZ_INVENTORY,
        onUnlocked?: () => void,
    ): void {
        super.Show();
        this._warehouseName = warehouseName;
        this._inventory = inventory;
        this._onUnlocked = onUnlocked ?? null;
        this._isWatchingAd = false;
        const displayName = `${warehouseName}仓库`;
        if (this._nameLabel) this._nameLabel.string = displayName;
        if (this._tipLabel) this._tipLabel.string = `是否观看视频解锁${displayName}？`;
    }

    public OnButtonClick(event: EventTouch): void {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "是":
                this.UnlockByVideo();
                break;
            case "否":
            case "关闭":
            case "Mask":
                if (!this._isWatchingAd) this.Close();
                break;
        }
    }

    private UnlockByVideo(): void {
        if (this._isWatchingAd || !this._inventory) return;
        if (ZRSJZ_GameData.Instance.IsWarehouseUnlocked(this._inventory)) {
            this.CompleteUnlock();
            return;
        }
        this._isWatchingAd = true;
        Banner.Instance.ShowVideoAd(() => {
            this._isWatchingAd = false;
            const unlocked = ZRSJZ_GameData.Instance.UnlockWarehouse(this._inventory);
            if (!unlocked && !ZRSJZ_GameData.Instance.IsWarehouseUnlocked(this._inventory)) {
                ZRSJZ_UIManager.Instance.ShowTip(`${this._warehouseName}仓库解锁失败`);
                return;
            }
            ZRSJZ_UIManager.Instance.ShowTip(`${this._warehouseName}仓库已解锁`);
            this.CompleteUnlock();
        });
    }

    private CompleteUnlock(): void {
        const callback = this._onUnlocked;
        this.Close();
        callback?.();
    }

    private Close(): void {
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.解锁仓库弹窗);
    }
}

