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
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_UIManager')
export class WZSJZ_UIManager extends Component {
    @property(Prefab)
    message_box: Prefab = null;
    private _panelDict: any = {}
    private _loadingPanelDict: any = {}
    private static _instance: WZSJZ_UIManager;
    private static _gameTimeScale: number = 1;
    private static _originalDirectorTick: ((deltaTime: number) => void) | null = null;
    private _isFiveTimesSpeed: boolean = false;
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
        if (WZSJZ_UIManager._instance === this) {
            WZSJZ_UIManager._instance = null;
        }
    }

    //*** 路径 或者 Bundle名称/路径 */
    public HidePanel(panelPath: string, callback?: Function) {
        this.EnsurePanelDictionaries();
        WZSJZ_AudioManager.Play('界面关闭', 0.55, 0.08);
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
        WZSJZ_UIManager.Instance.SJZXD_Emit("关闭页面_" + panelPath)
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
        WZSJZ_AudioManager.Play('界面打开', 0.55, 0.08);

        let idxSplit = panelPath.lastIndexOf('/');
        let scriptName = `WZSJZ_` + panelPath.slice(idxSplit + 1);

        if (!args) {
            args = [];
        }

        if (this._panelDict.hasOwnProperty(panelPath)) {
            let panel = this._panelDict[panelPath];
            if (isValid(panel)) {
                panel.parent = WZSJZ_UIManager.Instance.node.getChildByPath("Canvas");
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
                WZSJZ_UIManager.Instance.SJZXD_Emit("打开页面_" + panelPath)
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
            WZSJZ_UIManager.Instance.SJZXD_Emit("打开页面_" + panelPath)
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
        }, WZSJZ_UIManager.Instance.node.getChildByPath("Canvas"));

    }

    //弹出信息框
    public ShowText(txt: string) {
        let nd = instantiate(this.message_box);
        nd.parent = WZSJZ_UIManager.Instance.node.getChildByPath("Canvas");
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

    /** 全局调试热键：P打开修改界面，O在1倍与5倍游戏速度之间切换。 */
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
        this._isFiveTimesSpeed = !this._isFiveTimesSpeed;
        const timeScale = this._isFiveTimesSpeed ? 5 : 1;
        WZSJZ_UIManager._gameTimeScale = timeScale;
        this.ShowText(`游戏速度：${timeScale}倍`);
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


