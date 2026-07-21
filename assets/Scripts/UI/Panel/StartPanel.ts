import { _decorator, Component, Label, Node, Event, Prefab, Vec2, instantiate, Vec3, tween, v3, director, resources, find, Sprite, SpriteFrame } from 'cc';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import Banner, { Channel } from '../../Banner';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { GameManager } from '../../GameManager';
import { DataManager } from '../../Framework/Managers/DataManager';
import { BannerManager } from '../../Framework/Managers/BannerManager';
const { ccclass, property } = _decorator;


@ccclass('StartPanel')
export default class StartPanel extends Component {
    MoneyLabel: Label | null = null;
    Player: Node | null = null;
    PrivacyButton: Node | null = null;
    KeFuButton: Node | null = null;
    MoreGameButton: Node | null = null;
    QuitButton: Node | null = null;
    BottomRightPin: Node | null = null;
    MoreModeButton: Node | null = null;
    Buttons: Node | null = null;
    BYTEButtons: Node | null = null;//抖音按钮块
    BilibiliButtons: Node | null = null;//Bilibili按钮块

    protected onLoad(): void {
        this.MoneyLabel = NodeUtil.GetComponent("MoneyLabel", this.node, Label);
        this.Player = NodeUtil.GetNode("Player", this.node);
        this.PrivacyButton = NodeUtil.GetNode("PrivacyButton", this.node);
        this.KeFuButton = NodeUtil.GetNode("KeFuButton", this.node);
        this.MoreGameButton = NodeUtil.GetNode("MoreGameButton", this.node);
        this.QuitButton = NodeUtil.GetNode("QuitButton", this.node);
        this.BottomRightPin = NodeUtil.GetNode("BottomRightPin", this.node);
        this.MoreModeButton = NodeUtil.GetNode("MoreModeButton", this.node);
        this.Buttons = NodeUtil.GetNode("Buttons", this.node);
        this.BYTEButtons = NodeUtil.GetNode("BYTEButtons", this.node);
        this.BilibiliButtons = NodeUtil.GetNode("BilibiliButtons", this.node);
    }

    public static IsfirstStart: boolean = true;
    protected start(): void {
        if (StartPanel.IsfirstStart) {
            //初始化广告控制器
            BannerManager.Instance.Init();
            StartPanel.IsfirstStart = false;
            // Banner.Instance.initRecorder();
        }

        Banner.Instance.JudgeChannel((channel) => this.SetButtonState(channel));

        GameManager.GameData = DataManager.GetStartGameData();

        //华为
        let isHwNeedLogin = Banner.IS_HUAWEI_QUICK_GAME && !Banner.IsLogin;

        if (isHwNeedLogin) {
            UIManager.ShowPanel(Panel.HwLoginPanel);

            Banner.Instance.HWGameLogin(() => {
                Banner.IsLogin = true;
                UIManager.HidePanel(Panel.HwLoginPanel);
            }, () => {
                UIManager.ShowTip("登陆失败");
            });
        }
        //抖音访客进入直接进入场景
        if (Banner.IS_BYTEDANCE_MINI_GAME && Banner.OpenWinTheCustomer) {
            Banner.Instance.DYLoginInfo(() => {//登入
                if (window[`tt`]) { //获客直流
                    var options = window[`tt`].getLaunchOptionsSync();
                    console.log("获客直流判断1:" + options);
                    const scene = options.scene;
                    if (scene.substring(scene.length - 4) == "3041") {
                        console.log("3041");
                        //获客启动，直接进入关卡
                        if (!Banner.WinTheCustomerIsOver) {
                            //默认直接进入第一个关卡，需要修改手动修改
                            let gaemdata = DataManager.GetStartGameData();
                            GameManager.GameData = gaemdata;
                            UIManager.ShowPanel(Panel.LoadingPanel, [gaemdata, gaemdata.startScene]);
                        }
                    } else {
                        //非获客场景进入
                    }


                }
            }, () => {

            });
        }

    }

