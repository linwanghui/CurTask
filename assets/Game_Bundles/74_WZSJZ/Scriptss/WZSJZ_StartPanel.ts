import { _decorator, Button, Component, EventTouch, Label } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_GameData } from './WZSJZ_GameData';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import { WZSJZ_HomeLevelSelector } from './WZSJZ_HomeLevelSelector';
import { Panel, UIManager } from '../../../Scripts/Framework/Managers/UIManager';
import { DataManager } from '../../../Scripts/Framework/Managers/DataManager';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';

const { ccclass } = _decorator;

@ccclass('WZSJZ_StartPanel')
export class WZSJZ_StartPanel extends Component {
    private _physicalPowerLabel: Label = null;
    private _physicalPowerTimeLabel: Label = null;
    private _diamondLabel: Label = null;
    private _nextClockRefreshTimestamp: number = 0;
    private _isStartingGame: boolean = false;
    private _levelSelector: WZSJZ_HomeLevelSelector = null;
    private _hasCheckedAutoSignIn: boolean = false;

    protected onLoad(): void {
        WZSJZ_EventManager.BindSceneEventNode(this.node);
        this.node.on(WZSJZ_EventManager.体力变动, this.RefreshResourceView, this);
        this.node.on(WZSJZ_EventManager.钻石变动, this.RefreshResourceView, this);
    }

    protected start(): void {
        const canvas = this.node.parent?.getChildByName("Canvas");
        this._physicalPowerLabel = canvas
            ?.getChildByPath("左上角/体力槽/文本")
            ?.getComponent(Label) || null;
        this._physicalPowerTimeLabel = canvas
            ?.getChildByPath("左上角/体力槽/时间")
            ?.getComponent(Label) || null;
        this._diamondLabel = canvas
            ?.getChildByPath("左上角/钻石槽/文本")
            ?.getComponent(Label) || null;
        this._levelSelector = this.node.getComponent(WZSJZ_HomeLevelSelector)
            || this.node.addComponent(WZSJZ_HomeLevelSelector);
        this._levelSelector.Configure(canvas);
        // 场景中的签到Button当前没有序列化点击目标，在这里由节点生命周期托管监听。
        canvas?.getChildByPath("左侧栏/签到")?.on(
            Button.EventType.CLICK,
            this.ShowSignInPanel,
            this,
        );
        // 商店节点暂未在场景中序列化点击目标，由当前场景节点托管入口监听。
        canvas?.getChildByPath("左侧栏/商店")?.on(
            Button.EventType.CLICK,
            this.ShowShopPanel,
            this,
        );
        canvas?.getChildByPath("左侧栏/挂机宝箱")?.on(
            Button.EventType.CLICK,
            this.ShowHookPanel,
            this,
        );
        canvas?.getChildByPath("右侧栏/图鉴")?.on(
            Button.EventType.CLICK,
            this.ShowHandBookPanel,
            this,
        );
        this.RefreshResourceView();
        // 等主页节点和常驻UIManager完成本帧初始化后，再判断是否自动打开签到界面。
        this.scheduleOnce(this.TryShowDailySignIn, 0);
    }

    protected update(): void {
        // 使用Date.now而非dt，倒计时不受局内加速和离线时间影响。
        const now = Date.now();
        if (now < this._nextClockRefreshTimestamp) return;
        this._nextClockRefreshTimestamp = now + 1000;
        this.RefreshResourceView();
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "开始游戏":
                this.TryStartGame();
                break;
            case "体力":
                WZSJZ_UIManager.Instance.ShowPanel(
                    WZSJZ_Constant.Panel.GetPhysicalPowerPanel,
                );
                break;
            case "钻石":
                WZSJZ_UIManager.Instance.ShowPanel(WZSJZ_Constant.Panel.GetDiamondPanel);
                break;
            case "签到":
                this.ShowSignInPanel();
                break;
            case "商店":
                this.ShowShopPanel();
                break;
            case "挂机宝箱":
                this.ShowHookPanel();
                break;
            case "图鉴":
                this.ShowHandBookPanel();
                break;
            case "返回主页面":
                this.ReturnToMainPage();
                break;
        }
    }

    /** 离开整个WZSJZ玩法；局内返回本游戏主页不会经过这里。 */
    private ReturnToMainPage(): void {
        UIManager.ShowPanel(
            Panel.LoadingPanel,
            [DataManager.GetGameData("真人三角洲"), "ZRSJZ_Start"],
        );
        WZSJZ_GameData.DestroyInstance();
        WZSJZ_AudioManager.DestroyInstance();
        WZSJZ_UIManager.DestroyInstance();
    }

    private ShowSignInPanel = (): void => {
        WZSJZ_UIManager.Instance.ShowPanel(WZSJZ_Constant.Panel.SignInPanel);
    };

    private TryShowDailySignIn = (): void => {
        if (this._hasCheckedAutoSignIn) return;
        this._hasCheckedAutoSignIn = true;
        if (!WZSJZ_GameData.Instance.GetSignInSnapshot().CanClaimToday) return;
        this.ShowSignInPanel();
    };

    private ShowShopPanel = (): void => {
        WZSJZ_UIManager.Instance.ShowPanel(WZSJZ_Constant.Panel.ShopPanel);
    };

    private ShowHookPanel = (): void => {
        WZSJZ_UIManager.Instance.ShowPanel(WZSJZ_Constant.Panel.HookPanel);
    };

    private ShowHandBookPanel = (): void => {
        WZSJZ_UIManager.Instance.ShowPanel(WZSJZ_Constant.Panel.HandBookPanel);
    };

    private TryStartGame(): void {
        if (this._isStartingGame) return;
        const gameData = WZSJZ_GameData.Instance;
        if (!gameData.IsLevelUnlocked(gameData.SelectedLevel)) return;
        const cost = WZSJZ_Constant.HomeResource.StartGamePhysicalPowerCost;
        if (!gameData.TryConsumePhysicalPower(cost)) {
            WZSJZ_UIManager.Instance.ShowPanel(
                WZSJZ_Constant.Panel.GetPhysicalPowerPanel,
            );
            return;
        }
        this._isStartingGame = true;
        WZSJZ_UIManager.Instance.ShowPanel(
            WZSJZ_Constant.Panel.LoadingPanel,
            ["WZSJZ_Game"],
        );
    }

    private RefreshResourceView = (): void => {
        const data = WZSJZ_GameData.Instance;
        const snapshot = data.GetPhysicalPowerSnapshot(Date.now());
        if (this._physicalPowerLabel) {
            this._physicalPowerLabel.string = `${snapshot.Current}/${snapshot.Max}`;
        }
        if (this._diamondLabel) this._diamondLabel.string = `${data.Diamond}`;
        if (!this._physicalPowerTimeLabel) return;
        if (snapshot.Current >= snapshot.Max) {
            this._physicalPowerTimeLabel.string = "体力已满";
            return;
        }
        const minutes = Math.floor(snapshot.RemainingSeconds / 60);
        const seconds = snapshot.RemainingSeconds % 60;
        this._physicalPowerTimeLabel.string
            = `${minutes}:${seconds.toString().padStart(2, "0")}后恢复一点`;
    };
}
