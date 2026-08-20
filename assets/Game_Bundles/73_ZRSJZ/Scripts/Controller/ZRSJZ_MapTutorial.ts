import { _decorator, Collider, Component, Node } from 'cc';
import { ZRSJZ_Map } from './ZRSJZ_Map';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_Box } from '../Unit/ZRSJZ_Box';
import { ZRSJZ_TutorialPanel } from '../Panel/ZRSJZ_TutorialPanel';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_MapTutorial')
export class ZRSJZ_MapTutorial extends ZRSJZ_Map {

    @property(ZRSJZ_Box)
    Box1: ZRSJZ_Box = null;

    TutorialFlag: boolean[] = [false, false];

    protected onEnable(): void {
        ZRSJZ_EventManager.On(ZRSJZ_MyEvent.ZRSJZ_PLAYER_SEARCH, this.Checked, this);
    }

    Checked(box: ZRSJZ_Box) {
        if (box == this.Box1 && this.TutorialFlag[0] == false) {
            this.TutorialFlag[0] = true;
            ZRSJZ_EventManager.Emit(ZRSJZ_MyEvent.ZRSJZ_TUTORIAL, 1);
            ZRSJZ_TutorialPanel.IsTipShowing = true;
        }
    }
}


