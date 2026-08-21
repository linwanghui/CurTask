import { _decorator, Component, sp } from 'cc';
const { ccclass, property } = _decorator;

/** test 场景专用：Track 0 负责基础移动，Track 1 只叠加攻击动作。 */
@ccclass('NewPlayerSkeleton')
export class NewPlayerSkeleton extends Component {
    @property({ tooltip: '未移动时 Track 0 播放的动画' })
    IdleAnimation: string = 'daiji_q';

    @property({ tooltip: '实际移动时 Track 0 播放的动画' })
    MoveAnimation: string = 'zl_q';

    @property({ tooltip: '攻击时 Track 1 播放的上半身动画' })
    AttackAnimation: string = 'kq';

    private _skeleton: sp.Skeleton = null;
    private _isMoving: boolean = false;
    private _isAttacking: boolean = false;
    private _baseAnimation: string = '';

    protected onLoad(): void {
        this._skeleton = this.getComponent(sp.Skeleton);
        if (!this._skeleton) {
            console.error('[NewPlayerSkeleton] 当前节点缺少 sp.Skeleton 组件');
        }
    }

    protected start(): void {
        this.RefreshBaseAnimation(true);
    }

    protected onDisable(): void {
        this._isAttacking = false;
        this._skeleton?.clearTrack(1);
    }

    public SetMoving(isMoving: boolean): void {
        if (this._isMoving === isMoving) return;
        this._isMoving = isMoving;
        this.RefreshBaseAnimation();
    }

    public SetAttacking(isAttacking: boolean): void {
        if (!this._skeleton || this._isAttacking === isAttacking) return;
        this._isAttacking = isAttacking;

        if (isAttacking) {
            this._skeleton.setAnimation(1, this.AttackAnimation, true);
        } else {
            this._skeleton.clearTrack(1);
        }
    }

    private RefreshBaseAnimation(force: boolean = false): void {
        if (!this._skeleton) return;
        const animation = this._isMoving ? this.MoveAnimation : this.IdleAnimation;
        if (!force && this._baseAnimation === animation) return;

        this._baseAnimation = animation;
        this._skeleton.setAnimation(0, animation, true);
    }
}
