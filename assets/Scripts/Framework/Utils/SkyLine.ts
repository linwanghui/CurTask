import { SkyLineItem } from "./SkyLineItem";

export class ImprovedRectanglePacker {
    private containerWidth: number;
    private containerHeight: number; // 可修改的容器高度
    private placedItems: SkyLineItem[];
    private allowRotation: boolean;

    constructor(containerWidth: number = 6, containerHeight: number = 0, allowRotation: boolean = false) {
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight; // 初始高度
        this.placedItems = [];
        this.allowRotation = allowRotation;
    }

    /**
     * 检查在指定位置放置指定大小的物品是否允许
     * 用于手动放置时的检查，不限制已使用高度
     */
    canPlaceAt(x: number, y: number, width: number, height: number): boolean {
        // 兼容物品 y 值为正（自上向下）或负（之前的约定）：统一为自上向下为正的坐标系
        const yTop = (y <= 0) ? -y : y;

        // 检查是否超出容器边界（x 方向和 y 方向）
        if (x < 0 || x + width > this.containerWidth) {
            return false;
        }
        if (yTop < 0) {
            return false;
        }

        // 检查是否与已放置物品重叠
        for (const item of this.placedItems) {
            if (this.doRectanglesOverlap(x, yTop, width, height, item.x, (item.y <= 0) ? -item.y : item.y, item.width, item.height)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查在指定位置放置指定大小的物品是否允许（带高度限制）
     * 用于手动放置时的检查，限制最大容器高度
     */
    canPlaceAtWithHeightLimit(x: number, y: number, width: number, height: number): boolean {
        const yTop = (y <= 0) ? -y : y;

        // 检查是否超出容器边界（x方向）
        if (x < 0 || x + width > this.containerWidth) {
            return false;
        }

        // 检查是否超出高度限制（物品底部不能低于当前容器底部）
        if (yTop + height > this.containerHeight) {
            return false;
        }

        // 检查是否与已放置物品重叠
        for (const item of this.placedItems) {
            if (this.doRectanglesOverlap(x, yTop, width, height, item.x, (item.y <= 0) ? -item.y : item.y, item.width, item.height)) {
                return false;
            }
        }

        return true;
    }

    canPlaceItemAt(item: SkyLineItem, x: number, y: number): boolean {
        return this.canPlaceAt(x, y, item.width, item.height);
    }

    canPlaceItemAtWithHeightLimit(item: SkyLineItem, x: number, y: number): boolean {
        return this.canPlaceAtWithHeightLimit(x, y, item.width, item.height);
    }

    /**
     * 在指定位置强制放置物品
     */
    placeItemAt(item: SkyLineItem, x: number, y: number): SkyLineItem | null {
        if (!this.canPlaceItemAt(item, x, y)) {
            return null;
        }

        // 保持 item 原始坐标不变（外部使用的坐标系可能为负），但内部计算需要统一为自上向下为正的 y
        item.x = x;
        item.y = y;

        this.placedItems.push(item);

        // 自动更新容器高度（如果需要）
        this.updateContainerHeight();

        return item;
    }

    /**
     * 在指定位置强制放置物品（带高度限制）
     */
    placeItemAtWithHeightLimit(item: SkyLineItem, x: number, y: number): SkyLineItem | null {
        if (!this.canPlaceItemAtWithHeightLimit(item, x, y)) {
            return null;
        }

        item.x = x;
        item.y = y;

        this.placedItems.push(item);

        // 自动更新容器高度（如果需要）
        this.updateContainerHeight();

        return item;
    }

    /**
     * 添加物品到容器中（自动寻找最佳位置）
     */
    addItem(item: SkyLineItem): SkyLineItem | null {
        // 首先尝试在当前行右侧放置
        const currentRowPlacement = this.tryPlaceInCurrentRow(item);
        if (currentRowPlacement) {
            return this.placeItemAt(item, currentRowPlacement.x, currentRowPlacement.y);
        }

        // 尝试在现有行的空隙中放置
        const gapPlacement = this.findBestGapPlacement(item);
        if (gapPlacement) {
            return this.placeItemAt(item, gapPlacement.x, gapPlacement.y);
        }

        // 最后尝试放置在新的一行
        const newRowPlacement = this.findNewRowPlacement(item);
        if (newRowPlacement) {
            return this.placeItemAt(item, newRowPlacement.x, newRowPlacement.y);
        }

        return null;
    }

    /**
     * 尝试在当前行右侧放置物品
     */
    private tryPlaceInCurrentRow(item: SkyLineItem): { x: number, y: number } | null {
        if (this.placedItems.length === 0) {
            return { x: 0, y: 0 };
        }

        // 找到当前行最右侧的物品
        const currentRowY = this.placedItems[this.placedItems.length - 1].y;
        const currentRowItems = this.placedItems.filter(item => item.y === currentRowY);

        if (currentRowItems.length === 0) return null;

        const rightmostItem = currentRowItems.reduce((prev, current) =>
            (prev.x + prev.width > current.x + current.width) ? prev : current
        );

        const rightX = rightmostItem.x + rightmostItem.width;

        // 检查是否可以放在右侧
        if (rightX + item.width <= this.containerWidth &&
            this.canPlaceAt(rightX, currentRowY, item.width, item.height)) {
            return { x: rightX, y: currentRowY };
        }

        return null;
    }

    /**
     * 寻找最佳空隙放置位置
     */
    private findBestGapPlacement(item: SkyLineItem): { x: number, y: number } | null {
        let bestPlacement: { x: number, y: number } | null = null;

        // 遍历所有已放置物品，检查它们周围的空间
        for (const placedItem of this.placedItems) {
            // 检查右侧空隙
            const rightX = placedItem.x + placedItem.width;
            if (rightX + item.width <= this.containerWidth) {
                if (this.canPlaceAt(rightX, placedItem.y, item.width, item.height)) {
                    // 优先选择更靠上、更靠左的位置
                    if (!bestPlacement ||
                        placedItem.y > bestPlacement.y ||
                        (placedItem.y === bestPlacement.y && rightX < bestPlacement.x)) {
                        bestPlacement = { x: rightX, y: placedItem.y };
                    }
                }
            }

            // 检查下方空隙
            const bottomY = placedItem.y - placedItem.height;
            if (this.canPlaceAt(placedItem.x, bottomY, item.width, item.height)) {
                // 优先选择更靠上、更靠左的位置
                if (!bestPlacement ||
                    bottomY > bestPlacement.y ||
                    (bottomY === bestPlacement.y && placedItem.x < bestPlacement.x)) {
                    bestPlacement = { x: placedItem.x, y: bottomY };
                }
            }
        }

        return bestPlacement;
    }

    /**
     * 寻找新行的放置位置
     */
    private findNewRowPlacement(item: SkyLineItem): { x: number, y: number } | null {
        // 找到最下方的y坐标
        let bottomY = 0;
        if (this.placedItems.length > 0) {
            bottomY = Math.min(...this.placedItems.map(item => item.y - item.height));
        }

        // 尝试放在新的一行
        if (this.canPlaceAt(0, bottomY, item.width, item.height)) {
            return { x: 0, y: bottomY };
        }

        return null;
    }

    /**
     * 检查两个矩形是否重叠（y轴向上为正）
     */
    private doRectanglesOverlap(x1: number, y1: number, w1: number, h1: number,
        x2: number, y2: number, w2: number, h2: number): boolean {
        // 将 y 转换为自上向下为正的坐标系（top-based positive）
        const top1 = (y1 <= 0) ? -y1 : y1;
        const top2 = (y2 <= 0) ? -y2 : y2;

        const bottom1 = top1 + h1;
        const bottom2 = top2 + h2;

        // 检查是否不重叠的情况
        if (x1 + w1 <= x2) return false;
        if (x2 + w2 <= x1) return false;
        if (bottom1 <= top2) return false;
        if (bottom2 <= top1) return false;
        return true;
    }

    /**
     * 更新容器高度以适应所有已放置的物品
     */
    private updateContainerHeight(): void {
        if (this.placedItems.length === 0) {
            this.containerHeight = 0;
            return;
        }

        // 计算所有物品在自上向下为正的坐标系下的底部位置（top + height），取最大值
        const maxBottom = Math.max(...this.placedItems.map(item => {
            const top = (item.y <= 0) ? -item.y : item.y;
            return top + item.height;
        }));
        const requiredHeight = maxBottom;

        // 如果所需高度大于当前高度，则扩展容器
        if (requiredHeight > this.containerHeight) {
            this.containerHeight = requiredHeight;
        }
    }

    /**
     * 批量添加物品
     */
    addItems(items: SkyLineItem[]): SkyLineItem[] {
        if (!items || items.length === 0) return [];
        const placed: SkyLineItem[] = [];

        // 按面积从大到小排序，优先放置大的物品
        const sortedItems = [...items].sort((a, b) =>
            (b.width * b.height) - (a.width * a.height)
        );

        for (const item of sortedItems) {
            const positioned = this.addItem(item);
            if (positioned) {
                placed.push(positioned);
            } else {
                console.warn(`无法放置物品: ${item.width}x${item.height}`);
            }
        }

        return placed;
    }

    /**
     * 按照物品已有的位置直接放置（不自动排序）
     * 用于初始化时保持原有布局
     */
    addItemsWithExistingPositions(items: SkyLineItem[]): SkyLineItem[] {
        const placed: SkyLineItem[] = [];

        for (const item of items) {
            if (!item) continue;

            // 直接尝试在物品原有位置放置
            const positioned = this.placeItemAt(item, item.x, item.y);
            if (positioned) {
                placed.push(positioned);
            } else {
                console.warn(`无法按照原有位置放置物品: ${item.itemName} @ (${item.x},${item.y})`);
            }
        }

        return placed;
    }

    /**
     * 获取当前容器宽度（绝对值）
     */
    getContainerWidth(): number {
        return this.containerWidth;
    }

    /**
     * 获取当前容器高度（绝对值）
     */
    getContainerHeight(): number {
        return this.containerHeight;
    }

    /**
     * 设置容器高度
     */
    setContainerHeight(height: number): void {
        this.containerHeight = height;
    }

    /**
     * 获取所有已放置的物品
     */
    getPlacedItems(): SkyLineItem[] {
        return [...this.placedItems];
    }

    /**
     * 重置打包器
     */
    reset(): void {
        this.placedItems = [];
        this.containerHeight = 0;
    }

    /**
     * 计算空间利用率
     */
    getUtilization(): number {
        const totalArea = this.containerWidth * this.containerHeight;
        if (totalArea === 0) return 0;

        const usedArea = this.placedItems.reduce((sum, item) =>
            sum + (item.width * item.height), 0
        );

        return usedArea / totalArea;
    }

    /**
     * 获取已占用的行数（从顶部y=0到底部物品底部）
     * 返回占用的行数（绝对值）
     */
    getOccupiedRows(): number {
        if (this.placedItems.length === 0) {
            return 0;
        }
        // 计算所有物品在自上向下为正的坐标系下的底部位置（top + height），取最大值
        const maxBottom = Math.max(...this.placedItems.map(item => {
            const top = (item.y <= 0) ? -item.y : item.y;
            return top + item.height;
        }));
        const occupiedRows = maxBottom;

        console.log(`已占用行数: ${occupiedRows}`);
        return occupiedRows;
    }

    /**
     * 获取当前容器中的空行数（已分配高度 - 已占用行数）
     */
    getFreeRows(): number {
        const occupiedRows = this.getOccupiedRows();
        const freeRows = this.containerHeight - occupiedRows;
        console.log(`空行数: ${freeRows} (总高度: ${this.containerHeight} - 占用: ${occupiedRows})`);
        return freeRows;
    }

    /**
     * 确保至少有指定数量的空行，如果不足则扩展容器高度
     */
    ensureFreeRows(minFreeRows: number = 5): void {
        const currentFreeRows = this.getFreeRows();

        if (currentFreeRows < minFreeRows) {
            const neededRows = minFreeRows - currentFreeRows;
            this.containerHeight += neededRows;
            console.log(`扩展容器高度 ${neededRows} 行，新高度: ${this.containerHeight}`);
        }
    }

    /**
     * 自动调整容器高度以确保至少有指定数量的空行
     * 并返回调整后的高度
     */
    autoAdjustHeight(minFreeRows: number = 5): number {
        this.ensureFreeRows(minFreeRows);
        return this.containerHeight;
    }

    /**
     * 可视化当前布局（y轴向上为正）
     */
    visualize(): string {
        const height = this.containerHeight;

        // 创建网格，从左上角开始
        const grid: string[][] = Array.from({ length: height }, () =>
            Array.from({ length: this.containerWidth }, () => ' ')
        );

        // 标记已放置的物品
        this.placedItems.forEach((item, index) => {
            const char = String.fromCharCode(65 + (index % 26));
            // 将物品的 y 坐标转换为自上向下为正的行索引
            const top = (item.y <= 0) ? -item.y : item.y;
            const startRow = top;
            for (let row = startRow; row < startRow + item.height; row++) {
                for (let x = item.x; x < item.x + item.width; x++) {
                    if (row < height && x < this.containerWidth) {
                        grid[row][x] = char;
                    }
                }
            }
        });

        // 构建可视化字符串（从上往下显示）
        let result = '+' + '-'.repeat(this.containerWidth) + '+\n';
        for (let row = 0; row < height; row++) {
            result += '|' + grid[row].join('') + '|\n';
        }
        result += '+' + '-'.repeat(this.containerWidth) + '+\n';

        // 添加物品说明
        result += '\n物品说明:\n';
        this.placedItems.forEach((item, index) => {
            const char = String.fromCharCode(65 + (index % 26));
            result += `${char}: (${item.width}x${item.height}) @ (${item.x},${item.y})\n`;
        });

        result += `容器高度: ${height}\n`;
        result += `容器宽度: ${this.containerWidth}\n`;
        result += `空间利用率: ${(this.getUtilization() * 100).toFixed(1)}%\n`;

        return result;
    }
}