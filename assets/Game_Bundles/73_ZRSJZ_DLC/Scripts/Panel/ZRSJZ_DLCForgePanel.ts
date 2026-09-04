import {
    _decorator,
    Button,
    Color,
    Component,
    Graphics,
    HorizontalTextAlignment,
    Label,
    Mask,
    Node,
    ScrollView,
    Sprite,
    SpriteFrame,
    UITransform,
    VerticalTextAlignment,
    Vec3,
    instantiate,
    isValid,
} from 'cc';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { ZRSJZ_PROP_PROPERTY } from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { ZRSJZ_InventoryService } from '../../../73_ZRSJZ/Scripts/Service/ZRSJZ_InventoryService';
import {
    ZRSJZ_FORGE_CATEGORIES,
    ZRSJZ_FORGE_RECIPES,
    ZRSJZ_ForgeCategory,
    ZRSJZ_ForgeRecipe,
} from '../ZRSJZ_ForgeConstant';
import { ZRSJZ_ForgeService, ZRSJZ_ForgeTask } from '../ZRSJZ_ForgeService';

const { ccclass, executeInEditMode } = _decorator;

@executeInEditMode
@ccclass('ZRSJZ_DLCForgePanel')
export class ZRSJZ_DLCForgePanel extends Component {
    private static readonly LIST_WIDTH = 650;
    private static readonly LIST_HEIGHT = 730;
    private static readonly ROW_HEIGHT = 126;

    private _initialized: boolean = false;
    private _initializing: Promise<void> = null;
    private _sprites: Map<string, SpriteFrame> = new Map();
    private _category: ZRSJZ_ForgeCategory = '枪械';
    private _selectedItemName: string = '';
    private _listContent: Node = null;
    private _itemTemplate: Node = null;
    private _tabNodes: Map<ZRSJZ_ForgeCategory, Node> = new Map();
    private _itemNameLabel: Label = null;
    private _itemPropertyLabel: Label = null;
    private _itemSprite: Sprite = null;
    private _materialContent: Node = null;
    private _materialTemplate: Node = null;
    private _goldLabel: Label = null;
    private _timeLabel: Label = null;
    private _progressRoot: Node = null;
    private _progressSprite: Sprite = null;
    private _progressLabel: Label = null;
    private _actionButton: Node = null;
    private _actionButtonLabel: Label = null;
    private _statusLabel: Label = null;
    private _tickElapsed: number = 0;
    private _lastTaskName: string = '';
    private _lastReady: boolean = false;

    protected onLoad(): void {
        this.InitializeRuntime();
    }

    protected onEnable(): void {
        this.InitializeRuntime().then(() => this.RefreshAll());
    }

    protected update(deltaTime: number): void {
        this._tickElapsed += deltaTime;
        if (this._tickElapsed < 0.25 || !this._initialized) return;
        this._tickElapsed = 0;

        const task = ZRSJZ_ForgeService.GetTask();
        const taskName = task?.itemName ?? '';
        const ready = ZRSJZ_ForgeService.IsReady(task);
        if (taskName !== this._lastTaskName || ready !== this._lastReady) {
            this.RefreshAll();
            return;
        }
        this.RefreshProgress(task);
        this.RefreshAction(task);
    }

    private InitializeRuntime(): Promise<void> {
        if (this._initialized) return Promise.resolve();
        if (this._initializing) return this._initializing;

        this._initializing = this.LoadAssets().then(() => {
            if (!isValid(this.node)) return;
            if (!this.BindView()) return;
            this._initialized = true;
            if (!this._selectedItemName) {
                this._selectedItemName = this.GetCategoryRecipes()[0]?.itemName ?? '';
            }
            this.RefreshAll();
        });
        return this._initializing;
    }

    /** 仅供编辑器调用：把固定界面和两个复用模板真正写入预制体。 */
    public BuildPrefabInEditor(): void {
        if (!isValid(this.node)) return;
        this.BuildView();
        this.BindView();
        console.log('[ZRSJZ_DLCForgePanel] 锻造界面静态节点已生成，请保存预制体');
    }

