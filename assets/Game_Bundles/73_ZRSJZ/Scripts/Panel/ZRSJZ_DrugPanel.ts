import { _decorator, EventTouch } from 'cc';
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
    private _lastVideoClick: number = 0;
    private _playerIndex: number = 0;

    protected onDisable(): void {
        this._targetBox?.EndSearch(this._playerIndex);
    }

    Show(...args: any[]): void {
        this._targetBox = args[0] instanceof ZRSJZ_Box ? args[0] : null;
        this._playerIndex = args[1] === 1 ? 1 : 0;
        this._lastVideoClick = 0;
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
                if (Date.now() - this._lastVideoClick < 1000) return;
                this._lastVideoClick = Date.now();
                const targetBox = this._targetBox;
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_DRUG_ADD, this._playerIndex);
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
        this._targetBox?.EndSearch(this._playerIndex);
        this._targetBox = null;
        ZRSJZ_UIManager.Instance.HidePlayerPanel(
            ZRSJZ_PANEL.医疗箱弹窗,
            this._playerIndex,
        );
    }

}
