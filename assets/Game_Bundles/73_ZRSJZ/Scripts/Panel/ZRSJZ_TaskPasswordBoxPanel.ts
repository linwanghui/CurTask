import {
    _decorator,
    Button,
    EventTouch,
    find,
    instantiate,
    Label,
    Node,
    Sprite,
    UIOpacity,
    UITransform,
} from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

interface ZRSJZ_TaskPasswordRange {
    Node: Node;
    Width: number;
    IsHit: boolean;
    Checked1: Node;
    Checked2: Sprite;
    FeedbackElapsed: number;
}

@ccclass('ZRSJZ_TaskPasswordBoxPanel')
export class ZRSJZ_TaskPasswordBoxPanel extends ZRSJZ_Panel {
    @property({ displayName: "箭头移动速度", min: 1 })
    ArrowSpeed: number = 180;

    @property({ displayName: "每秒自动增加进度", min: 0.1 })
    AutoProgressPerSecond: number = 4;

    @property({ displayName: "扫描顺时针旋转速度（度/秒）", min: 1 })
    ScanRotationSpeed: number = 120;

    private static readonly RANGE_MIN_X: number = -470;
    private static readonly RANGE_MAX_X: number = 540;
    private static readonly RANGE_MIN_WIDTH: number = 50;
    private static readonly RANGE_MAX_WIDTH: number = 100;
    /** 两个判定范围可见边缘之间的最小间隔。 */
    private static readonly RANGE_MIN_GAP: number = 140;
    private static readonly ARROW_MIN_X: number = -615;
    private static readonly ARROW_MAX_X: number = 615;
    private static readonly HIT_FEEDBACK_DURATION: number = 0.3;
    private static readonly MISS_PENALTY_DURATION: number = 0.6;

    private _rangeTemplate: Node = null;
    private _arrow: Node = null;
    private _scan: Node = null;
    private _errorFlash: Node = null;
    private _errorOpacity: UIOpacity = null;
    private _progressSprite: Sprite = null;
    private _progressLabel: Label = null;
    private _unlockButton: Button = null;
    private readonly _rangeNodes: Node[] = [];
    private readonly _ranges: ZRSJZ_TaskPasswordRange[] = [];
    private _arrowDirection: number = 1;
    private _progress: number = 0;
    private _penaltyRemaining: number = 0;
    private _completionDelayRemaining: number = 0;
    private _isRunning: boolean = false;
    private _isTransitioningToGoods: boolean = false;
    private _targetBox: ZRSJZ_Box = null;
    private _playerIndex: number = 0;
    private _completeCallback: (() => void) = null;
    private _cancelCallback: (() => void) = null;

    protected onLoad(): void {
        this._rangeTemplate = find("Panel/判断范围", this.node);
        this._arrow = find("Panel/箭头", this.node);
        this._scan = find("Panel/扫描框/扫描", this.node);
        this._errorFlash = find("Panel/破译框/红", this.node);
        if (this._errorFlash) {
            this._errorFlash.active = true;
            this._errorOpacity = this._errorFlash.getComponent(UIOpacity)
                ?? this._errorFlash.addComponent(UIOpacity);
            this._errorOpacity.opacity = 0;
        }
        this._progressSprite = find("Panel/进度", this.node)?.getComponent(Sprite) ?? null;
        this._progressLabel = find("Panel/进度提示", this.node)?.getComponent(Label) ?? null;
        this._unlockButton = find("Panel/开锁", this.node)?.getComponent(Button) ?? null;

        this._unlockButton?.node.on(Button.EventType.CLICK, this.OnUnlockButton, this);
        find("Panel/关闭", this.node)?.on(Node.EventType.TOUCH_END, this.Close, this);
        find("Mask", this.node)?.on(Node.EventType.TOUCH_END, this.Close, this);
    }

