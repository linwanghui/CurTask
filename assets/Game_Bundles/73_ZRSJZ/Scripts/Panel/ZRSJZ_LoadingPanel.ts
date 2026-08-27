import { _decorator, director, find, Label, Node, Sprite, UITransform } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_LoadingPanel')
export class ZRSJZ_LoadingPanel extends ZRSJZ_Panel {

    LoadingSprite: Sprite = null;
    LoadingIcon: Sprite = null;
    LoadingLabel: Label = null;

    private _targetProgress: number = 0;
    private _displayProgress: number = 0;
    private _loadingComplete: boolean = false;
    private _isSwitchingScene: boolean = false;
    private _loadSerial: number = 0;
    private _elapsedTime: number = 0;
    private _iconBaseY: number = 0;
    private _sceneName: string = "";

    protected onLoad(): void {
        this.LoadingSprite = find("进度条/进度2", this.node).getComponent(Sprite);
        this.LoadingIcon = find("进度条/Icon", this.node).getComponent(Sprite);
        this.LoadingLabel = find("进度条/LoadingLabel", this.node).getComponent(Label);
        this._iconBaseY = this.LoadingIcon.node.position.y;
    }

    public Show(...args: any[]): void {
        super.Show(() => {
            if (args.length >= 2) {
                args[1]();
            }
        });

        const sceneName = typeof args[0] === "string" ? args[0] : "";
        this._sceneName = sceneName;
        const serial = ++this._loadSerial;
        this._targetProgress = 0;
        this._displayProgress = 0;
        this._loadingComplete = false;
        this._isSwitchingScene = false;
        this._elapsedTime = 0;
        this.ApplyProgress(0);

        if (!sceneName) {
            console.error("[ZRSJZ_LoadingPanel] 未指定目标场景");
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.加载界面);
            return;
        }

        director.preloadScene(
            sceneName,
            (completedCount: number, totalCount: number) => {
                if (serial !== this._loadSerial) return;
                const progress = totalCount > 0 ? completedCount / totalCount : 0;
                this._targetProgress = Math.max(
                    this._targetProgress,
                    Math.min(0.98, progress),
                );
            },
            (error: Error | null) => {
                if (serial !== this._loadSerial) return;
                if (error) {
                    console.error(`[ZRSJZ_LoadingPanel] 场景预加载失败: ${sceneName}`, error);
                    ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.加载界面);
                    return;
                }
                this._targetProgress = 1;
                this._loadingComplete = true;
            },
        );
    }

    protected update(deltaTime: number): void {
        if (!this.node.active || this._isSwitchingScene) return;

        const safeDeltaTime = Math.max(0, Math.min(0.1, deltaTime || 0));
        this._elapsedTime += safeDeltaTime;
        const speed = this._loadingComplete ? 2.5 : 0.8;
        this._displayProgress = Math.min(
            this._targetProgress,
            this._displayProgress + safeDeltaTime * speed,
        );
        this.ApplyProgress(this._displayProgress);

        if (this._loadingComplete && this._displayProgress >= 0.999 && this._elapsedTime >= 0.45) {
            this._isSwitchingScene = true;
            director.loadScene(this._sceneName);
        }
    }

    private ApplyProgress(progress: number): void {
        const safeProgress = Math.max(0, Math.min(1, progress));
        this.LoadingSprite.fillRange = safeProgress;
        this.LoadingLabel.string = `正在加载 ${Math.round(safeProgress * 100)}%`;

        const progressTransform = this.LoadingSprite.node.getComponent(UITransform);
        if (!progressTransform) return;

        const startX = this.LoadingSprite.node.position.x;
        this.LoadingIcon.node.setPosition(
            startX + progressTransform.width * safeProgress,
            this._iconBaseY + Math.sin(this._elapsedTime * 6) * 4,
            this.LoadingIcon.node.position.z,
        );
    }

}


