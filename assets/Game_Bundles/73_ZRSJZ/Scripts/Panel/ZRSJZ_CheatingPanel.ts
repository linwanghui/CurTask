import { ZRSJZ_InventoryService } from "../Service/ZRSJZ_InventoryService";
import { ZRSJZ_AccountService } from "../Service/ZRSJZ_AccountService";
import { _decorator, Component, EditBox, EventTouch, Node, Label, instantiate, Button } from 'cc';
import { ZRSJZ_LevelProgressService } from '../Service/ZRSJZ_LevelProgressService';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_INVENTORY, ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG, ZRSJZ_AVATAR_FRAME_UNLOCK, ZRSJZ_TITLE_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_BoosterShotService } from '../Service/ZRSJZ_BoosterShotService';
import { ZRSJZ_FragmentService } from "../Service/ZRSJZ_FragmentService";
import { ZRSJZ_EnhancementService } from '../Service/ZRSJZ_EnhancementService';
import { ZRSJZ_BattlePassService } from '../Service/ZRSJZ_BattlePassService';
import { ZRSJZ_AchievementService } from '../Service/ZRSJZ_AchievementService';
import { ZRSJZ_BATTLE_PASS_CONFIG } from '../ZRSJZ_BattlePassConfig';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_CheatingPanel')
export class ZRSJZ_CheatingPanel extends ZRSJZ_Panel {

    @property(EditBox)
    PropName: EditBox = null;

    @property(EditBox)
    PropCount: EditBox = null;
    private _matches: string[] = [];
    private _matchPage = 0;
    private _matchCount = 1;
    private _adding = false;
    private _matchRows: Node[] = [];

    public static FindRelatedProps(query: string): string[] {
        const chars = Array.from(new Set(Array.from(query.trim().toLowerCase()).filter(c => !/\s/.test(c))));
        if (!chars.length) return [];
        return Array.from(ZRSJZ_PROP_CONFIG.keys()).filter(name => chars.some(c => name.toLowerCase().includes(c)));
    }

    private RenderMatches(): void {
        const window = this.node.getChildByName('道具候选窗口');
        if (!window) { void ZRSJZ_UIManager.Instance.ShowTip('道具候选窗口缺失，请更新预制体'); return; }
        window.active = true;
        const template = window.getChildByName('候选模板');
        if (!this._matchRows.length && template) {
            for (let i = 0; i < 6; i++) {
                const row = instantiate(template); row.name = `候选_${i}`; row.parent = window;
                row.setPosition(0, 140 - i * 50, 0); this._matchRows.push(row);
            }
        }
        const pages = Math.max(1, Math.ceil(this._matches.length / 6));
        this._matchPage = Math.max(0, Math.min(pages - 1, this._matchPage));
        window.getChildByName('说明').getComponent(Label).string = `相关道具 ${this._matches.length} 个 · 选择后添加 ×${this._matchCount}`;
        window.getChildByName('页码').getComponent(Label).string = `${this._matchPage + 1} / ${pages}`;
        for (let i = 0; i < this._matchRows.length; i++) {
            const name = this._matches[this._matchPage * 6 + i], row = this._matchRows[i];
            row.active = !!name;
            row.getChildByName('Text').getComponent(Label).string = name || '';
        }
        window.getChildByName('上一页').getComponent(Button).interactable = this._matchPage > 0;
        window.getChildByName('下一页').getComponent(Button).interactable = this._matchPage + 1 < pages;
    }

    private async AddSelected(name: string, count: number): Promise<void> {
        if (this._adding) return;
        this._adding = true;
        try {
            if (await this.AddProp(name, count)) {
                if (!this.isValid) return;
                this.PropName.string = name;
                const window = this.node.getChildByName('道具候选窗口'); if (window) window.active = false;
            }
        } catch (error) {
            console.error('[作弊道具] 添加失败', error);
            if (this.isValid) void ZRSJZ_UIManager.Instance.ShowTip('添加失败，请稍后重试');
        } finally { this._adding = false; }
    }

    public Show(...args: any[]): void {
        super.Show(...args);
        const window = this.node.getChildByName('道具候选窗口'); if (window) window.active = false;
    }

    /**
     * 根据道具名称和数量向综合仓库添加道具。
     * 示例：AddProp("苹果", 10)。成功返回 true，参数无效或找不到配置时返回 false。
     */
    public async AddProp(propName: string, count: number = 1): Promise<boolean> {
        const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards([{
            PropName: propName,
            Count: count,
        }]);
        if (result.InvalidAwards.length > 0) {
            ZRSJZ_UIManager.Instance.ShowTip("道具名称或数量无效");
            console.warn(`[ZRSJZ_CheatingPanel] 添加道具失败，名称或数量无效: ${propName}, ${count}`);
            return false;
        }
        if (result.MailAwards.length > 0) {
            ZRSJZ_UIManager.Instance.ShowTip("仓库空间不足，剩余道具已发送至邮件");
        } else {
            ZRSJZ_UIManager.Instance.ShowTip("道具已添加到仓库");
        }
        return true;
    }

    private async AddAllProps(): Promise<void> {
        const result = await ZRSJZ_UIManager.Instance.ReceivePropAwards(
            Array.from(ZRSJZ_PROP_CONFIG.keys()).map(PropName => ({ PropName, Count: 1 })),
        );
        void ZRSJZ_UIManager.Instance.ShowTip(
            result.MailAwards.length > 0
                ? "仓库空间不足，放不下的道具已发送至邮件"
                : "所有道具已添加到仓库",
        );
    }

