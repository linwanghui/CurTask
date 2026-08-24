import { _decorator, Component, Label, Node, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_TaskAward')
export class ZRSJZ_TaskAward extends Component {

    @property(SpriteFrame)
    GoldSF: SpriteFrame = null;

    Icon: Sprite = null;
    Name: Label = null;
    Count: Label = null;

    PropName: string = "";

    private _isInit: boolean = false;

    Init(propName: string, count: number) {
        if (!this._isInit) {
            this._isInit = true;
            this.Icon = this.node.getChildByName("Icon").getComponent(Sprite);
            this.Name = this.node.getChildByName("Name").getComponent(Label);
            this.Count = this.node.getChildByName("Count").getComponent(Label);
        }

        this.PropName = propName;
        this.Name.string = propName;
        this.Count.string = count.toString();
        if (propName == "钞票") {
            this.Icon.spriteFrame = this.GoldSF;
        } else {
            ZRSJZ_UIManager.Instance.GetPropUI(propName).then(sf => {
                this.Icon.spriteFrame = sf;
                ZRSJZ_Tools.ScaleNodeToFit(this.Icon.node, 110, 110);
            });
        }
    }



}


