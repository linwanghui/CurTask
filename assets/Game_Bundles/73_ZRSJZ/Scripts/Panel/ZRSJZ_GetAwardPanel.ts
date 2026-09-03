import { _decorator, Component, EventTouch, find, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_MainTaskAwardConfig, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
import { ZRSJZ_AccountService } from '../Service/ZRSJZ_AccountService';
import { ZRSJZ_GradeService } from '../Service/ZRSJZ_GradeService';
const { ccclass, property } = _decorator;

export interface ZRSJZ_GetAwardPanelOptions {
    Awards: ZRSJZ_MainTaskAwardConfig[];
    DisplayOnly: true;
}

@ccclass('ZRSJZ_GetAwardPanel')
export class ZRSJZ_GetAwardPanel extends ZRSJZ_Panel {

    Award: Node = null;

    private _awards: ZRSJZ_MainTaskAwardConfig[] = [];
    private _displayOnly: boolean = false;

    protected onLoad(): void {
        this.Award = find("Panel/Award/View/Content", this.node);
    }

    Show(...args: any[]): void {
        super.Show(() => {
        });
        const options = args.length === 1
            && args[0]?.DisplayOnly === true
            && Array.isArray(args[0]?.Awards)
            ? args[0] as ZRSJZ_GetAwardPanelOptions
            : null;
        this._displayOnly = options !== null;
        this.ShowAward(...(options?.Awards ?? args));
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
                if (this._displayOnly) {
                    this._awards = [];
                    this._displayOnly = false;
                } else {
                    void this.GetAwards();
                }
                break;
        }
    }

    async GetAwards(): Promise<void> {
        const awards = this._awards;
        this._awards = [];
        let exp = 0;
        const propAwards: { PropName: string, Count: number }[] = [];
        awards.forEach(award => {
            if (award.TaskAwardName == "钞票") {
                ZRSJZ_AccountService.ChangeGold(award.TaskAwardCount);
                ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
            } else if (award.TaskAwardName == "经验") {
                exp = award.TaskAwardCount;
            } else {
                propAwards.push({
                    PropName: award.TaskAwardName,
                    Count: award.TaskAwardCount,
                });
            }
        })
        if (exp != 0) ZRSJZ_GradeService.AddExperience(exp);
        if (propAwards.length <= 0) return;

        const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards(propAwards);
        if (result.MailAwards.length > 0) {
            ZRSJZ_UIManager.Instance.ShowTip("仓库空间不足，剩余道具已发送至邮件");
        } else {
            ZRSJZ_UIManager.Instance.ShowTip("道具已添加到仓库");
        }
    }

}


