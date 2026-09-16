import { _decorator, Button, Color, Label, Node, ScrollView, Sprite, SpriteFrame, UITransform, Vec2 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_ENHANCEMENT_NODES, ZRSJZ_ENHANCEMENT_STATS, EnhancementStat } from '../ZRSJZ_EnhancementConfig';
import { ZRSJZ_EnhancementService as Upgrade } from '../Service/ZRSJZ_EnhancementService';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_TaskAward } from '../UI/ZRSJZ_TaskAward';
const { ccclass, property } = _decorator;

/** 路线与详情节点保存在预制体中；运行时仅绑定交互、更新显示。 */
@ccclass('ZRSJZ_UpgradePanel')
export class ZRSJZ_UpgradePanel extends ZRSJZ_Panel {
    @property(SpriteFrame) NormalFrame: SpriteFrame = null;
    @property(SpriteFrame) OwnedFrame: SpriteFrame = null;
    @property(SpriteFrame) LevelFrame: SpriteFrame = null;
    @property(SpriteFrame) OwnedLevelFrame: SpriteFrame = null;
    @property(SpriteFrame) LineFrame: SpriteFrame = null;
    @property(SpriteFrame) OwnedLineFrame: SpriteFrame = null;
    @property(SpriteFrame) DottedFrame: SpriteFrame = null;
    @property(SpriteFrame) OwnedDottedFrame: SpriteFrame = null;
    private selected = 'main_1';
    private version = 0;
    private route = new Map<string, Node>();
    private scroll: ScrollView = null;
    private refreshClock = 0;
    private signature = '';
    private materialAwards: ZRSJZ_TaskAward[] = [];
    private materialSetup: Promise<void> = null;
    private static readonly ENOUGH = new Color(18, 185, 67);
    private static readonly LACK = new Color(220, 55, 55);

