import { _decorator, Component, Label, Node } from 'cc';
import { GameManager } from 'db://assets/Scripts/GameManager';
import { ZRSJZ_PANEL_PATH_CONFIG } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Path')
export class ZRSJZ_Path extends Component {

    @property({ displayName: "路径" })
    Path: string = "";

    protected start(): void {
        this.node.active = GameManager.PathShow;
        this.getComponent(Label).string = ZRSJZ_PANEL_PATH_CONFIG.get(this.Path) || "";
    }

}


