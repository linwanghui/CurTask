import { _decorator, Component, EventTouch, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_DeathPanel')
export class ZRSJZ_DeathPanel extends ZRSJZ_Panel {

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "重新开始":

                break;
        }
    }
}


