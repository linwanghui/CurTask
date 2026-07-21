import { _decorator, Enum, Component, Tween, tween, UITransform, Vec2, Vec3, v3, CCBoolean } from 'cc';

const { ccclass, property } = _decorator;

export enum BREATHEANI_TYPE {
    Center,
    Top,
    Bottom,
    Left,
    Right,
}

@ccclass('UI_BreatheAni')
export default class UI_BreatheAni extends Component {

    @property(CCBoolean)
    playOnLoad: boolean = true;

    @property({ type: Enum(BREATHEANI_TYPE) })
    type: BREATHEANI_TYPE = BREATHEANI_TYPE.Center;

    @property
    speed: number = 1;

    @property
    scaleGap: number = 0.05;

    transform: UITransform;

    oriScale: Vec3 = v3();

    loadDone: boolean = false;

    protected onLoad(): void {
        this.transform = this.node.getComponent(UITransform);
        this.oriScale.set(this.node.getScale());
        this.loadDone = true;

        if (this.playOnLoad) this.Set(this.type);
    }

    Set(type: BREATHEANI_TYPE = BREATHEANI_TYPE.Center) {
        if (!this.loadDone) this.onLoad();
        this.node.scale.set(this.oriScale);

        let anchorX = 0.5, anchorY = 0.5, positionX = 0, positionY = 0;
        switch (type) {
            case BREATHEANI_TYPE.Top:
                anchorY = 1;
                positionY += this.transform.contentSize.height * this.node.scale.y / 2;
                break;
            case BREATHEANI_TYPE.Bottom:
                anchorY = 0;
                positionY -= this.transform.contentSize.height * this.node.scale.y / 2;
                break;
            case BREATHEANI_TYPE.Left:
                anchorX = 0;
                positionX -= this.transform.contentSize.width * this.node.scale.x / 2;
                break;
            case BREATHEANI_TYPE.Right:
                anchorX = 1;
                positionX += this.transform.contentSize.width * this.node.scale.x / 2;
                break;
        }
        this.transform.setAnchorPoint(anchorX, anchorY);
        this.node.setPosition(this.node.position.x + positionX, this.node.position.y + positionY);

        Tween.stopAllByTarget(this.node);

        switch (type) {
            case BREATHEANI_TYPE.Top:
            case BREATHEANI_TYPE.Bottom:
                tween(this.node)
                    .to(1 / this.speed, { scale: v3(this.oriScale.x, this.oriScale.y + this.scaleGap) })
                    .to(1 / this.speed, { scale: this.oriScale })
                    .to(1 / this.speed, { scale: v3(this.oriScale.x, this.oriScale.y - this.scaleGap) })
                    .to(1 / this.speed, { scale: this.oriScale })
                    .union().repeatForever().start();
                break;
            case BREATHEANI_TYPE.Left:
            case BREATHEANI_TYPE.Right:
                tween(this.node)
                    .to(1 / this.speed, { scale: v3(this.oriScale.x + this.scaleGap, this.oriScale.y) })
                    .to(1 / this.speed, { scale: this.oriScale })
                    .to(1 / this.speed, { scale: v3(this.oriScale.x - this.scaleGap, this.oriScale.y) })
                    .to(1 / this.speed, { scale: this.oriScale })
                    .union().repeatForever().start();
                break;
            case BREATHEANI_TYPE.Center:
                tween(this.node)
                    .to(1 / this.speed, { scale: v3(this.oriScale.x + this.scaleGap, this.oriScale.y + this.scaleGap) })
                    .to(1 / this.speed, { scale: this.oriScale })
                    .to(1 / this.speed, { scale: v3(this.oriScale.x - this.scaleGap, this.oriScale.y - this.scaleGap) })
                    .to(1 / this.speed, { scale: this.oriScale })
                    .union().repeatForever().start();
                break;
        }
    }

    Stop() {
        if (!this.loadDone) this.onLoad();
        Tween.stopAllByTarget(this.node);
        tween(this.node).to(0.1, { scale: this.oriScale }).start();
    }
}
