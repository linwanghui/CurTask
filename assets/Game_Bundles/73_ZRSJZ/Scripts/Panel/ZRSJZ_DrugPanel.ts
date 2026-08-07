import { _decorator, Button, EventTouch, find } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_DrugPanel')
export class ZRSJZ_DrugPanel extends ZRSJZ_Panel {
    private _targetBox: ZRSJZ_Box = null;
    private _videoButton: Button = null;
    private _isWatching: boolean = false;

    protected onLoad(): void {
        this._videoButton = find("Panel/观看视频", this.node)?.getComponent(Button) ?? null;
    }

    Show(...args: any[]): void {
        this._targetBox = args[0] instanceof ZRSJZ_Box ? args[0] : null;
        this._isWatching = false;
        if (this._videoButton) this._videoButton.interactable = true;
        super.Show();
    }

    OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
            case "关闭":
                this.Close();
                break;
            case "观看视频":
                if (this._isWatching) return;
                this._isWatching = true;
                if (this._videoButton) this._videoButton.interactable = false;
                const targetBox = this._targetBox;
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_DRUG_ADD);
                    if (targetBox?.RequiresRewardVideo() && !targetBox.IsOpened()) {
                        targetBox.UnlockMedicalBox();
                        targetBox.Open();
                    }
                    this.Close();
                })
                break;
        }
    }

    Close() {
        this._targetBox = null;
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.医疗箱弹窗, () => {
            ZRSJZ_Game.Instance.GamePaused = false;
        });
    }

}


