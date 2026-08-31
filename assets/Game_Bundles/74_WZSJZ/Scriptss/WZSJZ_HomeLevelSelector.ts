import { _decorator, Button, Component, Node } from 'cc';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_GameData } from './WZSJZ_GameData';

const { ccclass } = _decorator;

/** 首页关卡浏览表现：负责Boss动画轮换、锁定提示以及前后翻页边界。 */
@ccclass('WZSJZ_HomeLevelSelector')
export class WZSJZ_HomeLevelSelector extends Component {
    private _canvas: Node = null;
    private _previousButton: Node = null;
    private _nextButton: Node = null;
    private _startButton: Node = null;
    private _lockedTip: Node = null;
    private _homeAnimations: Node = null;
    private _configured: boolean = false;

    public Configure(canvas: Node): void {
        if (!canvas?.isValid) return;
        this._canvas = canvas;
        this._previousButton = canvas.getChildByName("上一关");
        this._nextButton = canvas.getChildByName("下一关");
        this._startButton = canvas.getChildByName("开始游戏");
        this._lockedTip = canvas.getChildByName("请先通关上一关");
        this._homeAnimations = canvas.getChildByName("主页动画");
        if (!this._configured) {
            this._configured = true;
            this._previousButton?.on(Button.EventType.CLICK, this.ShowPreviousLevel, this);
            this._nextButton?.on(Button.EventType.CLICK, this.ShowNextLevel, this);
            this.node.on(
                WZSJZ_EventManager.关卡进度变动,
                this.RefreshView,
                this,
            );
        }
        this.RefreshView();
    }

    private ShowPreviousLevel = (): void => {
        const data = WZSJZ_GameData.Instance;
        data.SelectLevel(data.SelectedLevel - 1);
    };

    private ShowNextLevel = (): void => {
        const data = WZSJZ_GameData.Instance;
        data.SelectLevel(data.SelectedLevel + 1);
    };

    private RefreshView = (): void => {
        if (!this._canvas?.isValid) return;
        const snapshot = WZSJZ_GameData.Instance.GetLevelProgressSnapshot();
        for (const animation of this._homeAnimations?.children || []) {
            animation.active = animation.name === `${snapshot.AnimationIndex}`;
        }
        if (this._startButton) {
            this._startButton.active = snapshot.IsSelectedLevelUnlocked;
        }
        if (this._lockedTip) {
            this._lockedTip.active = !snapshot.IsSelectedLevelUnlocked;
        }
        if (this._previousButton) {
            this._previousButton.active = snapshot.SelectedLevel > 1;
        }
        if (this._nextButton) {
            this._nextButton.active
                = snapshot.SelectedLevel < snapshot.MaximumPreviewLevel;
        }
    };
}
