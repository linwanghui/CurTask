import { _decorator, Component, Node, Event, director } from 'cc';
import { DataManager, GameData } from '../../Framework/Managers/DataManager';
import { AudioManager, Audios } from '../../Framework/Managers/AudioManager';
import { GameManager } from '../../GameManager';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { PanelBase } from '../../Framework/UI/PanelBase';
const { ccclass, property } = _decorator;

@ccclass('GameChoosePanel')
export class GameChoosePanel extends PanelBase {
    nextData: GameData;
    start() {

    }

    update(deltaTime: number) {

    }
    OnButtonClick(event: Event) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);
        let Name: string = event.target.name;
        let data = DataManager.GameData[Name];
        this.nextData = data;
        GameManager.GameData = this.nextData;
        UIManager.ShowPanel(Panel.LoadingPanel, [this.nextData, this.nextData.startScene]);
    }

    Back() {
        director.loadScene("Start");
    }

}


