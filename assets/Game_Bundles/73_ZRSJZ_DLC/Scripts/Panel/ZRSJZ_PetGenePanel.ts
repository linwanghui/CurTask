import { _decorator, Button, Color, Event, find, Graphics, isValid, Label, Layout, Node, ScrollView, Sprite, SpriteFrame, UITransform, Vec2 } from 'cc';
import { EDITOR } from 'cc/env';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_PANEL, ZRSJZ_PET_GENE_CONFIG, ZRSJZ_PetGeneType } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_PetService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_PetService';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_MyEvent } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_EventManager';
import { ZRSJZ_Tools } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Tools';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('ZRSJZ_PetGenePanel')
@executeInEditMode
export class ZRSJZ_PetGenePanel extends ZRSJZ_Panel {
    @property(SpriteFrame) HPSF: SpriteFrame = null;
    @property(SpriteFrame) DefenseSF: SpriteFrame = null;
    @property(SpriteFrame) AttackSF: SpriteFrame = null;
    @property(SpriteFrame) AttackSpeedSF: SpriteFrame = null;
    @property(SpriteFrame) SkillSF: SpriteFrame = null;
    @property(SpriteFrame) BackpackSF: SpriteFrame = null;
    @property(SpriteFrame) GoldSF: SpriteFrame = null;

    private _petName = "";
    private _selectedLevel = 1;
    private _iconRequest = 0;
    private _skillIconRequest = 0;
    private readonly _skillFrames = new Map<string, SpriteFrame>();
    private _learning = false;
    private _eventNode: Node = null;
    private _tree: Node = null;
    private _scroll: ScrollView = null;
    private readonly _nodes = new Map<number, Node>();

    protected onLoad(): void {
        this.BuildTree();
        if (EDITOR) this.PreviewGenes();
    }

    protected onEnable(): void {
        if (EDITOR) return;
        this._eventNode = ZRSJZ_UIManager.Instance?.node ?? null;
        this._eventNode?.on(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.Refresh, this);
        this._eventNode?.on(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.Refresh, this);
        this._eventNode?.on(ZRSJZ_MyEvent.ZRSJZ_PET_GENE_CHANGE, this.Refresh, this);
    }

    protected onDisable(): void {
        ++this._iconRequest;
        ++this._skillIconRequest;
        if (isValid(this._eventNode, true)) {
            this._eventNode.off(ZRSJZ_MyEvent.ZRSJZ_INVENTORY_CHANGE, this.Refresh, this);
            this._eventNode.off(ZRSJZ_MyEvent.ZRSJZ_CURRENCY_CHANGE, this.Refresh, this);
            this._eventNode.off(ZRSJZ_MyEvent.ZRSJZ_PET_GENE_CHANGE, this.Refresh, this);
        }
        this._eventNode = null;
    }

    Show(petName: string): void {
        super.Show();
        this._petName = petName;
        this.BuildTree();
        this.SelectNext();
    }

    private GetFrame(type: ZRSJZ_PetGeneType): SpriteFrame {
        return {
            "生命值": this.HPSF, "防御": this.DefenseSF, "攻击": this.AttackSF,
            "攻速": this.AttackSpeedSF, "技能": this.SkillSF, "背包": this.BackpackSF
        }[type];
    }

    /** 供MCP在预制体编辑模式预览，不读写玩家存档。 */
    public PreviewGenes(learnedLevel: string = "0", selectedLevel: string = "", materialCount: string = "0"): void {
        if (!EDITOR) return;
        this.BuildTree();
        const learned = Math.max(0, Number(learnedLevel) || 0);
        this._selectedLevel = Number(selectedLevel) || Math.min(learned + 1, ZRSJZ_PET_GENE_CONFIG.length);
        this.RenderTree(learned);
        const gene = ZRSJZ_PET_GENE_CONFIG.find(item => item.Level === this._selectedLevel) ?? ZRSJZ_PET_GENE_CONFIG[0];
        this.SetLabel("效果", ZRSJZ_PetService.GetGeneEffectText("星核幼龙", gene));
        this.SetLabel("Tip", "学习消耗：" + gene.CostProp);
        this.SetLabel("消耗道具数量", materialCount + "/" + gene.CostCount);
        const count = find("Panel/消耗道具数量", this.node)?.getComponent(Label);
        if (count) count.color = Number(materialCount) >= gene.CostCount ? new Color(40, 180, 55) : new Color(230, 65, 55);
        this.SetLabel("学习/tip", "学习");
        find("Panel/已学习", this.node).active = gene.Level <= learned;
        find("Panel/学习", this.node).active = gene.Level > learned;
        const icon = find("Panel/Icon", this.node)?.getComponent(Sprite);
        if (icon) { icon.sizeMode = Sprite.SizeMode.CUSTOM; icon.spriteFrame = this.GetFrame(gene.Type); }
        this._scroll?.scrollToLeft(0);
    }