    private At(path: string): Node { return this.node.getChildByPath(`Panel/${path}`); }
    private Text(path: string, text: string): Label {
        const label = this.At(path).getComponent(Label); label.string = text; return label;
    }
    protected onLoad(): void {
        this.scroll = this.At('Tree/Scroll').getComponent(ScrollView);
        this.At('Close').on(Button.EventType.CLICK, () => ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.强化界面), this);
        this.At('Desc/Upgrade').on(Button.EventType.CLICK, this.Purchase, this);
        for (const config of ZRSJZ_ENHANCEMENT_NODES) {
            const node = this.At(`Tree/Scroll/View/Content/Row_${config.Level}/${config.ID}`);
            this.route.set(config.ID, node);
            node.on(Button.EventType.CLICK, () => {
                this.selected = config.ID;
                ZRSJZ_AudioManager.Instance?.PlaySound('点击');
                this.Refresh();
            }, this);
        }
        void this.EnsureMaterialAwards();
    }
    Show(): void {
        super.Show();
        this.selected = `main_${Math.min(50, Upgrade.Level + 1)}`;
        this.Refresh();
        this.scheduleOnce(() => {
            if (!this.node.activeInHierarchy) return;
            const max = this.scroll.getMaxScrollOffset().y;
            this.scroll.scrollToOffset(new Vec2(0, Math.max(0, Math.min(max, max - Math.max(0, Upgrade.Level - 1) * 210))), 0);
        }, 0);
    }
    protected onDisable(): void { this.version++; this.unscheduleAllCallbacks(); }
    protected update(dt: number): void {
        this.refreshClock += dt;
        if (this.refreshClock < 0.5) return;
        this.refreshClock = 0;
        const config = Upgrade.GetNode(this.selected);
        const signature = `${Upgrade.FreeUpgradeEnabled}:${Upgrade.Level}:${ZRSJZ_GameData.Instance.Gold}:${(ZRSJZ_GameData.Instance.EnhancementSpecials ?? []).join(',')}:${config.Materials.map(m => ZRSJZ_InventoryService.GetPropCountByName(m.PropName)).join(',')}`;
        if (signature !== this.signature) { this.signature = signature; this.Refresh(); }
    }
    private Purchase(): void {
        const result = Upgrade.Purchase(this.selected);
        ZRSJZ_AudioManager.Instance?.PlaySound('点击');
        ZRSJZ_UIManager.Instance.ShowTip(result || '强化成功！');
        this.Refresh();
    }
    private Refresh(): void {
        ++this.version;
        this.Text('Progress', `强化等级  ${Upgrade.Level} / 50`);
        (Object.keys(ZRSJZ_ENHANCEMENT_STATS) as EnhancementStat[]).forEach((stat, index) =>
            this.Text(`Bonuses/Stat${index}`, `${stat}  ${Upgrade.Format(stat, Upgrade.GetBonus(stat))}`));
        for (const config of ZRSJZ_ENHANCEMENT_NODES) {
            const node = this.route.get(config.ID), owned = Upgrade.IsOwned(config);
            node.getComponent(Sprite).spriteFrame = owned ? this.OwnedFrame : this.NormalFrame;
            node.getChildByName('Icon').active = owned || Upgrade.IsAvailable(config);
            const grayIcon = node.getChildByName('GrayIcon');
            grayIcon.active = !owned && !Upgrade.IsAvailable(config);
            this.FitIcon(node.getChildByName('Icon'));
            this.FitIcon(grayIcon);
            node.getChildByName('Selected').active = this.selected === config.ID;
            node.getChildByName('Value').getComponent(Label).string = Upgrade.Format(config.Stat, config.Value);
            node.getChildByName('Status').getComponent(Label).string = config.Special ? (owned ? '已强化' : Upgrade.IsAvailable(config) ? '可强化' : '特殊强化') : '';
            if (config.Special) node.parent.getChildByName('Branch').getComponent(Sprite).spriteFrame = owned ? this.OwnedLineFrame : this.LineFrame;
            if (!config.Special) {
                const row = node.parent;
                const dotted = row.getChildByName('Dotted')?.getComponent(Sprite);
                if (dotted) {
                    dotted.sizeMode = Sprite.SizeMode.TRIMMED;
                    // Dotted 位于当前等级与下一等级之间；下一等级完成后才高亮。
                    dotted.spriteFrame = config.Level < Upgrade.Level
                        ? this.OwnedDottedFrame
                        : this.DottedFrame;
                }
                row.getChildByName('Level').getComponent(Sprite).spriteFrame = owned ? this.OwnedLevelFrame : this.LevelFrame;
                const line = row.getChildByName('Line');
                if (line) line.getComponent(Sprite).spriteFrame = config.Level < Upgrade.Level ? this.OwnedLineFrame : this.LineFrame;
            }
        }
        const config = Upgrade.GetNode(this.selected), owned = Upgrade.IsOwned(config), available = Upgrade.IsAvailable(config);
        const stat = ZRSJZ_ENHANCEMENT_STATS[config.Stat];
        const statLevel = ZRSJZ_ENHANCEMENT_NODES.filter(n => n.Stat === config.Stat && n.Level <= config.Level).length;
        this.Text('Desc/Title', `${config.Stat}强化 Lv.${statLevel}`);
        this.At('Desc/Icon').getComponent(Sprite).spriteFrame = this.route.get(config.ID).getChildByName('Icon').getComponent(Sprite).spriteFrame;
        this.FitIcon(this.At('Desc/Icon'), 90, 96);
        this.Text('Desc/Category', `${config.Special ? '特殊强化' : '基础强化'} · 路线 Lv.${config.Level}`);
        this.Text('Desc/Gain', `本次提升  ${Upgrade.Format(config.Stat, config.Value)}`);
        this.Text('Desc/Total', owned ? `当前累计  ${Upgrade.Format(config.Stat, Upgrade.GetBonus(config.Stat))}`
            : `累计 ${Upgrade.Format(config.Stat, Upgrade.GetBonus(config.Stat))} → ${Upgrade.Format(config.Stat, Upgrade.GetBonus(config.Stat) + config.Value)}`);
        this.Text('Desc/Description', stat.Description);
        const free = Upgrade.FreeUpgradeEnabled, gold = free ? 0 : config.Gold;
        this.Text('Desc/Gold', `${this.Money(ZRSJZ_GameData.Instance.Gold)} / ${this.Money(gold)}`).color = ZRSJZ_GameData.Instance.Gold >= gold ? ZRSJZ_UpgradePanel.ENOUGH : ZRSJZ_UpgradePanel.LACK;
        this.Text('Desc/Requirement', owned ? '该强化已永久生效' : available ? (free ? '本次游戏免费：免材料、免金币' : '消耗以下材料与金币') : config.Special ? `强化达到 Lv.${config.Level} 后可解锁` : `需先完成路线 Lv.${config.Level - 1}`);
        this.Text('Desc/Upgrade/Text', owned ? '已强化' : available ? (free ? '免费强化' : '解锁') : '未解锁');
        const upgradeButton = this.At('Desc/Upgrade');
        upgradeButton.getComponent(Button).interactable = available;
        // 不可点击时隐藏按钮底图，状态文字仍然显示。
        upgradeButton.getComponent(Sprite).enabled = available;
        config.Materials.forEach((material, index) => {
            const count = ZRSJZ_InventoryService.GetPropCountByName(material.PropName);
            const award = this.materialAwards[index];
            if (!award) { void this.EnsureMaterialAwards(); return; }
            const required = free ? 0 : material.Count;
            award.Init(material.PropName, required, `EnhancementMaterial${index}`);
            award.Count.string = `${count}/${required}`;
            award.Count.color = count >= required ? ZRSJZ_UpgradePanel.ENOUGH : ZRSJZ_UpgradePanel.LACK;
        });
    }
    /** 保留图片裁剪后的真实宽高，只做等比缩放；切换图片后重新适配。 */
    private FitIcon(node: Node, width = 90, height = 90): void {
        const sprite = node.getComponent(Sprite), frame = sprite.spriteFrame;
        if (!frame || frame.rect.width <= 0 || frame.rect.height <= 0) return;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.trim = true;
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        // 已经是 TRIMMED 时 setter 不会更新旧预制体里残留的自定义尺寸。
        node.getComponent(UITransform).setContentSize(frame.rect.width, frame.rect.height);
        const scale = Math.min(width / frame.rect.width, height / frame.rect.height);
        node.setScale(scale, scale, 1);
    }
    /** Material0/1 只作为定位容器，实际外观和异步图标加载统一复用 TaskAward。 */
    private EnsureMaterialAwards(): Promise<void> {
        if (this.materialAwards.length === 2) return Promise.resolve();
        if (this.materialSetup) return this.materialSetup;
        this.materialSetup = Promise.all([0, 1].map(async index => {
            const holder = this.At(`Desc/Material${index}`);
            holder.getComponent(Sprite).enabled = false;
            holder.children.forEach(child => child.active = false);
            const node = await ZRSJZ_PoolManager.Instance.GetNode('Prefabs/UI/TaskAward');
            if (!this.node?.isValid) { ZRSJZ_PoolManager.Instance.PutNode(node); return; }
            node.name = `TaskAward${index}`;
            node.setParent(holder);
            node.setPosition(0, 0);
            node.setScale(0.95, 0.95);
            node.active = true;
            this.materialAwards[index] = node.getComponent(ZRSJZ_TaskAward);
        })).then(() => { if (this.node?.isValid && this.node.activeInHierarchy) this.Refresh(); })
            .finally(() => { this.materialSetup = null; });
        return this.materialSetup;
    }
    private Money(value: number): string { return value >= 10000 ? `${Number((value / 10000).toFixed(2))}万` : `${value}`; }
}
