import {
    _decorator,
    Component,
    director,
    EventKeyboard,
    input,
    Input,
    instantiate,
    isValid,
    KeyCode,
    Label,
    Node,
    Prefab,
    tween,
    v3,
} from 'cc';
import Banner from '../../../Scripts/Banner';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { BundleManager } from '../../../Scripts/Framework/Managers/BundleManager';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_UIManager')
export class WZSJZ_UIManager extends Component {
    @property(Prefab)
    message_box: Prefab = null;
    private _panelDict: any = {}
    private _loadingPanelDict: any = {}
    private static _instance: WZSJZ_UIManager;
    /** director.tick实际使用的最终倍率。 */
    private static _gameTimeScale: number = 1;
    /** 玩家速度按钮控制的倍率，与O键测试倍率分开保存。 */
    private static _playerGameTimeScale: number = 1;
    private static _debugFiveTimesEnabled: boolean = false;
    private static _originalDirectorTick: ((deltaTime: number) => void) | null = null;
    private _isPKeyPressed: boolean = false;
    private _isOKeyPressed: boolean = false;
    public static get Instance(): WZSJZ_UIManager {
        // Component不能通过new创建；热重载或场景切换后应从当前场景找回真实组件。
        if (!this._instance?.node || !isValid(this._instance.node)) {
            this._instance = director.getScene()
                ?.getComponentInChildren(WZSJZ_UIManager) || null;
            this._instance?.EnsurePanelDictionaries();
        }
        return this._instance;
    }

    /**
     * 真正离开WZSJZ玩法时销毁常驻UI根节点。
     * 只允许外部主页入口调用；WZSJZ_Start与WZSJZ_Game之间切换时仍复用同一实例。
     */
    public static DestroyInstance(): void {
        const instance = this._instance;
        if (!instance?.node || !isValid(instance.node)) {
            this._instance = null;
            return;
        }
        instance.ResetGameTimeScale();
        // 先断开静态入口，避免销毁流程中的异步回调重新取得即将销毁的组件。
        this._instance = null;
        instance.node.destroy();
    }
    protected onLoad(): void {
        // 返回开始场景时场景里会再次带入一个UIManager，保留原常驻实例即可。
        if (WZSJZ_UIManager._instance
            && WZSJZ_UIManager._instance !== this
            && WZSJZ_UIManager._instance.node
            && isValid(WZSJZ_UIManager._instance.node)) {
            this.node.destroy();
            return;
        }
        WZSJZ_UIManager._instance = this;
        this.EnsurePanelDictionaries();
        WZSJZ_AudioManager.Initialize();
        this.InstallGlobalTimeScale();
        this.RegisterHotkeys();
    }

    start() {
        if (WZSJZ_UIManager._instance === this
            && this.node.parent === director.getScene()) {
            director.addPersistRootNode(this.node);
        }
    }

    protected onDestroy(): void {
        if (!WZSJZ_UIManager._instance || WZSJZ_UIManager._instance === this) {
            const normal = WZSJZ_Constant.SpeedUp.NormalMultiplier;
            WZSJZ_UIManager._gameTimeScale = normal;
            WZSJZ_UIManager._playerGameTimeScale = normal;
            WZSJZ_UIManager._debugFiveTimesEnabled = false;
            // 退出玩法后还原Cocos原始主循环，避免外部主页继续经过WZSJZ的dt包装。
            if (WZSJZ_UIManager._originalDirectorTick) {
                director.tick = WZSJZ_UIManager._originalDirectorTick;
                WZSJZ_UIManager._originalDirectorTick = null;
                director.getScheduler().setTimeScale(1);
            }
            WZSJZ_UIManager._instance = null;
        }
    }

    //*** 路径 或者 Bundle名称/路径 */
    public HidePanel(panelPath: string, callback?: Function) {
        this.EnsurePanelDictionaries();
        if (this._panelDict.hasOwnProperty(panelPath)) {
            let panel = this._panelDict[panelPath];
            if (panel && isValid(panel)) {
                let ani = panel.getComponent('animationUI');
                if (ani) {
                    ani.close(() => {
                        panel.parent = null;
                        if (callback && typeof callback === 'function') {
                            callback();
                        }
                    });
                } else {
                    panel.parent = null;
                    if (callback && typeof callback === 'function') {
                        callback();
                    }
                }
            } else if (callback && typeof callback === 'function') {
                callback();
            }
        }
        this._loadingPanelDict[panelPath] = false;
        this.SJZXD_Emit("关闭页面_" + panelPath)
        if (Banner.IS_BYTEDANCE_MINI_GAME) {//抖音埋点
            //@ts-ignore
            tt.reportAnalytics('ExitWindow', {
                WindowName: panelPath,
            });
        }
    }

