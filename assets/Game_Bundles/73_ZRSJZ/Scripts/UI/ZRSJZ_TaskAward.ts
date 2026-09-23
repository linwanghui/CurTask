import { FormatMoney } from "../ZRSJZ_NumberFormat";
import { _decorator, Component, EventTouch, Label, Node, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPON_SKIN } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_TaskAward')
export class ZRSJZ_TaskAward extends Component {

    @property(SpriteFrame)
    BottomSF: SpriteFrame = null;

    @property(SpriteFrame)
    GoldSF: SpriteFrame = null;

    @property(SpriteFrame)
    ExpSF: SpriteFrame = null;
    @property(SpriteFrame)
    WarehouseSF: SpriteFrame = null;

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

    Init(propName: string, count: number, selectionKey: string = propName, displayIcon?: SpriteFrame) {
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
        this.Count.string = propName === "钞票" ? FormatMoney(count, true) : count.toString();
        this.Icon.node.setScale(1, 1, 1);
        const heroSkin = ZRSJZ_SKIN_CONFIG.get(propName);
        const weaponSkin = Array.from(ZRSJZ_WEAPON_SKIN.values()).flat().find(s => s.Name === propName);
        if (displayIcon || heroSkin || (weaponSkin && !ZRSJZ_PROP_CONFIG.has(propName))) {
            this.Icon.spriteFrame = displayIcon ?? null;
            this.Bottom.spriteFrame = this.BottomSF;
            const apply = (sf: SpriteFrame) => {
                if (!sf || refreshVersion !== this._refreshVersion || !this.node.isValid) return;
                // 称号、头像框等自定义图不能沿用池中旧图的尺寸，否则会拉伸或越界。
                this.Icon.sizeMode = Sprite.SizeMode.TRIMMED;
                this.Icon.spriteFrame = sf;
                const scale = Math.min(110 / Math.max(1, sf.rect.width), 110 / Math.max(1, sf.rect.height), 1);
                this.Icon.node.setScale(scale, scale, 1);
            };
            if (displayIcon) apply(displayIcon);
            else if (heroSkin) void ZRSJZ_UIManager.Instance.GetHeroSkinIconUI(propName).then(apply).catch(console.error);
            else void ZRSJZ_UIManager.Instance.GetWeaponryIconUI(propName).then(apply).catch(console.error);
            const quality = heroSkin?.Quality ?? weaponSkin?.Quality;
            if (quality) void ZRSJZ_UIManager.Instance.GetPropGridUI(`${quality}1_1`).then(sf => {
                if (refreshVersion === this._refreshVersion && this.node.isValid) this.Bottom.spriteFrame = sf;
            }).catch(console.error);
            return;
        }
        if (propName.startsWith('仓库_') && propName.endsWith('扩容')) {
            this.Name.string = propName === '仓库_全部扩容'
                ? '主库'
                : propName.replace('仓库_', '').replace('扩容', '仓库');
            this.Count.string = `+${count}行`;
            this.Icon.spriteFrame = this.WarehouseSF;
            this.Bottom.spriteFrame = this.BottomSF;
            ZRSJZ_Tools.ScaleNodeToFit(this.Icon.node, 110, 110);
        } else if (propName === '安全箱扩容') {
            this.Count.string = '3×3';
            this.Icon.spriteFrame = this.WarehouseSF;
            this.Bottom.spriteFrame = this.BottomSF;
            ZRSJZ_Tools.ScaleNodeToFit(this.Icon.node, 110, 110);
        } else if (propName == "钞票") {
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
        // 钞票和经验只有数值展示，不属于可查看详情的道具。
        if (this.PropName === "钞票" || this.PropName === "经验") return;

        if (this._isGeting) {
            ZRSJZ_AudioManager.Instance.PlaySound("点击");
            this._isGetCheck = !this._isGetCheck;
            this.ShowGetButton();
            ZRSJZ_EventManager.EmitPersist(
                ZRSJZ_MyEvent.ZRSJZ_MAIL_GET_PROP_ADD,
                this.SelectionKey,
                this._isGetCheck,
            );
            return;
        }

        // 邮件未处于选择领取状态时，以及其他奖励展示场景中，点击普通道具显示只读详情。
        if (!ZRSJZ_PROP_CONFIG.has(this.PropName)) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        const playerIndex = ZRSJZ_InventoryService.GetActivePlayerIndex();
        ZRSJZ_UIManager.Instance.ShowPlayerPanel(
            ZRSJZ_PANEL.道具弹窗,
            playerIndex,
            this.PropName,
            playerIndex,
            true,
        );
    }

}
