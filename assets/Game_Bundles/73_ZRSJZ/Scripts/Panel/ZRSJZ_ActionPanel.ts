import { _decorator, Button, EventTouch, instantiate, isValid, Label, Layout, Node, Sprite } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_ACTION_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_ActionService } from '../Service/ZRSJZ_ActionService';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_ActionPanel')
export class ZRSJZ_ActionPanel extends ZRSJZ_Panel {
    private items = new Map<string, Node>();
    private selected = '';
    protected onLoad(): void {
        this.Panel = this.node.getChildByName('Panel');
        const content = this.Panel.getChildByName('所有动作')?.getChildByName('View')?.getChildByName('Content');
        const template = content?.getChildByName('动作Item');
        if (template) {
            template.active = false;
            for (const config of ZRSJZ_ACTION_CONFIG) {
                const item = instantiate(template);
                item.name = '动作Item_' + config.Name; item.parent = content; item.active = true;
                item.getChildByName('Name').getComponent(Label).string = config.Name;
                this.items.set(config.Name, item);
                item.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                    event.propagationStopped = true;
                    this.selected = config.Name; this.Refresh();
                }, this);
                const icon = item.getChildByName('Icon')?.getComponent(Sprite);
                if (icon) {
                    icon.spriteFrame = null;
                    void ZRSJZ_ActionService.LoadIcon(config.Name).then(frame => {
                        if (isValid(icon, true)) icon.spriteFrame = frame;
                    }).catch(error => console.error('[动作] 图标加载失败', config.Name, error));
                }
            }
            content.getComponent(Layout)?.updateLayout();
        }
        this.Panel.getChildByName('装备')?.on(Button.EventType.CLICK, this.Equip, this);
        this.Panel.getChildByName('卸下')?.on(Button.EventType.CLICK, this.Unequip, this);
        this.Panel.getChildByName('关闭')?.on(Button.EventType.CLICK, this.Close, this);
        this.node.getChildByName('Mask')?.on(Button.EventType.CLICK, this.Close, this);
    }
    public Show(): void {
        ZRSJZ_ActionService.RefreshUnlocks();
        this.selected = ZRSJZ_ACTION_CONFIG[0]?.Name ?? '';
        this.Refresh(); super.Show();
    }
    private Refresh(): void {
        const data = ZRSJZ_GameData.Instance;
        for (const [name, item] of this.items) {
            item.getChildByName('Checked').active = name === this.selected;
            item.getChildByName('Lock').active = !data.UnlockedActions.includes(name);
            const order = data.EquippedActions.indexOf(name);
            const equipped = item.getChildByName('已装备');
            equipped.active = order >= 0;
            equipped.getComponent(Label).string = '已装备 ' + (order + 1);
        }
        const unlocked = data.UnlockedActions.includes(this.selected);
        const equipped = data.EquippedActions.includes(this.selected);
        this.Panel.getChildByName('Name').getComponent(Label).string = this.selected;
        this.Panel.getChildByName('装备').active = unlocked && !equipped;
        this.Panel.getChildByName('卸下').active = equipped;
        const condition = this.Panel.getChildByName('解锁条件');
        condition.active = !unlocked;
        condition.getComponent(Label).string = ZRSJZ_ACTION_CONFIG.find(item => item.Name === this.selected)?.Unlock.Description ?? '';
    }
    private Equip(): void {
        const error = ZRSJZ_ActionService.Equip(this.selected);
        if (error) void ZRSJZ_UIManager.Instance.ShowTip(error);
        this.Refresh();
    }
    private Unequip(): void { ZRSJZ_ActionService.Unequip(this.selected); this.Refresh(); }
    private Close(): void { ZRSJZ_UIManager.Instance.HidePanel('73_ZRSJZ_DLC/Prefabs/Panel/动作弹窗'); }
}
