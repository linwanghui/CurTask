import { _decorator, EventTouch, Label, Sprite, SpriteFrame } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';
import { WZSJZ_UIManager } from '../WZSJZ_UIManager';
import { WZSJZ_Constant } from '../WZSJZ_Constant';
import { WZSJZ_Incident } from '../WZSJZ_Incident';
import type { WZSJZ_CombinationAwardData } from '../WZSJZ_CombinationRewardSystem';

const { ccclass } = _decorator;

@ccclass('WZSJZ_CombinationAwardPanel')
export class WZSJZ_CombinationAwardPanel extends PanelBase {
    private _showVersion: number = 0;

    Show(award?: WZSJZ_CombinationAwardData): void {
        const panel = this.node.getChildByName("Panel");
        super.Show(panel);
        if (!award || !panel) return;

        const rewardRoot = panel.getChildByName("底框");
        const nameLabel = rewardRoot?.getChildByName("Name")?.getComponent(Label);
        const amountLabel = rewardRoot?.getChildByName("数量")?.getComponent(Label);
        const propSprite = rewardRoot?.getChildByName("道具图")?.getComponent(Sprite);
        if (nameLabel) nameLabel.string = award.Name;
        if (amountLabel) amountLabel.string = `X${award.Amount}`;
        void this.LoadPropSprite(propSprite, award.SpritePath);
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "关闭":
                WZSJZ_UIManager.Instance.HidePanel(WZSJZ_Constant.Panel.CombinationAwardPanel);
                break;
        }
    }

    private async LoadPropSprite(sprite: Sprite, path: string): Promise<void> {
        const version = ++this._showVersion;
        if (!sprite || !path) return;
        sprite.spriteFrame = null;
        const frame = await WZSJZ_Incident.LoadSprite(path) as SpriteFrame;
        if (version === this._showVersion && sprite.node?.isValid) {
            sprite.spriteFrame = frame;
        }
    }
}
