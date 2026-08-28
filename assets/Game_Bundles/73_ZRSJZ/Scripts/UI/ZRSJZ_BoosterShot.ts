import { _decorator, Component, EventTouch, find, Label, Node, Sprite } from 'cc';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import Banner from 'db://assets/Scripts/Banner';
import { ZRSJZ_BoosterShotService } from '../Service/ZRSJZ_BoosterShotService';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AccountService } from '../Service/ZRSJZ_AccountService';
import { ZRSJZ_BOOSTER_SHOT_CONFIG, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BoosterShot')
export class ZRSJZ_BoosterShot extends Component {

    @property
    BoosterShotName: string = "";

    Name: Label = null;
    Desc: Label = null;
    Have: Label = null;
    BuyBtn: Node = null;
    VideoBtn: Node = null;
    UseBtn: Node = null;
    UseBtnSprite: Sprite = null;
    Used: Node = null;
    Price: Label = null;

    private _price: number = 0;
    private _curCount: number = 0;

    protected onLoad(): void {
        this.Name = find("Name", this.node).getComponent(Label);
        this.Desc = find("Tip", this.node).getComponent(Label);
        this.Have = find("Count", this.node).getComponent(Label);
        this.BuyBtn = find("钞票购买按钮", this.node);
        this.VideoBtn = find("视频按钮", this.node);
        this.UseBtn = find("使用按钮", this.node);
        this.UseBtnSprite = find("使用按钮", this.node).getComponent(Sprite);
        this.Used = find("使用中", this.node);
        this.Price = find("钞票购买按钮/Layout/Count", this.node).getComponent(Label);
    }

    protected start(): void {
        const config = ZRSJZ_BOOSTER_SHOT_CONFIG.get(this.BoosterShotName);
        if (!config) {
            console.error(`[ZRSJZ_BoosterShot] 未找到增强针配置: ${this.BoosterShotName}`);
            this.node.active = false;
            return;
        }
        this._price = config.Price;
        this.Name.string = config.Name;
        this.Desc.string = config.Desc;
        this.BuyBtn.active = config.UnlockType == "钞票";
        this.VideoBtn.active = config.UnlockType == "视频";
        this.Price.string = this.FormatAssetValue(config.Price);
        this.RefreshUI();
    }

    protected onEnable(): void {
        this.RefreshUI();
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_BOOSTER_SHOT_REFRESH, this.RefreshUI, this)
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_BOOSTER_SHOT_REFRESH, this.RefreshUI, this)
    }

    RefreshUI() {
        this._curCount = ZRSJZ_BoosterShotService.GetBoosterShotCount(this.BoosterShotName);
        this.Have.string = `已拥有：${this._curCount}`
        this.Used.active = ZRSJZ_BoosterShotService.GetCurBoosterShot() === this.BoosterShotName;
        this.UseBtn.active = ZRSJZ_BoosterShotService.GetCurBoosterShot() !== this.BoosterShotName;
        this.UseBtnSprite.grayscale = this._curCount <= 0;
    }

    OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "钞票购买按钮":
                if (ZRSJZ_GameData.Instance.Gold >= this._price) {
                    ZRSJZ_AccountService.ChangeGold(-this._price);
                    ZRSJZ_BoosterShotService.AddBoosterShot(this.BoosterShotName);
                    this.RefreshUI();
                } else {
                    ZRSJZ_UIManager.Instance.ShowTip("余额不足");
                }
                break;
            case "视频按钮":
                Banner.Instance.ShowVideoAd(() => {
                    ZRSJZ_BoosterShotService.AddBoosterShot(this.BoosterShotName);
                    this.RefreshUI();
                })
                break;
            case "使用按钮":
                if (this._curCount <= 0) {
                    void ZRSJZ_UIManager.Instance.ShowTip("当前没有可使用的增强针");
                    return;
                }
                const curBoosterShot = ZRSJZ_BoosterShotService.GetCurBoosterShot();
                if (!curBoosterShot) {
                    if (!ZRSJZ_BoosterShotService.UseBoosterShot(this.BoosterShotName)) {
                        void ZRSJZ_UIManager.Instance.ShowTip("增强针使用失败");
                    }
                } else if (curBoosterShot !== this.BoosterShotName) {
                    ZRSJZ_UIManager.Instance.ShowPanel(
                        ZRSJZ_PANEL.增强针替换弹窗,
                        this.BoosterShotName,
                    );
                }
                break;
        }
    }

    FormatAssetValue(value: number): string {
        const safeValue = Math.max(0, Math.floor(Number(value) || 0));
        if (safeValue >= 100000000) return `${(safeValue / 10000000)}亿`;
        if (safeValue >= 10000) return `${(safeValue / 10000)}万`;
        return safeValue.toString();
    }

}


