import {
    _decorator,
    Button,
    Color,
    EventTouch,
    find,
    Label,
    Layout,
    Node,
    Sprite,
    tween,
    Tween,
    v3,
} from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_PasswordBoxPanel')
export class ZRSJZ_PasswordBoxPanel extends ZRSJZ_Panel {
    @property({ displayName: '字母滚动速度', min: 50 })
    RollSpeed: number = 260;

    @property({ displayName: '锁定错误停顿时间', min: 0.1 })
    WrongPauseDuration: number = 0.7;

    @property({ displayName: '成功锁定动画时间', min: 0.1 })
    SuccessLockDuration: number = 0.36;

    private static readonly PASSWORD: string = "LWKJA";
    private static readonly LETTERS: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static readonly CORRECT_COLOR: Color = new Color(80, 255, 100, 255);
    private static readonly NORMAL_COLOR: Color = new Color(255, 255, 255, 255);
    private static readonly WRONG_COLOR: Color = new Color(255, 90, 90, 255);
    private static readonly CURRENT_LOCK_COLOR: Color = new Color(255, 220, 80, 255);
    /** 每列使用不同速度倍率，避免五列保持同步滚动。 */
    private static readonly COLUMN_SPEED_RATIOS: readonly number[] = [0.82, 0.94, 1.06, 1.18, 1.30];

    private readonly _columns: Node[] = [];
    private readonly _lockSprites: Sprite[] = [];
    private readonly _successLockNodes: Node[] = [];
    private readonly _correctRows: number[] = [];
    private readonly _rolling: boolean[] = [];
    private readonly _rowSteps: number[] = [];
    private readonly _wheelSpans: number[] = [];
    private _lockButton: Button = null;
    private _targetBox: ZRSJZ_Box = null;
    private _currentColumn: number = 0;
    private _isLockCoolingDown: boolean = false;
    private _roundSerial: number = 0;
    private _isInit: boolean = false;
    private _playerIndex: number = 0;
    private _isTransitioningToGoods: boolean = false;

    protected onLoad(): void {
        this.InitView();
        find("Panel/关闭", this.node)?.on(Node.EventType.TOUCH_END, this.Close, this);
    }

    protected onEnable(): void {
        // ZRSJZ_AudioManager.Instance.PlayCyclicSound("SafeBoxBG");
    }

    protected onDisable(): void {
        if (!this._isTransitioningToGoods) {
            this._targetBox?.EndSearch(this._playerIndex);
        }
        // ZRSJZ_AudioManager.Instance.StopCyclicSound("SafeBoxBG");
    }

    protected update(deltaTime: number): void {
        if (!this.node.activeInHierarchy) return;

        for (let index = 0; index < this._columns.length; index++) {
            if (!this._rolling[index]) continue;
            this.RollColumn(this._columns[index], deltaTime);
        }
    }

