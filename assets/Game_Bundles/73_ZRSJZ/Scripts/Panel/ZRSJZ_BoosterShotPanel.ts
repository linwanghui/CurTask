import { _decorator, EventTouch, find, Node } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_BoosterShotPanel')
export class ZRSJZ_BoosterShotPanel extends ZRSJZ_Panel {

    private _backlights: { node: Node; origin: number; speed: number }[] = [];

    protected update(dt: number): void {
        for (const light of this._backlights) {
            light.node.angle = (light.node.angle + light.speed * dt) % 360;
        }
    }

    protected onDisable(): void {
        for (const light of this._backlights) light.node.angle = light.origin;
    }


    protected onLoad(): void {
        const cards = find("Panel/Layout", this.node)?.children ?? [];
        cards.forEach((card, index) => {
            const node = card.getChildByName("背光");
            // 陈列弹窗统一顺时针缓转，各卡片略微错速。
            if (node) this._backlights.push({ node, origin: node.angle, speed: -(18 + index * 3) });
        });
    }

    OnButtonClick(event: EventTouch) {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        switch (event.getCurrentTarget().name) {
            case "Mask":
            case "关闭":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.增强针弹窗);
                break;

        }
    }


}


