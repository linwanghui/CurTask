import { _decorator, Color, instantiate, Label, Node, ScrollView, Sprite, SpriteFrame, UITransform, UIOpacity } from 'cc';
import { EDITOR } from 'cc/env';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_AchievementService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_AchievementService';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PANEL, ZRSJZ_AchievementConfig, ZRSJZ_AchievementReward, ZRSJZ_ACHIEVEMENT_CONFIG, ZRSJZ_ACHIEVEMENT_MILESTONE_CONFIG } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_AchievementPanel')
export class ZRSJZ_AchievementPanel extends ZRSJZ_Panel {
    @property(SpriteFrame) completedBackground: SpriteFrame = null;
    @property(SpriteFrame) normalNumberFrame: SpriteFrame = null;
    @property(SpriteFrame) completedNumberFrame: SpriteFrame = null;
    @property(SpriteFrame) milestoneReachedFrame: SpriteFrame = null;
    @property(SpriteFrame) milestoneLockedFrame: SpriteFrame = null;

    private content: Node = null;
    private rowTemplate: Node = null;
    private scroll: ScrollView = null;
    private progress: Sprite = null;
    private claimAll: Node = null;
    private tabs: Node[] = [];
    private milestones: Node[] = [];
    private filter: 'all' | 'completed' = 'all';
    private bound = false;
    private normalBackground: SpriteFrame = null;
    private goldRewardFrame: SpriteFrame = null;
    private interactiveRows = new WeakSet<Node>();

