import { _decorator, Component, EventTouch, Node } from 'cc';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';
import { WZSJZ_Constant } from './WZSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_StartPanel')
export class WZSJZ_StartPanel extends Component {
    start() {

    }




    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "开始游戏":
                WZSJZ_UIManager.Instance.ShowPanel(WZSJZ_Constant.Panel.LoadingPanel, ["WZSJZ_Game"]);
                break;
        }
    }


}


