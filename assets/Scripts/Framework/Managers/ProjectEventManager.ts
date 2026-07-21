import { _decorator, Button, Component, director, EventHandler, Node } from 'cc';
import { BannerManager } from './BannerManager';
import { PhysicsManager } from './PhysicsManager';
import { GameManager } from '../../GameManager';
import Banner from '../../Banner';
import { Panel, UIManager } from './UIManager';
const { ccclass, property } = _decorator;

export class ProjectEvent {
    public static 游戏开始: string = 'ProjectEvent.游戏开始';//游戏开始
    public static 游戏结束: string = 'ProjectEvent.游戏结束';//游戏结束(弹出结算界面)
    public static 弹出窗口: string = 'ProjectEvent.弹出窗口';//游戏弹出暂停窗口、游戏功能窗口等等
    public static 页面转换: string = 'ProjectEvent.页面转换';//游戏主页有二级菜单或功能菜单等之类的，进入游戏不要发送此消息
    public static 返回主页: string = 'ProjectEvent.返回主页';//游戏返回主页
    public static 返回主页按钮事件: string = 'ProjectEvent.返回主页按钮事件';//游戏返回主页的按钮点击（参数0：返回主页按钮的默认点击事件）
    public static 初始化更多模式按钮: string = 'ProjectEvent.初始化更多模式按钮';//游戏的更多模式按钮初始化(参数0：更多模式按钮的Node)
}


@ccclass('ProjectEventManager')
export class ProjectEventManager extends Component {
    private static _instance: ProjectEventManager = null;
    public static GameStartIsShowTreasureBox: boolean = false;//游戏开始的时候是否有宝箱
    public static IsShowPath: boolean = false;//是否展示路径
    public static get Instance(): ProjectEventManager {
        if (this._instance == null) {
            this._instance = new ProjectEventManager();
        }
        return this._instance;
    }
    protected onLoad(): void {
        ProjectEventManager._instance = this;
        this.ListenAllEvent();
    }



    //初始监听所有事件
    ListenAllEvent() {
        ProjectEventManager.on(ProjectEvent.游戏开始, this.GameStart);
        ProjectEventManager.on(ProjectEvent.游戏结束, this.GameOver);
        ProjectEventManager.on(ProjectEvent.弹出窗口, this.OpenWindow);
        ProjectEventManager.on(ProjectEvent.页面转换, this.Changgepage);
        ProjectEventManager.on(ProjectEvent.返回主页, this.ReturnHomepage);
        ProjectEventManager.on(ProjectEvent.返回主页按钮事件, this.OnReturnClick);
        ProjectEventManager.on(ProjectEvent.初始化更多模式按钮, this.MoreGameInit);
    }


    //点击返回主页按钮（参数为默认情况下）
    OnReturnClick(DefaultFunction: Function) {
        if (Banner.IsShowServerBundle) {
            UIManager.ShowPanel(Panel.ReturnPanel);
        } else {
            DefaultFunction();
        }
    }

    //初始化更多模式按钮(判断其是否显示等)
    MoreGameInit(btn: Node) {
        btn.active = false;
        //暂时关闭所有更多模式按钮
        return;
        if (Banner.IsShowServerBundle) {
            btn.active = true;
        } else {
            btn.active = false;
        }
        btn.on(Button.EventType.CLICK, () => {
            director.loadScene("GameMode");
        }, this);
    }

    //游戏开始
    GameStart(GameName: string) {
        console.log(GameName + ":游戏开始");
        BannerManager.Instance.GameStart(GameName);
    }

    //游戏结束
    GameOver(GameName: string) {
        console.log(GameName + ":游戏结束");
        BannerManager.Instance.GameOver(GameName);
    }
    //弹出窗口
    OpenWindow(GameName: string) {
        console.log(GameName + ":游戏弹出窗口");
        BannerManager.Instance.OpenWindow(GameName);
    }
    //页面转换
    Changgepage(GameName: string) {
        console.log(GameName + ":游戏页面转换");
        BannerManager.Instance.Changgepage(GameName);
    }
    //返回主页
    ReturnHomepage(GameName: string) {
        console.log(GameName + ":返回主页");
        BannerManager.Instance.ReturnHomepage(GameName);
    }

    public static on(type: string, callback: Function, target?: any) {
        ProjectEventManager.Instance.node?.on(type, callback, target);
    }
    public static off(type: string, callback?: Function, target?: any) {
        ProjectEventManager.Instance.node?.off(type, callback, target);
    }
    public static emit(type: string, target?: any) {
        ProjectEventManager.Instance.node?.emit(type, target);
    }
}


