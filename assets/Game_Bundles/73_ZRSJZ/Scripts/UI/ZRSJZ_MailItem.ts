import { _decorator, Component, Label, Node } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MailItem')
export class ZRSJZ_MailItem extends Component {

    Checked: Node = null;
    Type: Label = null;
    Time: Label = null;
    GetState: Node = null;
    UnclaimedState: Node = null;

    private _init: boolean = false;
    private _mailID: string = "";

    Init(mailID: string) {
        if (!this._init) {
            this._init = true;
            this.Checked = this.node.getChildByName("Checked");
            this.Type = this.node.getChildByName("Type").getComponent(Label);
            this.Time = this.node.getChildByName("Time").getComponent(Label);
            this.GetState = this.node.getChildByName("未领取");
            this.UnclaimedState = this.node.getChildByName("已领取");
        }

        this._mailID = mailID;
        const mailConfig = ZRSJZ_GameData.Instance.MailData[mailID];
        if (!mailConfig) {
            console.error(`邮箱中没有ID为${mailID}的邮件`);
            return;
        }
        this.Type.string = mailConfig.Type;
        this.Time.string = mailConfig.Time;
        this.ShowState();
    }

    ShowState() {
        const mailConfig = ZRSJZ_GameData.Instance.MailData[this._mailID];
        if (!mailConfig) {
            console.error(`邮箱中没有ID为${this._mailID}的邮件`);
            return;
        }

        this.GetState.active = mailConfig.PropAwards.length > 0;
        this.UnclaimedState.active = mailConfig.PropAwards.length <= 0;
    }

}