    private LoadAssets(): Promise<void> {
        return new Promise(resolve => {
            const bundle = BundleManager.GetBundle('73_ZRSJZ_DLC');
            if (!bundle) {
                console.warn('[ZRSJZ_DLCForgePanel] DLC Bundle 尚未就绪');
                resolve();
                return;
            }
            bundle.loadDir(
                'Sprites/锻造台',
                SpriteFrame,
                (error: any, sprites: SpriteFrame[]) => {
                    if (error) {
                        console.error('[ZRSJZ_DLCForgePanel] 锻造台图片加载失败', error);
                    } else {
                        sprites.forEach(sprite => this._sprites.set(sprite.name, sprite));
                    }
                    resolve();
                },
            );
        });
    }

    private BuildView(): void {
        const panel = this.node.getChildByName('Panel');
        if (!panel) return;
        const oldRoot = panel.getChildByName('锻造内容');
        if (oldRoot) {
            oldRoot.removeFromParent();
            oldRoot.destroy();
        }

        const root = this.CreateNode('锻造内容', panel, 0, 0, 2340, 1080);

        const title = this.CreateLabel('标题', root, '锻造', -970, 475, 180, 60, 40, new Color(255, 245, 80));
        title.horizontalAlign = HorizontalTextAlignment.LEFT;
        const underline = this.CreateNode('标题下划线', root, -945, 442, 160, 9);
        this.DrawRoundedRect(underline, new Color(255, 218, 0), new Color(255, 218, 0), 4, 0);

        this.BuildTabs(root);
        this.BuildList(root);
        this.BuildDetail(root);
    }

    private BuildTabs(root: Node): void {
        const tabY = [300, 155, 10, -135, -280];
        ZRSJZ_FORGE_CATEGORIES.forEach((category, index) => {
            const tab = this.CreateNode(category, root, -1050, tabY[index], 180, 118);
            tab.addComponent(Button);

            const background = this.CreateNode('选中底', tab, 0, 0, 178, 112);
            this.DrawRoundedRect(
                background,
                new Color(8, 30, 58, 210),
                new Color(0, 214, 255, 210),
                18,
                3,
            );
            const icon = this.CreateSpriteNode('图标', tab, -43, 12, 76, 76, this._sprites.get(category));
            icon.node.angle = category === '近战' ? -20 : 0;
            this.CreateLabel('文字', tab, category, 32, -4, 110, 46, 28, Color.WHITE);
            this._tabNodes.set(category, tab);
        });
    }

    private BuildList(root: Node): void {
        const frame = this.CreateNode('装备列表框', root, -700, -22, 690, 790);
        this.DrawRoundedRect(frame, new Color(2, 19, 39, 225), new Color(0, 205, 255), 24, 5);

        const viewport = this.CreateNode(
            '装备列表',
            frame,
            0,
            0,
            ZRSJZ_DLCForgePanel.LIST_WIDTH,
            ZRSJZ_DLCForgePanel.LIST_HEIGHT,
        );
        viewport.addComponent(Mask);
        const scrollView = viewport.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        scrollView.inertia = true;
        scrollView.elastic = true;

        this._listContent = this.CreateNode(
            'content',
            viewport,
            0,
            ZRSJZ_DLCForgePanel.LIST_HEIGHT * 0.5,
            ZRSJZ_DLCForgePanel.LIST_WIDTH,
            ZRSJZ_DLCForgePanel.LIST_HEIGHT,
        );
        this._listContent.getComponent(UITransform).setAnchorPoint(0.5, 1);
        scrollView.content = this._listContent;

        this._itemTemplate = this.CreateNode('装备条目模板', this._listContent, 0, -70, 610, 112);
        this._itemTemplate.addComponent(Button);
        this.CreateSpriteNode('装备底', this._itemTemplate, 0, 0, 610, 112, this._sprites.get('装备底'));
        this.CreateSpriteNode('装备图标', this._itemTemplate, -235, 0, 88, 88);
        const name = this.CreateLabel('名称', this._itemTemplate, '装备名称', -55, 25, 310, 42, 28, Color.WHITE);
        name.horizontalAlign = HorizontalTextAlignment.LEFT;
        const property = this.CreateLabel('属性', this._itemTemplate, '装备属性', -55, -22, 310, 36, 23, new Color(142, 218, 255));
        property.horizontalAlign = HorizontalTextAlignment.LEFT;
        this.CreateLabel('价值', this._itemTemplate, '10万', 245, -25, 100, 38, 23, new Color(233, 241, 255));
        const forgeTag = this.CreateLabel('锻造标签', this._itemTemplate, '锻造中', 222, 27, 130, 38, 23, new Color(255, 166, 40));
        forgeTag.node.active = false;
        this._itemTemplate.active = false;
    }

