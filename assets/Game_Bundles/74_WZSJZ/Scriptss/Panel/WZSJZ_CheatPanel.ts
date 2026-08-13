import { _decorator, EditBox, EventTouch } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_EventManager } from '../WZSJZ_EventManager';


const { ccclass } = _decorator;

@ccclass('WZSJZ_CheatPanel')
export class WZSJZ_CheatPanel extends PanelBase {


    Show(): void {
        super.Show(this.node.getChildByName("Panel"));
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "加999万资源":
                if (!WZSJZ_EventManager.EmitScene(
                    WZSJZ_EventManager.修改增加资源,
                    WZSJZ_Constant.Cheat.AddResourceAmount,
                    WZSJZ_Constant.Cheat.AddResourceAmount,
                )) {
                    WZSJZ_UIManager.Instance.ShowText('当前场景不支持修改资源');
                }
                break;
            case "加999钥匙":
                if (!WZSJZ_EventManager.EmitScene(
                    WZSJZ_EventManager.修改增加钥匙,
                    WZSJZ_Constant.Cheat.AddKeyAmount,
                )) {
                    WZSJZ_UIManager.Instance.ShowText('当前场景不支持修改钥匙');
                }
                break;
            case "无敌城墙":
                if (!WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.修改城墙无敌)) {
                    WZSJZ_UIManager.Instance.ShowText('当前场景不支持城墙无敌');
                }
                break;
            case "开启批量生成小怪":
                if (!WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.修改批量生成小怪)) {
                    WZSJZ_UIManager.Instance.ShowText('当前场景不支持批量生成小怪');
                }
                break;
            case "添加单位":
                const input = this.node.getChildByPath('Panel/单位名')?.getComponent(EditBox);
                const unitText = input?.string?.trim() || '';
                if (!unitText) {
                    WZSJZ_UIManager.Instance.ShowText('请输入单位名');
                    return;
                }
                if (!WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.修改添加单位, unitText)) {
                    WZSJZ_UIManager.Instance.ShowText('当前场景不支持添加单位');
                }
                break;
            case "添加敌人":
                const enemyInput = this.node.getChildByPath('Panel/敌人名')?.getComponent(EditBox);
                const enemyName = enemyInput?.string?.trim() || '';
                if (!enemyName) {
                    WZSJZ_UIManager.Instance.ShowText('请输入敌人名');
                    return;
                }
                if (!WZSJZ_EventManager.EmitScene(WZSJZ_EventManager.修改添加敌人, enemyName)) {
                    WZSJZ_UIManager.Instance.ShowText('当前场景不支持添加敌人');
                }
                break;
            case "关闭":
                WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.CheatPanel);
                break;
        }
    }



}