    protected onDisable(): void {
        this._isRunning = false;
        this.ResetFeedbackState();
        if (!this._isTransitioningToGoods) {
            this._targetBox?.EndSearch(this._playerIndex);
            const cancelCallback = this._cancelCallback;
            this._cancelCallback = null;
            cancelCallback?.();
        }
    }

    protected update(deltaTime: number): void {
        if (!this.node.activeInHierarchy) return;
        if (this._scan?.isValid) {
            this._scan.angle = (
                this._scan.angle - this.ScanRotationSpeed * Math.max(0, deltaTime)
            ) % 360;
        }
        if (!this._isRunning) return;
        this.UpdateRangeFeedback(deltaTime);
        if (this._completionDelayRemaining > 0) {
            this._completionDelayRemaining = Math.max(
                0,
                this._completionDelayRemaining - Math.max(0, deltaTime),
            );
            if (this._completionDelayRemaining <= 0) this.OpenUnlockedBox();
            return;
        }
        if (this._penaltyRemaining > 0) {
            this._penaltyRemaining = Math.max(
                0,
                this._penaltyRemaining - Math.max(0, deltaTime),
            );
            if (this._errorOpacity?.isValid) {
                const progress = 1 - this._penaltyRemaining
                    / ZRSJZ_TaskPasswordBoxPanel.MISS_PENALTY_DURATION;
                // 在整段失败惩罚时间内形成两个完整的透明度脉冲。
                const pulse = Math.sin(progress * Math.PI * 2);
                this._errorOpacity.opacity = Math.round(pulse * pulse * 255);
            }
            if (this._penaltyRemaining <= 0) {
                if (this._errorOpacity?.isValid) this._errorOpacity.opacity = 0;
                if (this._unlockButton) this._unlockButton.interactable = true;
            }
            return;
        }
        this.MoveArrow(deltaTime);
        this.SetProgress(this._progress + this.AutoProgressPerSecond * Math.max(0, deltaTime));
    }

    public Show(...args: any[]): void {
        this._targetBox = args[0] instanceof ZRSJZ_Box ? args[0] : null;
        this._playerIndex = this.PlayerIndex >= 0
            ? (this.PlayerIndex === 1 ? 1 : 0)
            : (args[1] === 1 ? 1 : 0);
        const callbacks = args.filter(arg => typeof arg === "function") as Array<() => void>;
        this._completeCallback = callbacks[0] ?? null;
        this._cancelCallback = callbacks[1] ?? null;
        this._isTransitioningToGoods = false;
        if (this._targetBox && !this._targetBox.TryBeginSearch(this._playerIndex)) {
            ZRSJZ_UIManager.Instance.ShowTip("另一名玩家正在搜索该箱子");
            ZRSJZ_UIManager.Instance.HidePlayerPanel(
                ZRSJZ_PANEL.破壁行动密码弹窗,
                this._playerIndex,
            );
            return;
        }
        super.Show();
        this.StartNewRound();
    }

