import { _decorator, EventTouch } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
const { ccclass } = _decorator;

@ccclass('WZSJZ_ReturnPanel')
export class WZSJZ_ReturnPanel extends PanelBase {
    private _isReturningHome: boolean = false;

    Show(): void {
        this._isReturningHome = false;
        super.Show(this.node.getChildByName("Panel"));
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "关闭":
            case "继续游戏":
                WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.ReturnPanel);
                break;
            case "返回主页":
                this.ReturnToHome();
                break;
        }
    }

    private ReturnToHome(): void {
        if (this._isReturningHome) return;
        this._isReturningHome = true;
        WZSJZ_UIManager.Instance.ShowPanel(
            WZSJZ_Constant.Panel.LoadingPanel,
            ["WZSJZ_Start"],
        );
    }
}