    private BuildTree(): void {
        const scrollNode = find("Panel/Ganes", this.node) ?? find("Panel/Genas", this.node);
        this._scroll = scrollNode?.getComponent(ScrollView) ?? null;
        const content = scrollNode && find("View/Content", scrollNode);
        this._tree = content?.getChildByName("Gane") ?? null;
        if (!this._tree) return;
        if (this._scroll) {
            this._scroll.content = content;
            this._scroll.horizontal = true;
            this._scroll.vertical = false;
            this._scroll.cancelInnerEvents = true;
        }
        const template = this._tree.getChildByName("Lv1");
        if (!template) return;
        this._nodes.clear();
        // 两行基因每五级汇合；随配置扩展宽度，末级也可滚动到。
        const width = Math.ceil(ZRSJZ_PET_GENE_CONFIG.length / 5) * 540 + 100;
        const layout = content.getComponent(Layout);
        if (layout) layout.enabled = false;
        content.getComponent(UITransform).setContentSize(width, 450);
        this._tree.getComponent(UITransform).setContentSize(width, 450);
        this._tree.setPosition(width / 2, 0, 0);
        const background = this._tree.getComponent(Sprite);
        if (background) background.enabled = false;
        for (const gene of ZRSJZ_PET_GENE_CONFIG) {
            let node = this._tree.getChildByName("Lv" + gene.Level);
            // 编辑器中不能instantiate场景节点，否则副本会沿用原节点的编辑器ID。
            if (EDITOR && node && node !== template && node.uuid === template.uuid) {
                node.removeFromParent();
                node.destroy();
                node = null;
            }
            if (!node) {
                node = new Node("Lv" + gene.Level);
                node.layer = template.layer;
                node.setParent(this._tree);
                node.addComponent(UITransform).setContentSize(116, 116);
                node.addComponent(Sprite);
                const labelNode = new Node("lv");
                labelNode.layer = template.layer;
                labelNode.setParent(node);
                labelNode.setPosition(0, -43.894, 0);
                const label = labelNode.addComponent(Label);
                const source = template.getChildByName("lv").getComponent(Label);
                label.font = source.font;
                label.useSystemFont = source.useSystemFont;
                label.fontFamily = source.fontFamily;
                label.fontSize = source.fontSize;
                label.lineHeight = source.lineHeight;
                label.color = source.color;
                label.isBold = source.isBold;
                label.enableOutline = source.enableOutline;
                label.outlineColor = source.outlineColor;
                label.outlineWidth = source.outlineWidth;
            }
            node.active = true;
            const slot = (gene.Level - 1) % 5;
            const group = Math.floor((gene.Level - 1) / 5);
            const x = -width / 2 + 80 + group * 540 + [0, 198, 0, 198, 366][slot];
            node.setPosition(x, [160, 160, -150, -150, 5][slot], 0);
            const sprite = node.getComponent(Sprite);
            if (sprite) {
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = this.GetFrame(gene.Type) ?? sprite.spriteFrame;
            }
            const label = node.getChildByName("lv")?.getComponent(Label);
            if (label) label.string = "lv." + gene.Level;
            this._nodes.set(gene.Level, node);
            if (!EDITOR) this.BindButton(node);
        }
        for (const node of this._tree.children) {
            if (/^Lv\d+$/.test(node.name) && !this._nodes.has(Number(node.name.slice(2)))) node.active = false;
        }
        this.DrawBranches();
        // 选中素材为实心黄底，放在图标下层形成光圈，不能盖住基因图标。
        this._tree.getChildByName("选中")?.setSiblingIndex(1);
        this.FitLabel("效果", 34, 281, 90);
        this.FitLabel("Tip", 30, 420, 45);
        find("Panel/Tip", this.node)?.setPosition(518, 33, 0);
        this.FitLabel("消耗道具数量", 28, 120, 38);
        this.FitLabel("学习/tip", 40, 220, 63);
        if (!EDITOR) {
            this.BindButton(find("Panel/关闭", this.node));
            this.BindButton(find("Panel/学习", this.node));
        }
    }

    private FitLabel(path: string, fontSize: number, width: number, height: number): void {
        const label = find("Panel/" + path, this.node)?.getComponent(Label);
        if (!label) return;
        label.overflow = Label.Overflow.SHRINK;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 4;
        label.getComponent(UITransform).setContentSize(width, height);
    }

