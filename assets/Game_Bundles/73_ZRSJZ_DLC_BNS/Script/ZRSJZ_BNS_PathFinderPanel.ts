import { _decorator, Component, EventTouch, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_PathFinderPanel')
export class ZRSJZ_BNS_PathFinderPanel extends Component {
    start() {

    }

    OnButtonClick(event: EventTouch) {
        switch (event.getCurrentTarget().name) {
            case "主基地":
            case "伐木场":
            case "矿场":
            case "发电厂":
            case "医疗部":
            case "研究所":
            case "防御塔":
                console.log("寻找地址" + event.getCurrentTarget().name);
        }

    }



}