    //关闭所有界面(功能)
    public HideAllPanel() {
        this.EnsurePanelDictionaries();
        for (let panelPath in this._panelDict) {
            // 排除LoadingPanel，不进行隐藏
            if (panelPath !== WZSJZ_Constant.Panel.LoadingPanel) {
                let panel = this._panelDict[panelPath];
                if (panel && isValid(panel)) {
                    let ani = panel.getComponent('animationUI');
                    if (ani) {
                        ani.close(() => {
                            panel.parent = null;
                        });
                    } else {
                        panel.parent = null;
                        panel.active = false;
                    }
                }
            }
        }
    }

    public ShowPanel(panelPath: string, args?: any, cb?: Function) {
        this.EnsurePanelDictionaries();
        if (this._loadingPanelDict[panelPath]) {
            return;
        }

        let idxSplit = panelPath.lastIndexOf('/');
        let scriptName = `WZSJZ_` + panelPath.slice(idxSplit + 1);

        if (!args) {
            args = [];
        }

        if (this._panelDict.hasOwnProperty(panelPath)) {
            let panel = this._panelDict[panelPath];
            if (isValid(panel)) {
                panel.parent = this.node.getChildByPath("Canvas");
                panel.active = true;
                // panel.setSiblingIndex(panel.parent.children.length);
                let script = panel.getComponent(scriptName);
                let script2 = panel.getComponent(scriptName.charAt(0).toUpperCase() + scriptName.slice(1));

                if (script && script.Show) {
                    script.Show.apply(script, args);
                    cb && cb(script);
                } else if (script2 && script2.Show) {
                    script2.Show.apply(script2, args);
                    cb && cb(script2);
                } else {
                    throw `查找不到脚本文件${scriptName}`;
                }
                this.SJZXD_Emit("打开页面_" + panelPath)
                if (Banner.IS_BYTEDANCE_MINI_GAME) {//抖音埋点
                    //@ts-ignore
                    tt.reportAnalytics('OpenWindow', {
                        WindowName: panelPath,
                    });
                }
                return;
            }
        }

        this._loadingPanelDict[panelPath] = true;
        let bundleName = "74_WZSJZ";
        BundleManager.LoadUI(bundleName, panelPath, (err: any, node: any) => {
            //判断是否有可能在显示前已经被关掉了？
            let isCloseBeforeShow = false;
            if (!this._loadingPanelDict[panelPath]) {
                isCloseBeforeShow = true;
            }

            this._loadingPanelDict[panelPath] = false;

            this._panelDict[panelPath] = node;

            let script: any = node.getComponent(scriptName);

            let script2: any = node.getComponent(scriptName.charAt(0).toUpperCase() + scriptName.slice(1));

            if (script && script.Show) {
                script.Show.apply(script, args);
                cb && cb(script);
            } else if (script2 && script2.Show) {
                script2.Show.apply(script2, args);
                cb && cb(script2);
            } else {
                throw `查找不到脚本文件${scriptName} 或者脚本中没有 Show() 方法...`;
            }
            this.SJZXD_Emit("打开页面_" + panelPath)
            if (Banner.IS_BYTEDANCE_MINI_GAME) {//抖音埋点
                //@ts-ignore
                tt.reportAnalytics('OpenWindow', {
                    WindowName: panelPath,
                });
            }
            if (isCloseBeforeShow) {
                //如果在显示前又被关闭，则直接触发关闭掉
                this.HidePanel(panelPath);
            }
        }, this.node.getChildByPath("Canvas"));

    }

    //弹出信息框
    public ShowText(txt: string) {
        let nd = instantiate(this.message_box);
        nd.parent = this.node.getChildByPath("Canvas");
        nd.position = v3(0, 0, 0);
        nd.getChildByName("内容").getComponent(Label).string = txt;
        tween(nd).to(1.5, { position: v3(0, 200, 0) }, { easing: "backOut" }).call(() => { nd.destroy() }).start();
    }

    private EnsurePanelDictionaries(): void {
        if (!this._panelDict || typeof this._panelDict !== 'object') {
            this._panelDict = {};
        }
        if (!this._loadingPanelDict || typeof this._loadingPanelDict !== 'object') {
            this._loadingPanelDict = {};
        }
    }

    /** P打开修改界面；O独立切换测试用5倍速度，不走玩家广告加速逻辑。 */
    private RegisterHotkeys(): void {
        input.on(Input.EventType.KEY_DOWN, this.OnKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.OnKeyUp, this);
    }

