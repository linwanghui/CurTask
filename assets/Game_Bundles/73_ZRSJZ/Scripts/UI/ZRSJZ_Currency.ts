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
                    if (this.Currency) this.Currency.string = object.value.toFixed(0);
                }
            })
            .call(() => {
                this._curCurrency = Math.floor(ZRSJZ_GameData.Instance.Gold);
                if (this.Currency) this.Currency.string = this._curCurrency.toString();
            })
            .start();
    }

    AddCurrencyByVideo() {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取金币弹窗);
    }
}


