import { _decorator, Component, Event, Node, ScrollView, Tween, tween, Vec3 } from 'cc';
import { MoreGameItem } from '../MoreGameItem';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import { PoolManager } from '../../Framework/Managers/PoolManager';
import { DataManager, GameData } from '../../Framework/Managers/DataManager';
import { Constant } from '../../Framework/Const/Constant';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import { GameManager } from '../../GameManager';
import { PanelBase } from '../../Framework/UI/PanelBase';
const { ccclass, property } = _decorator;

@ccclass('MoreGamePanel')
export class MoreGamePanel extends PanelBase {

    Panel: Node = null;
    ScrollView: ScrollView = null;
    Content: Node = null;
    CloseButton: Node = null;


    items: MoreGameItem[] = [];

    protected onLoad(): void {
        this.Panel = NodeUtil.GetNode("Panel", this.node);
        this.ScrollView = NodeUtil.GetComponent("ScrollView", this.node, ScrollView);
        this.Content = NodeUtil.GetNode("Content", this.node);
        this.CloseButton = NodeUtil.GetNode("CloseButton", this.node);
    }

    Show() {
        super.Show(this.Panel);
        this.ScrollView.scrollToLeft();

        this.items.forEach(e => PoolManager.PutNode(e.node));
        this.items = [];

        for (let i = 0; i < DataManager.GameData.length; i++) {
            const data = DataManager.GameData[i];
            PoolManager.GetNode(Constant.Path.MoreGameItem, this.Content).then(node => {
                let item = node.getComponent(MoreGameItem);
                item.Init(data, this.MoreGameItemCallback.bind(this))
                this.items.push(item);
                node.setScale(Vec3.ZERO);
                this.scheduleOnce(() => {
                    tween(node)
                        .to(0.3, { scale: Vec3.ONE }, { easing: "backOut" }).call(() => {
                            Tween.stopAllByTarget(node);
                            node.setScale(Vec3.ONE);
                        })
                        .start();
                }, 0.05 * node.getSiblingIndex())
            });
        }
    }

    MoreGameItemCallback(data: GameData) {
        //加载场景
        console.log(`加载游戏：${data.gameName}`);
        GameManager.GameData = data;
        UIManager.HidePanel(Panel.MoreGamePanel);
        UIManager.ShowPanel(Panel.LoadingPanel, [data, data.startScene]);
    }

    OnButtonClick(event: Event) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);

        switch (event.target.name) {
            case "Mask":
            case "CloseButton":
                UIManager.HidePanel(Panel.MoreGamePanel);
                break;
        }
    }
}