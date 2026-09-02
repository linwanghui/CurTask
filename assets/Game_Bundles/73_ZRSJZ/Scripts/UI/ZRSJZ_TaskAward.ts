import { _decorator, Component, EventTouch, Label, Node, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_TaskAward')
export class ZRSJZ_TaskAward extends Component {

    @property(SpriteFrame)
    BottomSF: SpriteFrame = null;

    @property(SpriteFrame)
    GoldSF: SpriteFrame = null;

    @property(SpriteFrame)
    ExpSF: SpriteFrame = null;

    Bottom: Sprite = null;
    Icon: Sprite = null;
    Name: Label = null;
    Count: Label = null;
    Check: Node = null;
    Checked: Node = null;

    PropName: string = "";
    SelectionKey: string = "";

    private _isInit: boolean = false;
    /** 防止节点回池并快速复用后，上一轮异步资源覆盖当前奖励。 */
    private _refreshVersion: number = 0;
    private _isGeting: boolean = false;
    private _isGetCheck: boolean = false;

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_MAIL_GET_PROP, this.GetShow, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_END, this.OnTouchEnd, this);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_MAIL_GET_PROP, this.GetShow, this);
    }

    Init(propName: string, count: number, selectionKey: string = propName) {
        const refreshVersion = ++this._refreshVersion;
        if (!this._isInit) {
            this._isInit = true;
            this.Bottom = this.getComponent(Sprite);
            this.Icon = this.node.getChildByName("Icon").getComponent(Sprite);
            this.Name = this.node.getChildByName("Name").getComponent(Label);
            this.Count = this.node.getChildByName("Count").getComponent(Label);
            this.Check = this.node.getChildByName("未选");
            this.Checked = this.node.getChildByName("勾选");
        }

        this.PropName = propName;
        this.SelectionKey = selectionKey;
        this._isGeting = false;
        this._isGetCheck = false;
        this.ShowGetButton();
        this.Name.string = propName;
        this.Count.string = count.toString();
        if (propName == "钞票") {
            this.Icon.spriteFrame = this.GoldSF;
            this.Bottom.spriteFrame = this.BottomSF;
        } else if (propName == "经验") {
            this.Icon.spriteFrame = this.ExpSF;
            this.Bottom.spriteFrame = this.BottomSF;
        } else {
            ZRSJZ_UIManager.Instance.GetPropUI(propName).then(sf => {
                if (refreshVersion !== this._refreshVersion || !this.node.isValid) return;
                this.Icon.spriteFrame = sf;
                ZRSJZ_Tools.ScaleNodeToFit(this.Icon.node, 110, 110);
            });

            const prop = ZRSJZ_PROP_CONFIG.get(propName);
            if (!prop) {
                console.warn(`[ZRSJZ_TaskAward] 未找到奖励道具配置: ${propName}`);
                this.Icon.spriteFrame = null;
                this.Bottom.spriteFrame = this.BottomSF;
                return;
            }
            ZRSJZ_UIManager.Instance.GetPropGridUI(`${prop.Quality}1_1`).then(sf => {
                if (refreshVersion !== this._refreshVersion || !this.node.isValid) return;
                this.Bottom.spriteFrame = sf;
            });
        }
    }

    GetShow(show: boolean) {
        this._isGeting = show;
        this._isGetCheck = false;
        this.ShowGetButton();
    }

    //显示售卖按钮
    ShowGetButton() {
        this.Check.active = this._isGeting && !this._isGetCheck;
        this.Checked.active = this._isGeting && this._isGetCheck;
    }

    OnTouchEnd(event: EventTouch) {
        if (this._isGeting) {
            ZRSJZ_AudioManager.Instance.PlaySound("点击");
            this._isGetCheck = !this._isGetCheck;
            this.ShowGetButton();
            ZRSJZ_EventManager.EmitPersist(
                ZRSJZ_MyEvent.ZRSJZ_MAIL_GET_PROP_ADD,
                this.SelectionKey,
                this._isGetCheck,
            );
        }
    }

}


