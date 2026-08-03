import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_DeathPanel')
export class ZRSJZ_DeathPanel extends ZRSJZ_Panel {

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        switch (event.getCurrentTarget().name) {
            case "重新开始":

                break;
        }
    }
}