    private DrawBranches(): void {
        let node = this._tree.getChildByName("基因连线");
        if (!node) { node = new Node("基因连线"); node.layer = this._tree.layer; node.setParent(this._tree); }
        node.setSiblingIndex(0);
        const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
        graphics.clear();
        const line = (a: number, b: number, curve: boolean) => {
            const start = this._nodes.get(a)?.position;
            const end = this._nodes.get(b)?.position;
            if (!start || !end) return;
            for (const outline of [true, false]) {
                graphics.lineWidth = outline ? 24 : 16;
                graphics.strokeColor = outline ? Color.WHITE : new Color(167, 234, 163);
                graphics.moveTo(start.x, start.y);
                if (curve) {
                    const mid = (start.x + end.x) / 2;
                    graphics.bezierCurveTo(mid, start.y, mid, end.y, end.x, end.y);
                } else graphics.lineTo(end.x, end.y);
                graphics.stroke();
            }
        };
        for (let first = 1; first <= ZRSJZ_PET_GENE_CONFIG.length; first += 5) {
            line(first, first + 1, false);
            line(first + 2, first + 3, false);
            line(first, first + 2, false);
            line(first + 1, first + 3, false);
            line(first + 1, first + 4, true);
            line(first + 3, first + 4, true);
            line(first + 4, first + 5, true);
            line(first + 4, first + 7, true);
        }
    }

    private BindButton(node: Node): void {
        if (!node) return;
        const button = node.getComponent(Button) ?? node.addComponent(Button);
        // 统一代码绑定，避免旧预制体点击事件重复触发。
        button.clickEvents = [];
        node.off(Button.EventType.CLICK, this.OnButtonClick, this);
        node.on(Button.EventType.CLICK, this.OnButtonClick, this);
    }

    private SelectNext(): void {
        const learned = ZRSJZ_PetService.GetPetGrade(this._petName);
        this._selectedLevel = ZRSJZ_PET_GENE_CONFIG.find(gene => gene.Level > learned)?.Level
            ?? ZRSJZ_PET_GENE_CONFIG[ZRSJZ_PET_GENE_CONFIG.length - 1]?.Level ?? 1;
        this.Refresh();
        const node = this._nodes.get(this._selectedLevel);
        if (node && this._scroll?.content) {
            const viewWidth = this._scroll.node.getComponent(UITransform).width;
            const width = this._scroll.content.getComponent(UITransform).width;
            const x = node.position.x + this._tree.position.x - viewWidth / 2;
            this._scroll.scrollToOffset(new Vec2(Math.max(0, Math.min(width - viewWidth, x)), 0), 0.2);
        }
    }

    private RenderTree(learned: number): void {
        const reminderLevel = !EDITOR && ZRSJZ_PetService.GetGeneLearnError(this._petName, learned + 1) === ""
            ? learned + 1 : 0;
        for (const [level, node] of this._nodes) {
            const tip = node.getChildByName("红点");
            for (const sprite of node.getComponentsInChildren(Sprite)) {
                sprite.grayscale = sprite.node === tip ? false : level > learned;
            }
            // 编辑器保留红点可见以便调整；运行时只显示材料充足的下一等级。
            if (tip && !EDITOR) tip.active = level === reminderLevel;
        }
        const selector = this._tree?.getChildByName("选中");
        const selected = this._nodes.get(this._selectedLevel);
        if (selector) {
            selector.active = !!selected;
            if (selected) {
                selector.setPosition(selected.position);
                selector.getComponent(UITransform)?.setContentSize(132, 132);
            }
        }
    }

    private SetLabel(path: string, text: string): void {
        const label = find("Panel/" + path, this.node)?.getComponent(Label);
        if (label) label.string = text;
    }

