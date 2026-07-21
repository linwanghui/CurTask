import { _decorator, Enum, Component, Tween, tween, UITransform, Vec3, v3, CCBoolean, CCFloat } from 'cc';

const { ccclass, property } = _decorator;

export enum UI_Rotate_Type {
    顺时针,
    逆时针,
}

@ccclass('UI_Rotate')
export default class UI_Rotate extends Component {
    @property(CCBoolean)
    playOnAwake: boolean = true;

    @property({ type: Enum(UI_Rotate_Type) })
    type: UI_Rotate_Type = UI_Rotate_Type.顺时针;

    @property
    speed: number = 1;

    @property(CCBoolean)
    fluctuate: boolean = false;

    @property({
        type: CCFloat,
        visible() { return this.fluctuate }
    })
    fluctuateSpeed: number = 1;

    @property({
        type: CCFloat,
        visible() { return this.fluctuate }
    })
    fluctuateScale: number = 1.2;

    transform: UITransform;

    oriScale: Vec3 = v3();

    loadDone: boolean = false;

    protected onLoad(): void {
        this.transform = this.node.getComponent(UITransform);
        this.oriScale.set(this.node.scale);
        this.loadDone = true;

        if (this.playOnAwake) this.Set(this.type, this.fluctuate);
    }

    Set(type: UI_Rotate_Type, fluctuate: boolean) {
        if (!this.loadDone) this.onLoad();
        Tween.stopAllByTarget(this.node);

        switch (this.type) {
            case UI_Rotate_Type.顺时针:
                tween(this.node)
                    .by(1 / this.speed, { angle: -60 })
                    .repeatForever().start();
                if (fluctuate) {
                    tween(this.node)
                        .to(1 / this.fluctuateSpeed, { scale: this.oriScale.clone().add(Vec3.ONE.clone().multiplyScalar(this.fluctuateScale)) })
                        .to(1 / this.fluctuateSpeed, { scale: this.oriScale })
                        .union().repeatForever().start();
                }
                break;
            case UI_Rotate_Type.逆时针:
                tween(this.node)
                    .by(1 / this.speed, { angle: 60 })
                    .repeatForever().start();

                if (fluctuate) {
                    tween(this.node)
                        .to(1 / this.fluctuateSpeed, { scale: this.oriScale.clone().add(Vec3.ONE.clone().multiplyScalar(this.fluctuateScale)) })
                        .to(1 / this.fluctuateSpeed, { scale: this.oriScale })
                        .union().repeatForever().start();
                }
                break;
        }
    }

    Stop() {
        if (!this.loadDone) this.onLoad();
        Tween.stopAllByTarget(this.node);
        tween(this.node).to(0.1, { scale: this.oriScale }).start();
    }
}