    OnButtonClick(event: EventTouch) {
        if (ZRSJZ_UIManager.Dragging) return;
        const target = event.getCurrentTarget().name;
        if (target.startsWith('候选_')) {
            const name = this._matches[this._matchPage * 6 + Number(target.slice(3))];
            if (name) void this.AddSelected(name, this._matchCount);
            return;
        }
        switch (target) {
            case '完成全部成就':
                ZRSJZ_AchievementService.DebugCompleteAll();
                void ZRSJZ_UIManager.Instance.ShowTip('全部成就已完成，请前往成就界面领取奖励');
                break;
            case '战令等级加10': {
                ZRSJZ_BattlePassService.EnsurePeriods();
                const before = ZRSJZ_BattlePassService.GetLevel();
                const config = ZRSJZ_BATTLE_PASS_CONFIG;
                if (before >= config.maxLevel) {
                    void ZRSJZ_UIManager.Instance.ShowTip('战令已满级');
                    break;
                }
                const state = ZRSJZ_GameData.Instance.BattlePass;
                state.exp = Math.min(config.maxLevel * config.expPerLevel, state.exp + 10 * config.expPerLevel);
                ZRSJZ_GameData.SaveData();
                void ZRSJZ_UIManager.Instance.ShowTip(`战令等级 +${ZRSJZ_BattlePassService.GetLevel() - before}，当前 Lv.${ZRSJZ_BattlePassService.GetLevel()}`);
                break;
            }
            case '免费强化':
                ZRSJZ_EnhancementService.FreeUpgradeEnabled = true;
                void ZRSJZ_UIManager.Instance.ShowTip('本次游戏已开启免费强化：免材料、免金币');
                break;
            case '关闭候选':
                this.node.getChildByName('道具候选窗口').active = false;
                break;
            case '上一页': this._matchPage--; this.RenderMatches(); break;
            case '下一页': this._matchPage++; this.RenderMatches(); break;
            case '一键关卡全开':
                ZRSJZ_LevelProgressService.UnlockAll();
                void ZRSJZ_UIManager.Instance.ShowTip('全部关卡已解锁');
                break;
            case "Mask":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.作弊界面);
                break;
            case "所有道具加1":
                void this.AddAllProps();
                break;
            case "主库加一行":
                ZRSJZ_InventoryService.AddInventoryRow(ZRSJZ_INVENTORY.仓库_全部, 1);
                break;
            case "装备加一行":
                ZRSJZ_InventoryService.AddInventoryRow(ZRSJZ_INVENTORY.仓库_装备, 1);
                break;
            case "保险箱加一行":
                ZRSJZ_InventoryService.AddInventoryRow(ZRSJZ_INVENTORY.保险箱, 1);
                break;
            case "无限火力":
                ZRSJZ_Game.Instance.UnlimitedFirepower = true;
                break;
            case "超级高爆":
                ZRSJZ_BoosterShotService.SuperHighDropEnabled = !ZRSJZ_BoosterShotService.SuperHighDropEnabled;
                ZRSJZ_UIManager.Instance.ShowTip(ZRSJZ_BoosterShotService.SuperHighDropEnabled
                    ? "超级高爆已开启：红色物资爆率提升至50倍"
                    : "超级高爆已关闭");
                break;
            case "获得所有头像框和称号": {
                const data = ZRSJZ_GameData.Instance;
                data.OwnedAvatarFrames = Array.from(new Set([...(data.OwnedAvatarFrames ?? []), ...Object.keys(ZRSJZ_AVATAR_FRAME_UNLOCK)]));
                data.OwnedTitles = Array.from(new Set([...(data.OwnedTitles ?? []), ...ZRSJZ_TITLE_CONFIG.map(item => item.name)]));
                ZRSJZ_GameData.SaveData();
                ZRSJZ_EventManager.EmitPersist(ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE);
                ZRSJZ_UIManager.Instance.ShowTip('已获得所有头像框和称号');
                break;
            }
            case "金币加1000W":
                ZRSJZ_AccountService.ChangeGold(10000000);
                break;
            case "宠物碎片加100":
                ZRSJZ_FragmentService.CreateVideoReward(100)();
                break;
            case "英雄碎片加100":
                ZRSJZ_FragmentService.CreateVideoReward(100, '英雄碎片')();
                break;
            case "高价值装备":
                const weapons: string[] = ["兔月盔", "竹月盔", "萌龙盔", "裂光盔", "弑神盔", "光明盔", "冥辉盔",
                    "兔萌甲", "玄竹甲", "绿龙甲", "星轨甲", "赤锋甲", "圣翎甲", "噬星甲",
                    "兔绒包", "云竹包", "恐仔囊", "天穹包", "赤辉囊", "烬菱包", "虚空匣",
                    "霜月狼", "裂海鲨", "焚天龙",
                ];
                weapons.forEach(name => {
                    this.AddProp(name, 1);
                })
                break;
            case "添加道具": {
                const name = this.PropName.string.trim(), count = Number(this.PropCount.string);
                if (!name) { void ZRSJZ_UIManager.Instance.ShowTip('请输入道具名称或关键字'); break; }
                if (!Number.isSafeInteger(count) || count <= 0) { void ZRSJZ_UIManager.Instance.ShowTip('数量必须是正整数'); break; }
                if (ZRSJZ_PROP_CONFIG.has(name)) void this.AddSelected(name, count);
                else {
                    this._matches = ZRSJZ_CheatingPanel.FindRelatedProps(name);
                    this._matchPage = 0; this._matchCount = count;
                    if (this._matches.length) this.RenderMatches();
                    else void ZRSJZ_UIManager.Instance.ShowTip('没有找到包含这些字的道具');
                }
                break;
            }

        }
    }
}
