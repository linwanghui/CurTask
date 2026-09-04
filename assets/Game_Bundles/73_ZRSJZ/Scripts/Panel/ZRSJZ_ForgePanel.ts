import {
    _decorator,
    Color,
    EventTouch,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    instantiate,
    isValid,
} from 'cc';
import {
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PROP_PROPERTY,
    ZRSJZ_PANEL,
} from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_InventoryService } from '../Service/ZRSJZ_InventoryService';
import { ZRSJZ_Panel } from './ZRSJZ_Panel';
import {
    ZRSJZ_FORGE_CATEGORIES,
    ZRSJZ_FORGE_RECIPES,
    ZRSJZ_ForgeCategory,
    ZRSJZ_ForgeRecipe,
} from '../ZRSJZ_ForgeConstant';
import { ZRSJZ_ForgeService, ZRSJZ_ForgeTask } from '../Service/ZRSJZ_ForgeService';

const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_ForgePanel')
export class ZRSJZ_ForgePanel extends ZRSJZ_Panel {
    private static readonly LIST_HEIGHT = 730;

    @property(SpriteFrame)
    SelectedEquipmentBackground: SpriteFrame = null;

    private _initialized: boolean = false;
    private _normalEquipmentBackground: SpriteFrame = null;
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

    public Show(...args: any[]): void {
        this.PlayerIndex = args[0] === 1 ? 1 : 0;
        super.Show();
        this.InitializeRuntime().then(() => this.RefreshAll());
    }

