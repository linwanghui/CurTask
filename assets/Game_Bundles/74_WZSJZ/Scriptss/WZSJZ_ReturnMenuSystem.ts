import { _decorator, Button, Component, Node } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';

const { ccclass } = _decorator;

/** 游戏内菜单入口，负责打开返回确认界面。 */
@ccclass('WZSJZ_ReturnMenuSystem')
export class WZSJZ_ReturnMenuSystem extends Component {
    private _configured: boolean = false;

    public Configure(canvas: Node): void {
        if (this._configured) return;
        const menu = canvas?.getChildByName("菜单");
        if (!menu) {
            console.warn("[WZSJZ] 游戏场景中没有找到“菜单”节点。");
            return;
        }
        this._configured = true;
        menu.getComponent(Button) || menu.addComponent(Button);
        menu.on(Button.EventType.CLICK, this.ShowReturnPanel, this);
    }

    private ShowReturnPanel = (): void => {
        WZSJZ_UIManager.Instance.ShowPanel(WZSJZ_Constant.Panel.ReturnPanel);
    };
}