    private Refresh(): void {
        if (EDITOR || !this._petName || !isValid(this.node, true)) return;
        const iconRequest = ++this._skillIconRequest;
        const gene = ZRSJZ_PetService.GetGeneConfig(this._petName, this._selectedLevel);
        if (!gene) return;
        const learned = ZRSJZ_PetService.GetPetGrade(this._petName);
        this.RenderTree(learned);
        for (const base of ZRSJZ_PET_GENE_CONFIG) {
            if (base.Type === "技能") {
                void this.RefreshSkillIcon(this._nodes.get(base.Level)?.getComponent(Sprite), base.Level, iconRequest);
            }
        }
        const isLearned = ZRSJZ_PetService.CheckPet(this._petName) && gene.Level <= learned;
        this.SetLabel("效果", ZRSJZ_PetService.GetGeneEffectText(this._petName, gene));
        this.SetLabel("Tip", "学习消耗：" + gene.CostProp);
        const available = ZRSJZ_PetService.GetGeneCostOwned(gene);
        this.SetLabel("消耗道具数量", available + "/" + gene.CostCount);
        const count = find("Panel/消耗道具数量", this.node)?.getComponent(Label);
        if (count) count.color = available >= gene.CostCount ? new Color(40, 180, 55) : new Color(230, 65, 55);
        find("Panel/已学习", this.node).active = isLearned;
        const learn = find("Panel/学习", this.node);
        learn.active = !isLearned;
        learn.getComponent(Button).interactable = !this._learning;
        this.SetLabel("学习/tip", "学习");
        const icon = find("Panel/Icon", this.node)?.getComponent(Sprite);
        if (icon) { icon.sizeMode = Sprite.SizeMode.CUSTOM; icon.spriteFrame = this.GetFrame(gene.Type); icon.grayscale = false; }
        if (gene.Type === "技能") void this.RefreshSkillIcon(icon, gene.Level, iconRequest);
        void this.RefreshCostIcon(gene.CostProp);
    }

    private async RefreshSkillIcon(icon: Sprite, level: number, request: number): Promise<void> {
        if (!icon) return;
        icon.sizeMode = Sprite.SizeMode.CUSTOM;
        // 按基因解锁等级匹配技能，不能使用基因节点序号作为技能槽位。
        const skill = [0, 1, 2, 3].map(index => ZRSJZ_PetService.GetSkill(this._petName, index))
            .find(item => item?.Unlock === "基因" && item.GeneLevel === level);
        if (!skill) { icon.spriteFrame = this.SkillSF; return; }
        const path = `Sprites/宠物/技能/${this._petName}/${skill.Name}`;
        const cached = this._skillFrames.get(path);
        if (isValid(cached)) {
            icon.spriteFrame = cached;
            return;
        }
        // 首次加载留空，后续直接使用缓存，避免刷新时闪回通用技能图标。
        icon.spriteFrame = null;
        try {
            const frame = await ZRSJZ_Tools.LoadSpriteByBundle("73_ZRSJZ_DLC", path);
            if (!isValid(this, true)) return;
            this._skillFrames.set(path, frame);
            if (isValid(this, true) && isValid(icon, true) && request === this._skillIconRequest) {
                // 只替换贴图，保留RenderTree设置的未学习灰色状态。
                icon.spriteFrame = frame;
            }
        } catch (error) { console.warn(`[ZRSJZ_PetGenePanel] 技能图标加载失败：${path}`, error); }
    }

    private async RefreshCostIcon(propName: string): Promise<void> {
        const request = ++this._iconRequest;
        const icon = find("Panel/消耗道具图标", this.node)?.getComponent(Sprite);
        if (!icon) return;
        icon.spriteFrame = null;
        try {
            const frame = propName === "金币" ? this.GoldSF : await ZRSJZ_UIManager.Instance?.GetPropUI(propName);
            if (!isValid(this, true) || !isValid(icon, true) || request !== this._iconRequest || !frame) return;
            icon.sizeMode = Sprite.SizeMode.CUSTOM;
            icon.spriteFrame = frame;
            const { width, height } = frame.originalSize;
            const scale = Math.min(85 / Math.max(width, 1), 85 / Math.max(height, 1));
            icon.getComponent(UITransform).setContentSize(width * scale, height * scale);
        } catch (error) { console.warn("[ZRSJZ_PetGenePanel] 消耗图标加载失败", error); }
    }

    public OnButtonClick(event: Button | Event): void {
        const node = event instanceof Button ? event.node : event.target as Node;
        ZRSJZ_AudioManager.Instance?.PlaySound("点击");
        if (node.name === "关闭" || node.name === "Mask") { ZRSJZ_UIManager.Instance?.HidePanel(ZRSJZ_PANEL.宠物基因弹窗); return; }
        if (/^Lv\d+$/.test(node.name)) { this._selectedLevel = Number(node.name.slice(2)); this.Refresh(); return; }
        if (node.name !== "学习" || this._learning) return;
        this._learning = true;
        try {
            const error = ZRSJZ_PetService.TryLearnGene(this._petName, this._selectedLevel);
            if (error) ZRSJZ_UIManager.Instance?.ShowTip(error);
            else this.SelectNext();
        } finally { this._learning = false; this.Refresh(); }
    }
}
