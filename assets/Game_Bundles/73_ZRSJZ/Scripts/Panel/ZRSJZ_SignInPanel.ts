import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, Button, director, find, Label, Node, Sprite, SpriteFrame, Tween, tween, UITransform, v3, Widget } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_PANEL, ZRSJZ_ROLE_CONFIG, ZRSJZ_SKIN_CONFIG, ZRSJZ_WEAPON_SKIN } from '../ZRSJZ_Constant';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';

import { ZRSJZ_GameData } from '../ZRSJZ_GameData';

const { ccclass, property } = _decorator;

type SignInReward = {
    name: string;
    countText: string;
    gold?: number;
    propName?: string;
    propCount?: number;
    weaponSkin?: { weaponName: string; skinName: string };
    roleSkin?: { roleName: string; skinName: string };
    /** 视频皮肤没有金币售价时，单独指定重复领取的折算价值。 */
    duplicateGold?: number;
};

const SIGN_IN_REWARDS: readonly SignInReward[] = [
    { name: '钞票', countText: 'x100万', gold: 1000000 },
    { name: 'K50-云雾', countText: 'x1', weaponSkin: { weaponName: 'K50-轻机枪', skinName: 'K50-云雾' } },
    { name: '钞票', countText: 'x300万', gold: 3000000 },
    { name: '烬猎', countText: 'x1', roleSkin: { roleName: '威蓝', skinName: '烬猎' } },
    { name: '钞票', countText: 'x500万', gold: 5000000 },
    { name: 'W76-狙击枪', countText: 'x1', propName: 'W76-狙击枪', propCount: 1 },
    { name: 'W76-紫墟', countText: 'x1', weaponSkin: { weaponName: 'W76-狙击枪', skinName: 'W76-紫墟' }, duplicateGold: 7000000 },
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
        // if (ZRSJZ_AccountService.IsSignInCompleted()) {
        //     this.node.active = false;
        //     return;
        // }
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
            item.on(Node.EventType.TOUCH_END, () => void this.OnSignItemClick(dayIndex), this);
        }
    }

    private RefreshSignItems(): void {
        const claimedCount = ZRSJZ_AccountService.GetSignInClaimedCount();
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

    private async OnSignItemClick(dayIndex: number): Promise<void> {
        const claimedCount = ZRSJZ_AccountService.GetSignInClaimedCount();
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

        const reward = SIGN_IN_REWARDS[dayIndex];
        if (!reward) return;
        // 先验证皮肤及折算配置，避免未发奖励就占用当天签到。
        const skinReward = this.ResolveSkinReward(reward);
        if ((reward.weaponSkin || reward.roleSkin) && !skinReward) {
            console.error('[ZRSJZ_SignInPanel] 签到皮肤奖励配置无效', reward);
            ZRSJZ_UIManager.Instance.ShowTip('奖励配置异常，请稍后再试');
            return;
        }

        const claimedDayIndex = ZRSJZ_AccountService.ClaimSignInReward();
        if (claimedDayIndex !== dayIndex) {
            this.RefreshSignItems();
            return;
        }

        let sentToMail = false;
        let convertedGold = 0;
        if (reward.gold) {
            ZRSJZ_AccountService.ChangeGold(reward.gold);
            ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
        } else if (skinReward) {
            if (skinReward.owned) {
                convertedGold = skinReward.gold;
                ZRSJZ_AccountService.ChangeGold(convertedGold);
                ZRSJZ_UIManager.Instance.ShowCurrencyEffect();
            } else if (reward.weaponSkin) {
                ZRSJZ_AccountService.AddWeaponSkin(reward.weaponSkin.weaponName, reward.weaponSkin.skinName);
            } else {
                ZRSJZ_AccountService.AddSkin(reward.roleSkin.roleName, reward.roleSkin.skinName);
            }
        } else if (reward.propName) {
            const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards([{
                PropName: reward.propName,
                Count: reward.propCount ?? 1,
            }]);
            if (result.MailAwards.length > 0) {
                sentToMail = true;
            }
        }

        this.RefreshSignItems();
        ZRSJZ_UIManager.Instance.ShowTip(
            convertedGold > 0
                ? `签到成功，已拥有${reward.name}，已折算为${convertedGold}金币`
                : sentToMail
                    ? `签到成功，${reward.name}${reward.countText}已发送至邮件`
                    : `签到成功，获得${reward.name}${reward.countText}`,
        );
        if (ZRSJZ_AccountService.IsSignInCompleted()) {
            this.ClosePanel();
        }
    }

    private ResolveSkinReward(reward: SignInReward): { owned: boolean; gold: number } | null {
        let owned: boolean;
        let price: number;
        if (reward.weaponSkin) {
            const { weaponName, skinName } = reward.weaponSkin;
            const config = ZRSJZ_WEAPON_SKIN.get(weaponName)?.find(skin => skin.Name === skinName);
            if (!config) return null;
            owned = ZRSJZ_AccountService.HasWeaponSkin(weaponName, skinName);
            price = config.UnlockType === '金币' ? config.Price : 0;
        } else if (reward.roleSkin) {
            const { roleName, skinName } = reward.roleSkin;
            const config = ZRSJZ_SKIN_CONFIG.get(skinName);
            if (!config || !ZRSJZ_ROLE_CONFIG.get(roleName)?.Skin.includes(skinName)) return null;
            owned = (ZRSJZ_GameData.Instance.HaveSkin ?? []).includes(skinName);
            price = config.UnlockType === '金币' ? config.UnlockPrice : 0;
        } else {
            return null;
        }
        const gold = reward.duplicateGold ?? price;
        if (!Number.isFinite(gold) || gold <= 0 || !Number.isInteger(gold)) return null;
        return { owned, gold };
    }

    private ClosePanel(): void {
        ZRSJZ_AudioManager.Instance.PlaySound("点击");
        ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.签到弹窗);
    }

    private CanClaimToday(): boolean {
        return ZRSJZ_AccountService.CanClaimSignInReward();
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

