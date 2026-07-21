import { _decorator, Component, Tween, tween, UITransform, Vec3, v3, CCBoolean, CCFloat, Quat, quat, Sprite, Label, Button } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('UI_SkillCooldown')
export default class UI_SkillCooldown extends Component {
    @property
    cooldown: number = 0;
    button: Button = null;
    sprite: Sprite = null;
    label: Label = null;
    cooldownTimer: number = 0;
    startCool: boolean = false;

    onLoad(): void {
        this.sprite = this.node.getComponent(Sprite);
        this.label = this.node.getChildByName("Label").getComponent(Label);
        this.button = this.node.parent.getComponent(Button);
    }

    Set(cooldown: number) {
        this.cooldown = cooldown;
        this.cooldownTimer = 0;
        this.label.node.active = false;
    }

    StartCooldown() {
        this.button.enabled = false;
        this.cooldownTimer = 0;
        this.startCool = true;
        this.label.string = `${this.cooldown}`;
        this.label.node.active = true;
    }

    StopCooldown() {
        this.cooldownTimer = 0;
        this.startCool = false;
        this.label.node.active = false;
        this.button.enabled = true;
        this.sprite.fillRange = 0;
    }

    update(dt: number): void {
        if (this.startCool) {
            this.cooldownTimer += dt;
            this.sprite.fillRange = 1 - this.cooldownTimer / this.cooldown;
            this.label.string = `${(this.cooldown - this.cooldownTimer).toFixed(1)}`;
            if (this.cooldownTimer >= this.cooldown) {
                this.StopCooldown();
            }
        }
    }

}
