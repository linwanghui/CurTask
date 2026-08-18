import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_CheatingPanel')
export class ZRSJZ_CheatingPanel extends ZRSJZ_Panel {

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        switch (event.getCurrentTarget().name) {
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.作弊界面);
                break;
            case "所有道具加1":
                ZRSJZ_InventoryService.AddAllProp();
                break;
            case "所有子弹加20":
                ZRSJZ_InventoryService.AddAllAmmo(20);
                break;
            case "无限火力":
                ZRSJZ_Game.Instance.UnlimitedFirepower = true;
                break;
            case "金币加1000W":
                ZRSJZ_AccountService.ChangeGold(10000000);
                break;

        }
    }
}


