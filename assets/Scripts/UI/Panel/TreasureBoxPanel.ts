import { _decorator, Node, find, instantiate, Prefab, resources, Sprite, tween, director } from 'cc';
import Banner from '../../Banner';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { Tools } from '../../Framework/Utils/Tools';
import { PanelBase } from '../../Framework/UI/PanelBase';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import { EventManager, MyEvent } from '../../Framework/Managers/EventManager';
const { ccclass, property } = _decorator;

@ccclass('TreasureBoxPanel')
export default class TreasureBoxPanel extends PanelBase {
    @property(Sprite)
    jdt: Sprite | null = null;//进度条

    Panel: Node = null;

    index: number = 0;

    gived: boolean = false;
    sussCb: Function = null;

    protected onLoad(): void {
        this.Panel = NodeUtil.GetNode("Panel", this.node);
    }

    Show(sussCb: Function = null) {
        super.Show(this.Panel);

        this.IsShow2 = false;
        this.IsShow = false;
        this.sussCb = sussCb;
        this.gived = false;
        this.index = 0;
        this.unschedule(this.Sub_index);
        this.schedule(this.Sub_index, 0.1);
    }

    //定时扣
    Sub_index() {
        if (this.index > 0) this.index -= 1;
    }
    IsShow: boolean = false;
    IsShow2: boolean = false;

    //点击宝箱按钮
    OnButtonClick() {
        this.index += Tools.GetRandom(5, 10);
        if (this.index >= 60 && !this.IsShow) {
            Banner.Instance.ShowVideoAd(() => { this.GiveReward(); });
            this.IsShow = true;
            this.scheduleOnce(() => {
                UIManager.HidePanel(Panel.TreasureBoxPanel);
                director.getScene().emit(MyEvent.TreasureBoxDestroy);
            }, 1);
        }
    }
    protected update(dt: number): void {
        this.jdt.fillRange = this.index / 100;
    }

    protected lateUpdate(dt: number): void {
        if (this.index > 0) this.index -= 0.1;
    }

    //提供奖励
    GiveReward() {
        if (this.gived) return;
        this.gived = true;
        this.sussCb && this.sussCb();
    }
}