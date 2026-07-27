import { _decorator, EventTouch, instantiate, Node, Prefab, ScrollView, tween, Tween, UITransform, Vec3, Widget } from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import {
    ZRSJZ_GRID_TYPE,
    ZRSJZ_PANEL,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PROP_QUALITY
} from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import { GetBoxroomCategory, ZRSJZ_BOXROOM_CATEGORIES, ZRSJZ_BoxroomCategory } from '../ZRSJZ_BoxroomConstant';
import { ZRSJZ_BoxroomBox } from '../ZRSJZ_BoxroomBox';
const { ccclass } = _decorator;

type ZRSJZ_BoxroomCategoryView = {
    node: Node,
    contentWidth: number,
};

@ccclass('ZRSJZ_BoxroomPanel')
export class ZRSJZ_BoxroomPanel extends ZRSJZ_Panel {
    private static readonly CELL_WIDTH = 174;
    private static readonly CELL_HEIGHT = 178;
    private static readonly HORIZONTAL_GAP = 40;
    private static readonly VERTICAL_GAP = 24;
    private static readonly ROW_COUNT = 3;
    private static readonly CONTENT_PADDING = 20;

    private _curCategory: ZRSJZ_BoxroomCategory = "工艺品";
    private _content: Node = null;
    private _scrollView: ScrollView = null;
    private _selectedTab: Node = null;
    private _boxPrefab: Prefab = null;
    private _refreshVersion: number = 0;
    private _categoryCache: Map<ZRSJZ_BoxroomCategory, ZRSJZ_BoxroomCategoryView> = new Map();
    private _categoryBuildTasks: Map<
        ZRSJZ_BoxroomCategory,
        Promise<ZRSJZ_BoxroomCategoryView>
    > = new Map();

    protected onLoad(): void {
        const panel = this.node.getChildByName("Panel");
        const leftBar = panel?.getChildByName("左侧栏");
        this._selectedTab = leftBar?.getChildByName("页签选中") ?? null;
        this._scrollView = panel?.getChildByName("展览框")
            ?.getChildByName("收藏框")
            ?.getComponent(ScrollView) ?? null;
        this._content = this._scrollView?.content ?? null;

        for (const category of ZRSJZ_BOXROOM_CATEGORIES) {
            leftBar?.getChildByName(category)?.on(Node.EventType.TOUCH_END, () => {
                this.SelectCategory(category);
            }, this);
        }
    }

