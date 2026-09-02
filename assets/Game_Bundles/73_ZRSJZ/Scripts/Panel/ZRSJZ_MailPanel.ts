import { _decorator, Component, find, instantiate, Label, Node, Prefab, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_MailItem } from '../UI/ZRSJZ_MailItem';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_MAIL_DESC } from '../ZRSJZ_Constant';
import { ZRSJZ_MailService } from '../Service/ZRSJZ_MailService';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MailPanel')
export class ZRSJZ_MailPanel extends ZRSJZ_Panel {

    @property(Prefab)
    MailItemPrefab: Prefab = null;

    @property(SpriteFrame)
    MailIconSFs: SpriteFrame[] = [];

    MailItemContent: Node = null;
    MailDescNode: Node = null;
    MailIcon: Sprite = null;
    MailType: Label = null;
    LoadTime: Label = null;
    Deadline: Label = null;
    MailDesc: Label = null;
    PropContent: Node = null;
    PartialClaimChecked: Node = null;
    ClaimBtn: Node = null;
    PartialClaimBtn: Node = null;
    CheckMask: Node = null;


    private _curMailID: string = "";

    protected onLoad(): void {
        this.MailItemContent = find("Panel/MailItems/view/content", this.node);
        this.MailDescNode = find("Panel/MailDesc", this.node);
        this.MailIcon = find("Panel/MailDesc/MailIcon", this.node).getComponent(Sprite);
        this.MailType = find("Panel/MailDesc/MailType", this.node).getComponent(Label);
        this.LoadTime = find("Panel/MailDesc/LoadTime", this.node).getComponent(Label);
        this.Deadline = find("Panel/MailDesc/Deadline", this.node).getComponent(Label);
        this.MailDesc = find("Panel/MailDesc/MailDesc", this.node).getComponent(Label);
        this.PropContent = find("Panel/MailDesc/PropContent/View/Content", this.node);
        this.PartialClaimChecked = find("Panel/MailDesc/部分领取/对勾", this.node);
        this.ClaimBtn = find("Panel/MailDesc/领取", this.node);
        this.PartialClaimBtn = find("Panel/MailDesc/部分领取", this.node);
        this.CheckMask = find("Panel/MailDesc/CheckMask", this.node);
    }

    protected start(): void {
        this.InitMailItems();
    }

    InitMailItems() {
        this.MailItemContent.removeAllChildren();
        for (const mailID in ZRSJZ_GameData.Instance.MailData) {
            const mailitem = instantiate(this.MailItemPrefab);
            mailitem.parent = this.MailItemContent;
            mailitem.getComponent(ZRSJZ_MailItem).Init(mailID);
            this._curMailID = mailID;
        }
    }

    CheckMail(mailID: string) {
        const hasMail = ZRSJZ_GameData.Instance.MailData.hasOwnProperty(mailID);
        this.MailDescNode.active = hasMail;
        this._curMailID = mailID;
        if (!hasMail) {
            console.error(`未找到邮件 ${mailID}`);
            return;
        }
        const mail = ZRSJZ_GameData.Instance.MailData[mailID];
        this.MailIcon.spriteFrame = this.GetIcon(mail.Type);
        this.MailType.string = mail.Type;
        this.LoadTime.string = mail.Time;
        this.Deadline.string = `${30 - ZRSJZ_Tools.GetDaysSince(mail.Time)}天后过期`;
        this.MailDesc.string = ZRSJZ_MAIL_DESC.get(mail.Type) || "暂无邮件描述";
        this.ShowProp();
    }

    GetIcon(name: string): SpriteFrame {
        for (let i = 0; i < this.MailIconSFs.length; i++) {
            if (this.MailIconSFs[i].name == name) {
                return this.MailIconSFs[i];
            }
        }
        return null;
    }

    ShowProp() {
        for (let i = this.PropContent.children.length - 1; i >= 0; i--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.PropContent.children[i]);
        }
        const props = ZRSJZ_MailService.GetMailProps(this._curMailID);
        this.PartialClaimBtn.active = props.length > 0;
        this.ClaimBtn.active = props.length > 0;
        if (props.length <= 0) return;
        for (let i = 0; i < props.length; i++) {
            this.LoadProp(props[i]);
        }
    }

    LoadProp(propName: string) {
        ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/TaskAward").then(prop => {
            prop.parent = this.PropContent;
            prop.active = true;
            prop.getComponent(ZRSJZ_TaskAward)?.Init(propName, 1);
        })
    }
}