    private BuildDetail(root: Node): void {
        this._itemNameLabel = this.CreateLabel(
            '装备名称',
            root,
            '',
            390,
            285,
            760,
            60,
            38,
            new Color(255, 239, 91),
        );
        this._itemPropertyLabel = this.CreateLabel(
            '装备属性',
            root,
            '',
            390,
            232,
            760,
            45,
            27,
            new Color(160, 232, 255),
        );

        this._itemSprite = this.CreateSpriteNode('锻造装备', root, 390, 70, 390, 260);

        this._progressRoot = this.CreateNode('锻造进度', root, 390, 380, 800, 62);
        this.CreateSpriteNode(
            '进度底',
            this._progressRoot,
            0,
            0,
            800,
            30,
            this._sprites.get('进度底'),
        );
        this._progressSprite = this.CreateSpriteNode(
            '进度条',
            this._progressRoot,
            0,
            0,
            800,
            30,
            this._sprites.get('进度条'),
        );
        if (this._progressSprite.spriteFrame) {
            this.ConfigureProgressSprite();
        }
        this._progressLabel = this.CreateLabel(
            '进度文本',
            this._progressRoot,
            '',
            0,
            0,
            400,
            44,
            24,
            new Color(255, 241, 70),
        );

        const materials = this.CreateNode('所需材料', root, 390, -255, 900, 205);
        const materialsBackground = this.CreateSpriteNode(
            '材料底',
            materials,
            0,
            0,
            900,
            205,
            this._sprites.get('所需材料-底'),
        );
        materialsBackground.node.setSiblingIndex(0);
        this.CreateLabel('材料标题', materials, '所需材料', 0, 88, 260, 45, 27, new Color(58, 238, 255));
        this._materialContent = this.CreateNode('材料内容', materials, 0, -5, 850, 145);
        this._materialTemplate = this.CreateNode('材料格模板', this._materialContent, 0, 0, 128, 128);
        this.CreateSpriteNode('空槽', this._materialTemplate, 0, 0, 128, 128, this._sprites.get('物品-空'));
        this.CreateSpriteNode('图标', this._materialTemplate, 0, 10, 82, 82);
        const quantity = this.CreateLabel('数量', this._materialTemplate, '0/0', 0, -47, 112, 34, 21, Color.WHITE);
        quantity.horizontalAlign = HorizontalTextAlignment.RIGHT;
        this._materialTemplate.active = false;

        const costBackground = this.CreateSpriteNode(
            '货币时间底',
            root,
            325,
            -445,
            680,
            92,
            this._sprites.get('所需钞票-底'),
        );
        this.CreateLabel('货币标题', costBackground.node, '所需货币：', -210, 20, 210, 42, 27, Color.WHITE);
        this._goldLabel = this.CreateLabel(
            '货币数量',
            costBackground.node,
            '',
            -60,
            20,
            180,
            42,
            29,
            new Color(255, 244, 115),
        );
        this.CreateLabel('时间标题', costBackground.node, '所需时间：', 105, 20, 210, 42, 27, Color.WHITE);
        this._timeLabel = this.CreateLabel(
            '时间数量',
            costBackground.node,
            '',
            250,
            20,
            140,
            42,
            29,
            new Color(80, 238, 255),
        );

        this._actionButton = this.CreateSpriteNode(
            '开始锻造',
            root,
            890,
            -445,
            300,
            92,
            this._sprites.get('按钮'),
        ).node;
        this._actionButton.addComponent(Button);
        this._actionButton.on(Node.EventType.TOUCH_END, this.OnAction, this);
        this._actionButtonLabel = this.CreateLabel(
            '按钮文字',
            this._actionButton,
            '开始锻造',
            0,
            0,
            280,
            60,
            32,
            new Color(25, 27, 30),
        );

        this._statusLabel = this.CreateLabel(
            '状态文字',
            root,
            '',
            855,
            -445,
            430,
            90,
            30,
            new Color(255, 197, 42),
        );
        this._statusLabel.enableWrapText = true;
        this._statusLabel.lineHeight = 38;
        this._statusLabel.node.active = false;
    }

