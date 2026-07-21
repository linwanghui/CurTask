import { _decorator, Component, director, Label, Node, resources, Sprite, SpriteFrame, Vec3 } from 'cc';
import { GameData } from '../../Scripts/Framework/Managers/DataManager';
import NodeUtil from '../Framework/Utils/NodeUtil';
import { ResourceUtil } from '../Framework/Utils/ResourceUtil';
import { AudioManager, Audios } from '../Framework/Managers/AudioManager';
const { ccclass, property } = _decorator;

@ccclass('MoreGameItem')
export class MoreGameItem extends Component {

    Icon: Sprite = null;
    Label: Label = null;

    data: GameData = null;

    cb: Function = null;

    protected onLoad(): void {
        this.Icon = NodeUtil.GetComponent("Sprite", this.node, Sprite);
        this.Label = NodeUtil.GetComponent("Label", this.node, Label);
    }

    Init(data: GameData, cb: Function) {
        this.data = data;
        this.cb = cb;
        this.Label.string = `${data.gameName}`;
        // this.Label.node.active = false;

        ResourceUtil.Load(`Sprites/GameIcons/${data.gameName}/spriteFrame`, SpriteFrame, (err: any, spriteFrame: SpriteFrame) => {
            if (spriteFrame) this.Icon.spriteFrame = spriteFrame;
            else this.Label.node.active = true;
        });
    }

    OnButtonClick(event) {
        AudioManager.Instance.PlayCommonSFX(Audios.ButtonClick);
        this.cb && this.cb(this.data);
    }
}