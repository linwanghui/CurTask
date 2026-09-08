import { _decorator, director, isValid, Label, Sprite } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_NativeSpineGuard } from '../WZSJZ_NativeSpineGuard';
import { WZSJZ_NativePlatform } from '../WZSJZ_NativePlatform';

const { ccclass, property } = _decorator;

@ccclass('WZSJZ_LoadingPanel')
export class WZSJZ_LoadingPanel extends PanelBase {
    @property(Sprite)
    LoadingFG: Sprite = null;
    @property(Label)
    LoadingLabel: Label = null;
    private _isLoading: boolean = false;
    //第一个参数为要转跳的场景
    Show(...args: any[]): void {
        if (!WZSJZ_NativePlatform.IsSupported) {
            this.ShowLegacy(...args);
            return;
        }
        const sceneName = args[0];
        if (this._isLoading || typeof sceneName !== 'string' || !sceneName) return;
        this._isLoading = true;
        // 场景切换期间静态 Instance 可能短暂重绑定，始终使用本次打开时的真实管理器。
        const uiManager = WZSJZ_UIManager.Instance;
        uiManager?.ResetGameTimeScale();
        uiManager?.HideAllPanel();
        this.node.active = true;
        // this.LoadingLabel.string = `正在加载：${0}%`;

        const alive = () => isValid(this, true) && isValid(this.node, true);
        const failed = (error: unknown) => {
            if (!alive()) return;
            this._isLoading = false;
            console.error(`[WZSJZ][SceneLoad] 加载失败：${sceneName}`, error);
            if (isValid(this.LoadingLabel, true)) {
                this.LoadingLabel.string = '加载失败，请重新进入游戏';
            }
        };
        if (isValid(this.LoadingFG, true)) this.LoadingFG.fillRange = 0;
        console.info(`[WZSJZ][SceneLoad] 开始预加载：${sceneName}`);
        // 预加载完成后再切换，避免同时对同一场景loadScene/preloadScene。
        director.preloadScene(sceneName, (completed, total) => {
            if (!alive()) return;
            const progress = total > 0 ? Math.min(1, completed / total) : 0;
            if (isValid(this.LoadingFG, true)) this.LoadingFG.fillRange = progress;
            if (isValid(this.LoadingLabel, true)) {
                this.LoadingLabel.string = `正在加载：${Math.ceil(progress * 100)}%`;
            }
        }, (error) => {
            if (!alive()) return;
            if (error) { failed(error); return; }
            console.info(`[WZSJZ][SceneLoad] 预加载完成：${sceneName}`);
            this.scheduleOnce(() => {
                if (!alive()) return;
                WZSJZ_NativeSpineGuard.BeforeSceneSwitch();
                const accepted = director.loadScene(sceneName, (loadError) => {
                    if (!alive()) return;
                    if (loadError) { failed(loadError); return; }
                    console.info(`[WZSJZ][SceneLoad] 场景启动完成：${sceneName}`);
                    this.scheduleOnce(() => {
                        if (!alive()) return;
                        this._isLoading = false;
                        if (isValid(uiManager, true) && isValid(uiManager.node, true)) {
                            uiManager.HidePanel(WZSJZ_Constant.Panel.LoadingPanel);
                        }
                    }, 1);
                });
                if (!accepted) failed(new Error('场景切换请求被拒绝'));
            }, 0);
        });
    }

    /** 非目标渠道保留原来的切场景流程，不启用本次原生兼容改动。 */
    private ShowLegacy(...args: any[]): void {
        const uiManager = WZSJZ_UIManager.Instance;
        uiManager?.ResetGameTimeScale();
        uiManager?.HideAllPanel();
        this.node.active = true;
        if (!args[0]) return;
        director.loadScene(args[0], () => {
            this.scheduleOnce(() => {
                if (uiManager?.node?.isValid) uiManager.HidePanel(WZSJZ_Constant.Panel.LoadingPanel);
            }, 1);
        });
        director.preloadScene(args[0], (completedCount, totalCount) => {
            if (this.LoadingFG) {
                this.LoadingFG.fillRange = Math.max(this.LoadingFG.fillRange, completedCount / totalCount);
            }
            if (this.LoadingLabel) {
                this.LoadingLabel.string = `正在加载：${Math.ceil(completedCount / totalCount * 100)}%`;
            }
        }, () => {});
    }

    Hide(endCb: Function = null): void {
        this.node.active = false;
        endCb && endCb();
    }
}


