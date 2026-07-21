import { _decorator, Node, Event, tween, v3, Tween } from 'cc';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import { PanelBase } from '../../Framework/UI/PanelBase';

const { ccclass, property } = _decorator;

@ccclass('SettingPanel')
export default class SettingPanel extends PanelBase {

    Panel: Node = null;
    MusicToggle: Node = null;
    SoundToggle: Node = null;
    VibrateToggle: Node = null;

    CloseButton: Node = null;

    cb: Function = null;

    protected onLoad(): void {
        this.Panel = NodeUtil.GetNode("Panel", this.node);
        this.MusicToggle = NodeUtil.GetNode("MusicToggle", this.node);
        this.SoundToggle = NodeUtil.GetNode("SoundToggle", this.node);
        this.VibrateToggle = NodeUtil.GetNode("VibrateToggle", this.node);

        this.CloseButton = NodeUtil.GetNode("CloseButton", this.node);
    }

    Show(cb: Function = null) {
        super.Show(this.Panel);
        this.cb = cb;
        this.RefreshToggle(this.MusicToggle, AudioManager.IsMusicOn);
        this.RefreshToggle(this.SoundToggle, AudioManager.IsSoundOn);
        this.RefreshToggle(this.VibrateToggle, AudioManager.IsVibrateOn);
    }

    RefreshToggle(nd: Node, on: boolean, cb: Function = null) {
        let targetPos = on ? v3(65, 0) : v3(-65, 0);
        let handle = nd.getChildByName("Toggle");
        Tween.stopAllByTarget(handle);
        tween(handle).to(0.1, { position: targetPos }, { easing: `sineIn` }).call(
            () => {
                nd.getChildByName("Toggle_Off").active = !on;
                nd.getChildByName("Toggle_On").active = on;
                cb && cb();
            }
        ).start();
    }

    OnButtonClick(event: Event) {
        // AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);

        switch (event.target.name) {
            case "MusicToggle":
                AudioManager.IsMusicOn = !AudioManager.IsMusicOn;
                this.RefreshToggle(this.MusicToggle, AudioManager.IsMusicOn, this.cb);
                break;
            case "SoundToggle":
                AudioManager.IsSoundOn = !AudioManager.IsSoundOn;
                this.RefreshToggle(this.SoundToggle, AudioManager.IsSoundOn, this.cb);
                break;
            case "VibrateToggle":
                AudioManager.IsVibrateOn = !AudioManager.IsVibrateOn;
                this.RefreshToggle(this.VibrateToggle, AudioManager.IsVibrateOn, this.cb);
                break;
            case "Mask":
            case "CloseButton":
                UIManager.HidePanel(Panel.SettingPanel);
                break;

        }
    }
}
