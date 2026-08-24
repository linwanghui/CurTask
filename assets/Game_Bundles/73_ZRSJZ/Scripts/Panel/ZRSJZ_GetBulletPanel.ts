import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, Button, EventTouch, find, Label, Node, Sprite, UITransform, v3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Inventory } from '../UI/ZRSJZ_Inventory';
import { ZRSJZ_TaskService } from "../Service/ZRSJZ_TaskService";
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GetBulletPanel')
export class ZRSJZ_GetBulletPanel extends ZRSJZ_Panel {
    private _ammoName: string = "";
    private _unitPrice: number = 0;
    private _maxCount: number = 0;
    private _count: number = 0;
    private _nameLabel: Label = null;
    private _countLabel: Label = null;
    private _priceLabel: Label = null;
    private _icon: Sprite = null;
    private _track: Node = null;
    private _fill: Sprite = null;
    private _handle: Node = null;
    private _isPurchasing: boolean = false;

    protected onLoad(): void {
        this._nameLabel = find("Panel/PropName", this.node)?.getComponent(Label) ?? null;
        this._countLabel = find("Panel/数目底/PropName", this.node)?.getComponent(Label) ?? null;
        this._priceLabel = find("Panel/PropPrice/Price", this.node)?.getComponent(Label) ?? null;
        this._icon = find("Panel/PropIcon", this.node)?.getComponent(Sprite) ?? null;
        this._track = find("Panel/数目条底", this.node);
        this._fill = find("Panel/数目条底/数目条", this.node)?.getComponent(Sprite) ?? null;
        this._handle = find("Panel/数目条底/滑块", this.node);

        this.BindButton(find("Panel/减", this.node));
        this.BindButton(find("Panel/加", this.node));
        this.BindButton(find("Mask", this.node));
        this._track?.on(Node.EventType.TOUCH_START, this.OnSliderTouch, this);
        this._track?.on(Node.EventType.TOUCH_MOVE, this.OnSliderTouch, this);
        this._track?.on(Node.EventType.TOUCH_END, this.OnSliderTouch, this);
        this._track?.on(Node.EventType.TOUCH_CANCEL, this.OnSliderTouch, this);
    }

    protected onDestroy(): void {
        this._track?.off(Node.EventType.TOUCH_START, this.OnSliderTouch, this);
        this._track?.off(Node.EventType.TOUCH_MOVE, this.OnSliderTouch, this);
        this._track?.off(Node.EventType.TOUCH_END, this.OnSliderTouch, this);
        this._track?.off(Node.EventType.TOUCH_CANCEL, this.OnSliderTouch, this);
    }

    public Show(ammoName: string): void {
        super.Show();
        const ammoData = ZRSJZ_PROP_CONFIG.get(ammoName);
        if (!ammoData || ammoData.PropType !== "弹药") {
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.购买子弹弹窗);
            return;
        }

        this._ammoName = ammoName;
        this._isPurchasing = false;
        this._unitPrice = Math.max(1, Math.floor(ammoData.UnitPrice));
        this._maxCount = Math.min(999, Math.floor(ZRSJZ_GameData.Instance.Gold / this._unitPrice));
        this._count = this._maxCount > 0 ? 1 : 0;
        if (this._nameLabel) this._nameLabel.string = ammoName;
        void ZRSJZ_UIManager.Instance.GetPropUI(ammoName).then(spriteFrame => {
            if (this.node.isValid && this._ammoName === ammoName && this._icon) {
                this._icon.spriteFrame = spriteFrame;
            }
        });
        this.RefreshDisplay();
    }

    public OnButtonClick(event: EventTouch): void {
        if (ZRSJZ_UIManager.Dragging) return;
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "减":
                this.SetCount(this._count - 1);
                break;
            case "加":
                this.SetCount(this._count + 1);
                break;
            case "购买":
                this.Purchase();
                break;
            case "Mask":
            case "关闭":
            case "Close":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.购买子弹弹窗);
                break;
        }
    }

    private BindButton(node: Node): void {
        if (!node) return;
        const button = node.getComponent(Button) ?? node.addComponent(Button);
        button.node.on(Node.EventType.TOUCH_START, this.OnButtonClick, this);
    }

    private readonly OnSliderTouch = (event: EventTouch): void => {
        if (!this._track || this._maxCount <= 0) return;
        const transform = this._track.getComponent(UITransform);
        if (!transform) return;
        const local = transform.convertToNodeSpaceAR(v3(
            event.getUILocation().x,
            event.getUILocation().y,
            0,
        ));
        const width = transform.contentSize.width;
        const progress = Math.max(0, Math.min(1, local.x / width + transform.anchorPoint.x));
        this.SetCount(Math.max(1, Math.round(progress * this._maxCount)));
        event.propagationStopped = true;
    };

    private SetCount(count: number): void {
        this._count = Math.max(0, Math.min(this._maxCount, Math.floor(count)));
        this.RefreshDisplay();
    }

    private RefreshDisplay(): void {
        const progress = this._maxCount > 0 ? this._count / this._maxCount : 0;
        if (this._countLabel) this._countLabel.string = `${this._count}/${this._maxCount}`;
        if (this._priceLabel) this._priceLabel.string = `${this._count * this._unitPrice}`;
        if (this._fill) this._fill.fillRange = progress;
        if (this._handle && this._track) {
            const width = this._track.getComponent(UITransform)?.contentSize.width ?? 0;
            this._handle.setPosition(
                (progress - 0.5) * width,
                this._handle.position.y,
                this._handle.position.z,
            );
        }
    }

    private async Purchase(): Promise<void> {
        if (this._isPurchasing) return;
        if (!this._ammoName || this._count <= 0) {
            await ZRSJZ_UIManager.Instance.ShowTip("金币不足，无法购买子弹");
            return;
        }
        const totalPrice = this._count * this._unitPrice;
        if (ZRSJZ_GameData.Instance.Gold < totalPrice) {
            await ZRSJZ_UIManager.Instance.ShowTip("金币不足");
            return;
        }

        this._isPurchasing = true;
        ZRSJZ_AccountService.ChangeGold(-totalPrice);
        const createdIDs = ZRSJZ_InventoryService.AddAmmoToWarehouse(
            this._ammoName,
            this._count,
        );
        if (createdIDs.length === 0) {
            ZRSJZ_AccountService.ChangeGold(totalPrice);
            this._isPurchasing = false;
            await ZRSJZ_UIManager.Instance.ShowTip("子弹加入仓库失败");
            return;
        }

        const warehouseNode = await ZRSJZ_UIManager.Instance.GetInventory(
            ZRSJZ_INVENTORY.仓库_全部,
        );
        await warehouseNode?.getComponent(ZRSJZ_Inventory)?.ShowPropItem();
        await ZRSJZ_UIManager.Instance.ShowTip(`成功购买${this._count}发${this._ammoName}`);
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.购买子弹弹窗);
        ZRSJZ_TaskService.CompleteTask(`在商城购买[${this._ammoName}]`, this._count);
    }
}

