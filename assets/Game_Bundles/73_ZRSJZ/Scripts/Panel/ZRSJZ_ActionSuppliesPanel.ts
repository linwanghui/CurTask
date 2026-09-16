import { _decorator, Button, Enum, EventTouch, Label, Node, Sprite, UITransform, isValid } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_ActionSuppliesService as Supplies } from '../Service/ZRSJZ_ActionSuppliesService';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ActionSuppliesPanel')
export class ZRSJZ_ActionSuppliesPanel extends ZRSJZ_Panel {
    @property({ type: Enum(ZRSJZ_PANEL) })
    PanelName: ZRSJZ_PANEL = ZRSJZ_PANEL.行动补给弹窗;
    @property([Node])
    RewardSlots: Node[] = [];
    private renderVersion = 0;

    Show(): void {
        this.PlayerIndex = -1;
        super.Show();
        const version = ++this.renderVersion;
        const awards = Supplies.GetAwards();
        this.Panel.getChildByName('领取').getComponent(Button).interactable = !Supplies.Claiming && awards.length > 0;
        this.RewardSlots.forEach((slot, index) => {
            const award = awards[index];
            slot.active = !!award;
            if (!award) return;
            slot.getChildByName('名字').getComponent(Label).string = award.PropName;
            slot.getChildByName('数量').getComponent(Label).string = '×' + award.Count;
            const frame = slot.getComponent(Sprite);
            const icon = slot.getChildByName('图标').getComponent(Sprite);
            frame.spriteFrame = null;
            icon.spriteFrame = null;
            const config = ZRSJZ_PROP_CONFIG.get(award.PropName);
            const current = () => isValid(this.node) && this.renderVersion === version && isValid(slot);
            ZRSJZ_UIManager.Instance.GetPropGridUI(config.Quality + '1_1')?.then(asset => {
                if (current()) frame.spriteFrame = asset;
            }).catch(error => console.warn('[行动补给] 品质框加载失败', error));
            ZRSJZ_UIManager.Instance.GetPropUI(award.PropName)?.then(asset => {
                if (!asset || !current()) return;
                icon.spriteFrame = asset;
                icon.sizeMode = Sprite.SizeMode.CUSTOM;
                const size = asset.originalSize;
                const scale = Math.min(106 / Math.max(1, size.width), 100 / Math.max(1, size.height));
                icon.getComponent(UITransform).setContentSize(size.width * scale, size.height * scale);
            }).catch(error => console.warn('[行动补给] 道具图标加载失败', error));
        });
    }

    public OnRewardClick(_event: EventTouch, index: string): void {
        if (Supplies.Claiming) return;
        const award = Supplies.GetAwards()[Number(index)];
        if (!award) return;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        ZRSJZ_UIManager.Instance.ShowPlayerPanel(ZRSJZ_PANEL.道具弹窗, 0, award.PropName, 0);
    }

    public async OnButtonClick(event: EventTouch): Promise<void> {
        if (Supplies.Claiming) return;
        ZRSJZ_AudioManager.Instance.PlaySound('点击');
        const name = event.getCurrentTarget().name;
        if (name === 'Mask' || name === '关闭') {
            ZRSJZ_UIManager.Instance.HidePanel(this.PanelName);
            return;
        }
        if (name !== '领取' || !ZRSJZ_UIManager.ZRSJZ_DLC) return;
        const awards = Supplies.GetAwards();
        if (!awards.length || awards.some(award => !ZRSJZ_PROP_CONFIG.has(award.PropName))) return;
        Supplies.Claiming = true;
        const button = this.Panel.getChildByName('领取').getComponent(Button);
        button.interactable = false;
        try {
            const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards(awards);
            Supplies.CompleteClaim();
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_SUPPLIES_CHANGE);
            ZRSJZ_UIManager.Instance.HidePanel(this.PanelName);
            ZRSJZ_UIManager.Instance.ShowTip(result.MailID ? '补给已领取，仓库放不下的道具已发送邮件' : '行动补给已领取');
        } catch (error) {
            console.error('[行动补给] 领取失败', error);
            ZRSJZ_UIManager.Instance.ShowTip('领取异常，请稍后重试');
        } finally {
            Supplies.Claiming = false;
            if (isValid(button)) button.interactable = true;
        }
    }
}
