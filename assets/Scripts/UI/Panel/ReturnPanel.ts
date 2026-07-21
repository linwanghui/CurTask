import { _decorator, Component, director, Node } from 'cc';
import { PanelBase } from '../../Framework/UI/PanelBase';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { ProjectEvent, ProjectEventManager } from '../../Framework/Managers/ProjectEventManager';
const { ccclass, property } = _decorator;

@ccclass('ReturnPanel')
export class ReturnPanel extends PanelBase {

    Show(...args: any[]): void {
        super.Show(this.node.getChildByName("弹板"));
        ProjectEventManager.emit(ProjectEvent.弹出窗口, "返回界面");
    }
    //点击是
    OnYesClick() {
        UIManager.HidePanel(Panel.ReturnPanel);
        director.getScene().emit("退出游戏");
        director.loadScene("GameMode");
    }
    //点击否
    OnNoClick() {
        UIManager.HidePanel(Panel.ReturnPanel);

    }

}