    private BindView(): boolean {
        const panel = this.node.getChildByName('Panel');
        const root = panel?.getChildByName('锻造内容');
        if (!root) return false;

        this._tabNodes.clear();
        ZRSJZ_FORGE_CATEGORIES.forEach(category => {
            const tab = root.getChildByName(category);
            if (!tab) return;
            tab.off(Node.EventType.TOUCH_END, undefined, this);
            tab.on(Node.EventType.TOUCH_END, () => this.SelectCategory(category), this);
            this._tabNodes.set(category, tab);
        });

        const listFrame = root.getChildByName('装备列表框');
        const viewport = listFrame?.getChildByName('装备列表');
        this._listContent = viewport?.getChildByName('content') ?? null;
        this._itemTemplate = this._listContent?.getChildByName('装备条目模板') ?? null;
        this._itemNameLabel = root.getChildByName('装备名称')?.getComponent(Label) ?? null;
        this._itemPropertyLabel = root.getChildByName('装备属性')?.getComponent(Label) ?? null;
        this._itemSprite = root.getChildByName('锻造装备')?.getComponent(Sprite) ?? null;

        this._progressRoot = root.getChildByName('锻造进度');
        this._progressSprite = this._progressRoot?.getChildByName('进度条')?.getComponent(Sprite) ?? null;
        this._progressLabel = this._progressRoot?.getChildByName('进度文本')?.getComponent(Label) ?? null;

        const materials = root.getChildByName('所需材料');
        this._materialContent = materials?.getChildByName('材料内容') ?? null;
        this._materialTemplate = this._materialContent?.getChildByName('材料格模板') ?? null;
        const cost = root.getChildByName('货币时间底');
        this._goldLabel = cost?.getChildByName('货币数量')?.getComponent(Label) ?? null;
        this._timeLabel = cost?.getChildByName('时间数量')?.getComponent(Label) ?? null;

        this._actionButton = root.getChildByName('开始锻造');
        this._actionButtonLabel = this._actionButton?.getChildByName('按钮文字')?.getComponent(Label) ?? null;
        this._statusLabel = root.getChildByName('状态文字')?.getComponent(Label) ?? null;
        if (this._actionButton) {
            this._actionButton.off(Node.EventType.TOUCH_END, this.OnAction, this);
            this._actionButton.on(Node.EventType.TOUCH_END, this.OnAction, this);
        }
        this.ApplyStaticSprites(root);

        return !!(
            this._listContent && this._itemTemplate && this._itemNameLabel
            && this._itemPropertyLabel && this._itemSprite && this._materialContent
            && this._materialTemplate && this._goldLabel && this._timeLabel
            && this._progressRoot && this._progressSprite && this._progressLabel
            && this._actionButton && this._actionButtonLabel && this._statusLabel
        );
    }

    private ApplyStaticSprites(root: Node): void {
        if (this._sprites.size <= 0) return;
        ZRSJZ_FORGE_CATEGORIES.forEach(category => {
            const icon = root.getChildByName(category)?.getChildByName('图标')?.getComponent(Sprite);
            if (icon) icon.spriteFrame = this._sprites.get(category) ?? null;
        });
        const templateBackground = this._itemTemplate?.getChildByName('装备底')?.getComponent(Sprite);
        if (templateBackground) templateBackground.spriteFrame = this._sprites.get('装备底') ?? null;
        const progressBackground = this._progressRoot?.getChildByName('进度底')?.getComponent(Sprite);
        if (progressBackground) progressBackground.spriteFrame = this._sprites.get('进度底') ?? null;
        if (this._progressSprite) {
            this._progressSprite.spriteFrame = this._sprites.get('进度条') ?? null;
            if (this._progressSprite.spriteFrame) this.ConfigureProgressSprite();
        }
        const materials = root.getChildByName('所需材料');
        const materialsBackground = materials?.getChildByName('材料底')?.getComponent(Sprite);
        if (materialsBackground) materialsBackground.spriteFrame = this._sprites.get('所需材料-底') ?? null;
        const emptySlot = this._materialTemplate?.getChildByName('空槽')?.getComponent(Sprite);
        if (emptySlot) emptySlot.spriteFrame = this._sprites.get('物品-空') ?? null;
        const costBackground = root.getChildByName('货币时间底')?.getComponent(Sprite);
        if (costBackground) costBackground.spriteFrame = this._sprites.get('所需钞票-底') ?? null;
        const actionBackground = this._actionButton?.getComponent(Sprite);
        if (actionBackground) actionBackground.spriteFrame = this._sprites.get('按钮') ?? null;
    }

