import { _decorator, Component, director, Label, Node, Sprite } from 'cc';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import { BundleManager } from '../../Framework/Managers/BundleManager';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { PanelBase } from '../../Framework/UI/PanelBase';
import { DataManager, GameData } from '../../Framework/Managers/DataManager';
import { GameManager } from '../../GameManager';
import { PhysicsManager } from '../../Framework/Managers/PhysicsManager';
const { ccclass, property, menu } = _decorator;

@ccclass('LoadingPanel')
@menu("Framework/UI组件/Panel_Loading")
export default class LoadingPanel extends PanelBase {
    Loading: Node = null;
    MapLabel: Label | null = null;
    LoadingLabel: Label | null = null;
    LoadingFG: Sprite | null = null;

    protected onLoad(): void {
        this.Loading = NodeUtil.GetNode("Loading", this.node);
        this.LoadingLabel = NodeUtil.GetComponent("LoadingLabel", this.node, Label);
        this.MapLabel = NodeUtil.GetComponent("MapLabel", this.node, Label);
        this.LoadingFG = NodeUtil.GetComponent("LoadingFG", this.node, Sprite);
    }

    //**一个参数为直接跳转到该场景，两个参数第一个参数为GameData，第二个为跳转到GameData的默认分包里的场景 */
    Show(...args: any[]) {
        PhysicsManager.SetCollisionMatrix(GameManager.GameData);
        this.node.active = true;
        this.LoadingFG.fillRange = 0;
        this.LoadingLabel.string = `正在加载：${0}%`;

        const loadScene = (senceName, bundleName = null) => {
            director.loadScene(senceName, () => {
                UIManager.HidePanel(Panel.LoadingPanel);
            });
            this.LoadingLabel.string = `加载中...`;



            this.Loading.active = false;
            director.preloadScene(senceName, (completedCount: number, totalCount: number, item: any) => {
                this.LoadingFG.fillRange = this.LoadingFG.fillRange > completedCount / totalCount ? this.LoadingFG.fillRange : completedCount / totalCount;
                this.LoadingLabel.string = `正在加载：${Math.ceil(completedCount / totalCount * 100)}%`;
            }, () => {
            });
        }

        this.Loading.active = args.length >= 2;

        if (args.length == 1) {
            loadScene(args[0]);
        }

        if (args.length >= 2) {
            if (!(args[0] instanceof GameData)) {
                console.error(`第一个参数类型错误，应该传入GameData。`, args[0]);
                return;
            }

            let data = args[0] as GameData;
            let scene = args[1];

            if (data.Bundles) {
                BundleManager.LoadBundles(data.Bundles, () => {
                    this.Loading.active = false;
                    loadScene(scene, data.DefaultBundle);
                }, () => {
                    UIManager.ShowTip("网络异常，请稍后重试");
                    UIManager.HidePanel(Panel.LoadingPanel);
                });
            } else {
                this.Loading.active = false;
                loadScene(scene, data.DefaultBundle);
            }
        }

    }
}