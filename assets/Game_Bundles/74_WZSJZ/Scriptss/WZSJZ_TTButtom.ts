import { _decorator, Component, Node } from 'cc';
import Banner from '../../../Scripts/Banner';
const { ccclass, property } = _decorator;

@ccclass('WZSJZ_TTButtom')
export class WZSJZ_TTButtom extends Component {
    start() {
        if (!Banner.IS_BYTEDANCE_MINI_GAME) {
            this.node.active = false;
        }
    }


}


