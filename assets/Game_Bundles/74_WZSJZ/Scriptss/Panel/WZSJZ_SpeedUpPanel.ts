import { _decorator, EventTouch, Label } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_GameData } from '../WZSJZ_GameData';
import Banner from '../../../../Scripts/Banner';
import { WZSJZ_EventManager } from '../WZSJZ_EventManager';



const { ccclass, property } = _decorator;

@ccclass('WZSJZ_SpeedUpPanel')
export class WZSJZ_SpeedUpPanel extends PanelBase {
    private _isWatchingVideo: boolean = false;

    Show(): void {
        this._isWatchingVideo = false;
        const panel = this.node.getChildByName("Panel");
        const watched = WZSJZ_GameData.Instance.SpeedUpVideoWatchCount;
        const required = WZSJZ_Constant.SpeedUp.PermanentUnlockVideoCount;
        const description = panel?.getChildByPath("弹版/描述")?.getComponent(Label);
        if (description) {
            description.string = `看广告本局加速！\n观看(${Math.min(watched, required)}/${required})次后永久解锁加速功能`;
        }
        super.Show(panel);
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "关闭":
                WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.SpeedUpPanel);
                break;
            case "观看按钮":
                this.WatchSpeedUpVideo();
                break;

        }
    }

    private WatchSpeedUpVideo(): void {
        if (this._isWatchingVideo) return;
        this._isWatchingVideo = true;
        Banner.Instance.ShowVideoAd(() => {
            this._isWatchingVideo = false;
            WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.加速视频完成);
        });
    }
}
