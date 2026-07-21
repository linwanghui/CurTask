import { _decorator, Component, find, instantiate, isValid, Node, Prefab, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

import { Constant } from "../Const/Constant";
import Tip from "../UI/Tip";
import { ResourceUtil } from "../Utils/ResourceUtil";
import { PoolManager } from './PoolManager';
import { BundleManager } from './BundleManager';
import { PanelBase } from '../UI/PanelBase';
import NodeUtil from '../Utils/NodeUtil';

export enum Panel {
    PrivacyPanel = "Prefabs/UI/PrivacyPanel",
    HealthAdvicePanel = "Prefabs/UI/HealthAdvicePanel",
    LoadingPanel = "Prefabs/UI/LoadingPanel",
    SettingPanel = "Prefabs/UI/SettingPanel",
    MoreGamePanel = "Prefabs/UI/MoreGamePanel",
    NewMoreGamePanel = "Prefabs/UI/NewMoreGamePanel",
    CommonTipPanel = "Prefabs/UI/CommonTipPanel",
    TreasureBoxPanel = "Prefabs/UI/TreasureBoxPanel",
    HwLoginPanel = "Prefabs/UI/HwLoginPanel",
    SidebarPanel = "Prefabs/UI/SidebarPanel",//侧边栏
    BilibiliSidebarPanel = "Prefabs/UI/BilibiliSidebarPanel",//侧边栏
    ReturnPanel = "Prefabs/UI/ReturnPanel",//返回框
}

@ccclass('UIManager')
export class UIManager extends Component {
    public static Instance: UIManager;

    private _layerGame: Node = null;
    /**游戏层 */
    public get LayerGame() {
        if (!this._layerGame) this._layerGame = NodeUtil.GetNode("Layer_Game", this.node);
        return this._layerGame;
    };

    private _layerTreasureBox: Node = null;
    /**宝箱层 */
    public get LayerTreasureBox() {
        if (!this._layerTreasureBox) this._layerTreasureBox = NodeUtil.GetNode("Layer_TreasureBox", this.node);
        return this._layerTreasureBox;
    };

    private _layerAd: Node = null;
    /**广告层 */
    public get LayerAd() {
        if (!this._layerAd) this._layerAd = NodeUtil.GetNode("Layer_TreasureBox", this.node);
        return this._layerAd;
    };

    private _canvas: Node = null;
    public get Canvas() {
        if (!this._canvas) this._canvas = NodeUtil.GetNode("Canvas", this.node);
        return this._canvas;
    };

    onLoad(): void {
        UIManager.Instance = this;
    }

    //#region 静态方法
    private static _panels: Map<string, PanelBase> = new Map();

    public static ShowPanel(path: string, args?: any, cb: Function = null) {
        const loadUI = () => {
            ResourceUtil.Load(path, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error(`加载 UI 失败：${path}`);
                    return;
                }

                let node: Node = instantiate(prefab);

                if (node.name == "TreasureBoxPanel") {
                    node.parent = UIManager.Instance.LayerTreasureBox;
                } else {
                    node.parent = UIManager.Instance.LayerGame;
                }

                let panel = node.getComponent(PanelBase);

                if (!panel) {
                    console.error(`[${node.name}]上没有 Panel 脚本，或者没有脚本没有继承自 PanelBase 。路径：[${path}]`);
                    cb && cb();
                    return;
                }

                this._panels.set(path, panel);
                if (Array.isArray(args)) {
                    panel.Show(...args);
                } else {
                    panel.Show(args);
                }
                cb && cb();
            });
        }

        if (!this._panels.has(path)) {
            loadUI();
        } else {
            let panel = this._panels.get(path);

            if (!isValid(panel)) {
                loadUI();
                return
            };

            if (panel.node.name == "TreasureBoxPanel") {
                panel.node.parent = UIManager.Instance.LayerTreasureBox;
            } else {
                panel.node.parent = UIManager.Instance.LayerGame;
            }

            if (Array.isArray(args)) {
                panel.Show(...args);
            } else {
                panel.Show(args);
            }
            cb && cb();
        }
    }

    public static ShowBundlePanel(bundleName: string, panelPath: string, args?: any, cb?: Function) {
        const path = `${bundleName}/${panelPath}`;

        const loadUI = () => {
            BundleManager.LoadPrefab(bundleName, panelPath).then((prefab: Prefab) => {
                let node: Node = instantiate(prefab);
                node.setPosition(0, 0, 0);
                find("Canvas").addChild(node);
                let panel = node.getComponent(PanelBase);

                if (!panel) {
                    console.error(`[${node.name}]上没有 Panel 脚本，或者没有脚本没有继承自 PanelBase 。路径：[${path}]`);
                    cb && cb();
                    return;
                }

                this._panels.set(path, panel);

                if (Array.isArray(args)) {
                    panel.Show(...args);
                } else {
                    panel.Show(args);
                }

                cb && cb();
            })
        }

        if (this._panels.has(path)) {
            loadUI();
        }
        else {
            let panel = this._panels.get(path);

            if (!isValid(panel)) {
                loadUI();
                return
            };

            panel.node.parent = find("Canvas");
            if (Array.isArray(args)) {
                panel.Show(...args);
            } else {
                panel.Show(args);
            }
            cb && cb();
        }
    }

    public static HidePanel(path: string, callback?: Function) {
        if (!this._panels.has(path)) {
            console.warn(`Map中没有[${path}]`);
        }

        let panel = this._panels.get(path);

        if (panel && isValid(panel) && UIManager.Instance) {
            panel.getComponent(PanelBase).Hide(() => {
                panel.node.parent = UIManager.Instance.node;
                callback && callback();
            });
        } else {
            panel.getComponent(PanelBase).Hide();
            callback && callback();
        }

    }

    public static RefreshPanel(path: string, args?: any) {
        if (!this._panels.has(path)) return;

        let panel = this._panels.get(path);

        if (isValid(panel)) {
            panel.getComponent(PanelBase).Refresh();
        }
    }

    /*** 全局提示*/
    public static ShowTip(content: string, delay: number = 0.75, tweenType: number = 2) {
        PoolManager.GetNode(Constant.Path.Tip, find("Canvas"), Vec3.ZERO).then(node => node.getComponent(Tip).Show(content, delay, tweenType));
    }

    //#endregion

}