import { _decorator, EventTouch, find, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_Player } from '../Controller/ZRSJZ_Player';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MapPanel')
export class ZRSJZ_MapPanel extends ZRSJZ_Panel {

    Icon: Sprite = null;
    AllMap: Node = null;
    CurMap: Node = null;
    CurPoint: Node = null;
    private _pointWorldPosition: Vec3 = new Vec3();
    private _pointParentPosition: Vec3 = new Vec3();

    protected onLoad(): void {
        this.Icon = find("Panel/我的位置/Icon", this.node)?.getComponent(Sprite) ?? null;
        this.AllMap = find("Panel/Map", this.node);
        this.CurPoint = find("Panel/我的位置", this.node);
    }

    public Show(...args: any[]): void {
        super.Show();
        if (!this.AllMap || this.AllMap.children.length === 0) {
            console.warn("[ZRSJZ_MapPanel] 地图弹窗中没有可显示的地图节点");
            return;
        }

        this.AllMap.children.forEach(map => map.active = false);
        const requestedMapIndex = Number(args[0] ?? 0);
        const mapIndex = Number.isFinite(requestedMapIndex)
            ? Math.max(0, Math.min(this.AllMap.children.length - 1, Math.floor(requestedMapIndex)))
            : 0;
        this.CurMap = this.AllMap.children[mapIndex];
        this.CurMap.active = true;

        const iconArgument = args[1];
        if (this.Icon && iconArgument instanceof SpriteFrame) {
            this.Icon.spriteFrame = iconArgument;
        }

        this.RefreshPlayerPoint();
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "关闭":
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.地图弹窗);
                break;
        }
    }

    /** 根据玩家的游戏世界坐标更新地图弹窗中的位置标记。 */
    public ShowPoint(x: number, y: number): void {
        if (!this.CurMap || !this.CurPoint) {
            return;
        }

        const gameMap = ZRSJZ_Game.Instance?.CurMap?.Map;
        const worldMapTransform = gameMap?.getComponent(UITransform);
        const popupMapTransform = this.CurMap.getComponent(UITransform);
        const pointParentTransform = this.CurPoint.parent?.getComponent(UITransform);
        if (!worldMapTransform || !popupMapTransform || !pointParentTransform) {
            this.CurPoint.active = false;
            return;
        }

        const worldBounds = worldMapTransform.getBoundingBoxToWorld();
        if (worldBounds.width <= 0 || worldBounds.height <= 0) {
            this.CurPoint.active = false;
            return;
        }

        const normalizedX = Math.max(0, Math.min(1, (x - worldBounds.xMin) / worldBounds.width));
        const normalizedY = Math.max(0, Math.min(1, (y - worldBounds.yMin) / worldBounds.height));
        const mapSize = popupMapTransform.contentSize;
        const mapAnchor = popupMapTransform.anchorPoint;
        this._pointParentPosition.set(
            (normalizedX - mapAnchor.x) * mapSize.width,
            (normalizedY - mapAnchor.y) * mapSize.height,
            0,
        );

        popupMapTransform.convertToWorldSpaceAR(
            this._pointParentPosition,
            this._pointWorldPosition,
        );
        pointParentTransform.convertToNodeSpaceAR(
            this._pointWorldPosition,
            this._pointParentPosition,
        );
        this.CurPoint.setPosition(this._pointParentPosition);
        this.CurPoint.active = true;
    }

    /** 只在弹窗打开时调用一次，弹窗保持打开期间不继续更新。 */
    private RefreshPlayerPoint(): void {
        const player = ZRSJZ_Game.Instance?.CurMap?.Unit
            ?.getComponentsInChildren(ZRSJZ_Player)
            .find(component => component.node.activeInHierarchy);
        if (!player) {
            if (this.CurPoint) {
                this.CurPoint.active = false;
            }
            return;
        }

        this.ShowPoint(player.node.worldPosition.x, player.node.worldPosition.y);
    }
}