    private OnKeyDown(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.KEY_P) {
            if (this._isPKeyPressed) return;
            this._isPKeyPressed = true;
            if (!this.IsPanelVisible(WZSJZ_Constant.Panel.CheatPanel)) {
                this.ShowPanel(WZSJZ_Constant.Panel.CheatPanel);
            }
            return;
        }
        if (event.keyCode !== KeyCode.KEY_O || this._isOKeyPressed
            || this.IsPanelVisible(WZSJZ_Constant.Panel.CheatPanel)) {
            return;
        }
        this._isOKeyPressed = true;
        this.ToggleDebugFiveTimesSpeed();
    }

    private OnKeyUp(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.KEY_P) {
            this._isPKeyPressed = false;
        }
        if (event.keyCode === KeyCode.KEY_O) {
            this._isOKeyPressed = false;
        }
    }

    private IsPanelVisible(panelPath: string): boolean {
        const panel = this._panelDict[panelPath] as Node;
        return !!panel && isValid(panel) && !!panel.parent && panel.active;
    }

    public static get GameTimeScale(): number {
        return this._gameTimeScale;
    }

    public static get PlayerGameTimeScale(): number {
        return this._playerGameTimeScale;
    }

    /** 只修改玩家速度按钮的1/2倍状态；O键测试倍率不会影响这个状态。 */
    public SetGameTimeScale(multiplier: number): number {
        const config = WZSJZ_Constant.SpeedUp;
        const next = multiplier >= config.FastMultiplier
            ? config.FastMultiplier
            : config.NormalMultiplier;
        if (WZSJZ_UIManager._playerGameTimeScale === next) return next;
        WZSJZ_UIManager._playerGameTimeScale = next;
        WZSJZ_UIManager._gameTimeScale = WZSJZ_UIManager._debugFiveTimesEnabled
            ? config.DebugMultiplier
            : next;
        WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.游戏速度变动, next);
        return next;
    }

    /** 场景跳转前同时关闭玩家加速和O键测试加速，最终必定恢复1倍。 */
    public ResetGameTimeScale(): void {
        const normal = WZSJZ_Constant.SpeedUp.NormalMultiplier;
        WZSJZ_UIManager._debugFiveTimesEnabled = false;
        WZSJZ_UIManager._playerGameTimeScale = normal;
        WZSJZ_UIManager._gameTimeScale = normal;
        WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.游戏速度变动, normal);
    }

    private ToggleDebugFiveTimesSpeed(): void {
        WZSJZ_UIManager._debugFiveTimesEnabled
            = !WZSJZ_UIManager._debugFiveTimesEnabled;
        WZSJZ_UIManager._gameTimeScale = WZSJZ_UIManager._debugFiveTimesEnabled
            ? WZSJZ_Constant.SpeedUp.DebugMultiplier
            : WZSJZ_UIManager._playerGameTimeScale;
        this.ShowText(
            WZSJZ_UIManager._debugFiveTimesEnabled
                ? `测试速度：${WZSJZ_Constant.SpeedUp.DebugMultiplier}倍`
                : `测试速度已关闭：${WZSJZ_UIManager._playerGameTimeScale}倍`,
        );
    }

    /**
     * Cocos 3.8 的组件update、Spine和系统更新直接使用director.tick的dt，
     * 不经过Scheduler.timeScale；这里只包装一次主循环，统一缩放整帧时间。
     */
    private InstallGlobalTimeScale(): void {
        if (WZSJZ_UIManager._originalDirectorTick) {
            return;
        }
        // 避免旧的Scheduler倍率与全局dt倍率叠加。
        director.getScheduler().setTimeScale(1);
        WZSJZ_UIManager._originalDirectorTick = director.tick.bind(director);
        director.tick = (deltaTime: number): void => {
            WZSJZ_UIManager._originalDirectorTick?.(
                deltaTime * WZSJZ_UIManager._gameTimeScale,
            );
        };
    }
    //跨场景监听事件
    public SJZXD_On(type: string, callback: Function, target?: any) {
        this.node.on(type, callback, target);
    }
    //跨场景监听事件
    public SJZXD_OnOnce(type: string, callback: Function, target?: any) {
        this.node.once(type, callback, target);
    }
    public SJZXD_Off(type: string, callback?: Function, target?: any) {
        this.node.off(type, callback, target);
    }
    public SJZXD_Emit(type: string, arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
        this.node.emit(type, arg0, arg1, arg2, arg3, arg4);
    }
}


