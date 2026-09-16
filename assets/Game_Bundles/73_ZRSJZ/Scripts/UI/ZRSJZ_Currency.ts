import { _decorator, Component, easing, Label, Node, tween, Tween } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Currency')
export class ZRSJZ_Currency extends Component {

    Currency: Label = null;

    private _curTween: Tween = null;
    private _curCurrency: number = 0;

    /** 仅格式化余额显示，不修改实际金币；亿级余额舍去万以下的尾数。 */
    public static FormatAmount(value: number): string {
        const amount = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
        if (amount < 10000) return amount.toString();
        if (amount < 100000000) {
            const remainder = amount % 10000;
            return `${Math.floor(amount / 10000)}万${remainder === 0 ? '' : remainder}`;
        }
        const wan = Math.floor((amount % 100000000) / 10000);
        return `${Math.floor(amount / 100000000)}亿${wan === 0 ? '' : wan + '万'}`;
    }

    protected onLoad(): void {
        this.Currency = this.node.getChildByName("Count").getComponent(Label);
    }

    protected start(): void {
        this.Show();
    }

    protected onEnable(): void {
        ZRSJZ_UIManager.Instance.AddCurrency(this.node);
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.Show, this);
    }

    protected onDisable(): void {
        ZRSJZ_UIManager.Instance?.RemoveCurrency(this.node);
        ZRSJZ_EventManager.OffPersist(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.Show, this);
    }

    Show() {
        Tween.stopAllByTarget(this._curTween);

        const object = { value: this._curCurrency };

        this._curTween = tween(object)
            .delay(0.6)
            .to(0.5, { value: ZRSJZ_GameData.Instance.Gold }, {
                onUpdate: () => {
                    this._curCurrency = object.value;
                    if (this.Currency) this.Currency.string = ZRSJZ_Currency.FormatAmount(object.value);
                }
            })
            .call(() => {
                this._curCurrency = Math.floor(ZRSJZ_GameData.Instance.Gold);
                if (this.Currency) this.Currency.string = ZRSJZ_Currency.FormatAmount(this._curCurrency);
            })
            .start();
    }

    AddCurrencyByVideo() {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取金币弹窗);
    }
}

