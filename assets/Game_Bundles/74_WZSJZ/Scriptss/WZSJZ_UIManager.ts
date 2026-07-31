import { _decorator, Component, director, isValid, Node } from 'cc';
import Banner from '../../../Scripts/Banner';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { BundleManager } from '../../../Scripts/Framework/Managers/BundleManager';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_UIManager')
export class WZSJZ_UIManager extends Component {
    private _panelDict: any = {}
    private _loadingPanelDict: any = {}
    private static _instance: WZSJZ_UIManager;
    public static get Instance() {
        if (!this._instance) {
            this._instance = new WZSJZ_UIManager();
        }

        return this._instance;
    }
    protected onLoad(): void {
        WZSJZ_UIManager._instance = this;
    }

    start() {
        director.addPersistRootNode(this.node);
    }

    //*** 路径 或者 Bundle名称/路径 */
    public HidePanel(panelPath: string, callback?: Function) {
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