    protected onLoad(): void { this.Bind(); }
    public Show(): void {
        this.Bind();
        this.filter = 'all';
        super.Show();
        this.Refresh();
    }
    private Click(node: Node, callback: () => void): void {
        node.on(Node.EventType.TOUCH_END, () => {
            ZRSJZ_AudioManager.Instance?.PlaySound('点击');
            callback();
        }, this);
    }
    private Bind(): void {
        if (this.bound) return;
        this.Panel = this.node.getChildByName('Panel');
        this.scroll = this.Panel.getChildByName('成就列表').getComponent(ScrollView);
        this.content = this.scroll.node.getChildByName('Content');
        this.scroll.content = this.content;
        this.rowTemplate = this.content.getChildByName('成就条目模板')
            ?? this.content.children.find(row => row.name.startsWith('成就-'));
        if (!this.rowTemplate) throw new Error('成就列表缺少成就条目，请重新导入成就界面预制体');
        this.goldRewardFrame = this.content.getChildByName('成就-初入战场')?.getChildByName('奖励图标')?.getComponent(Sprite)?.spriteFrame;
        if (this.rowTemplate.name === '成就条目模板') this.rowTemplate.active = false;
        const normalRow = this.content.children.find(row => row.getChildByName('前往')?.active);
        this.normalBackground = (normalRow ?? this.rowTemplate).getComponent(Sprite).spriteFrame;
        this.progress = this.Panel.getChildByName('进度').getComponent(Sprite);
        this.progress.type = Sprite.Type.FILLED;
        this.progress.fillType = Sprite.FillType.HORIZONTAL;
        this.claimAll = this.Panel.getChildByName('领取所有奖励');
        const tabBox = this.Panel.getChildByName('选项框');
        this.tabs = [tabBox.getChildByName('全部'), tabBox.getChildByName('已完成')];
        this.Click(this.Panel.getChildByName('返回'), () => ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.成就界面));
        this.tabs.forEach((tab, index) => this.Click(tab, () => {
            this.filter = index ? 'completed' : 'all';
            this.Refresh();
        }));
        this.milestones = ZRSJZ_AchievementService.Milestones.map(percent =>
            this.Panel.getChildByName('里程碑' + percent));
        this.Click(this.Panel.getChildByName('进度框').getChildByName('进度领奖区域'), () =>
            this.ClaimMilestone(ZRSJZ_AchievementService.GetNextMilestone()));
        this.Click(this.progress.node, () => this.ClaimMilestone(ZRSJZ_AchievementService.GetNextMilestone()));
        this.Click(this.Panel.getChildByName('宝箱'), () =>
            this.ClaimMilestone(ZRSJZ_AchievementService.GetNextMilestone()));
        this.Click(this.claimAll, () => {
            const result = ZRSJZ_AchievementService.ClaimAllRewards();
            if (result.count) this.ShowRewards(result.rewards);
            else ZRSJZ_UIManager.Instance.ShowTip('暂无可领取奖励');
            this.Refresh();
        });
        this.bound = true;
    }
    private ClaimMilestone(percent: number): void {
        const state = ZRSJZ_AchievementService.GetMilestoneState(percent);
        if (state === 'claimed') {
            ZRSJZ_UIManager.Instance.ShowTip('奖励已领取');
        } else if (state === 'locked') {
            ZRSJZ_UIManager.Instance.ShowTip('完成度不足');
        } else if (ZRSJZ_AchievementService.ClaimMilestone(percent)) {
            this.ShowRewards(ZRSJZ_ACHIEVEMENT_MILESTONE_CONFIG.find(item => item.percent === percent).rewards);
            this.Refresh();
        } else ZRSJZ_UIManager.Instance.ShowTip('奖励配置错误');
    }
    private Refresh(): void {
        const completed = ZRSJZ_AchievementService.GetCompletedCount();
        const data = ZRSJZ_GameData.Instance;
        this.UpdateProgress(completed, ZRSJZ_AchievementService.Items.length, data.AchievementMilestonesClaimed);
        this.tabs.forEach((tab, index) => {
            const selected = (this.filter === 'completed') === (index === 1);
            tab.getChildByName(index ? '已完成选中' : '全部选中').active = selected;
            tab.getChildByName(index ? '已完成文字' : '全部文字').getComponent(Label).color = selected
                ? new Color(255, 255, 255) : new Color(29, 37, 44);
        });
        const canClaim = ZRSJZ_AchievementService.Items.some(item =>
            ZRSJZ_AchievementService.IsCompleted(item) && !data.AchievementClaimed.includes(item.id));
        (this.claimAll.getComponent(UIOpacity) ?? this.claimAll.addComponent(UIOpacity)).opacity = canClaim ? 255 : 150;
        const items = ZRSJZ_AchievementService.Items.filter(item => this.filter === 'all' || ZRSJZ_AchievementService.IsCompleted(item));
        this.content.children.forEach(row => row.active = false);
        items.forEach((item, index) => this.AddRow(item, index, ZRSJZ_AchievementService.GetProgress(item.id),
            ZRSJZ_AchievementService.IsCompleted(item), data.AchievementClaimed.includes(item.id), true));
        this.Panel.getChildByName('暂无成就').active = items.length === 0;
        this.ResetList(items.length);
    }
    private ShowRewards(rewards: readonly ZRSJZ_AchievementReward[]): void {
        const data = ZRSJZ_GameData.Instance;
        const merged = new Map<string, { TaskAwardName: string; TaskAwardCount: number; Icon?: SpriteFrame }>();
        for (const reward of rewards) {
            // Cosmetic rewards still obey their existing unlock rules.
            if (reward.type === '称号' && !data.OwnedTitles?.includes(reward.name)) continue;
            if (reward.type === '头像框' && !data.OwnedAvatarFrames?.includes(reward.id)) continue;
            const name = reward.type === '钞票' ? '钞票' : reward.type === '道具' ? reward.name
                : reward.type === '称号' ? '称号·' + reward.name : '头像框·' + reward.id;
            const count = 'count' in reward ? reward.count : 1;
            const existing = merged.get(name);
            if (existing) existing.TaskAwardCount += count;
            else merged.set(name, {
                TaskAwardName: name, TaskAwardCount: count,
                Icon: reward.type === '称号' || reward.type === '头像框' ? this.milestoneReachedFrame : undefined
            });
        }
        ZRSJZ_UIManager.Instance.ShowPanel(ZRSJZ_PANEL.获取奖励弹窗, { Awards: Array.from(merged.values()), DisplayOnly: true });
    }
    private async UpdateRewardIcon(row: Node, item: ZRSJZ_AchievementConfig): Promise<void> {
        const reward = item.rewards.find(r => r.type === '道具' || r.type === '钞票');
        if (!reward || (reward.type !== '道具' && reward.type !== '钞票')) return;
        const sprite = row.getChildByName('奖励图标')?.getComponent(Sprite);
        if (!sprite) return;
        try {
            const frame = reward.type === '钞票' ? this.goldRewardFrame : await ZRSJZ_UIManager.Instance.GetPropUI(reward.name);
            if (!frame || !row.isValid) return;
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;
            sprite.spriteFrame = frame;
            const scale = Math.min(200 / frame.rect.width, 80 / frame.rect.height, 1);
            sprite.node.setScale(scale, scale, 1);
        } catch (error) { console.error('[Achievement] 奖励图标加载失败', item.id, error); }
    }
    /** 填充、里程碑坐标和数字共用同一完成比例，避免美术摆位与实际进度不一致。 */
    private UpdateProgress(completed: number, total: number, claimed: readonly number[] = []): number {
        const ratio = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
        const percent = Math.floor(ratio * 100);
        this.progress.fillStart = 0;
        this.progress.fillRange = ratio;
        const label = this.Panel.getChildByName('完成率');
        label.active = true;
        label.getComponent(Label).string = '已完成 ' + completed + '/' + total + '（' + percent + '%）';
        const transform = this.progress.node.getComponent(UITransform);
        const width = transform.width * this.progress.node.scale.x;
        const left = this.progress.node.position.x - width * transform.anchorX;
        this.milestones.forEach((node, index) => {
            const milestone = ZRSJZ_AchievementService.Milestones[index];
            node.setPosition(left + width * milestone / 100, node.position.y, node.position.z);
            node.getComponent(Sprite).spriteFrame = percent >= milestone ? this.milestoneReachedFrame : this.milestoneLockedFrame;
            (node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity)).opacity = claimed.includes(milestone) ? 150 : 255;
        });
        const chest = this.Panel.getChildByName('宝箱');
        const chestMilestone = [...ZRSJZ_AchievementService.Milestones]
            .sort((a, b) => a - b).find(value => !claimed.includes(value));
        chest.active = chestMilestone !== undefined;
        if (chest.active) chest.setPosition(left + width * chestMilestone / 100, chest.position.y, chest.position.z);
        const chestClaimable = chest.active && percent >= chestMilestone;
        const chestSprite = chest.getComponent(Sprite);
        chestSprite.grayscale = !chestClaimable;
        chestSprite.color = chestClaimable ? new Color(255, 255, 255) : new Color(150, 150, 150);
        return percent;
    }
    private ResetList(count: number): void {
        this.scroll.stopAutoScroll();
        const viewHeight = this.scroll.node.getComponent(UITransform).height;
        this.content.getComponent(UITransform).setContentSize(1430, Math.max(viewHeight, count * 184));
        this.content.setPosition(0, 0);
    }
    private AddRow(item: ZRSJZ_AchievementConfig, index: number, progress: number, completed: boolean, claimed: boolean, interactive: boolean): void {
        let row = this.content.getChildByName('成就-' + item.id);
        if (!row) {
            row = instantiate(this.rowTemplate);
            row.name = '成就-' + item.id;
            row.parent = this.content;
        }
        row.setPosition(18, -83 - index * 184);
        const referenceRow = this.content.getChildByName('成就-初入战场');
        if (referenceRow && referenceRow !== row) {
            for (const name of ['已领取', '前往']) {
                row.getChildByName(name).setPosition(referenceRow.getChildByName(name).position);
            }
        }
        row.active = true;
        row.getComponent(Sprite).spriteFrame = completed && this.completedBackground
            ? this.completedBackground : this.normalBackground;
        const number = row.getChildByName('序号');
        number.getComponent(Sprite).spriteFrame = completed ? this.completedNumberFrame : this.normalNumberFrame;
        const numberLabel = number.getChildByName('数字').getComponent(Label);
        numberLabel.string = String(index + 1);
        numberLabel.color = completed ? new Color(29, 37, 44) : new Color(255, 255, 255);
        row.getChildByName('名称').getComponent(Label).string = '【' + item.id + '】';
        row.getChildByName('描述').getComponent(Label).string = item.description;
        row.getChildByName('奖励数值').getComponent(Label).string = ZRSJZ_AchievementService.DescribeRewards(item.rewards, '\n');
        if (!EDITOR) void this.UpdateRewardIcon(row, item);
        row.getChildByName('进度').getComponent(Label).string = '(' + (completed ? item.target : Math.min(item.target, Math.floor(progress))) + '/' + item.target + ')';
        const claim = row.getChildByName('领取奖励');
        const go = row.getChildByName('前往');
        claim.active = completed && !claimed;
        go.active = !completed;
        row.getChildByName('已领取').active = claimed;
        if (!interactive || this.interactiveRows.has(row)) return;
        this.interactiveRows.add(row);
        const showRewards = () => ZRSJZ_UIManager.Instance.ShowTip(ZRSJZ_AchievementService.DescribeRewards(item.rewards));
        this.Click(row.getChildByName('奖励数值'), showRewards);
        this.Click(row.getChildByName('奖励图标'), showRewards);
        this.Click(row.getChildByName('已领取'), () => ZRSJZ_UIManager.Instance.ShowTip('奖励已领取'));
        this.Click(claim, () => {
            if (ZRSJZ_AchievementService.Claim(item.id)) {
                this.ShowRewards(item.rewards);
                this.Refresh();
            }
        });
        this.Click(go, () => {
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.成就界面);
            ZRSJZ_UIManager.Instance.ShowPanel(item.destination === 'pets' ? ZRSJZ_PANEL.宠物界面 : ZRSJZ_PANEL.选关界面);
        });
    }
    /** 仅供 Cocos 编辑器预览排版；不读取或写入玩家存档。 */
    public PreviewLayout(): void {
        if (!EDITOR) return;
        this.Bind();
        ZRSJZ_ACHIEVEMENT_CONFIG.forEach((item, index) => this.AddRow(item, index, 0, false, false, false));
        this.ResetList(ZRSJZ_ACHIEVEMENT_CONFIG.length);
        this.UpdateProgress(0, ZRSJZ_ACHIEVEMENT_CONFIG.length);
    }
}