    private ConfigureProgressSprite(): void {
        this._progressSprite.type = Sprite.Type.FILLED;
        this._progressSprite.fillType = Sprite.FillType.HORIZONTAL;
        this._progressSprite.fillStart = 0;
        this._progressSprite.fillRange = 0;
    }

    private SelectCategory(category: ZRSJZ_ForgeCategory): void {
        this.PlayClick();
        this._category = category;
        this._selectedItemName = this.GetCategoryRecipes()[0]?.itemName ?? '';
        this.RefreshAll();
    }

    private SelectRecipe(recipe: ZRSJZ_ForgeRecipe): void {
        this.PlayClick();
        this._selectedItemName = recipe.itemName;
        this.RefreshAll();
    }

    private RefreshAll(): void {
        if (!this._initialized) return;
        const task = ZRSJZ_ForgeService.GetTask();
        this._lastTaskName = task?.itemName ?? '';
        this._lastReady = ZRSJZ_ForgeService.IsReady(task);
        this.RefreshTabs();
        this.RefreshList(task);
        this.RefreshDetail(task);
        this.RefreshProgress(task);
        this.RefreshAction(task);
    }

    private RefreshTabs(): void {
        this._tabNodes.forEach((node, category) => {
            const background = node.getChildByName('选中底');
            if (!background) return;
            background.getComponent(Graphics)?.clear();
            const selected = category === this._category;
            this.DrawRoundedRect(
                background,
                selected ? new Color(8, 119, 167, 235) : new Color(8, 30, 58, 210),
                selected ? new Color(255, 225, 44) : new Color(0, 214, 255, 210),
                18,
                selected ? 5 : 3,
            );
            node.setScale(selected ? new Vec3(1.06, 1.06, 1) : Vec3.ONE);
        });
    }

    private RefreshList(task: ZRSJZ_ForgeTask): void {
        if (!this._listContent || !this._itemTemplate) return;
        this._listContent.children.slice().forEach(row => {
            if (row === this._itemTemplate) return;
            row.removeFromParent();
            row.destroy();
        });
        const recipes = this.GetCategoryRecipes();
        const contentHeight = Math.max(
            ZRSJZ_DLCForgePanel.LIST_HEIGHT,
            recipes.length * ZRSJZ_DLCForgePanel.ROW_HEIGHT + 20,
        );
        this._listContent.getComponent(UITransform).setContentSize(
            ZRSJZ_DLCForgePanel.LIST_WIDTH,
            contentHeight,
        );

        recipes.forEach((recipe, index) => {
            const row = instantiate(this._itemTemplate);
            row.name = recipe.itemName;
            row.active = true;
            this._listContent.addChild(row);
            row.setPosition(0, -70 - index * ZRSJZ_DLCForgePanel.ROW_HEIGHT);
            row.on(Node.EventType.TOUCH_END, () => this.SelectRecipe(recipe), this);

            const selected = recipe.itemName === this._selectedItemName;
            const background = row.getChildByName('装备底')?.getComponent(Sprite);
            if (background) background.spriteFrame = this._sprites.get(selected ? '选择装备底' : '装备底') ?? null;
            const icon = row.getChildByName('装备图标')?.getComponent(Sprite);
            this.LoadPropSprite(icon, recipe.itemName, 88, 88);

            const nameColor = selected ? new Color(34, 32, 25) : Color.WHITE;
            const name = row.getChildByName('名称')?.getComponent(Label);
            if (name) {
                name.string = recipe.itemName;
                name.color = nameColor;
            }
            const property = row.getChildByName('属性')?.getComponent(Label);
            if (property) {
                property.string = this.GetPrimaryProperty(recipe);
                property.color = selected ? new Color(28, 59, 93) : new Color(142, 218, 255);
            }
            const value = row.getChildByName('价值')?.getComponent(Label);
            if (value) {
                value.string = this.FormatValue(recipe.value);
                value.color = selected ? new Color(40, 40, 30) : new Color(233, 241, 255);
            }

            const forgeTag = row.getChildByName('锻造标签')?.getComponent(Label);
            if (forgeTag) {
                forgeTag.node.active = task?.itemName === recipe.itemName;
                const status = ZRSJZ_ForgeService.IsReady(task) ? '可领取' : '锻造中';
                forgeTag.string = status;
                forgeTag.color = ZRSJZ_ForgeService.IsReady(task)
                    ? new Color(80, 255, 117)
                    : new Color(255, 166, 40);
            }
        });
    }