    public Show(...args: any[]): void {
        super.Show(...args);
        this.SelectCategory(this._curCategory);
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "返回":
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.收藏室界面);
                break;
        }
    }

    private SelectCategory(category: ZRSJZ_BoxroomCategory): void {
        this._curCategory = category;
        const tab = this.node.getChildByName("Panel")
            ?.getChildByName("左侧栏")
            ?.getChildByName(category);
        if (tab && this._selectedTab) {
            Tween.stopAllByTarget(this._selectedTab);
            tween(this._selectedTab)
                .to(0.18, {
                    position: new Vec3(
                        this._selectedTab.position.x,
                        tab.position.y,
                        this._selectedTab.position.z
                    )
                }, { easing: "quadOut" })
                .start();
        }
        this.RefreshExhibition(category);
    }

    private async RefreshExhibition(category: ZRSJZ_BoxroomCategory): Promise<void> {
        if (!this._content || !this._scrollView) return;

        const refreshVersion = ++this._refreshVersion;
        this._scrollView.stopAutoScroll();
        this._categoryCache.forEach(view => view.node.active = false);

        const view = await this.GetCategoryView(category);
        if (!view || refreshVersion !== this._refreshVersion || !this._content) return;

        const contentTransform = this._content.getComponent(UITransform);
        const contentWidget = this._content.getComponent(Widget);
        if (!contentTransform) return;
        if (contentWidget) contentWidget.enabled = false;

        const maskTransform = this._content.parent?.getComponent(UITransform);
        const contentHeight = maskTransform?.height ?? 624;
        view.node.active = true;
        view.node.getComponentsInChildren(ZRSJZ_BoxroomBox)
            .forEach(box => box.RefreshLevel());
        contentTransform.setAnchorPoint(0, 0.5);
        contentTransform.setContentSize(
            Math.max(maskTransform?.width ?? 0, view.contentWidth),
            contentHeight
        );
        this._content.setPosition(-(maskTransform?.width ?? 0) * 0.5, 0);
        this.scheduleOnce(() => this._scrollView?.scrollToLeft(0), 0);
    }

    private GetCategoryView(
        category: ZRSJZ_BoxroomCategory
    ): Promise<ZRSJZ_BoxroomCategoryView> {
        const cachedView = this._categoryCache.get(category);
        if (cachedView) return Promise.resolve(cachedView);

        const buildingTask = this._categoryBuildTasks.get(category);
        if (buildingTask) return buildingTask;

        const task = this.BuildCategoryView(category);
        this._categoryBuildTasks.set(category, task);
        task.then(() => this._categoryBuildTasks.delete(category));
        return task;
    }

    private async BuildCategoryView(
        category: ZRSJZ_BoxroomCategory
    ): Promise<ZRSJZ_BoxroomCategoryView> {
        const prefab = await this.GetBoxPrefab();
        if (!prefab || !this._content) return null;

        const props = [...ZRSJZ_PROP_CONFIG.values()].filter(config =>
            config.PropType === "物品"
            && config.Quality === ZRSJZ_PROP_QUALITY.红色
            && GetBoxroomCategory(config.Name) === category
        );
        const maskTransform = this._content.parent?.getComponent(UITransform);
        const contentHeight = maskTransform?.height ?? 624;
        const occupied: boolean[][] = Array.from(
            { length: ZRSJZ_BoxroomPanel.ROW_COUNT },
            () => []
        );
        let usedColumns = 0;

        const categoryNode = new Node(category);
        categoryNode.layer = this._content.layer;
        categoryNode.active = false;
        this._content.addChild(categoryNode);

        for (const config of props) {
            const [heightUnit, widthUnit] = this.GetGridSize(config.GridType);
            const position = this.FindGridPosition(occupied, widthUnit, heightUnit);
            this.OccupyGrid(occupied, position.column, position.row, widthUnit, heightUnit);
            usedColumns = Math.max(usedColumns, position.column + widthUnit);

            const box = instantiate(prefab);
            categoryNode.addChild(box);

            const boxWidth = widthUnit * ZRSJZ_BoxroomPanel.CELL_WIDTH
                + (widthUnit - 1) * ZRSJZ_BoxroomPanel.HORIZONTAL_GAP;
            const boxHeight = heightUnit * ZRSJZ_BoxroomPanel.CELL_HEIGHT
                + (heightUnit - 1) * ZRSJZ_BoxroomPanel.VERTICAL_GAP;
            const x = ZRSJZ_BoxroomPanel.CONTENT_PADDING
                + position.column * (ZRSJZ_BoxroomPanel.CELL_WIDTH + ZRSJZ_BoxroomPanel.HORIZONTAL_GAP)
                + boxWidth * 0.5;
            const y = contentHeight * 0.5
                - ZRSJZ_BoxroomPanel.CONTENT_PADDING
                - position.row * (ZRSJZ_BoxroomPanel.CELL_HEIGHT + ZRSJZ_BoxroomPanel.VERTICAL_GAP)
                - boxHeight * 0.5;
            box.setPosition(x, y);
            box.getComponent(ZRSJZ_BoxroomBox)?.Init(config.Name, boxWidth, boxHeight);
        }

        const contentWidth = ZRSJZ_BoxroomPanel.CONTENT_PADDING * 2
            + usedColumns * ZRSJZ_BoxroomPanel.CELL_WIDTH
            + Math.max(0, usedColumns - 1) * ZRSJZ_BoxroomPanel.HORIZONTAL_GAP;
        const view = { node: categoryNode, contentWidth };
        this._categoryCache.set(category, view);
        return view;
    }

    private GetBoxPrefab(): Promise<Prefab> {
        if (this._boxPrefab) return Promise.resolve(this._boxPrefab);

        return new Promise(resolve => {
            BundleManager.GetBundle("73_ZRSJZ_DLC").load(
                "Prefabs/收藏道具框",
                Prefab,
                (error: any, prefab: Prefab) => {
                    if (error) {
                        console.error("收藏道具框加载失败:", error);
                        resolve(null);
                        return;
                    }
                    this._boxPrefab = prefab;
                    resolve(prefab);
                }
            );
        });
    }

    private GetGridSize(gridType: ZRSJZ_GRID_TYPE): [number, number] {
        const [height, width] = gridType.split("_").map(Number);
        return [
            Math.max(1, Math.min(ZRSJZ_BoxroomPanel.ROW_COUNT, height || 1)),
            Math.max(1, width || 1),
        ];
    }

    private FindGridPosition(
        occupied: boolean[][],
        width: number,
        height: number
    ): { column: number, row: number } {
        for (let column = 0; ; column++) {
            for (let row = 0; row <= ZRSJZ_BoxroomPanel.ROW_COUNT - height; row++) {
                let canPlace = true;
                for (let y = row; y < row + height && canPlace; y++) {
                    for (let x = column; x < column + width; x++) {
                        if (occupied[y][x]) {
                            canPlace = false;
                            break;
                        }
                    }
                }
                if (canPlace) return { column, row };
            }
        }
    }

    private OccupyGrid(
        occupied: boolean[][],
        column: number,
        row: number,
        width: number,
        height: number
    ): void {
        for (let y = row; y < row + height; y++) {
            for (let x = column; x < column + width; x++) {
                occupied[y][x] = true;
            }
        }
    }
}
