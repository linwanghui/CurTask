import { _decorator, Component, Node } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_DLCButton')
export class ZRSJZ_DLCButton extends Component {

    protected onEnable(): void {
        ZRSJZ_EventManager.OnPersist(ZRSJZ_MyEvent.ZRSJZ_LOADED_DLC, () => this.node.active = true);
    }

    start() {
        this.node.active = ZRSJZ_UIManager.ZRSJZ_DLC;
    }

}


