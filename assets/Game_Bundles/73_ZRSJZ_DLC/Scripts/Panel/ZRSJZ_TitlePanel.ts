import { _decorator, Label, Node, ScrollView, Sprite, Color, RichText, find } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_TITLE_CONFIG, ZRSJZ_PANEL } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_TitleService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_TitleService';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_TitleShine } from '../../../73_ZRSJZ/Scripts/UI/ZRSJZ_TitleShine';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_TitlePanel')
export class ZRSJZ_TitlePanel extends ZRSJZ_Panel {
    private selected = '';
    private bound = false;
    private content: Node;
    private Bind(): void {
        if (this.bound) return;
        this.Panel = this.node.getChildByName('Panel');
        this.content = this.Panel.getChildByName('称号列表').getChildByName('Content');
        const click = (node: Node, callback: () => void) => node.on(Node.EventType.TOUCH_END, () => {
            ZRSJZ_AudioManager.Instance?.PlaySound('点击');
            callback();
        }, this);
        click(this.Panel.getChildByName('关闭'), () => ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.称号弹窗));
        for (const item of ZRSJZ_TITLE_CONFIG) {
            const row = this.content.getChildByName(item.name);
            const icon = row.getChildByName('图标');
            if (icon && !icon.getComponent(ZRSJZ_TitleShine)) icon.addComponent(ZRSJZ_TitleShine);
            click(row, () => { this.selected = item.name; this.Refresh(); });
        }
        click(this.Panel.getChildByName('使用'), () => {
            if (!ZRSJZ_TitleService.IsOwned(this.selected)) {
                ZRSJZ_UIManager.Instance.ShowTip(ZRSJZ_TitleService.GetUnlockHint(this.selected));
                return;
            }
            if (ZRSJZ_TitleService.GetEquipped() === this.selected) {
                ZRSJZ_UIManager.Instance.ShowTip('该称号已穿戴');
                return;
            }
            ZRSJZ_TitleService.Equip(this.selected);
            this.Refresh();
        });
        this.bound = true;
        find("Mask", this.node).on(Node.EventType.TOUCH_END, () => {
            ZRSJZ_AudioManager.Instance?.PlaySound('点击');
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.称号弹窗);
        })
    }
    public Show(): void {
        this.Bind();
        this.selected = ZRSJZ_TitleService.GetEquipped()
            || ZRSJZ_TITLE_CONFIG.find(item => ZRSJZ_TitleService.IsOwned(item.name))?.name
            || ZRSJZ_TITLE_CONFIG[0].name;
        super.Show();
        this.Panel.getChildByName('称号列表').getComponent(ScrollView).scrollToTop(0);
        this.Refresh();
    }
    private Refresh(): void {
        const equipped = ZRSJZ_TitleService.GetEquipped();
        let owned = 0;
        for (const item of ZRSJZ_TITLE_CONFIG) {
            const row = this.content.getChildByName(item.name);
            const unlocked = ZRSJZ_TitleService.IsOwned(item.name);
            if (unlocked) owned++;
            row.getChildByName('锁').active = !unlocked;
            row.getChildByName('选中框').active = this.selected === item.name;
            row.getChildByName('已穿戴').active = equipped === item.name;
        }
        this.Panel.getChildByName('已获得数量').getComponent(Label).string = '已获得称号:' + owned + '/' + ZRSJZ_TITLE_CONFIG.length;
        const button = this.Panel.getChildByName('使用');
        button.active = ZRSJZ_TitleService.IsOwned(this.selected) && equipped !== this.selected;
        (button.getChildByName('穿戴') ?? button.getChildByName('文字')).getComponent(Label).string = '穿戴';
        button.getComponent(Sprite).color = Color.WHITE;
        const worn = this.Panel.getChildByName('已穿戴');
        if (worn) worn.active = equipped === this.selected;
        this.RefreshUnlockCondition();
    }
    private RefreshUnlockCondition(): void {
        const node = this.Panel.getChildByName('解锁条件');
        if (!node) return;
        node.active = !ZRSJZ_TitleService.IsOwned(this.selected);
        if (!node.active) return;
        const condition = ZRSJZ_TITLE_CONFIG.find(item => item.name === this.selected)?.unlockCondition;
        if (!condition) return;
        const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const color = /^#[0-9a-f]{6}$/i.test(condition.color ?? '') ? condition.color : '#37C5FF';
        const text = condition.keyword ? condition.text.split(condition.keyword).map(escape)
            .join(`<color=${color}>${escape(condition.keyword)}</color>`) : escape(condition.text);
        const label = node.getComponent(RichText) ?? node.addComponent(RichText);
        label.fontColor = Color.WHITE;
        label.string = `<outline color=#20242B width=2>${text}</outline>`;
    }
}
