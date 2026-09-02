import { _decorator, Canvas, find, Label, Node, UITransform, Vec3 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_TutorialPanel')
export class ZRSJZ_TutorialPanel extends ZRSJZ_Panel {
    public static IsTipShowing: boolean = false;

    MaskNode: Node = null;
    TipNode: Node = null;
    TipLabel: Label = null;
    TipMaskNode: Node = null;
    TipMaskLabel: Label = null;
    NextTipNode: Node = null;

    private _trackedTarget: Node = null;
    private _trackedGuide: Node = null;
    private _trackedPadding: number = 0;
    private _resizeTrackedGuide: boolean = false;
    private _smoothTrackedGuide: boolean = false;
    private readonly _guideMoveSmoothTime: number = 0.18;

    protected onLoad(): void {
        this.Panel = find("Panel", this.node);
        this.MaskNode = find("Panel/Mask", this.node);
        this.TipNode = find("Panel/Tip", this.node);
        this.TipLabel = find("Panel/Tip/Tip/Tip", this.node).getComponent(Label);
        this.TipMaskNode = find("Panel/MaskTip", this.node);
        this.TipMaskLabel = find("Panel/MaskTip/Tip/Tip", this.node).getComponent(Label);
        this.NextTipNode = find("Panel/NextTip", this.node);
    }

    Show(type: string, target: Node, tip?: string, nextTargets?: Node[], nextTips?: string[]): void {
        this.ClearTracking();
        this.node.active = true;
        // ZRSJZ_Panel.Hide 会把 Panel 缩放到 0，复用缓存面板时必须恢复。
        this.Panel.setScale(Vec3.ONE);
        this.MaskNode.active = false;
        this.TipNode.active = false;
        if (type == "Mask") {
            this.TrackTarget(target);
        } else if (type == "Tip") {
            this.ShowTip(target, tip);
        } else if (type == "MaskTip") {
            this.NextTipNode.active = true;
            this.TipMaskNode.active = true;
            this.ShowMaskTip([target, ...nextTargets], [tip, ...nextTips]);
        }
    }

    protected lateUpdate(deltaTime: number): void {
        this.SyncTrackedGuide(deltaTime);
    }

    protected onDisable(): void {
        this.ClearTracking();
    }

    TrackTarget(target: Node) {
        if (!target?.isValid) return;
        this.MaskNode.active = true;
        this.TrackGuide(this.MaskNode, target, 0, true, true);
        target.once(Node.EventType.TOUCH_END, () => {
            this.ClearTracking();
            this.MaskNode.active = false;
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.新手引导弹窗);
            ZRSJZ_Game.Instance.GamePaused = false;
        });
    }

    ShowTip(target: Node, tip: string) {
        if (!target?.isValid) return;
        this.TipLabel.string = tip;
        this.TrackGuide(this.TipNode, target, 0, false, false);
        this.TipNode.active = true;
        target.once(Node.EventType.TOUCH_START, () => {
            this.ClearTracking();
            this.TipNode.active = false;
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.新手引导弹窗);
            ZRSJZ_TutorialPanel.IsTipShowing = false;
        })
    }

    ShowMaskTip(targets: Node[], tips: string[]) {
        if (targets.length > 0) {
            this.TrackTarget_MaskTip(targets.shift(), tips.shift(), () => {
                if (targets.length == 0) {
                    this.ClearTracking();
                    this.NextTipNode.active = false;
                    this.TipMaskNode.active = false;
                    ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL_CLOSE_COLLIDER);
                    ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.新手引导弹窗);
                } else {
                    this.ShowMaskTip([...targets], [...tips]);
                }
            })
        } else {
            this.ClearTracking();
            this.NextTipNode.active = false;
            this.TipMaskNode.active = false;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL_CLOSE_COLLIDER);
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.新手引导弹窗);
        }
    }

    TrackTarget_MaskTip(target: Node, tip: string, cb: Function) {
        if (!target?.isValid) {
            cb?.();
            return;
        }
        this.TipMaskLabel.string = tip;
        this.TrackGuide(this.TipMaskNode, target, 10, true, true);
        find("NextMask", this.TipMaskNode).once(Node.EventType.TOUCH_END, () => {
            this.ClearTracking();
            cb?.();
        });
    }

    /** 等待 Widget/Layout 完成本帧布局，并在之后每帧同步目标位置。 */
    private TrackGuide(
        guide: Node,
        target: Node,
        padding: number,
        resize: boolean,
        smoothMove: boolean,
    ): void {
        this._trackedGuide = guide;
        this._trackedTarget = target;
        this._trackedPadding = Math.max(0, padding);
        this._resizeTrackedGuide = resize;
        this._smoothTrackedGuide = smoothMove;

        this.unschedule(this.SyncTrackedGuide);
        this.scheduleOnce(this.SyncTrackedGuide, 0);
    }

    private readonly SyncTrackedGuide = (deltaTime: number = 0): void => {
        const guide = this._trackedGuide;
        const target = this._trackedTarget;
        if (
            !guide?.isValid
            || !target?.isValid
            || !guide.activeInHierarchy
            || !target.activeInHierarchy
        ) return;

        this.AlignGuideToTarget(
            guide,
            target,
            this._trackedPadding,
            this._resizeTrackedGuide,
            this._smoothTrackedGuide,
            deltaTime,
        );
    };

    /**
     * 使用目标 UI 的四个世界坐标角点计算引导范围，父节点缩放、Widget 和 Layout
     * 都会包含在结果中；跨 Canvas 时先经由两边相机转换屏幕坐标。
     */
    private AlignGuideToTarget(
        guide: Node,
        target: Node,
        padding: number,
        resize: boolean,
        smoothMove: boolean,
        deltaTime: number,
    ): void {
        const targetTransform = target.getComponent(UITransform);
        const guideTransform = guide.getComponent(UITransform);
        const guideParentTransform = guide.parent?.getComponent(UITransform);
        if (!targetTransform || !guideTransform || !guideParentTransform) return;

        const width = targetTransform.contentSize.width;
        const height = targetTransform.contentSize.height;
        const anchor = targetTransform.anchorPoint;
        const left = -width * anchor.x;
        const right = width * (1 - anchor.x);
        const bottom = -height * anchor.y;
        const top = height * (1 - anchor.y);
        const localCorners = [
            new Vec3(left, bottom, 0),
            new Vec3(right, bottom, 0),
            new Vec3(left, top, 0),
            new Vec3(right, top, 0),
        ];

        const guideCorners = localCorners.map(point => {
            const targetWorldPoint = targetTransform.convertToWorldSpaceAR(point);
            return this.ConvertTargetWorldToGuideLocal(
                target,
                targetWorldPoint,
                guideParentTransform,
            );
        });

        const minX = Math.min(...guideCorners.map(point => point.x));
        const maxX = Math.max(...guideCorners.map(point => point.x));
        const minY = Math.min(...guideCorners.map(point => point.y));
        const maxY = Math.max(...guideCorners.map(point => point.y));
        const paddedWidth = maxX - minX + padding;
        const paddedHeight = maxY - minY + padding;

        // ShowTip 只需要让提示节点的原点指向目标中心，不应受 Tip 自身锚点影响。
        if (!resize) {
            guide.setPosition(
                (minX + maxX) * 0.5,
                (minY + maxY) * 0.5,
                guide.position.z,
            );
            return;
        }

        guideTransform.setContentSize(paddedWidth, paddedHeight);
        const guideAnchor = guideTransform.anchorPoint;
        const targetX = minX - padding * 0.5 + paddedWidth * guideAnchor.x;
        const targetY = minY - padding * 0.5 + paddedHeight * guideAnchor.y;
        if (smoothMove) {
            const safeDeltaTime = Number.isFinite(deltaTime)
                ? Math.max(0, Math.min(deltaTime, 0.05))
                : 0;
            const moveRatio = 1 - Math.exp(-safeDeltaTime / this._guideMoveSmoothTime);
            const currentPosition = guide.position;
            const offsetX = targetX - currentPosition.x;
            const offsetY = targetY - currentPosition.y;
            if (offsetX * offsetX + offsetY * offsetY <= 0.25) {
                guide.setPosition(targetX, targetY, currentPosition.z);
            } else {
                guide.setPosition(
                    currentPosition.x + offsetX * moveRatio,
                    currentPosition.y + offsetY * moveRatio,
                    currentPosition.z,
                );
            }
            return;
        }

        guide.setPosition(targetX, targetY, guide.position.z);
    }

    private ConvertTargetWorldToGuideLocal(
        target: Node,
        targetWorldPoint: Vec3,
        guideParentTransform: UITransform,
    ): Vec3 {
        const sourceCamera = this.FindParentCanvas(target)?.cameraComponent;
        const guideCamera = this.FindParentCanvas(this.node)?.cameraComponent;
        let guideWorldPoint = targetWorldPoint.clone();

        if (sourceCamera && guideCamera && sourceCamera !== guideCamera) {
            const screenPoint = sourceCamera.worldToScreen(targetWorldPoint.clone());
            guideWorldPoint = guideCamera.screenToWorld(screenPoint);
        }

        return guideParentTransform.convertToNodeSpaceAR(guideWorldPoint);
    }

    private FindParentCanvas(node: Node): Canvas | null {
        let current: Node | null = node;
        while (current) {
            const canvas = current.getComponent(Canvas);
            if (canvas) return canvas;
            current = current.parent;
        }
        return null;
    }

    private ClearTracking(): void {
        this.unschedule(this.SyncTrackedGuide);
        this._trackedTarget = null;
        this._trackedGuide = null;
        this._trackedPadding = 0;
        this._resizeTrackedGuide = false;
        this._smoothTrackedGuide = false;
    }

}


