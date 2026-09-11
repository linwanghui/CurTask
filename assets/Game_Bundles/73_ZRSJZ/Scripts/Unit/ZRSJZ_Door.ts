import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { _decorator, Collider2D, Component, Node, sp } from 'cc';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from "../Manager/ZRSJZ_AudioManager";
import { ZRSJZ_OnlineService as Online } from '../Service/ZRSJZ_OnlineService';
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
    private _lastBlockedTipTime: number = 0;
    private pending = false;
    private pendingPlayer = 0;
    private pendingMode = '';
    private paidTokens = new Set<string>();
    private doorID = '';

    /** 接触保险门时提示；短暂冷却避免碰撞抖动或双人同时接触刷屏。 */
    public ShowMissingOperationTip(): void {
        if (!this.IsInsuranceDoor || this._isOpened) return;
        const now = Date.now();
        if (now - this._lastBlockedTipTime < 3000) return;
        this._lastBlockedTipTime = now;
        void ZRSJZ_UIManager.Instance.ShowTip('本局没有“先锋行动”，无法进入房间');
    }

    public get IsInsuranceDoor(): boolean {
        return this.Skin === "保险门";
    }

    public get CanOpenManually(): boolean {
        return !this._isOpened && !this.IsInsuranceDoor;
    }

    protected onLoad(): void {
        this.doorID = Online.SceneObjectKey(this.node, 'door');
        this.Spine = this.getComponent(sp.Skeleton);
        this.Sensor = this.getComponent(Collider2D);
        this.Collider = this.node.getChildByName("Collider");
        Online.Events.on('door', this.OnOnlineDoor, this);
    }

    protected start(): void {
        this.Spine.setSkin(this.Skin);
        if (!this.IsInsuranceDoor && Online.OpenDoors.has(this.doorID)) this.OpenInternal();
    }
    protected onDestroy(): void { Online.Events.off('door', this.OnOnlineDoor, this); }
    private RequestOnlineOpen(mode: string, playerIndex = 0): boolean {
        if (!Online.Connected || Online.BattleEnded) { ZRSJZ_UIManager.Instance.ShowTip('连接恢复为单机后请重试开门'); return false; }
        if (Online.OpenDoors.has(this.doorID)) { this.OpenInternal(); return true; }
        if (this.pending) return false;
        this.pending = true; this.pendingMode = mode; this.pendingPlayer = playerIndex;
        Online.Send('door_claim', { id: this.doorID, mode });
        return true;
    }
    private OnOnlineDoor(message: any): void {
        if (!this.isValid || message.id !== this.doorID || this.IsInsuranceDoor) return;
        if (message.open) { this.pending = false; this.OpenInternal(); return; }
        if (message.busy || message.cancelled) {
            this.pending = false;
            if (message.busy) ZRSJZ_UIManager.Instance.ShowTip('队友正在解锁，请稍后重试');
            return;
        }
        if (!message.token || !this.pending || !Online.Battle) return;
        if (this.paidTokens.has(message.token)) { Online.Send('door_commit', { id: this.doorID, token: message.token, success: true }); return; }
        const success = this.pendingMode !== 'key' || ZRSJZ_InventoryService.ConsumeEquippedRoomCard(this.RoomCard, this.pendingPlayer);
        if (success) {
            this.paidTokens.add(message.token);
            // 已扣费后即使提交时断线，本机也保留开门成果。
            Online.OpenDoors.add(this.doorID);
            this.OpenInternal();
            if (this.pendingMode === 'key') ZRSJZ_UIManager.Instance.ShowTip(`已使用${this.RoomCard}`);
        } else ZRSJZ_UIManager.Instance.ShowTip(`${this.RoomCard}已失效`);
        Online.Send('door_commit', { id: this.doorID, token: message.token, success });
        this.pending = false;
    }

    public TryOpenWithRoomCard(playerIndex: number = 0): boolean {
        if (!this.CanOpenManually) return false;
        if (!ZRSJZ_InventoryService.HasEquippedRoomCard(this.RoomCard, playerIndex)) {
            ZRSJZ_UIManager.Instance.ShowTip(`需要在卡包中装备${this.RoomCard}`);
            return false;
        }
        if (Online.Battle) return this.RequestOnlineOpen('key', playerIndex);
        this.pending = false;
        if (!ZRSJZ_InventoryService.ConsumeEquippedRoomCard(this.RoomCard, playerIndex)) {
            ZRSJZ_UIManager.Instance.ShowTip(`${this.RoomCard}已失效`);
            return false;
        }

        this.Open();
        ZRSJZ_UIManager.Instance.ShowTip(`已使用${this.RoomCard}`);
        return true;
    }

    public Open() {
        if (!this.isValid) return;
        if (this.IsInsuranceDoor) return;
        if (this._isOpened) return;
        if (Online.Battle) { this.RequestOnlineOpen('ad'); return; }
        this.pending = false;
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
        // 通行状态立即生效，不依赖暂停/后台时可能不执行的 Spine 动画回调。
        this.Sensor.enabled = false;
        this.Collider.active = false;
        ZRSJZ_AudioManager.Instance.PlaySound("开门");
        this.Spine.setAnimation(0, this.Skin, false);
        this.Spine.setCompleteListener(() => {
            this.Sensor.enabled = false;
            this.Collider.active = false;
        });
    }


}
