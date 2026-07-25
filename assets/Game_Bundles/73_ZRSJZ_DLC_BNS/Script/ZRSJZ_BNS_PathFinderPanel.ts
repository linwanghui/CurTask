import { _decorator, Component, EventTouch, find, Node } from 'cc';
import { ZRSJZ_BNS_EventManager, ZRSJZ_BNS_MyEvent } from './ZRSJZ_BNS_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_PathFinderPanel')
export class ZRSJZ_BNS_PathFinderPanel extends Component {
    @property({ tooltip: '玩家距离目标建筑多近时关闭指引' })
    private guideCloseDistance: number = 200;

    public OnButtonClick(event: EventTouch): void {
        const buttonNode = event.getCurrentTarget() as Node;
        const buildingNameMap: { [buttonName: string]: string } = {
            主基地: '主基地',
            伐木场: '伐木场',
            矿场: '矿场',
            发电厂: '发电厂',
            医疗部: '医疗部',
            研究所: '科研所',
            防御塔: '防御塔',
            果园: '果园',
        };
        const buildingName = buildingNameMap[buttonNode?.name];
        if (!buildingName) return;
        const targetBuilding = find(`Canvas/建筑/${buildingName}`);
        if (!targetBuilding) {
            console.warn(`[ZRSJZ_BNS_PathFinderPanel] 找不到建筑：${buildingName}`);
            return;
        }
        ZRSJZ_BNS_EventManager.Emit(
            ZRSJZ_BNS_MyEvent.开启建筑指引,
            targetBuilding,
            this.guideCloseDistance
        );
    }
}

