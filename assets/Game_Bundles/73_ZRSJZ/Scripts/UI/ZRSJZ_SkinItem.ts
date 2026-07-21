import { _decorator, Button, Component, Node, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_SkinItem')
export class ZRSJZ_SkinItem extends Component {

    Checked: Node = null;
    Icon: Sprite = null;
    Button: Button = null;
    SkinName: string = "";

    private _isInit: boolean = false;

    Init(skinName: string) {
        if (!this._isInit) {
            this._isInit = true;
            this.Checked = this.node.getChildByName("Checked");
            this.Icon = this.node.getChildByName("SkinIcon").getComponent(Sprite);
            this.Button = this.getComponent(Button);
        }
        this.SkinName = skinName;
    }
}