    private RefreshDetail(task: ZRSJZ_ForgeTask): void {
        const recipe = this.GetSelectedRecipe();
        if (!recipe) return;

        this._itemNameLabel.string = recipe.itemName;
        this._itemPropertyLabel.string = this.GetPrimaryProperty(recipe)
            + '    价值 ' + this.FormatValue(recipe.value);
        this.LoadPropSprite(this._itemSprite, recipe.itemName, 390, 260);
        this._goldLabel.string = this.FormatValue(recipe.goldCost);
        this._timeLabel.string = recipe.durationHours + '小时';

        this._materialContent.children.slice().forEach(slot => {
            if (slot === this._materialTemplate) return;
            slot.removeFromParent();
            slot.destroy();
        });
        const slotCount = recipe.materials.length;
        const gap = Math.min(145, 790 / Math.max(1, slotCount));
        const startX = -(slotCount - 1) * gap * 0.5;
        recipe.materials.forEach((material, index) => {
            const slot = instantiate(this._materialTemplate);
            slot.name = material.name;
            slot.active = true;
            this._materialContent.addChild(slot);
            slot.setPosition(startX + index * gap, 0);
            const icon = slot.getChildByName('图标')?.getComponent(Sprite);
            this.LoadPropSprite(icon, material.name, 82, 82);
            const owned = ZRSJZ_InventoryService.GetPropCountByName(material.name);
            const countLabel = slot.getChildByName('数量')?.getComponent(Label);
            if (countLabel) {
                countLabel.string = owned + '/' + material.count;
                countLabel.color = owned >= material.count ? Color.WHITE : new Color(255, 84, 67);
            }
        });
    }

    private RefreshProgress(task: ZRSJZ_ForgeTask): void {
        if (!task) {
            this._progressRoot.active = false;
            return;
        }
        this._progressRoot.active = true;
        const progress = ZRSJZ_ForgeService.GetProgress(task);
        this._progressSprite.fillRange = progress;
        this._progressLabel.string = '进度: ' + Math.floor(progress * 100) + '%';
    }

    private RefreshAction(task: ZRSJZ_ForgeTask): void {
        const recipe = this.GetSelectedRecipe();
        if (!recipe) return;

        if (!task) {
            this._actionButton.active = true;
            this._statusLabel.node.active = false;
            this._actionButtonLabel.string = '开始锻造';
            return;
        }

        if (task.itemName !== recipe.itemName) {
            this._actionButton.active = false;
            this._statusLabel.node.active = true;
            this._statusLabel.string = '其他装备正在锻造中';
            this._statusLabel.color = new Color(255, 194, 47);
            return;
        }

        if (ZRSJZ_ForgeService.IsReady(task)) {
            this._actionButton.active = true;
            this._statusLabel.node.active = false;
            this._actionButtonLabel.string = '领取';
            return;
        }

        this._actionButton.active = false;
        this._statusLabel.node.active = true;
        this._statusLabel.string = '锻造中…\n剩余 ' + this.FormatDuration(
            ZRSJZ_ForgeService.GetRemainingMilliseconds(task),
        );
        this._statusLabel.color = new Color(255, 172, 38);
    }

