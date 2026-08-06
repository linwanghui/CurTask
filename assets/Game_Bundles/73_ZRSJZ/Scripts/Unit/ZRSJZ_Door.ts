import { _decorator, Collider2D, Component, Node, sp } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
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
    private _isOpened: boolean = false;

    protected onLoad(): void {
        this.Spine = this.getComponent(sp.Skeleton);
        this.Sensor = this.getComponent(Collider2D);
        this.Collider = this.node.getChildByName("Collider");
    }

    protected start(): void {
        this.Spine.setSkin(this.Skin);
    }

    public TryOpenWithRoomCard(): boolean {
        if (this._isOpened) return false;
        if (!ZRSJZ_GameData.Instance.HasEquippedRoomCard(this.RoomCard)) {
            ZRSJZ_UIManager.Instance.ShowTip(`需要在卡包中装备${this.RoomCard}`);
            return false;
        }
        if (!ZRSJZ_GameData.Instance.ConsumeEquippedRoomCard(this.RoomCard)) {
            ZRSJZ_UIManager.Instance.ShowTip(`${this.RoomCard}已失效`);
            return false;
        }

        this.Open();
        ZRSJZ_UIManager.Instance.ShowTip(`已使用${this.RoomCard}`);
        return true;
    }

    public Open() {
        if (this._isOpened) return;
        this._isOpened = true;
        this.Spine.setAnimation(0, "kaim", false);
        this.Spine.setCompleteListener(() => {
            this.Sensor.enabled = false;
            this.Collider.active = false;
        });
    }


}