    SetButtonState(channel: Channel) {
        if (Banner.IS_VIVO_MINI_GAME) {
            this.PrivacyButton.active = false;
        }

        if (this.KeFuButton) {
            this.KeFuButton.active = channel == Channel.VivoBtn || channel == Channel.OppoBtn;
        }
        else {
            this.KeFuButton = this.node.getChildByName("Buttons").getChildByName("KeFuButton");
            if (this.KeFuButton) {
                this.KeFuButton.active = channel == Channel.VivoBtn || channel == Channel.OppoBtn;
            }
            else {
                console.error("KeFuButton 不存在");
            }
        }

        if (this.MoreGameButton) {
            this.MoreGameButton.active = channel == Channel.OppoBtn;
        }
        else {
            this.MoreGameButton = this.node.getChildByName("Buttons").getChildByName("MoreGameButton");
            if (this.MoreGameButton) {
                this.MoreGameButton.active = channel == Channel.OppoBtn;
            }
            else {
                console.error("MoreGameButton 不存在");
            }
        }

        if (this.QuitButton) {
            this.QuitButton.active = channel == Channel.HuaweiBtn;
        }
        else {
            this.QuitButton = this.node.getChildByName("Buttons").getChildByName("QuitButton");
            if (this.QuitButton) {
                this.QuitButton.active = channel == Channel.HuaweiBtn;
            }
            else {
                console.error("QuitButton 不存在");
            }
        }

        // this.Buttons.active = false;
        this.BYTEButtons.active = false;
        this.BilibiliButtons.active = false;

        // this.QuitButton.active = channel == Channel.HuaweiBtn;
        if (Banner.IS_BYTEDANCE_MINI_GAME) {
            this.BYTEButtons.active = true;
        } else if (Banner.IS_Bilibili_GAME) {
            this.BilibiliButtons.active = true;
        } else {
            this.Buttons.active = true;
        }
    }

    OnButtonClick(event: Event) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);

        switch (event.target.name) {
            case "StartGameButton":
                if (Banner.IsShowServerBundle) {
                    director.loadScene("GameMode");
                }
                else UIManager.ShowPanel(Panel.LoadingPanel, [GameManager.GameData, GameManager.GameData.startScene]);
                break;

            case "PrivacyButton":
                if (Banner.IS_ANDROID) {
                    Banner.Instance.AndroidPrivacy();
                } else if (Banner.IS_HarmonyOSNext_GAME) {
                    Banner.Instance.HarmonyOsNextPrivacy();
                }
                else {
                    UIManager.ShowPanel(Panel.PrivacyPanel, false);
                }
                break;

            case "KeFuButton":
                Banner.Instance.AndroidKeFu();
                break;
            case "MoreGameButton":
                Banner.Instance.AndroidMoreGame();
                break;
            case "QuitButton":
                Banner.Instance.Quit();
                break;
            case "SettingButton":
                UIManager.ShowPanel(Panel.SettingPanel);
                break;
            //更多模式
            case "MoreModeButton":
                UIManager.ShowPanel(Panel.MoreGamePanel);
                break;
            case "Addchebianlang":
                UIManager.ShowPanel(Panel.SidebarPanel);
                break;
            case "AddShortcut":
                Banner.Instance.TTAddShortcut();
                break;
            case "AddSubscription":
                Banner.Instance.TTSubscription(() => {
                    console.log("订阅成功！");
                }, () => { console.log("订阅失败！"); }, () => { });
                break;
            case "DYAppMessage":
                Banner.Instance.ShareDYAppMessage();
                break;

            case "BiliSiderbarButton":
                UIManager.ShowPanel(Panel.BilibiliSidebarPanel);
                break;

            case "BiliAddShortcut":
                Banner.Instance.AddBilibiliShortcut(() => {
                    let rewardCount = 99999;
                    GameManager.RewardItemCount += rewardCount;
                    UIManager.ShowTip(`奖励道具已发放：+${rewardCount}`);
                });
                break;
        }
    }
}