    private OnAction(): void {
        const recipe = this.GetSelectedRecipe();
        if (!recipe) return;
        this.PlayClick();

        const task = ZRSJZ_ForgeService.GetTask();
        const result = task
            ? ZRSJZ_ForgeService.Claim()
            : ZRSJZ_ForgeService.Start(recipe);
        ZRSJZ_UIManager.Instance.ShowTip(result.message);
        this.RefreshAll();
    }

    private GetCategoryRecipes(): readonly ZRSJZ_ForgeRecipe[] {
        return ZRSJZ_FORGE_RECIPES.filter(recipe => recipe.category === this._category);
    }

    private GetSelectedRecipe(): ZRSJZ_ForgeRecipe | null {
        return ZRSJZ_FORGE_RECIPES.find(
            recipe => recipe.itemName === this._selectedItemName,
        ) ?? null;
    }

    private GetPrimaryProperty(recipe: ZRSJZ_ForgeRecipe): string {
        const properties = ZRSJZ_PROP_PROPERTY.get(recipe.itemName) ?? {};
        if (recipe.propType === '枪' || recipe.propType === '刀') {
            return '攻击力 ' + (properties['伤害'] ?? 0);
        }
        if (recipe.propType === '头盔' || recipe.propType === '防弹衣') {
            return '减伤 ' + (properties['减伤'] ?? 0) + '%';
        }
        if (recipe.propType === '背包') {
            return '容量 ' + (properties['容量'] ?? 0);
        }
        return recipe.propType;
    }

    private FormatValue(value: number): string {
        if (value < 10000) return Math.floor(value).toString();
        const wan = value / 10000;
        return wan >= 100
            ? wan.toFixed(0) + '万'
            : wan.toFixed(1).replace('.0', '') + '万';
    }

    private FormatDuration(milliseconds: number): string {
        const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor(totalSeconds % 3600 / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds]
            .map(value => value.toString().padStart(2, '0'))
            .join(':');
    }

    private LoadPropSprite(
        sprite: Sprite,
        propName: string,
        maxWidth: number,
        maxHeight: number,
    ): void {
        if (!sprite) return;
        (sprite as any).__forgePropName = propName;
        ZRSJZ_UIManager.Instance.GetPropUI(propName)?.then(spriteFrame => {
            if (!spriteFrame || !isValid(sprite?.node)) return;
            if ((sprite as any).__forgePropName !== propName) return;
            sprite.spriteFrame = spriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            const original = spriteFrame.originalSize;
            const scale = Math.min(
                maxWidth / Math.max(1, original.width),
                maxHeight / Math.max(1, original.height),
            );
            sprite.node.getComponent(UITransform)?.setContentSize(
                original.width * scale,
                original.height * scale,
            );
        }).catch(error => {
            console.warn('[ZRSJZ_DLCForgePanel] 道具图片加载失败: ' + propName, error);
        });
    }

    private PlayClick(): void {
        ZRSJZ_AudioManager.Instance?.PlaySound('点击');
    }

    private CreateNode(
        name: string,
        parent: Node,
        x: number,
        y: number,
        width: number,
        height: number,
    ): Node {
        const node = new Node(name);
        node.layer = parent.layer;
        parent.addChild(node);
        node.setPosition(x, y);
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    private CreateLabel(
        name: string,
        parent: Node,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fontSize: number,
        color: Color,
    ): Label {
        const node = this.CreateNode(name, parent, x, y, width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.max(fontSize + 6, height);
        label.color = color;
        label.horizontalAlign = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        return label;
    }

    private CreateSpriteNode(
        name: string,
        parent: Node,
        x: number,
        y: number,
        width: number,
        height: number,
        spriteFrame?: SpriteFrame,
    ): Sprite {
        const node = this.CreateNode(name, parent, x, y, width, height);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = spriteFrame ?? null;
        return sprite;
    }

    private DrawRoundedRect(
        node: Node,
        fill: Color,
        stroke: Color,
        radius: number,
        lineWidth: number,
    ): void {
        const transform = node.getComponent(UITransform);
        const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
        const width = transform?.width ?? 100;
        const height = transform?.height ?? 100;
        graphics.fillColor = fill;
        graphics.strokeColor = stroke;
        graphics.lineWidth = lineWidth;
        graphics.roundRect(-width * 0.5, -height * 0.5, width, height, radius);
        graphics.fill();
        if (lineWidth > 0) graphics.stroke();
    }
}
