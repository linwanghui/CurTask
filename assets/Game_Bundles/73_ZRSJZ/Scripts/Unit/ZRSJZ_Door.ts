import { _decorator, Collider2D, Component, Node, sp } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Door')
export class ZRSJZ_Door extends Component {

    @property({ displayName: "门皮肤" })
    Skin: string = "小镇";

    @property({ displayName: "开锁需要房卡" })
    RoomCard: string = "低级房卡";

    Spine: sp.Skeleton = null;
    Sensor: Collider2D = null;
    Collider: Node = null;

    protected onLoad(): void {
        this.Spine = this.getComponent(sp.Skeleton);
        this.Sensor = this.getComponent(Collider2D);
        this.Collider = this.node.getChildByName("Collider");
    }

    protected start(): void {
        this.Spine.setSkin(this.Skin);
    }

    Open() {
        this.Spine.setAnimation(0, "kaim", false);
        this.Spine.setCompleteListener(() => {
            this.Sensor.enabled = false;
            this.Collider.active = false;
        });
    }


}


