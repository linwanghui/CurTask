import { _decorator, Component, Label } from 'cc';
import NodeUtil from '../../Framework/Utils/NodeUtil';
import Banner from '../../Banner';
import { Panel, UIManager } from '../../Framework/Managers/UIManager';
import { PanelBase } from '../../Framework/UI/PanelBase';
const { ccclass, property } = _decorator;

@ccclass('HwLoginPanel')
export class HwLoginPanel extends PanelBase {
    Label: Label = null;

    elapsedTime: number = 0;
    updateInterval: number = 0.5; // 点变化的时间间隔
    dots: string = "";
    maxDots: number = 3;

    protected onLoad(): void {
        this.Label = NodeUtil.GetComponent("Label", this.node, Label);
    }

    Show() {
        this.updateInterval = 0.5; // 点变化的时间间隔
        this.elapsedTime = 0; // 累计时间
    }

    protected update(dt: number): void {
        this.elapsedTime += dt;

        // 每隔一定时间更新一次
        if (this.elapsedTime >= this.updateInterval) {
            this.elapsedTime = 0;

            // 更新点数
            this.dots = this.dots.length < this.maxDots ? this.dots + '.' : '';
            this.Label.string = '登录中' + this.dots;
        }
    }

    OnMaskButtonClick() {
        Banner.Instance.HWGameLogin(() => {
            Banner.IsLogin = true;
            UIManager.HidePanel(Panel.HwLoginPanel);
        }, () => {
            UIManager.ShowTip("登陆失败");
        });
    }

}