    Show(...args: any[]): void {
        this._targetBox = args[0] instanceof ZRSJZ_Box ? args[0] : null;
        this._playerIndex = args[1] === 1 ? 1 : 0;
        this._isTransitioningToGoods = false;
        if (!this._targetBox) return;

        // ZRSJZ_Panel.Hide 会暂时关闭 Panel/Mask，而这里的 Mask 同时是字母轮盘的裁剪区。
        find("Panel/Mask", this.node).active = true;
        super.Show();
        this.InitView();
        this.StartNewRound();
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "确定":
                this.TryLockCurrentColumn();
                break;
            case "关闭":
            case "Mask":
                this.Close();
                break;
        }
    }

    private InitView(): void {
        if (this._isInit) return;
        const layoutNode = find("Panel/Mask/Layout", this.node);
        const lockRoot = find("Panel/锁定", this.node);
        if (!layoutNode || !lockRoot) return;

        // Layout 只保留编辑器中的初始位置，运行时由脚本移动每一列。
        layoutNode.getComponent(Layout).enabled = false;
        lockRoot.getComponent(Layout).enabled = false;
        this._lockButton = find("Panel/确定", this.node)?.getComponent(Button);

        for (let index = 0; index < ZRSJZ_PasswordBoxPanel.PASSWORD.length; index++) {
            const column = layoutNode.getChildByName(`Col_${index}`);
            const lockSprite = lockRoot.getChildByName(`锁定_${index}`)?.getComponent(Sprite);
            if (!column || !lockSprite) continue;
            column.getComponent(Layout).enabled = false;
            this._columns.push(column);
            this._lockSprites.push(lockSprite);
            this._successLockNodes.push(lockSprite.node.getChildByName("成功锁定"));
            this._correctRows.push(-1);
            this._rolling.push(true);
            const rowStep = column.children.length > 1
                ? Math.abs(column.children[1].position.y - column.children[0].position.y)
                : 100;
            this._rowSteps.push(rowStep);
            this._wheelSpans.push(rowStep * column.children.length);
        }
        this._isInit = this._columns.length === ZRSJZ_PasswordBoxPanel.PASSWORD.length;
    }

    private StartNewRound(): void {
        this._roundSerial++;
        this._currentColumn = 0;
        this._isLockCoolingDown = false;
        if (this._lockButton) this._lockButton.interactable = true;

        for (const successNode of this._successLockNodes) {
            if (!successNode) continue;
            Tween.stopAllByTarget(successNode);
            successNode.active = false;
            successNode.setScale(1, 1, 1);
        }

        for (let columnIndex = 0; columnIndex < this._columns.length; columnIndex++) {
            const column = this._columns[columnIndex];
            const answer = ZRSJZ_PasswordBoxPanel.PASSWORD[columnIndex];
            const correctRow = Math.floor(Math.random() * column.children.length);
            const choices = this.RandomLetters(column.children.length - 1, answer);
            this._correctRows[columnIndex] = correctRow;
            this._rolling[columnIndex] = true;

            let randomIndex = 0;
            for (let row = 0; row < column.children.length; row++) {
                const label = column.children[row].getComponent(Label);
                const isCorrect = row === correctRow;
                label.string = isCorrect ? answer : choices[randomIndex++];
                // 正确密码字母始终使用绿色，玩家需要在它经过中心时锁定。
                label.color = isCorrect
                    ? ZRSJZ_PasswordBoxPanel.CORRECT_COLOR
                    : ZRSJZ_PasswordBoxPanel.NORMAL_COLOR;
            }

            const startRow = Math.floor(Math.random() * column.children.length);
            column.setPosition(column.position.x, 0, column.position.z);
            this.ResetColumnPositions(columnIndex, startRow);
            this.RefreshLockSprite(columnIndex);
        }
    }

    private RandomLetters(count: number, excluded: string): string[] {
        const candidates = ZRSJZ_PasswordBoxPanel.LETTERS
            .split("")
            .filter(letter => letter !== excluded);
        for (let index = candidates.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
        }
        return candidates.slice(0, count);
    }

    private RollColumn(column: Node, deltaTime: number): void {
        const columnIndex = this._columns.indexOf(column);
        if (columnIndex < 0) return;
        const speedRatio = ZRSJZ_PasswordBoxPanel.COLUMN_SPEED_RATIOS[columnIndex] ?? 1;
        const offset = this.RollSpeed * speedRatio * deltaTime;
        const span = this._wheelSpans[columnIndex];
        const halfSpan = span * 0.5;

        // 单个字符越过下边界时立即放到最上方，列节点本身不跳变。
        // 所有字符之间始终相差一个 rowStep，从而形成无限连续滚动。
        for (const item of column.children) {
            const nextY = this.WrapRowPosition(item.position.y - offset, halfSpan, span);
            item.setPosition(item.position.x, nextY, item.position.z);
        }
    }

    private ResetColumnPositions(columnIndex: number, centeredRow: number): void {
        const column = this._columns[columnIndex];
        const step = this._rowSteps[columnIndex];
        const span = this._wheelSpans[columnIndex];
        const halfSpan = span * 0.5;
        const firstRowY = (column.children.length - 1) * step * 0.5;
        const centeredBaseY = firstRowY - centeredRow * step;

        for (let row = 0; row < column.children.length; row++) {
            const baseY = firstRowY - row * step;
            const y = this.WrapRowPosition(baseY - centeredBaseY, halfSpan, span);
            const item = column.children[row];
            item.setPosition(item.position.x, y, item.position.z);
        }
    }

    private WrapRowPosition(value: number, halfSpan: number, span: number): number {
        while (value >= halfSpan) value -= span;
        while (value < -halfSpan) value += span;
        return value;
    }

    private GetCenteredRow(column: Node): number {
        let nearestRow = 0;
        let nearestDistance = Number.MAX_VALUE;
        for (let row = 0; row < column.children.length; row++) {
            const distance = Math.abs(column.children[row].position.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestRow = row;
            }
        }
        return nearestRow;
    }

    private SnapToRow(columnIndex: number, row: number): void {
        const column = this._columns[columnIndex];
        const item = column?.children[row];
        if (!item) return;
        const span = this._wheelSpans[columnIndex];
        const halfSpan = span * 0.5;
        const offset = -item.position.y;
        for (const child of column.children) {
            const y = this.WrapRowPosition(child.position.y + offset, halfSpan, span);
            child.setPosition(child.position.x, y, child.position.z);
        }
    }

    private TryLockCurrentColumn(): void {
        if (
            this._isLockCoolingDown
            || !this._targetBox
            || this._currentColumn >= this._columns.length
        ) return;

        const columnIndex = this._currentColumn;
        const centeredRow = this.GetCenteredRow(this._columns[columnIndex]);
        this._rolling[columnIndex] = false;
        this.SnapToRow(columnIndex, centeredRow);

        if (centeredRow !== this._correctRows[columnIndex]) {
            ZRSJZ_AudioManager.Instance.PlaySound("SafeBoxF");
            this.PlayWrongPause(columnIndex, centeredRow);
            return;
        }

        this.PlaySuccessLock(columnIndex);
        ZRSJZ_AudioManager.Instance.PlaySound("SafeBoxT");
        // 只有前一列成功后 currentColumn 才会前进，从而保证按顺序锁定。
        this._currentColumn++;
        this.RefreshAllLockSprites();
        if (this._currentColumn < this._columns.length) {
            return;
        }

        if (this._lockButton) this._lockButton.interactable = false;
        const serial = this._roundSerial;
        this.scheduleOnce(() => {
            if (serial === this._roundSerial && this.node.activeInHierarchy) {
                this.OpenUnlockedBox();
            }
        }, this.SuccessLockDuration);
    }

    private PlayWrongPause(columnIndex: number, row: number): void {
        this._isLockCoolingDown = true;
        if (this._lockButton) this._lockButton.interactable = false;
        const wrongLabel = this._columns[columnIndex].children[row].getComponent(Label);
        wrongLabel.color = ZRSJZ_PasswordBoxPanel.WRONG_COLOR;
        const serial = this._roundSerial;

        this.scheduleOnce(() => {
            if (serial !== this._roundSerial || !this.node.activeInHierarchy) return;
            wrongLabel.color = row === this._correctRows[columnIndex]
                ? ZRSJZ_PasswordBoxPanel.CORRECT_COLOR
                : ZRSJZ_PasswordBoxPanel.NORMAL_COLOR;
            this._rolling[columnIndex] = true;
            this._isLockCoolingDown = false;
            if (this._lockButton) this._lockButton.interactable = true;
        }, this.WrongPauseDuration);
    }

    private RefreshAllLockSprites(): void {
        for (let index = 0; index < this._lockSprites.length; index++) {
            this.RefreshLockSprite(index);
        }
    }

    private RefreshLockSprite(index: number): void {
        const sprite = this._lockSprites[index];
        if (!sprite) return;
        const isCompleted = index < this._currentColumn;
        const isCurrent = index === this._currentColumn;
        const successNode = this._successLockNodes[index];

        // 锁定底图只允许当前正在操作的列显示。
        sprite.enabled = isCurrent;
        sprite.color = ZRSJZ_PasswordBoxPanel.CURRENT_LOCK_COLOR;
        if (successNode) successNode.active = isCompleted;
    }

    private PlaySuccessLock(index: number): void {
        const successNode = this._successLockNodes[index];
        if (!successNode) return;

        Tween.stopAllByTarget(successNode);
        successNode.active = true;
        successNode.setScale(0.25, 0.25, 1);
        const expandDuration = this.SuccessLockDuration * 0.65;
        const settleDuration = this.SuccessLockDuration - expandDuration;
        tween(successNode)
            .to(expandDuration, { scale: v3(1.25, 1.25, 1) }, { easing: 'backOut' })
            .to(settleDuration, { scale: v3(1, 1, 1) }, { easing: 'sineOut' })
            .start();
    }

    private OpenUnlockedBox(): void {
        const box = this._targetBox;
        box.UnlockPassword();
        this._isTransitioningToGoods = true;
        ZRSJZ_UIManager.Instance.HidePlayerPanel(ZRSJZ_PANEL.密码箱弹窗, this._playerIndex, () => {
            ZRSJZ_UIManager.Instance.ShowPlayerPanel(
                ZRSJZ_PANEL.物资弹窗,
                this._playerIndex,
                box,
                this._playerIndex,
            );
            Promise.resolve().then(() => {
                this._isTransitioningToGoods = false;
            });
        });
    }

    private Close(): void {
        this._roundSerial++;
        this._isTransitioningToGoods = false;
        this._rolling.fill(false);
        this._successLockNodes.forEach(node => node && Tween.stopAllByTarget(node));
        this._targetBox?.EndSearch(this._playerIndex);
        this._targetBox = null;
        ZRSJZ_UIManager.Instance.HidePlayerPanel(ZRSJZ_PANEL.密码箱弹窗, this._playerIndex);
    }
}
