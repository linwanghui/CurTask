import { _decorator, Component, Node, Sprite, SpriteFrame, tween, v3, Vec3 } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

enum ZRSJZ_BOX_STATE {
    IDLE = 0,
    OPENED = 1,
}

@ccclass('ZRSJZ_Box')
export class ZRSJZ_Box extends Component {
    @property
    BoxName: string = '';

    Icon: Sprite = null;
    Checked: Sprite = null;
    IconSF: SpriteFrame[] = [null, null];
    CheckedSF: SpriteFrame[] = [null, null];
    State: ZRSJZ_BOX_STATE = ZRSJZ_BOX_STATE.IDLE;

    private _isInit: boolean = false;

    protected start(): void {
        this.Init();
    }

    Init() {
        if (this._isInit) return;
        this._isInit = true;
        this.Icon = this.node.getChildByName('Icon').getComponent(Sprite);
        this.Checked = this.node.getChildByName('Checked').getComponent(Sprite);
        this.State = ZRSJZ_BOX_STATE.IDLE;
        console.error(this.BoxName);
        ZRSJZ_UIManager.Instance.GetBoxUI(this.BoxName).then((sf: SpriteFrame) => {
            this.IconSF[0] = sf;
            this.Icon.spriteFrame = sf;
        })
        ZRSJZ_UIManager.Instance.GetBoxUI(`${this.BoxName}开箱`).then((sf: SpriteFrame) => {
            this.IconSF[1] = sf;
        })
        ZRSJZ_UIManager.Instance.GetBoxUI(`${this.BoxName}描边`).then((sf: SpriteFrame) => {
            this.CheckedSF[0] = sf;
            this.Checked.spriteFrame = sf;
            this.Checked.node.active = false;
        })
        ZRSJZ_UIManager.Instance.GetBoxUI(`${this.BoxName}开箱描边`).then((sf: SpriteFrame) => {
            this.CheckedSF[1] = sf;
        })
    }

    Show(worldPos: Vec3) {
        this.Init();
        this.node.setWorldPosition(v3(worldPos.x, worldPos.y + 300, worldPos.z))
        tween(this.node)
            .to(0.3, { worldPosition: worldPos.clone() }, { easing: 'backOut' })
            .start();
    }

    Check() {
        this.Checked.node.active = true;
    }

    CheckCancel() {
        this.Checked.node.active = false;
    }

    Open() {
        this.State = ZRSJZ_BOX_STATE.OPENED;
        this.Icon.spriteFrame = this.IconSF[this.State];
        this.Checked.spriteFrame = this.CheckedSF[this.State];
    }
}


