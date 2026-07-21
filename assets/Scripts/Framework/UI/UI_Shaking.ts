import { _decorator, Component, Tween, tween, UITransform, Vec3, v3, CCBoolean, CCFloat, Quat, quat } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('UI_Shaking')
export default class UI_Shaking extends Component {
    @property(CCBoolean)
    playOnAwake: boolean = true;

    @property
    speed: number = 10;

    @property
    angle: number = 5;

    transform: UITransform;

    oriRotation: Quat = quat();

    loadDone: boolean = false;

    protected onLoad(): void {
        this.transform = this.node.getComponent(UITransform);
        this.oriRotation.set(this.node.rotation);

        this.loadDone = true;
        if (this.playOnAwake) this.Shaking(this.speed, this.angle);
    }

    Shaking(speed: number, angle: number) {
        if (!this.loadDone) this.onLoad();

        Tween.stopAllByTarget(this.node);

        tween(this.node)
            .to(1 / speed, { angle: angle })
            .to(1 / speed, { angle: 0 })
            .to(1 / speed, { angle: -angle })
            .to(1 / speed, { angle: 0 })
            .union().repeatForever().start();
    }

    Stop() {
        if (!this.loadDone) this.onLoad();
        Tween.stopAllByTarget(this.node);
        this.node.setRotation(this.oriRotation);
    }
}
