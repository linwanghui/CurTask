import { _decorator, Button, Event, Label, Node } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_GameData } from '../WZSJZ_GameData';
import { WZSJZ_AudioManager } from '../WZSJZ_AudioManager';
const { ccclass } = _decorator;

@ccclass('WZSJZ_FinishPanel')
export class WZSJZ_FinishPanel extends PanelBase {
    private _isVictory: boolean = false;
    private _isNavigating: boolean = false;
    private _boundButtons: WeakSet<Node> = new WeakSet<Node>();

    Show(isVictory: boolean = false, diamondReward: number = 0): void {
        this._isVictory = !!isVictory;
        this._isNavigating = false;
        const panel = this.node.getChildByName("Panel");
        if (!panel) return;

        const victoryNode = panel.getChildByName("胜利");
        const failureNode = panel.getChildByName("失败");
        const homeButton = panel.getChildByName("返回主页");
        const nextButton = panel.getChildByName("下一关");
        const restartButton = panel.getChildByName("重新开始");
        if (victoryNode) victoryNode.active = this._isVictory;
        if (failureNode) failureNode.active = !this._isVictory;
        if (homeButton) homeButton.active = true;
        if (nextButton) nextButton.active = this._isVictory;
        if (restartButton) restartButton.active = !this._isVictory;

        const rewardLabel = victoryNode
            ?.getChildByPath("奖励/数量")
            ?.getComponent(Label);
        if (rewardLabel) {
            rewardLabel.string = `X${Math.max(0, Math.floor(diamondReward))}`;
        }
        this.BindButton(homeButton);
        this.BindButton(nextButton);
        this.BindButton(restartButton);
        super.Show(panel);
        const audioConfig = WZSJZ_Constant.FinishResult;
        WZSJZ_AudioManager.Play(
            this._isVictory
                ? audioConfig.VictoryAudioName
                : audioConfig.FailureAudioName,
            this._isVictory
                ? audioConfig.VictoryAudioVolume
                : audioConfig.FailureAudioVolume,
            0.1,
        );
    }

    public OnButtonClick(event: Event): void {
        const target = event.currentTarget as Node
            || (event as any).getCurrentTarget?.() as Node;
        switch (target?.name) {
            case "返回主页":
                this.ReturnToHome();
                break;
            case "下一关":
                this.GoToNextLevel();
                break;
            case "重新开始":
                this.RestartLevel();
                break;
        }
    }

    private ReturnToHome(): void {
        this.LoadScene("WZSJZ_Start");
    }

    private GoToNextLevel(): void {
        if (!this._isVictory || this._isNavigating) return;
        const gameData = WZSJZ_GameData.Instance;
        gameData.SelectLevel(gameData.SelectedLevel + 1);
        this.LoadScene("WZSJZ_Game");
    }

    private RestartLevel(): void {
        if (this._isVictory || this._isNavigating) return;
        this.LoadScene("WZSJZ_Game");
    }

    private LoadScene(sceneName: string): void {
        if (this._isNavigating) return;
        this._isNavigating = true;
        WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.FinishPanel);
        WZSJZ_UIManager.Instance.ShowPanel(
            WZSJZ_Constant.Panel.LoadingPanel,
            [sceneName],
        );
    }

    /** 场景里只做了按钮外观时，运行时自动补上Button与点击监听。 */
    private BindButton(node: Node): void {
        if (!node || this._boundButtons.has(node)) return;
        this._boundButtons.add(node);
        node.getComponent(Button) || node.addComponent(Button);
        node.on(Button.EventType.CLICK, this.OnButtonClick, this);
    }
}