    /** 兼容编辑器 Button 事件和脚本动态注册事件。 */
    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget()?.name) {
            case "开锁":
                this.TryHitRange();
                break;
            case "关闭":
            case "Mask":
                this.Close();
                break;
        }
    }

    private OnUnlockButton(): void {
        this.TryHitRange();
    }

    private StartNewRound(): void {
        this._isRunning = true;
        this.ResetFeedbackState();
        if (this._unlockButton) {
            this._unlockButton.enabled = true;
            this._unlockButton.interactable = true;
        }
        this._arrowDirection = 1;
        if (this._arrow) {
            this._arrow.setPosition(
                ZRSJZ_TaskPasswordBoxPanel.ARROW_MIN_X,
                this._arrow.position.y,
                this._arrow.position.z,
            );
        }
        this.GenerateRanges();
        this.SetProgress(0);
    }

    private GenerateRanges(): void {
        if (!this._rangeTemplate?.isValid) {
            console.error("[ZRSJZ_TaskPasswordBoxPanel] 找不到 Panel/判断范围 节点");
            return;
        }

        const parent = this._rangeTemplate.parent;
        if (!parent) {
            console.error("[ZRSJZ_TaskPasswordBoxPanel] 判断范围节点没有父节点");
            return;
        }

        // 只保留预制体中的“判断范围”作为模板。每轮都从模板动态生成额外2～3个节点，
        // 避免编辑器中残留的复制节点或上一轮节点参与本轮判定。
        for (const child of [...parent.children]) {
            if (child === this._rangeTemplate || !child.name.startsWith("判断范围")) continue;
            child.active = false;
            child.removeFromParent();
            child.destroy();
        }
        this._rangeNodes.length = 0;
        this._ranges.length = 0;

        const additionalCount = Math.random() < 0.5 ? 2 : 3;
        const count = 1 + additionalCount;
        const layouts = this.CreateRandomRangeLayouts(count);
        const templateSprite = this._rangeTemplate.getComponent(Sprite);
        if (templateSprite) templateSprite.enabled = true;
        const templateMask = this._rangeTemplate.getChildByName("Mask");
        if (templateMask) templateMask.active = true;

        for (let index = 0; index < count; index++) {
            const rangeNode = index === 0
                ? this._rangeTemplate
                : instantiate(this._rangeTemplate);
            if (index > 0) {
                rangeNode.name = `判断范围_${index + 1}`;
                parent.addChild(rangeNode);
                rangeNode.setSiblingIndex(this._rangeTemplate.getSiblingIndex() + index);
            }

            const layout = layouts[index];
            const transform = rangeNode.getComponent(UITransform);
            if (transform) transform.setContentSize(layout.Width, transform.contentSize.height);
            rangeNode.setPosition(layout.X, this._rangeTemplate.position.y, this._rangeTemplate.position.z);
            rangeNode.active = true;
            const sprite = rangeNode.getComponent(Sprite);
            if (sprite) sprite.enabled = true;
            const mask = rangeNode.getChildByName("Mask");
            if (mask) mask.active = true;
            const checked1 = rangeNode.getChildByName("Checked1");
            if (checked1) checked1.active = false;
            const checked2Node = rangeNode.getChildByName("Checked2");
            const checked2 = checked2Node?.getComponent(Sprite) ?? null;
            if (checked2Node) checked2Node.active = false;
            if (checked2) checked2.fillRange = 0;
            this._rangeNodes.push(rangeNode);
            this._ranges.push({
                Node: rangeNode,
                Width: layout.Width,
                IsHit: false,
                Checked1: checked1,
                Checked2: checked2,
                FeedbackElapsed: 0,
            });
        }
        if (this._ranges.length !== count) {
            console.error(`[ZRSJZ_TaskPasswordBoxPanel] 判定范围生成失败: ${this._ranges.length}/${count}`);
        }
    }

    private CreateRandomRangeLayouts(count: number): Array<{ X: number, Width: number }> {
        const minX = ZRSJZ_TaskPasswordBoxPanel.RANGE_MIN_X;
        const maxX = ZRSJZ_TaskPasswordBoxPanel.RANGE_MAX_X;
        const minGap = ZRSJZ_TaskPasswordBoxPanel.RANGE_MIN_GAP;

        for (let round = 0; round < 500; round++) {
            const layouts: Array<{ X: number, Width: number }> = [];
            for (let index = 0; index < count; index++) {
                const width = ZRSJZ_TaskPasswordBoxPanel.RANGE_MIN_WIDTH
                    + Math.random() * (
                        ZRSJZ_TaskPasswordBoxPanel.RANGE_MAX_WIDTH
                        - ZRSJZ_TaskPasswordBoxPanel.RANGE_MIN_WIDTH
                    );
                const x = minX + Math.random() * (maxX - minX);
                const canPlace = layouts.every(other =>
                    Math.abs(x - other.X) >= minGap + (width + other.Width) * 0.5,
                );
                if (!canPlace) break;
                layouts.push({ X: x, Width: width });
            }
            if (layouts.length === count) {
                return layouts.sort((a, b) => a.X - b.X);
            }
        }

        // 极低概率下随机多轮仍失败时均匀摆放，仍满足宽度、坐标和间隔要求。
        const step = count > 1 ? (maxX - minX) / (count - 1) : 0;
        return Array.from({ length: count }, (_, index) => ({
            X: minX + step * index,
            Width: ZRSJZ_TaskPasswordBoxPanel.RANGE_MIN_WIDTH
                + Math.random() * (
                    ZRSJZ_TaskPasswordBoxPanel.RANGE_MAX_WIDTH
                    - ZRSJZ_TaskPasswordBoxPanel.RANGE_MIN_WIDTH
                ),
        }));
    }

    private MoveArrow(deltaTime: number): void {
        if (!this._arrow) return;
        let x = this._arrow.position.x
            + this._arrowDirection * this.ArrowSpeed * Math.max(0, deltaTime);
        if (x >= ZRSJZ_TaskPasswordBoxPanel.ARROW_MAX_X) {
            x = ZRSJZ_TaskPasswordBoxPanel.ARROW_MAX_X;
            this._arrowDirection = -1;
        } else if (x <= ZRSJZ_TaskPasswordBoxPanel.ARROW_MIN_X) {
            x = ZRSJZ_TaskPasswordBoxPanel.ARROW_MIN_X;
            this._arrowDirection = 1;
        }
        this._arrow.setPosition(x, this._arrow.position.y, this._arrow.position.z);
    }

    private TryHitRange(): void {
        if (
            !this._isRunning
            || !this._arrow
            || this._penaltyRemaining > 0
            || this._completionDelayRemaining > 0
        ) return;
        ZRSJZ_AudioManager.Instance?.PlaySound("点击");
        const arrowWorldX = this._arrow.worldPosition.x;
        const target = this._ranges.find(range =>
            !range.IsHit
            && (() => {
                const bounds = range.Node.getComponent(UITransform)?.getBoundingBoxToWorld();
                return !!bounds && arrowWorldX >= bounds.xMin && arrowWorldX <= bounds.xMax;
            })(),
        );
        if (!target) {
            ZRSJZ_AudioManager.Instance?.PlaySound("SafeBoxF");
            this.StartMissPenalty();
            return;
        }

        ZRSJZ_AudioManager.Instance?.PlaySound("SafeBoxT");
        target.IsHit = true;
        const sprite = target.Node.getComponent(Sprite);
        if (sprite) sprite.enabled = false;
        const mask = target.Node.getChildByName("Mask");
        if (mask) mask.active = false;
        target.FeedbackElapsed = 0;
        if (target.Checked1?.isValid) target.Checked1.active = true;
        if (target.Checked2?.node?.isValid) {
            target.Checked2.node.active = true;
            target.Checked2.fillRange = 0;
        }

        const completedCount = this._ranges.filter(range => range.IsHit).length;
        // 每次有效命中都在当前值上增加一大段；不点击时仍由 update 缓慢增长。
        this.SetProgress(this._progress + 100 / this._ranges.length, false);
        if (completedCount === this._ranges.length || this._progress >= 100) {
            this._completionDelayRemaining = ZRSJZ_TaskPasswordBoxPanel.HIT_FEEDBACK_DURATION;
            if (this._unlockButton) this._unlockButton.interactable = false;
        }
    }

    private SetProgress(progress: number, openWhenFull: boolean = true): void {
        if (!this._isRunning) return;
        this._progress = Math.max(0, Math.min(100, progress));
        if (this._progressSprite) this._progressSprite.fillRange = this._progress / 100;
        if (this._progressLabel) {
            this._progressLabel.string = `[  ${Math.floor(this._progress)}%  ]`;
        }
        if (openWhenFull && this._progress >= 100) this.OpenUnlockedBox();
    }

    private StartMissPenalty(): void {
        this._penaltyRemaining = ZRSJZ_TaskPasswordBoxPanel.MISS_PENALTY_DURATION;
        if (this._errorOpacity?.isValid) this._errorOpacity.opacity = 0;
        if (this._unlockButton) this._unlockButton.interactable = false;
    }

    private UpdateRangeFeedback(deltaTime: number): void {
        const duration = ZRSJZ_TaskPasswordBoxPanel.HIT_FEEDBACK_DURATION;
        const elapsed = Math.max(0, deltaTime);
        for (const range of this._ranges) {
            if (!range.Checked2?.node?.active) continue;
            range.FeedbackElapsed = Math.min(duration, range.FeedbackElapsed + elapsed);
            if (range.Checked2?.node?.isValid) {
                const progress = range.FeedbackElapsed / duration;
                // 缓出效果：开始快速填充，接近完成时逐渐减速。
                range.Checked2.fillRange = 1 - Math.pow(1 - progress, 3);
            }
            if (range.FeedbackElapsed < duration) continue;
            if (range.Checked1?.isValid) range.Checked1.active = false;
            if (range.Checked2?.node?.isValid) range.Checked2.node.active = false;
        }
    }

    private ResetFeedbackState(): void {
        this._penaltyRemaining = 0;
        this._completionDelayRemaining = 0;
        if (this._errorOpacity?.isValid) this._errorOpacity.opacity = 0;
        for (const range of this._ranges) {
            range.FeedbackElapsed = 0;
            if (range.Checked1?.isValid) range.Checked1.active = false;
            if (range.Checked2?.node?.isValid) {
                range.Checked2.fillRange = 0;
                range.Checked2.node.active = false;
            }
        }
    }

    private OpenUnlockedBox(): void {
        if (!this._isRunning) return;
        this._isRunning = false;
        this._progress = 100;
        if (this._progressSprite) this._progressSprite.fillRange = 1;
        if (this._progressLabel) this._progressLabel.string = "[  100%  ]";
        const box = this._targetBox;
        if (!box?.node?.isValid) {
            const completeCallback = this._completeCallback;
            this._completeCallback = null;
            this._cancelCallback = null;
            this._isTransitioningToGoods = true;
            ZRSJZ_UIManager.Instance.HidePlayerPanel(
                ZRSJZ_PANEL.破壁行动密码弹窗,
                this._playerIndex,
                () => {
                    completeCallback?.();
                    this._isTransitioningToGoods = false;
                },
            );
            return;
        }

        this._completeCallback?.();
        this._completeCallback = null;
        this._cancelCallback = null;
        box.UnlockPassword();
        this._isTransitioningToGoods = true;
        ZRSJZ_UIManager.Instance.HidePlayerPanel(
            ZRSJZ_PANEL.破壁行动密码弹窗,
            this._playerIndex,
            () => {
                ZRSJZ_UIManager.Instance.ShowPlayerPanel(
                    ZRSJZ_PANEL.物资弹窗,
                    this._playerIndex,
                    box,
                    this._playerIndex,
                );
                Promise.resolve().then(() => {
                    this._isTransitioningToGoods = false;
                });
            },
        );
    }

    private Close(endSearch: boolean = true): void {
        this._isRunning = false;
        this._isTransitioningToGoods = false;
        if (endSearch) this._targetBox?.EndSearch(this._playerIndex);
        const cancelCallback = endSearch ? this._cancelCallback : null;
        this._targetBox = null;
        this._completeCallback = null;
        this._cancelCallback = null;
        cancelCallback?.();
        ZRSJZ_UIManager.Instance.HidePlayerPanel(
            ZRSJZ_PANEL.破壁行动密码弹窗,
            this._playerIndex,
        );
    }
}
