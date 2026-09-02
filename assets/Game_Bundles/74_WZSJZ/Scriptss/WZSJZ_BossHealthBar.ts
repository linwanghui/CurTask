import { _decorator, Component, Label, Node, Sprite, tween, Tween } from 'cc';
import type { WZSJZ_Boss } from './WZSJZ_Boss';
import { WZSJZ_Constant } from './WZSJZ_Constant';
const { ccclass } = _decorator;

@ccclass('WZSJZ_BossHealthBar')
export class WZSJZ_BossHealthBar extends Component {
    private _owner: WZSJZ_Boss = null;
    private _anchor: Node = null;
    private _progress: Sprite = null;
    private _targetRatio: number = -1;
    private _levelLabel: Label = null;
    private _displayedLevel: number = -1;

    public Configure(owner: WZSJZ_Boss, anchor: Node): void {
        this._owner = owner;
        this._anchor = anchor;
        this._progress = this.node.getChildByName("血条顶")?.getComponent(Sprite) || null;
        const levelNode = this.node.getChildByName("等级");
        this._levelLabel = levelNode?.getComponent(Label)
            || levelNode?.getComponentInChildren(Label)
            || null;
        if (this._progress) {
            this._progress.type = Sprite.Type.FILLED;
            this._progress.fillType = Sprite.FillType.HORIZONTAL;
            this._progress.fillStart = 0;
        }
        this._targetRatio = -1;
        this._displayedLevel = -1;
        this.RefreshLevel();
        this.Refresh(true);
    }

    protected lateUpdate(): void {
        if (!this._owner || !this._anchor) {
            return;
        }
        if (!this._owner?.node?.isValid || !this._owner.node.activeInHierarchy
            || !this._anchor?.isValid) {
            this.node.destroy();
            return;
        }
        this.node.setWorldPosition(this._anchor.worldPosition);
        this.RefreshLevel();
        this.Refresh(false);
    }

    private RefreshLevel(): void {
        if (!this._levelLabel || !this._owner) return;
        const level = Math.max(1, Math.floor(this._owner.BossLevel || 1));
        if (level === this._displayedLevel) return;
        this._displayedLevel = level;
        this._levelLabel.string = `LV.${level}`;
    }

    private Refresh(immediately: boolean): void {
        if (!this._progress || !this._owner) {
            return;
        }
        const ratio = Math.max(
            0,
            Math.min(1, this._owner.CurrentHealth / this._owner.MaxHealth),
        );
        if (Math.abs(ratio - this._targetRatio) <= 0.0001) {
            return;
        }
        this._targetRatio = ratio;
        Tween.stopAllByTarget(this._progress);
        if (immediately) {
            this._progress.fillRange = ratio;
            return;
        }
        tween(this._progress)
            .to(WZSJZ_Constant.BossCommon.StatusBarTweenDuration, {
                fillRange: ratio,
            }, { easing: "quadOut" })
            .start();
    }

    protected onDisable(): void {
        if (this._progress) {
            Tween.stopAllByTarget(this._progress);
        }
    }
}
