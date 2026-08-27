import { _decorator, EventTouch, find, Label, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_BOOSTER_SHOT_CONFIG, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_BoosterShotService } from '../Service/ZRSJZ_BoosterShotService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BoosterShotReplacePanel')
export class ZRSJZ_BoosterShotReplacePanel extends ZRSJZ_Panel {
    @property(SpriteFrame)
    Icons: SpriteFrame[] = [];

    private _newName: Label = null;
    private _newIcon: Sprite = null;
    private _oldName: Label = null;
    private _oldIcon: Sprite = null;
    private _pendingBoosterShot: string = "";
    private _isReplacing: boolean = false;

    protected onLoad(): void {
        this._newName = find("Panel/NewName", this.node)?.getComponent(Label);
        this._newIcon = find("Panel/NewIcon", this.node)?.getComponent(Sprite);
        this._oldName = find("Panel/OldName", this.node)?.getComponent(Label);
        this._oldIcon = find("Panel/OldIcon", this.node)?.getComponent(Sprite);
    }

    Show(...args: any[]): void {
        const newBoosterShot = typeof args[0] === "string" ? args[0] : "";
        const oldBoosterShot = ZRSJZ_BoosterShotService.GetCurBoosterShot();
        if (
            !ZRSJZ_BOOSTER_SHOT_CONFIG.has(newBoosterShot)
            || !ZRSJZ_BOOSTER_SHOT_CONFIG.has(oldBoosterShot)
            || newBoosterShot === oldBoosterShot
        ) {
            console.warn("[ZRSJZ_BoosterShotReplacePanel] 无效的增强针替换请求", {
                oldBoosterShot,
                newBoosterShot,
            });
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.增强针替换弹窗);
            return;
        }

        this._pendingBoosterShot = newBoosterShot;
        this._isReplacing = false;
        this.SetBoosterShot(this._newName, this._newIcon, newBoosterShot);
        this.SetBoosterShot(this._oldName, this._oldIcon, oldBoosterShot);
        super.Show();
    }

    OnButtonClick(event: EventTouch): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "替换":
                this.ConfirmReplace();
                break;
            case "关闭":
                this.ClosePanel();
                break;
        }
    }

    private ConfirmReplace(): void {
        if (this._isReplacing || !this._pendingBoosterShot) return;
        this._isReplacing = true;
        if (!ZRSJZ_BoosterShotService.UseBoosterShot(this._pendingBoosterShot)) {
            this._isReplacing = false;
            void ZRSJZ_UIManager.Instance.ShowTip("增强针数量不足，无法替换");
            return;
        }
        this.ClosePanel();
    }

    private ClosePanel(): void {
        this._pendingBoosterShot = "";
        this._isReplacing = false;
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.增强针替换弹窗);
    }

    private SetBoosterShot(nameLabel: Label, iconSprite: Sprite, boosterShot: string): void {
        if (nameLabel) {
            nameLabel.string = ZRSJZ_BOOSTER_SHOT_CONFIG.get(boosterShot)?.Name ?? boosterShot;
        }
        if (!iconSprite) return;
        const prefabIconOrder = ["攻击针", "爆率针", "生命针", "移速针", "防御针"];
        const icon = this.Icons.find(spriteFrame => spriteFrame?.name === boosterShot)
            ?? this.Icons[prefabIconOrder.indexOf(boosterShot)];
        if (icon) iconSprite.spriteFrame = icon;
    }

}


