import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { _decorator, Collider2D, Component, Node, sp } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from "../Manager/ZRSJZ_AudioManager";
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

    public get IsInsuranceDoor(): boolean {
        return this.Skin === "保险门";
    }

    public get CanOpenManually(): boolean {
        return !this._isOpened && !this.IsInsuranceDoor;
    }

    protected onLoad(): void {
        this.Spine = this.getComponent(sp.Skeleton);
        this.Sensor = this.getComponent(Collider2D);
        this.Collider = this.node.getChildByName("Collider");
    }

    protected start(): void {
        this.Spine.setSkin(this.Skin);
    }

    public TryOpenWithRoomCard(playerIndex: number = 0): boolean {
        if (!this.CanOpenManually) return false;
        if (!ZRSJZ_InventoryService.HasEquippedRoomCard(this.RoomCard, playerIndex)) {
            ZRSJZ_UIManager.Instance.ShowTip(`需要在卡包中装备${this.RoomCard}`);
            return false;
        }
        if (!ZRSJZ_InventoryService.ConsumeEquippedRoomCard(this.RoomCard, playerIndex)) {
            ZRSJZ_UIManager.Instance.ShowTip(`${this.RoomCard}已失效`);
            return false;
        }

        this.Open();
        ZRSJZ_UIManager.Instance.ShowTip(`已使用${this.RoomCard}`);
        return true;
    }

    public Open() {
        if (this.IsInsuranceDoor) return;
        this.OpenInternal();
    }

    /** 保险门只能由破壁行动开启，不能通过房卡或广告入口绕过。 */
    public OpenForBreakWallOperation(): void {
        if (!this.IsInsuranceDoor) return;
        this.OpenInternal();
    }

    private OpenInternal(): void {
        if (this._isOpened) return;
        this._isOpened = true;
        ZRSJZ_AudioManager.Instance.PlaySound("开门");
        this.Spine.setAnimation(0, this.Skin, false);
        this.Spine.setCompleteListener(() => {
            this.Sensor.enabled = false;
            this.Collider.active = false;
        });
    }


}


