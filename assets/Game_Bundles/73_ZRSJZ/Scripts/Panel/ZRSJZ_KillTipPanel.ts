import { _decorator, director, find, Label, sp } from 'cc';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';

const { ccclass } = _decorator;

/** 连杀独立于提示动画：上次击杀后5秒内可续接，切换场景重置。 */
@ccclass('ZRSJZ_KillTipPanel')
export class ZRSJZ_KillTipPanel extends ZRSJZ_Panel {
    private static _pendingKillCount: number = 0;
    private static _activeInstance: ZRSJZ_KillTipPanel = null;
    private static _lastKillTime = 0;
    private static _streak = 0;
    private static _scene: object = null;

    private _spine: sp.Skeleton = null;
    private _countLabel: Label = null;
    private _killCount: number = 0;
    private _isFinishing: boolean = false;

    /** 敌人死亡时统一调用；预制体尚在异步加载时也不会漏掉连续击败。 */
    public static NotifyKill(): void {
        const now = Date.now();
        const scene = director.getScene();
        this._streak = scene === this._scene && now >= this._lastKillTime && now - this._lastKillTime <= 5000
            ? this._streak + 1 : 1;
        this._scene = scene;
        this._lastKillTime = now;
        this._pendingKillCount = this._streak;
        const instance = this._activeInstance;
        if (instance?.node?.isValid && instance.node.active) {
            instance.AddKill();
            return;
        }

        ZRSJZ_UIManager.Instance?.ShowPanel(ZRSJZ_PANEL.击败弹窗);
    }

    public Show(): void {
        this.CacheNodes();
        this._killCount = Math.max(1, ZRSJZ_KillTipPanel._pendingKillCount);
        ZRSJZ_KillTipPanel._pendingKillCount = 0;
        ZRSJZ_KillTipPanel._activeInstance = this;
        this._isFinishing = false;
        this.RefreshCount();
        super.Show(() => this.PlayAnimation());
    }

    protected onDisable(): void {
        this.unschedule(this.Finish);
        this._spine?.setCompleteListener(null);
        if (ZRSJZ_KillTipPanel._activeInstance === this) {
            ZRSJZ_KillTipPanel._activeInstance = null;
        }
        this._killCount = 0;
        this._isFinishing = false;
    }

    private CacheNodes(): void {
        if (!this.Panel) this.Panel = find('Panel', this.node);
        this._spine = find('Panel/Spine', this.node)?.getComponent(sp.Skeleton) ?? null;
        this._countLabel = find('Panel/Count', this.node)?.getComponent(Label) ?? null;
    }

    private AddKill(): void {
        this._isFinishing = false;
        this._killCount = ZRSJZ_KillTipPanel._streak;
        this.RefreshCount();
        this.PlayAnimation();
    }

    private RefreshCount(): void {
        if (this._countLabel) {
            this._countLabel.string = `x${this._killCount}`;
        }
    }

    private PlayAnimation(): void {
        this.unschedule(this.Finish);
        if (!this._spine?.findAnimation('tion_2')) {
            console.warn('[ZRSJZ_KillTipPanel] 未找到 Panel/Spine 的 tion_2 动画');
            this.scheduleOnce(this.Finish, 1);
            return;
        }

        this._spine.setCompleteListener(entry => {
            if (entry?.animation?.name === 'tion_2') this.Finish();
        });
        this._spine.setAnimation(0, 'tion_2', false);

        // 防止异常情况下 Spine 不派发完成回调，保证提示最终能够关闭。
        const duration = this._spine.findAnimation('tion_2')?.duration ?? 1;
        this.scheduleOnce(this.Finish, Math.max(0.1, duration + 0.1));
    }

    private Finish = (): void => {
        if (this._isFinishing) return;
        this._isFinishing = true;
        this.unschedule(this.Finish);
        this._spine?.setCompleteListener(null);
        ZRSJZ_UIManager.Instance?.HidePanel(ZRSJZ_PANEL.击败弹窗);
    };
}
