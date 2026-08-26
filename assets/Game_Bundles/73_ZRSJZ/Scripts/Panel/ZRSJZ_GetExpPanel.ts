import { _decorator, find, Label, sp } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
const { ccclass } = _decorator;

/** 经验获得提示：统一排队播放，Spine 动画结束后自动关闭。 */
@ccclass('ZRSJZ_GetExpPanel')
export class ZRSJZ_GetExpPanel extends ZRSJZ_Panel {
    private static readonly _experienceQueue: number[] = [];
    private static _isShowing: boolean = false;

    private _spine: sp.Skeleton = null;
    private _experienceLabel: Label = null;
    private _isFinishing: boolean = false;
    private _hasShown: boolean = false;

    /** 所有经验提示都从这里进入，连续获得经验时不会覆盖或漏播。 */
    public static Enqueue(experience: number): void {
        const amount = Math.max(0, Math.floor(Number(experience) || 0));
        if (amount <= 0) return;
        this._experienceQueue.push(amount);
        this.ShowNext();
    }

    public Show(experience: number): void {
        this.CacheNodes();
        this._isFinishing = false;
        this._hasShown = true;
        this.node.parent = this.node.parent.parent;
        if (this._experienceLabel) {
            this._experienceLabel.string = `+${Math.max(0, Math.floor(Number(experience) || 0))}`;
        }
        super.Show(() => this.PlayAnimation());
    }

    protected onDisable(): void {
        this.unschedule(this.Finish);
        this._spine?.setCompleteListener(null);
        // UIManager 首次实例化预制体时会先设为 inactive，此时还没有真正展示。
        if (!this._hasShown) return;
        this._hasShown = false;
        if (this._isFinishing) return;

        // 面板被外部强制关闭时丢弃残留提示，避免切换场景后队列卡死。
        ZRSJZ_GetExpPanel._experienceQueue.length = 0;
        ZRSJZ_GetExpPanel._isShowing = false;
    }

    private static ShowNext(): void {
        if (this._isShowing || this._experienceQueue.length <= 0) return;
        this._isShowing = true;
        ZRSJZ_UIManager.Instance.ShowPanel(
            ZRSJZ_PANEL.涨经验弹窗,
            this._experienceQueue.shift(),
        );
    }

    private CacheNodes(): void {
        if (!this.Panel) this.Panel = find('Panel', this.node);
        this._spine = find('Panel/Spine', this.node)?.getComponent(sp.Skeleton) ?? null;
        this._experienceLabel = find('Panel/经验', this.node)?.getComponent(Label) ?? null;
    }

    private PlayAnimation(): void {
        if (!this._spine) {
            console.warn('[ZRSJZ_GetExpPanel] 未找到 Panel/Spine，经验弹窗将直接关闭');
            this.scheduleOnce(this.Finish, 0.1);
            return;
        }

        this._spine.setCompleteListener(entry => {
            if (entry?.animation?.name !== 'zhanli') return;
            this.Finish();
        });
        this._spine.setAnimation(0, 'zhanli', false);
    }

    private Finish = (): void => {
        if (this._isFinishing) return;
        this._isFinishing = true;
        this.unschedule(this.Finish);
        this._spine?.setCompleteListener(null);
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.涨经验弹窗, () => {
            ZRSJZ_GetExpPanel._isShowing = false;
            // Hide 的回调发生在节点失活之前，延迟到微任务再展示下一条。
            Promise.resolve().then(() => ZRSJZ_GetExpPanel.ShowNext());
        });
    };
}
