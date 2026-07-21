import { _decorator, Button, Component, director, Event, EventHandler, Node, resources, ScrollView, Sprite, SpriteFrame, Tween, tween, Vec3 } from 'cc';
import { MoreGameItem } from '../MoreGameItem';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import { PoolManager } from '../../Framework/Managers/PoolManager';
import { DataManager, GameData } from '../../Framework/Managers/DataManager';
import { Constant } from '../../Framework/Const/Constant';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import { GameManager } from '../../GameManager';
import { PanelBase } from '../../Framework/UI/PanelBase';
import Banner from '../../Banner';
const { ccclass, property } = _decorator;

@ccclass('NewMoreGamePanel')
export class NewMoreGamePanel extends PanelBase {

    @property(Sprite)
    main: Sprite = null;

    @property(Node)
    content: Node = null;

    nextData: GameData;

    items: Node[] = [];

    protected onLoad(): void {
        this.Show();
    }

    Show() {
        this.node.active = true;
        for (let i = 0; i < DataManager.GameData.length; i++) {
            const element = DataManager.GameData[i];
            let sprite: Sprite;
            if (i == 0) sprite = this.main;
            else sprite = this.content.children[i - 1].getComponent(Sprite);
            resources.load(`Sprites/GameIcons/${element.gameName}/spriteFrame`, SpriteFrame, (err, sf) => { sprite.spriteFrame = sf; });
        }
    }

    ClickMain() {
        this.nextData = DataManager.GameData[0];
        UIManager.ShowPanel(Panel.LoadingPanel, [this.nextData, this.nextData.startScene]);
    }

    Click(event: Event) {
        let target: Node = event.target;
        let num = target.getSiblingIndex();
        this.nextData = DataManager.GameData[num + 1];
        UIManager.ShowPanel(Panel.LoadingPanel, [this.nextData, this.nextData.startScene]);
    }

    // Play() {
    //     AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);
    //     console.log(`加载游戏：${this.nextData.gameName}`);
    //     GameManager.GameData = this.nextData;
    //     UIManager.ShowPanel(Panel.LoadingPanel, [this.nextData, this.nextData.startScene]);
    // }

    Back() {
        director.loadScene("Start");
    }
}