import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, Component, EditBox, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_CheatingPanel')
export class ZRSJZ_CheatingPanel extends ZRSJZ_Panel {

    @property(EditBox)
    PropName: EditBox = null;

    @property(EditBox)
    PropCount: EditBox = null;

    /**
     * 根据道具名称和数量向综合仓库添加道具。
     * 示例：AddProp("苹果", 10)。成功返回 true，参数无效或找不到配置时返回 false。
     */
    public async AddProp(propName: string, count: number = 1): Promise<boolean> {
        const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards([{
            PropName: propName,
            Count: count,
        }]);
        if (result.MailAwards.length > 0) {
            ZRSJZ_UIManager.Instance.ShowTip("仓库空间不足，剩余道具已发送至邮件");
        } else {
            ZRSJZ_UIManager.Instance.ShowTip("道具已添加到仓库");
        }

        console.warn(`[ZRSJZ_CheatingPanel] 添加道具失败，名称或数量无效: ${propName}, ${count}`);
        return false;
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.作弊界面);
                break;
            case "所有道具加1":
                ZRSJZ_InventoryService.AddAllProp();
                break;
            case "主库加一行":
                ZRSJZ_InventoryService.AddInventoryRow(ZRSJZ_INVENTORY.仓库_全部, 1);
                break;
            case "装备加一行":
                ZRSJZ_InventoryService.AddInventoryRow(ZRSJZ_INVENTORY.仓库_装备, 1);
                break;
            case "保险箱加一行":
                ZRSJZ_InventoryService.AddInventoryRow(ZRSJZ_INVENTORY.保险箱, 1);
                break;
            case "无限火力":
                ZRSJZ_Game.Instance.UnlimitedFirepower = true;
                break;
            case "金币加1000W":
                ZRSJZ_AccountService.ChangeGold(10000000);
                break;
            case "添加道具":
                if (!ZRSJZ_PROP_CONFIG.has(this.PropName.string)) {
                    ZRSJZ_UIManager.Instance.ShowTip("道具不存在");
                } else {
                    const propCount = parseInt(this.PropCount.string);
                    if (isNaN(propCount)) {
                        ZRSJZ_UIManager.Instance.ShowTip("数量无效");
                    } else {
                        this.AddProp(this.PropName.string, propCount);
                    }
                }
                break;

        }
    }
}


