import { _decorator, Component, Node, Sprite } from 'cc';
import type { WZSJZ_Boss_LaoSai } from './WZSJZ_Boss_LaoSai';
const { ccclass } = _decorator;

@ccclass('WZSJZ_BossTenacityBar')
export class WZSJZ_BossTenacityBar extends Component {
    private _owner: WZSJZ_Boss_LaoSai = null;
    private _anchor: Node = null;
    private _progress: Sprite = null;

    public Configure(owner: WZSJZ_Boss_LaoSai, anchor: Node): void {
        this._owner = owner;
        this._anchor = anchor;
        this._progress = this.node.getChildByName("韧性条顶")?.getComponent(Sprite) || null;
        if (this._progress) {
            this._progress.type = Sprite.Type.FILLED;
            this._progress.fillType = Sprite.FillType.HORIZONTAL;
            this._progress.fillStart = 0;
        }
        this.Refresh();
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
        this.Refresh();
    }

    private Refresh(): void {
        if (this._progress && this._owner) {
            this._progress.fillRange = Math.max(
                0,
                Math.min(1, this._owner.CurrentTenacity / this._owner.MaxTenacity),
            );
        }
    }
}
