import { _decorator, Button, Color, Label, Node, ScrollView, Sprite, SpriteFrame, Vec2 } from 'cc';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import { ZRSJZ_ENHANCEMENT_NODES, ZRSJZ_ENHANCEMENT_STATS, EnhancementStat } from '../ZRSJZ_EnhancementConfig';
import { ZRSJZ_EnhancementService as Upgrade } from '../Service/ZRSJZ_EnhancementService';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_PANEL, ZRSJZ_PROP_CONFIG } from '../ZRSJZ_Constant';
import { ZRSJZ_Tools } from '../ZRSJZ_Tools';
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
        const signature = `${Upgrade.Level}:${ZRSJZ_GameData.Instance.Gold}:${(ZRSJZ_GameData.Instance.EnhancementSpecials ?? []).join(',')}:${config.Materials.map(m => ZRSJZ_InventoryService.GetPropCountByName(m.PropName)).join(',')}`;
        if (signature !== this.signature) { this.signature = signature; this.Refresh(); }
    }
    private Purchase(): void {
        const result = Upgrade.Purchase(this.selected);
        ZRSJZ_AudioManager.Instance?.PlaySound('点击');
        ZRSJZ_UIManager.Instance.ShowTip(result || '强化成功！');
        this.Refresh();
    }
    private Refresh(): void {
        const version = ++this.version;
        this.Text('Progress', `强化等级  ${Upgrade.Level} / 50`);
        (Object.keys(ZRSJZ_ENHANCEMENT_STATS) as EnhancementStat[]).forEach((stat, index) =>
            this.Text(`Bonuses/Stat${index}`, `${stat}  ${Upgrade.Format(stat, Upgrade.GetBonus(stat))}`));
        for (const config of ZRSJZ_ENHANCEMENT_NODES) {
            const node = this.route.get(config.ID), owned = Upgrade.IsOwned(config);
            node.getComponent(Sprite).spriteFrame = owned ? this.OwnedFrame : this.NormalFrame;
            node.getChildByName('Icon').active = owned || Upgrade.IsAvailable(config);
            node.getChildByName('GrayIcon').active = !owned && !Upgrade.IsAvailable(config);
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
        this.Text('Desc/Category', `${config.Special ? '特殊强化' : '基础强化'} · 路线 Lv.${config.Level}`);
        this.Text('Desc/Gain', `本次提升  ${Upgrade.Format(config.Stat, config.Value)}`);
        this.Text('Desc/Total', owned ? `当前累计  ${Upgrade.Format(config.Stat, Upgrade.GetBonus(config.Stat))}`
            : `累计 ${Upgrade.Format(config.Stat, Upgrade.GetBonus(config.Stat))} → ${Upgrade.Format(config.Stat, Upgrade.GetBonus(config.Stat) + config.Value)}`);
        this.Text('Desc/Description', stat.Description);
        this.Text('Desc/Gold', `${this.Money(ZRSJZ_GameData.Instance.Gold)} / ${this.Money(config.Gold)}`).color = ZRSJZ_GameData.Instance.Gold >= config.Gold ? ZRSJZ_UpgradePanel.ENOUGH : ZRSJZ_UpgradePanel.LACK;
        this.Text('Desc/Requirement', owned ? '该强化已永久生效' : available ? '消耗以下材料与金币' : config.Special ? `强化达到 Lv.${config.Level} 后可解锁` : `需先完成路线 Lv.${config.Level - 1}`);
        this.Text('Desc/Upgrade/Text', owned ? '已强化' : available ? '解锁' : '未解锁');
        this.At('Desc/Upgrade').getComponent(Button).interactable = available;
        config.Materials.forEach((material, index) => {
            const base = `Desc/Material${index}`;
            this.Text(`${base}/Name`, material.PropName);
            const count = ZRSJZ_InventoryService.GetPropCountByName(material.PropName);
            this.Text(`${base}/Count`, `${count}/${material.Count}`).color = count >= material.Count ? ZRSJZ_UpgradePanel.ENOUGH : ZRSJZ_UpgradePanel.LACK;
            const icon = this.At(`${base}/Icon`).getComponent(Sprite);
            icon.spriteFrame = null;
            Promise.all([ZRSJZ_UIManager.Instance.GetPropGridUI(`${ZRSJZ_PROP_CONFIG.get(material.PropName).Quality}1_1`),
                ZRSJZ_UIManager.Instance.GetPropUI(material.PropName)]).then(([grid, frame]) => {
                if (version !== this.version || !this.node?.isValid || !this.node.activeInHierarchy) return;
                this.At(base).getComponent(Sprite).spriteFrame = grid;
                icon.spriteFrame = frame;
                ZRSJZ_Tools.ScaleNodeToFit(icon.node, 95, 85);
            }).catch(error => console.warn('[强化] 材料图标加载失败', error));
        });
    }
    private Money(value: number): string { return value >= 10000 ? `${Number((value / 10000).toFixed(2))}万` : `${value}`; }
}
