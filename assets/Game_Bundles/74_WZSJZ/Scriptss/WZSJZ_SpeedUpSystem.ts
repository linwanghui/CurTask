import { _decorator, Button, Component, Node } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_GameData } from './WZSJZ_GameData';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';

const { ccclass } = _decorator;

/** 局内加速授权与速度按钮表现；全局dt倍率仍统一由UIManager控制。 */
@ccclass('WZSJZ_SpeedUpSystem')
export class WZSJZ_SpeedUpSystem extends Component {
    private _speedRoot: Node = null;
    private _currentGameVideoUnlocked: boolean = false;
    private _buttonBound: boolean = false;

    protected onLoad(): void {
        this.node.on(WZSJZ_EventManager.请求切换速度, this.OnToggleRequested, this);
        this.node.on(WZSJZ_EventManager.加速视频完成, this.OnVideoCompleted, this);
        this.node.on(WZSJZ_EventManager.游戏速度变动, this.RefreshView, this);
    }

    public Configure(canvas: Node): void {
        this._speedRoot = canvas?.getChildByPath("数据栏/速度") || null;
        if (this._speedRoot && !this._buttonBound) {
            this._buttonBound = true;
            this._speedRoot.getComponent(Button) || this._speedRoot.addComponent(Button);
            this._speedRoot.on(Button.EventType.CLICK, this.OnSpeedButtonClick, this);
        }
        WZSJZ_UIManager.Instance?.ResetGameTimeScale();
        this.RefreshView(WZSJZ_UIManager.PlayerGameTimeScale);
    }

    private OnSpeedButtonClick = (): void => {
        this.node.emit(WZSJZ_EventManager.请求切换速度);
    };

    private OnToggleRequested = (): void => {
        const uiManager = WZSJZ_UIManager.Instance;
        if (!uiManager) return;

        const config = WZSJZ_Constant.SpeedUp;
        if (WZSJZ_UIManager.PlayerGameTimeScale >= config.FastMultiplier) {
            uiManager.SetGameTimeScale(config.NormalMultiplier);
            return;
        }

        if (this._currentGameVideoUnlocked
            || WZSJZ_GameData.Instance.HasPermanentSpeedUp()) {
            uiManager.SetGameTimeScale(config.FastMultiplier);
            return;
        }
        uiManager.ShowPanel(WZSJZ_Constant.Panel.SpeedUpPanel);
    };

    /** 面板只发送“视频完整播放”消息，授权、存档和倍率切换在这里统一完成。 */
    private OnVideoCompleted = (): void => {
        const uiManager = WZSJZ_UIManager.Instance;
        if (!uiManager) return;
        const gameData = WZSJZ_GameData.Instance;
        const watched = gameData.RecordSpeedUpVideoWatch();
        this._currentGameVideoUnlocked = true;
        uiManager.HidePanel(WZSJZ_Constant.Panel.SpeedUpPanel);
        uiManager.SetGameTimeScale(WZSJZ_Constant.SpeedUp.FastMultiplier);
        uiManager.ShowText(
            gameData.HasPermanentSpeedUp()
                ? "已永久解锁2倍加速！"
                : `本局已解锁2倍加速（${watched}/${WZSJZ_Constant.SpeedUp.PermanentUnlockVideoCount}）`,
        );
    };

    private RefreshView = (multiplier: number): void => {
        const isFast = multiplier >= WZSJZ_Constant.SpeedUp.FastMultiplier;
        const normalNode = this._speedRoot?.getChildByName("速度x1");
        const fastNode = this._speedRoot?.getChildByName("速度x2");
        if (normalNode) normalNode.active = !isFast;
        if (fastNode) fastNode.active = isFast;
    };
}
