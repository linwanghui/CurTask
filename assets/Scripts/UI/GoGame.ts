import { _decorator, Button, Component, director, EventTouch, Node } from 'cc';
import { AudioManager, Audios } from '../Framework/Managers/AudioManager';
import Banner from '../Banner';
import { Panel, UIManager } from '../Framework/Managers/UIManager';
import { GameManager } from '../GameManager';
import { DataManager } from '../Framework/Managers/DataManager';
const { ccclass, property } = _decorator;

@ccclass('GoGame')
export class GoGame extends Component {
    @property()
    public GameName: string = "";


    start() {
        this.addButtonToNode();
        if (!Banner.IsShowServerBundle) {
            this.node.active = false;
        }
    }

    addButtonToNode() {
        this.node.addComponent(Button);
        this.node.getComponent(Button).transition = Button.Transition.SCALE;
        this.node.getComponent(Button).zoomScale = 1.1;
        this.node.on(Node.EventType.TOUCH_END, this.onButtonClicked, this);
    }

    onButtonClicked(event: EventTouch) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);
        director.getScene().emit("退出游戏");
        let gaemdata = DataManager.GetGameDataByName(this.GameName);
        GameManager.GameData = gaemdata;
        UIManager.ShowPanel(Panel.LoadingPanel, [gaemdata, gaemdata.startScene]);
    }
}