    public OnButtonClick(event: EventTouch): void {
        this.PlayClick();
        if (event.getCurrentTarget().name === '返回') {
            ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.锻造界面);
        }
    }

    private InitializeRuntime(): Promise<void> {
        if (this._initialized) return Promise.resolve();
        if (!isValid(this.node) || !this.BindView()) return Promise.resolve();
        this._initialized = true;
        this._selectedItemName = this.GetCategoryRecipes()[0]?.itemName ?? '';
        this.RefreshAll();
        return Promise.resolve();
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
        this._normalEquipmentBackground = this._itemTemplate
            ?.getChildByName('装备底')?.getComponent(Sprite)?.spriteFrame ?? null;
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
        if (this._progressSprite) this.ConfigureProgressSprite();

        const bound = !!(
            this._listContent && this._itemTemplate && this._itemSprite && this._materialContent
            && this._materialTemplate && this._goldLabel && this._timeLabel
            && this._progressRoot && this._progressSprite && this._progressLabel
            && this._actionButton && this._actionButtonLabel && this._statusLabel
        );
        // 装备名称/装备属性是旧版右侧文本，新预制体可以不保留。
        // 只有完整绑定成功后才隐藏模板，避免绑定失败时整个列表变空。
        if (bound) this._itemTemplate.active = false;
        return bound;
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
            const selected = category === this._category;
            const selectedBackground = node.getChildByName('选中底');
            const normalBackground = node.getChildByName('未选中');
            if (selectedBackground) selectedBackground.active = selected;
            if (normalBackground) normalBackground.active = !selected;
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
        const contentTransform = this._listContent.getComponent(UITransform);
        const templateTransform = this._itemTemplate.getComponent(UITransform);
        const viewportHeight = this._listContent.parent?.getComponent(UITransform)?.height
            ?? ZRSJZ_ForgePanel.LIST_HEIGHT;
        const rowHeight = templateTransform?.height ?? 112;
        const rowSpacing = 20;
        const rowStep = rowHeight + rowSpacing;
        const contentHeight = Math.max(
            viewportHeight,
            recipes.length * rowStep + rowSpacing,
        );
        contentTransform.setContentSize(
            contentTransform.width,
            contentHeight,
        );
        const templateX = this._itemTemplate.position.x;
        const templateY = this._itemTemplate.position.y;

        recipes.forEach((recipe, index) => {
            const row = instantiate(this._itemTemplate);
            row.name = recipe.itemName;
            row.active = true;
            this._listContent.addChild(row);
            row.setPosition(templateX, templateY - index * rowStep);
            row.on(Node.EventType.TOUCH_END, () => this.SelectRecipe(recipe), this);

            const selected = recipe.itemName === this._selectedItemName;
            const background = row.getChildByName('装备底')?.getComponent(Sprite);
            if (background) {
                background.spriteFrame = selected && this.SelectedEquipmentBackground
                    ? this.SelectedEquipmentBackground
                    : this._normalEquipmentBackground;
            }
            const icon = row.getChildByName('装备图标')?.getComponent(Sprite);
            const iconTransform = icon?.node.getComponent(UITransform);
            this.LoadPropSprite(
                icon,
                recipe.itemName,
                iconTransform?.width ?? 88,
                iconTransform?.height ?? 88,
            );

            const name = row.getChildByName('名称')?.getComponent(Label);
            if (name) {
                name.string = recipe.itemName;
            }
            const property = row.getChildByName('属性')?.getComponent(Label);
            if (property) {
                property.string = this.GetPrimaryPropertyName(recipe);
            }
            const propertyValue = row.getChildByName('属性值')?.getComponent(Label);
            if (propertyValue) {
                propertyValue.string = this.GetPrimaryPropertyValue(recipe);
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

        if (this._itemNameLabel) this._itemNameLabel.string = recipe.itemName;
        if (this._itemPropertyLabel) {
            this._itemPropertyLabel.string = this.GetPrimaryPropertyName(recipe)
                + ' ' + this.GetPrimaryPropertyValue(recipe)
                + '    价值 ' + this.FormatValue(recipe.value);
        }
        this.LoadPropSprite(this._itemSprite, recipe.itemName, 390, 260);
        this._goldLabel.string = this.FormatValue(recipe.goldCost);
        this._timeLabel.string = recipe.durationHours + '小时';

        this._materialContent.children.slice().forEach(slot => {
            if (slot === this._materialTemplate) return;
            slot.removeFromParent();
            slot.destroy();
        });
        const slotCount = 6;
        const gap = Math.min(145, 790 / slotCount);
        const startX = -(slotCount - 1) * gap * 0.5;
        for (let index = 0; index < slotCount; index++) {
            const material = recipe.materials[index];
            const slot = instantiate(this._materialTemplate);
            slot.name = material ? material.name : '空材料槽' + (index + 1);
            slot.active = true;
            this._materialContent.addChild(slot);
            slot.setPosition(startX + index * gap, 0);

            const emptySlot = slot.getChildByName('空槽');
            const grid = slot.getChildByName('格子');
            const icon = slot.getChildByName('图标')?.getComponent(Sprite);
            const countLabel = slot.getChildByName('数量')?.getComponent(Label);

            if (!material) {
                if (emptySlot) emptySlot.active = true;
                if (grid) grid.active = false;
                if (icon) {
                    (icon as any).__forgePropName = '';
                    icon.spriteFrame = null;
                    icon.node.active = false;
                }
                if (countLabel) countLabel.node.active = false;
                continue;
            }

            slot.on(
                Node.EventType.TOUCH_END,
                () => this.ShowMaterialDetail(material.name),
                this,
            );

            if (emptySlot) emptySlot.active = false;
            if (grid) {
                grid.active = true;
                this.LoadMaterialGridSprite(grid.getComponent(Sprite), material.name);
            }
            if (icon) {
                icon.node.active = true;
                const iconTransform = icon.node.getComponent(UITransform);
                this.LoadPropSprite(
                    icon,
                    material.name,
                    iconTransform?.width ?? 82,
                    iconTransform?.height ?? 82,
                );
            }
            if (countLabel) {
                const owned = ZRSJZ_InventoryService.GetPropCountByName(material.name);
                countLabel.node.active = true;
                countLabel.string = owned + '/' + material.count;
                countLabel.color = owned >= material.count
                    ? Color.WHITE
                    : new Color(255, 84, 67);
            }
        }
    }

    private ShowMaterialDetail(propName: string): void {
        if (!ZRSJZ_PROP_CONFIG.has(propName)) return;
        this.PlayClick();
        ZRSJZ_UIManager.Instance.ShowPlayerPanel(
            ZRSJZ_PANEL.道具弹窗,
            this.PlayerIndex,
            propName,
            this.PlayerIndex,
        );
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

    private GetPrimaryPropertyName(recipe: ZRSJZ_ForgeRecipe): string {
        if (recipe.propType === '枪' || recipe.propType === '刀') return '攻击力';
        if (recipe.propType === '头盔' || recipe.propType === '防弹衣') return '减伤';
        if (recipe.propType === '背包') return '容量';
        return recipe.propType;
    }

    private GetPrimaryPropertyValue(recipe: ZRSJZ_ForgeRecipe): string {
        const properties = ZRSJZ_PROP_PROPERTY.get(recipe.itemName) ?? {};
        if (recipe.propType === '枪' || recipe.propType === '刀') {
            return String(properties['伤害'] ?? 0);
        }
        if (recipe.propType === '头盔' || recipe.propType === '防弹衣') {
            return String(properties['减伤'] ?? 0) + '%';
        }
        if (recipe.propType === '背包') {
            const capacity = Number(properties['容量'] ?? 0);
            const columns = 4;
            return Math.ceil(capacity / columns) + '*' + columns;
        }
        return '';
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

    private LoadMaterialGridSprite(sprite: Sprite, propName: string): void {
        if (!sprite) return;
        const quality = ZRSJZ_PROP_CONFIG.get(propName)?.Quality;
        if (!quality) {
            sprite.spriteFrame = null;
            return;
        }
        const gridName = quality + '1_1';
        (sprite as any).__forgeGridName = gridName;
        ZRSJZ_UIManager.Instance.GetPropGridUI(gridName)?.then(spriteFrame => {
            if (!spriteFrame || !isValid(sprite?.node)) return;
            if ((sprite as any).__forgeGridName !== gridName) return;
            sprite.spriteFrame = spriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }).catch(error => {
            console.warn('[ZRSJZ_ForgePanel] 材料格子加载失败: ' + gridName, error);
        });
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
            console.warn('[ZRSJZ_ForgePanel] 道具图片加载失败: ' + propName, error);
        });
    }

    private PlayClick(): void {
        ZRSJZ_AudioManager.Instance?.PlaySound('点击');
    }

}
