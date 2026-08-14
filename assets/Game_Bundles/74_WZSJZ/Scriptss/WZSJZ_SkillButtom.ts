import { _decorator, Component, Label, Node, Sprite } from 'cc';
const { ccclass } = _decorator;

@ccclass('WZSJZ_SkillButtom')
export class WZSJZ_SkillButtom extends Component {
    private _cooldown: number = 0;
    private _remaining: number = 0;
    private _onUse: (() => boolean) = null;
    private _maskNode: Node = null;
    private _countdownNode: Node = null;
    private _countdownLabel: Label = null;

    protected onLoad(): void {
        this.node.on(Node.EventType.TOUCH_END, this.OnClicked, this);
        this._maskNode = this.node.getChildByName("遮罩");
        this._countdownNode = this.node.getChildByName("倒计时");
        this._countdownLabel = this._countdownNode?.getComponent(Label) || null;
    }

    public Configure(cooldown: number, onUse: () => boolean): void {
        this._cooldown = Math.max(0, cooldown);
        // 技能刚生成（包括组合角色拆开后重新组合）时从完整CD开始。
        this._remaining = this._cooldown;
        this._onUse = onUse;
        const mask = this._maskNode?.getComponent(Sprite);
        if (mask) {
            mask.type = Sprite.Type.FILLED;
            mask.fillType = Sprite.FillType.RADIAL;
            mask.fillStart = 0.25;
        }
        this.RefreshCooldownView();
    }

    protected update(deltaTime: number): void {
        if (this._remaining <= 0) {
            return;
        }
        this._remaining = Math.max(0, this._remaining - deltaTime);
        this.RefreshCooldownView();
    }

    private OnClicked(): void {
        if (this._remaining > 0 || !this._onUse?.()) {
            return;
        }
        this._remaining = this._cooldown;
        this.RefreshCooldownView();
    }

    private RefreshCooldownView(): void {
        const coolingDown = this._remaining > 0;
        if (this._maskNode) {
            this._maskNode.active = coolingDown;
            const mask = this._maskNode.getComponent(Sprite);
            if (mask) {
                mask.fillRange = this._cooldown > 0 ? this._remaining / this._cooldown : 0;
            }
        }
        if (this._countdownNode) {
            this._countdownNode.active = coolingDown;
        }
        if (this._countdownLabel) {
            this._countdownLabel.string = Math.ceil(this._remaining).toString();
        }
    }

}

