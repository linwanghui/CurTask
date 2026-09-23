import { _decorator, Button, Component, Node, tween, Tween, UITransform } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from './Manager/ZRSJZ_EventManager';
import { ZRSJZ_UIManager } from './Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from './ZRSJZ_Constant';
import { ZRSJZ_Game } from './ZRSJZ_Game';
import { ZRSJZ_TutorialPanel } from './Panel/ZRSJZ_TutorialPanel';
import { ZRSJZ_GameData } from './ZRSJZ_GameData';
import { ZRSJZ_TaskService } from './Service/ZRSJZ_TaskService';
import { ZRSJZ_GradeService } from './Service/ZRSJZ_GradeService';
import { ZRSJZ_AudioManager } from './Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Tutorial')
export class ZRSJZ_Tutorial extends Component {

    @property(Node)
    TutorialNodes: Node[] = [];

    TipFlag: boolean[] = [false, false, false];
    PropID: string = "";
    private _completed: boolean = false;
    private _skipping = false;
    private _skipStarted = false;
    private _pass: Node = null;
    private _skipButton: Node = null;
    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL, this.Tutorial, this);
        this.scheduleOnce(this.BindSkipButton, 0);
    }

    protected onDisable(): void {
        ZRSJZ_EventManager.Off(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL, this.Tutorial, this);
        this.unschedule(this.BindSkipButton);
        if (this._skipButton?.isValid) this._skipButton.off(Button.EventType.CLICK, this.SkipTutorial, this);
        if (this._pass?.isValid) this._pass.active = false;
        ZRSJZ_TutorialPanel.IsTipShowing = false;
    }

    private BindSkipButton(): void {
        this._pass = ZRSJZ_UIManager.Instance?.node.getChildByName('Pass');
        this._skipButton = this._pass?.getChildByName('跳过新手教程');
        if (!this._pass || !this._skipButton || !ZRSJZ_Game.Instance?.IsTutorial) return;
        this._pass.active = !this._completed;
        this._pass.setSiblingIndex(this._pass.parent.children.length - 1);
        this._skipButton.layer = this._pass.layer;
        this._skipButton.off(Button.EventType.CLICK, this.SkipTutorial, this);
        this._skipButton.on(Button.EventType.CLICK, this.SkipTutorial, this);
    }

    public async SkipTutorial(): Promise<void> {
        const game = ZRSJZ_Game.Instance;
        const ui = ZRSJZ_UIManager.Instance;
        if (!game?.IsTutorial || !ui || this._completed || this._skipping
            || (game.IsGameFinished && !this._skipStarted)) return;
        this._skipping = true;
        this._skipStarted = true;
        game.StopTutorialForExit();
        ZRSJZ_AudioManager.Instance?.PlaySound('点击');
        ZRSJZ_TutorialPanel.IsTipShowing = false;
        ui.CloseAllPanelsImmediately();
        try {
            // 保留已经拾取、装备的物资；不按失败结算扣除玩家装备。
            await ui.FinishGameInventory(true);
            if (!this.isValid || ZRSJZ_Game.Instance !== game) return;
            this.CompleteTutorial();
            ui.CloseAllPanelsImmediately();
            ui.ShowPanel(ZRSJZ_PANEL.加载界面, 'ZRSJZ_Start');
        } catch (error) {
            console.error('[新手教程] 跳过失败', error);
            void ui.ShowTip('退出教程失败，请再次点击跳过');
        } finally {
            this._skipping = false;
        }
    }

    private CompleteTutorial(): void {
        if (this._completed) return;
        this._completed = true;
        if (this._pass?.isValid) this._pass.active = false;
        const data = ZRSJZ_GameData.Instance;
        const firstCompletion = !data.IsTutorial;
        data.IsTutorial = true;
        data.CurMap = '五号小镇_机密行动';
        if (firstCompletion) {
            ZRSJZ_GradeService.AddExperience(100);
            ZRSJZ_TaskService.CompleteTask('完成新手教程');
        }
        ZRSJZ_GameData.SaveData();
    }

    Tutorial(index: number, target?: Node, propID?: string) {
        const game = ZRSJZ_Game.Instance;
        // 第 5 步由成功结算发出，仍需发放教程奖励；其他引导不可覆盖结算。
        if (!game || this._completed || (game.IsGameFinished && index !== 5)) return;
        if (index == 1) {
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "Mask", this.TutorialNodes[0], "搜索物资");
            ZRSJZ_Game.Instance.GamePaused = true;
        } else if (index == 2 && !this.TipFlag[0]) {
            this.TipFlag[0] = true;
            this.PropID = propID;
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "Tip", target, "双击或者拖动拾取");
        } else if (index == 3 && !this.TipFlag[1] && propID == this.PropID) {
            ZRSJZ_TutorialPanel.IsTipShowing = true;
            this.TipFlag[1] = true;
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "Tip", target, "双击或者拖动装备武器");
        } else if (index == 4 && !this.TipFlag[2]) {
            this.TipFlag[2] = true;
            // 首次关闭物资界面即放行，不再等待后续背包提示点击完毕。
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL_CLOSE_COLLIDER);
            this.TutorialNodes[4].active = true;
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "MaskTip", this.TutorialNodes[1], "背包里面可以切换装备", [
                this.TutorialNodes[3]], ["可以通过切换来更换当前武器"]);
        } else if (index == 5) {
            this.CompleteTutorial();
        } else if (index == 6 && !this.TipFlag[3]) {
            this.TipFlag[3] = true
            ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.新手引导弹窗, "Mask", this.TutorialNodes[2], "使用治疗恢复状态");
            ZRSJZ_Game.Instance.GamePaused = true;
        }
    }

}


