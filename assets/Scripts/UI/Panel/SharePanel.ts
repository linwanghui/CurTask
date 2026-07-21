import { _decorator, Component, Node, Event, Vec3, JsonAsset, tween, RichText, Tween, UITransform, v3 } from 'cc';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import Banner, { Company } from '../../Banner';
import { UIManager } from '../../Framework/Managers/UIManager';
import { Constant } from '../../Framework/Const/Constant';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import { Tools } from '../../Framework/Utils/Tools';


const { ccclass, property } = _decorator;

@ccclass('SharePanel')
export default class SharePanel extends Component {
    Panel: Node = null;

    protected onLoad(): void {
        this.Panel = NodeUtil.GetNode("Panel", this.node);
    }

    Show() {
        Banner.Instance.ShowCustomAd();
        Banner.Instance.stopRecorder();

        tween(this.Panel).to(0.3, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    OnButtonClick(event: Event) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);

        switch (event.target.name) {
            case "ShareButton":
                Banner.Instance.shareRecorder();
                UIManager.ShowTip("奖励领取成功");
                break;
            case "Mask":
            case "CloseButton":
                break;

        }
    }
}
