import { _decorator, Component, Label } from 'cc';
import { ZRSJZ_GameData } from '../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_BNS_EventManager, ZRSJZ_BNS_MyEvent } from './ZRSJZ_BNS_EventManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BNS_ResourcePanel')
export class ZRSJZ_BNS_ResourcePanel extends Component {
    private readonly resourceNames = ['木材', '矿石', '食物', '宝石'] as const;

    protected onLoad(): void {
        ZRSJZ_BNS_EventManager.BindGameDataEvent();
        ZRSJZ_BNS_EventManager.On(
            ZRSJZ_BNS_MyEvent.资源数量改变,
            this.Refresh,
            this
        );
        this.Refresh();
    }

    protected onDestroy(): void {
        ZRSJZ_BNS_EventManager.Off(
            ZRSJZ_BNS_MyEvent.资源数量改变,
            this.Refresh,
            this
        );
    }

    private Refresh(): void {
        for (const resourceName of this.resourceNames) {
            const countLabel = this.node
                .getChildByName(resourceName)
                ?.getChildByName('数量')
                ?.getComponent(Label);

            if (countLabel) {
                countLabel.string =
                    ZRSJZ_GameData.Instance.GetBNSProperty(resourceName).toString();
            }
        }
    }
}


