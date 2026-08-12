import { _decorator, Button, director, find, Label, Node, Sprite, SpriteFrame, Tween, tween, UITransform, v3, Widget } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';

const { ccclass, property } = _decorator;

type SignInReward = {
    name: string;
    countText: string;
    gold?: number;
    propName?: string;
    propCount?: number;
};

const SIGN_IN_REWARDS: readonly SignInReward[] = [
    { name: '金币', countText: 'x100万', gold: 1000000 },
    { name: '金币', countText: 'x200万', gold: 2000000 },
    { name: '金币', countText: 'x300万', gold: 3000000 },
    { name: '金币', countText: 'x400万', gold: 4000000 },
    { name: '金币', countText: 'x500万', gold: 5000000 },
    { name: '金币', countText: 'x600万', gold: 6000000 },
    { name: 'W76-狙击枪', countText: 'x1', propName: 'W76-狙击枪', propCount: 1 },
];

@ccclass('ZRSJZ_SignInPanel')
export class ZRSJZ_SignInPanel extends ZRSJZ_Panel {
    private static _entryButton: Node = null;

    @property([SpriteFrame])
    SignItemSFs: SpriteFrame[] = [];

    private _signItems: Node[] = [];

    protected onLoad(): void {
        this.BindCloseButton();
        this.BindSignItems();
    }

    public Show(...args: any[]): void {
        if (ZRSJZ_GameData.Instance.IsSignInCompleted()) {
            this.node.active = false;
            return;
        }
        this.RefreshSignItems();
        super.Show(...args);
    }



    private BindCloseButton(): void {
        const closeButton = find('Panel/关闭', this.node);
        if (!closeButton) {
            console.warn('[ZRSJZ_SignInPanel] 未找到关闭按钮');
            return;
        }

        const button = closeButton.getComponent(Button) ?? closeButton.addComponent(Button);
        button.target = closeButton;
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.9;
        closeButton.on(Node.EventType.TOUCH_END, this.ClosePanel, this);
    }

    private BindSignItems(): void {
        const items = find('Panel/All/Items', this.node);
        const all = find('Panel/All', this.node);
        for (let dayIndex = 0; dayIndex < SIGN_IN_REWARDS.length; dayIndex++) {
            const itemName = `SignItem${dayIndex + 1}`;
            const item = items?.getChildByName(itemName) ?? all?.getChildByName(itemName);
            if (!item) {
                console.warn(`[ZRSJZ_SignInPanel] 未找到 ${itemName}`);
                continue;
            }

            this._signItems[dayIndex] = item;
            const button = item.getComponent(Button) ?? item.addComponent(Button);
            button.target = item;
            button.transition = Button.Transition.SCALE;
            button.zoomScale = 0.96;
            item.on(Node.EventType.TOUCH_END, () => this.OnSignItemClick(dayIndex), this);
        }
    }

    private RefreshSignItems(): void {
        const claimedCount = ZRSJZ_GameData.Instance.GetSignInClaimedCount();
        const canClaimToday = this.CanClaimToday();

        for (let dayIndex = 0; dayIndex < SIGN_IN_REWARDS.length; dayIndex++) {
            const item = this._signItems[dayIndex];
            if (!item) continue;

            const reward = SIGN_IN_REWARDS[dayIndex];
            this.SetLabel(item, 'Title', `第${this.GetChineseDay(dayIndex + 1)}天`);
            this.SetLabel(item, 'Name', reward.name);
            this.SetLabel(item, 'Count', reward.countText);

            const checked = item.getChildByName('Checked');
            const signed = item.getChildByName('已签到');
            const state = item.getChildByName('State');
            const isClaimed = dayIndex < claimedCount;
            const isCurrentDay = dayIndex === claimedCount;
            const isClaimable = isCurrentDay && canClaimToday;

            // 前六天只有“可领取”状态使用高亮底图，其余状态统一使用普通底图。
            if (dayIndex < 6 && this.SignItemSFs.length >= 2) {
                const itemSprite = item.getComponent(Sprite);
                if (itemSprite) itemSprite.spriteFrame = this.SignItemSFs[isClaimable ? 1 : 0];
            }

            if (checked) {
                Tween.stopAllByTarget(checked);
                checked.setScale(v3(1, 1, 1));
                checked.active = isClaimable;
                if (isClaimable) {
                    tween(checked)
                        .to(0.5, { scale: v3(1.06, 1.06, 1) }, { easing: 'sineInOut' })
                        .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'sineInOut' })
                        .union()
                        .repeatForever()
                        .start();
                }
            }
            if (signed) signed.active = isClaimed;

            if (state) {
                if (isClaimed) {
                    this.SetNodeLabel(state, '已签到');
                } else if (isClaimable) {
                    this.SetNodeLabel(state, '可领取');
                } else {
                    this.SetNodeLabel(state, '待领取');
                }
            }
        }
    }

    private OnSignItemClick(dayIndex: number): void {
        const claimedCount = ZRSJZ_GameData.Instance.GetSignInClaimedCount();
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        if (dayIndex < claimedCount) {
            ZRSJZ_UIManager.Instance.ShowTip('该奖励已经领取');
            return;
        }
        if (dayIndex > claimedCount) {
            ZRSJZ_UIManager.Instance.ShowTip('请按顺序完成签到');
            return;
        }
        if (!this.CanClaimToday()) {
            ZRSJZ_UIManager.Instance.ShowTip('今日已经签到，请明天再来');
            return;
        }

        const claimedDayIndex = ZRSJZ_GameData.Instance.ClaimSignInReward();
        if (claimedDayIndex !== dayIndex) {
            this.RefreshSignItems();
            return;
        }

        const reward = SIGN_IN_REWARDS[dayIndex];
        if (reward.gold) {
            ZRSJZ_GameData.Instance.ChangeGold(reward.gold);
            ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
        } else if (reward.propName) {
            ZRSJZ_GameData.Instance.AddPropByName(reward.propName, reward.propCount ?? 1);
            ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE);
        }

        this.RefreshSignItems();
        ZRSJZ_UIManager.Instance.ShowTip(`签到成功，获得${reward.name}${reward.countText}`);
        if (ZRSJZ_GameData.Instance.IsSignInCompleted()) {
            this.ClosePanel();
        }
    }

    private ClosePanel(): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.签到弹窗);
    }

    private CanClaimToday(): boolean {
        return ZRSJZ_GameData.Instance.CanClaimSignInReward();
    }

    private SetLabel(item: Node, childName: string, text: string): void {
        const label = item.getChildByName(childName)?.getComponent(Label);
        if (label) label.string = text;
    }

    private SetNodeLabel(node: Node, text: string): void {
        const label = node.getComponent(Label);
        if (label) label.string = text;
    }

    private GetChineseDay(day: number): string {
        return ['一', '二', '三', '四', '五', '六', '七'][day - 1] ?? `${day}`;
    }
}
