import { _decorator, Component, EventTouch, find, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_MainTaskAwardConfig, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
import { ZRSJZ_AccountService } from '../Service/ZRSJZ_AccountService';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_GetAwardPanel')
export class ZRSJZ_GetAwardPanel extends ZRSJZ_Panel {

    Award: Node = null;

    private _awards: ZRSJZ_MainTaskAwardConfig[] = [];

    protected onLoad(): void {
        this.Award = find("Panel/Award/View/Content", this.node);
    }

    Show(...args: any[]): void {
        super.Show(() => {
        });
        this.ShowAward(...args);
    }

    ShowAward(...args: ZRSJZ_MainTaskAwardConfig[]) {
        for (let i = this.Award.children.length - 1; i >= 0; i--) {
            ZRSJZ_PoolManager.Instance.PutNode(this.Award.children[i]);
        }
        this._awards = [...args];
        args.forEach(award => {
            ZRSJZ_PoolManager.Instance.GetNode("Prefabs/UI/TaskAward").then(awardNode => {
                awardNode.parent = this.Award;
                awardNode.active = true;
                awardNode.getComponent(ZRSJZ_TaskAward).Init(award.TaskAwardName, award.TaskAwardCount);
            })
        })
    }

    OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.获取奖励弹窗);
                this.GetAwards();
                break;
        }
    }

    GetAwards() {
        this._awards.forEach(award => {
            if (award.TaskAwardName == "钞票") {
                ZRSJZ_AccountService.ChangeGold(award.TaskAwardCount);
                ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
            } else {
                ZRSJZ_InventoryService.AddPropByName(award.TaskAwardName, award.TaskAwardCount);
            }
        })
        this._awards = [];
    }

}


