import { _decorator, Component, Node, Event, Vec3, JsonAsset, tween, RichText, Tween, UITransform, v3, error } from 'cc';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import { ResourceUtil } from '../../Framework/Utils/ResourceUtil';
import Banner, { Company } from '../../Banner';
import PrefsManager from '../../Framework/Managers/PrefsManager';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { Constant } from '../../Framework/Const/Constant';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import { PanelBase } from '../../Framework/UI/PanelBase';
import { Tools } from '../../Framework/Utils/Tools';

const { ccclass, property } = _decorator;

@ccclass('PrivacyPanel')
export default class PrivacyPanel extends PanelBase {
    Panel: Node = null;
    Buttons: Node = null;
    CloseButton: Node = null;
    PrivacyText: RichText = null;

    cb: Function = null;

    protected onLoad(): void {
        this.Panel = NodeUtil.GetNode("Panel", this.node);
        this.Buttons = NodeUtil.GetNode("Buttons", this.node);
        this.CloseButton = NodeUtil.GetNode("CloseButton", this.node);
        this.PrivacyText = NodeUtil.GetComponent("PrivacyText", this.node, RichText);
    }

    Show(showButtons: boolean = false, cb: Function = null) {
        super.Show(this.Panel);
        this.cb = cb;

        ResourceUtil.LoadJson("Company").then((jsonAsset: JsonAsset) => {
            let CompanyQQ = jsonAsset.json[Company[Banner.Instance.Company]];
            if (Tools.IsEmptyStr(CompanyQQ)) {
                CompanyQQ = "2572555395@qq.com";
                error("联系方式QQ在Json中未注册，当前使用默认联系QQ！");
            }
            this.PrivacyText.string = `<color=#000000>1.为了向您提供和持续优化定制化的服务，<b>${Company[Banner.Instance.Company]}</b>（以下简称“我们”）将收集和处理以下的信息：<size=35><color=#529cff><u>\n\t设备信息，包括设备标识符、MAC、机型、品牌、App包名、App版本号、设备分辨率及像素密度；\n\t网络信息，包括网络链接状态，接入网络的方式和类型，IP地址；\n\t使用信息，包括广告内容的展现，点击，下载；</u></color></size>\n2.上述数据将会传输并保存至【中华人民共和国境内】的服务器，保存期限为60天，超出这一保留时间后将删除，但法律法规另有要求除外。我们保证不对外公开或向任何第三方提供您的个人信息，但是存在下列情形之一的除外：\n\t（1）公开或提供相关信息之前获得您的许可的；\n\t（2）根据法律或政策的规定而公开或提供的；\n\t（3）根据国家权力机关要求公开或提供的，\n如果你不同意我们采集上述信息，或不同意调用相关手机权限或功能，本软件将无法正常运行，您可通过卸载或退出本软件来终止数据收集及上传。\n3.如果您是未成年人，请在您的监护人仔细阅读本隐私政策。并在征得您的监护人同意的前提下使用我们的服务。\n4.如果您对本隐私政策和我们游戏有任何疑问和建议，请通过客服${CompanyQQ}联系我们，我们将尽快答复您。</color>`;
        });

        this.Buttons.active = showButtons;
        this.CloseButton.active = !showButtons;
    }

    OnButtonClick(event: Event) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);

        switch (event.target.name) {
            case "AgreeButton":
                UIManager.HidePanel(Panel.PrivacyPanel);
                PrefsManager.SetBool(Constant.Key.AgreePolicy, true);
                this.cb && this.cb();
                break;
            case "DisagreeButton":
                Banner.Instance.Quit();
                break;
            case "CloseButton":
                UIManager.HidePanel(Panel.PrivacyPanel);
                break;

        }
    }
}
