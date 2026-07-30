import {
    _decorator,
    AudioClip,
    EventTouch,
    instantiate,
    Label,
    Node,
    Prefab,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec3
} from 'cc';
import { ZRSJZ_Panel } from '../../../73_ZRSJZ/Scripts/Panel/ZRSJZ_Panel';
import { ZRSJZ_UIManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_UIManager';
import {
    ZRSJZ_GRID_TYPE,
    ZRSJZ_PANEL,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PROP_QUALITY
} from '../../../73_ZRSJZ/Scripts/ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../../../73_ZRSJZ/Scripts/ZRSJZ_GameData';
import { ZRSJZ_AudioManager } from '../../../73_ZRSJZ/Scripts/Manager/ZRSJZ_AudioManager';
import { BundleManager } from 'db://assets/Scripts/Framework/Managers/BundleManager';
import {
    FormatMysteryBoxValue,
    ZRSJZ_MYSTERY_BOX_AUDIO_LEAD_TIME,
    ZRSJZ_MYSTERY_BOX_CELL_SIZE,
    ZRSJZ_MYSTERY_BOX_CONFIG,
    ZRSJZ_MYSTERY_BOX_FRAME_PADDING,
    ZRSJZ_MYSTERY_BOX_QUALITY_RANK,
    ZRSJZ_MYSTERY_BOX_REVEAL_DURATION,
    ZRSJZ_MysteryBoxConfig,
    ZRSJZ_MysteryBoxType
} from '../ZRSJZ_MysteryBoxConstant';
import { ZRSJZ_MysteryBoxSmallBox } from '../ZRSJZ_MysteryBoxSmallBox';
const { ccclass } = _decorator;

type ZRSJZ_MysteryBoxReward = {
    name: string,
    value: number,
    quality: ZRSJZ_PROP_QUALITY,
    gridType: ZRSJZ_GRID_TYPE,
    column: number,
    row: number,
    width: number,
    height: number,
    node?: Node,
};

@ccclass('ZRSJZ_MysteryBoxPanel')
export class ZRSJZ_MysteryBoxPanel extends ZRSJZ_Panel {
    private _selectedType: ZRSJZ_MysteryBoxType = "普通箱";
    private _isOpening: boolean = false;
    private _itemPrefab: Prefab = null;
    private _mysterySprites: Map<string, SpriteFrame> = new Map();
    private _qualityAudios: Map<string, AudioClip> = new Map();
    private _qualityAudioPlayId: number = 0;
    private _assetTask: Promise<void> = null;

    protected onLoad(): void {
        const panel = this.node.getChildByName("Panel");
        const boxSelect = panel?.getChildByName("购买界面")?.getChildByName("物资箱选择");
        for (const type of Object.keys(ZRSJZ_MYSTERY_BOX_CONFIG) as ZRSJZ_MysteryBoxType[]) {
            boxSelect?.getChildByName(type)?.on(Node.EventType.TOUCH_END, () => {
                this.SelectBox(type);
            }, this);
        }
        panel?.getChildByName("购买界面")
            ?.getChildByName("选择按钮")
            ?.on(Node.EventType.TOUCH_END, this.ConfirmSelection, this);
    }

    public Show(...args: any[]): void {
        super.Show(...args);
        this._isOpening = false;
        this.ShowPurchasePage();
        this.SelectBox(this._selectedType);
        this.RefreshPurchasePrices();
        this.RefreshStatistics();
        this.LoadAssets();
    }

    public OnButtonClick(event: EventTouch): void {
        switch (event.getCurrentTarget().name) {
            case "返回":
                if (this._isOpening) {
                    ZRSJZ_UIManager.Instance.ShowTip("开启中，请稍后");
                    return;
                }
                if (this.IsOpeningPageVisible()) {
                    this.ShowPurchasePage();
                    this.ClearBoard();
                    this.SelectBox(this._selectedType);
                    return;
                }
                ZRSJZ_UIManager.Instance.HidePanel(ZRSJZ_PANEL.盲盒界面);
                break;
            case "开吃":
                this.OpenSelectedBox();
                break;
        }
    }

    private SelectBox(type: ZRSJZ_MysteryBoxType): void {
        this._selectedType = type;
        const purchasePage = this.node.getChildByName("Panel")?.getChildByName("购买界面");
        const boxSelect = purchasePage?.getChildByName("物资箱选择");
        const selected = boxSelect?.getChildByName("选中");
        const target = boxSelect?.getChildByName(type);
        if (selected && target) {
            selected.setPosition(target.position.x, selected.position.y, selected.position.z);
        }
    }

    private ConfirmSelection(): void {
        const panel = this.node.getChildByName("Panel");
        const purchasePage = panel?.getChildByName("购买界面");
        const openingPage = panel?.getChildByName("开箱界面");
        if (purchasePage) purchasePage.active = false;
        if (openingPage) openingPage.active = true;
        this.RefreshOpenBoxState();
        this.ClearBoard();
        this.ResizeBoard(ZRSJZ_MYSTERY_BOX_CONFIG[this._selectedType]);
        this.SetCurrentValue(0);
        this.SetOpenButtonText("开吃");
    }

    private ShowPurchasePage(): void {
        const panel = this.node.getChildByName("Panel");
        const purchasePage = panel?.getChildByName("购买界面");
        const openingPage = panel?.getChildByName("开箱界面");
        if (purchasePage) purchasePage.active = true;
        if (openingPage) openingPage.active = false;
    }

    private IsOpeningPageVisible(): boolean {
        return this.node.getChildByName("Panel")
            ?.getChildByName("开箱界面")
            ?.active === true;
    }

    private RefreshPurchasePrices(): void {
        const boxSelect = this.node.getChildByName("Panel")
            ?.getChildByName("购买界面")
            ?.getChildByName("物资箱选择");
        for (const type of Object.keys(ZRSJZ_MYSTERY_BOX_CONFIG) as ZRSJZ_MysteryBoxType[]) {
            const priceLabel = boxSelect?.getChildByName(type)
                ?.getChildByName("价格")
                ?.getChildByName("价格文本")
                ?.getComponent(Label);
            if (priceLabel) {
                priceLabel.string = FormatMysteryBoxValue(
                    ZRSJZ_MYSTERY_BOX_CONFIG[type].price
                );
            }
        }
    }

    private async OpenSelectedBox(): Promise<void> {
        if (this._isOpening) {
            ZRSJZ_UIManager.Instance.ShowTip("开启中，请稍后");
            return;
        }

        const config = ZRSJZ_MYSTERY_BOX_CONFIG[this._selectedType];
        if (ZRSJZ_GameData.Instance.Gold < config.price) {
            ZRSJZ_UIManager.Instance.ShowTip("金币不足");
            return;
        }

        this._isOpening = true;
        this.SetOpenButtonText("准备中");
        await this.LoadAssets();
        if (!this._itemPrefab || this._mysterySprites.size === 0) {
            ZRSJZ_UIManager.Instance.ShowTip("盲盒资源加载失败");
            this._isOpening = false;
            this.SetOpenButtonText("开吃");
            return;
        }

        this.SetOpenButtonText("开启中");
        ZRSJZ_GameData.Instance.ChangeGold(-config.price);

        const rewards = this.GenerateRewards(config);
        await this.BuildBoard(config, rewards);
        this.SetCurrentValue(0);

        let revealedValue = 0;
        const revealRewards = rewards.slice().sort((left, right) =>
            left.row - right.row || left.column - right.column
        );
        for (const reward of revealRewards) {
            const revealDuration =
                ZRSJZ_MYSTERY_BOX_REVEAL_DURATION[reward.quality] ?? 0.8;
            const smallBox = reward.node?.getComponent(ZRSJZ_MysteryBoxSmallBox);
            await Promise.all([
                smallBox?.Reveal(revealDuration) ?? Promise.resolve(),
                this.Wait(Math.max(
                    0,
                    revealDuration - ZRSJZ_MYSTERY_BOX_AUDIO_LEAD_TIME
                )).then(() => this.PlayQualityAudio(reward.quality)),
            ]);
            revealedValue += reward.value;
            this.SetCurrentValue(revealedValue);
        }

        this.GrantRewards(rewards);
        ZRSJZ_UIManager.Instance.ShowTip("所有的道具已经放入仓库中");
        const redCount = rewards.reduce((count, reward) =>
            count + (reward.quality === ZRSJZ_PROP_QUALITY.红色 ? 1 : 0), 0
        );
        ZRSJZ_GameData.Instance.RecordMysteryBoxOpen(
            config.price,
            revealedValue,
            redCount
        );
        this.RefreshStatistics();
        this._isOpening = false;
        this.SetOpenButtonText(
            `再来一次(${FormatMysteryBoxValue(config.price)})`
        );
    }

    private PlayQualityAudio(quality: ZRSJZ_PROP_QUALITY): void {
        let audioName = "白绿蓝";
        switch (quality) {
            case ZRSJZ_PROP_QUALITY.紫色:
                audioName = "紫";
                break;
            case ZRSJZ_PROP_QUALITY.金色:
            case ZRSJZ_PROP_QUALITY.红色:
                audioName = "金红";
                break;
        }
        const audioClip = this._qualityAudios.get(audioName);
        if (!audioClip || !ZRSJZ_AudioManager.Instance) return;

        const originalName = audioClip.name;
        try {
            audioClip.name = `${originalName}_${++this._qualityAudioPlayId}`;
            ZRSJZ_AudioManager.Instance.StopMusic();
            ZRSJZ_AudioManager.Instance.PlayMusicByClip(audioClip, false, 1);
        } finally {
            audioClip.name = originalName;
        }
    }

    private Wait(duration: number): Promise<void> {
        return new Promise(resolve => {
            this.scheduleOnce(() => resolve(), duration);
        });
    }

    private GenerateRewards(config: ZRSJZ_MysteryBoxConfig): ZRSJZ_MysteryBoxReward[] {
        const occupied: boolean[][] = Array.from(
            { length: config.rows },
            () => Array(config.columns).fill(false)
        );
        const totalCells = config.columns * config.rows;
        const fillRate = config.minFillRate
            + Math.random() * (config.maxFillRate - config.minFillRate);
        const targetCells = Math.max(1, Math.round(totalCells * fillRate));
        const targetValue = this.GetTargetRewardValue(config.price);
        const targetCellValue = targetValue / Math.max(1, targetCells);
        const pool = [...ZRSJZ_PROP_CONFIG.values()]
            .filter(prop => prop.PropType === "物品");
        const rewards: ZRSJZ_MysteryBoxReward[] = [];
        let occupiedCells = 0;
        let baseValue = 0;
        let attempts = 0;

        while (occupiedCells < targetCells && attempts++ < 300) {
            const remainingValue = Math.max(1, targetValue - baseValue);
            const prop = this.PickProp(pool, targetCellValue, remainingValue * 1.05);
            const [height, width] = this.GetGridSize(prop.GridType);
            if (occupiedCells + width * height > targetCells + 2) continue;

            const position = this.GetFirstValidPosition(occupied, width, height);
            if (!position) continue;
            this.SetOccupied(occupied, position.column, position.row, width, height);
            rewards.push({
                name: prop.Name,
                value: prop.UnitPrice,
                quality: prop.Quality,
                gridType: prop.GridType,
                column: position.column,
                row: position.row,
                width,
                height,
            });
            occupiedCells += width * height;
            baseValue += prop.UnitPrice;
        }

        if (rewards.length === 0) {
            const fallback = pool[Math.floor(Math.random() * pool.length)];
            const [height, width] = this.GetGridSize(fallback.GridType);
            rewards.push({
                name: fallback.Name,
                value: fallback.UnitPrice,
                quality: fallback.Quality,
                gridType: fallback.GridType,
                column: 0,
                row: 0,
                width,
                height,
            });
        }

        return rewards;
    }

    private PickProp(pool: any[], targetCellValue: number, maxValue: number): any {
        const affordablePool = pool.filter(prop => prop.UnitPrice <= maxValue);
        if (affordablePool.length === 0) {
            return pool.reduce((cheapest, prop) =>
                prop.UnitPrice < cheapest.UnitPrice ? prop : cheapest
            );
        }
        const sourcePool = affordablePool;
        let totalWeight = 0;
        const weighted = sourcePool.map(prop => {
            const [height, width] = this.GetGridSize(prop.GridType);
            const valuePerCell = prop.UnitPrice / Math.max(1, width * height);
            const valueDistance = Math.abs(Math.log(
                Math.max(1, valuePerCell) / Math.max(1, targetCellValue)
            ));
            const qualityRank = ZRSJZ_MYSTERY_BOX_QUALITY_RANK[prop.Quality] ?? 1;
            const weight = (1 / (1 + valueDistance * 2)) * (0.7 + qualityRank * 0.12);
            totalWeight += weight;
            return { prop, weight };
        });

        let random = Math.random() * totalWeight;
        for (const item of weighted) {
            random -= item.weight;
            if (random <= 0) return item.prop;
        }
        return weighted[weighted.length - 1].prop;
    }

    private GetTargetRewardValue(price: number): number {
        const gameData = ZRSJZ_GameData.Instance;
        const historyDifference = (gameData.MysteryBoxTotalCost ?? 0)
            - (gameData.MysteryBoxTotalValue ?? 0);
        const correction = Math.max(-price * 0.25, Math.min(price * 0.25, historyDifference * 0.1));
        return Math.max(
            price * 0.55,
            Math.floor(price * (0.70 + Math.random() * 0.60) + correction)
        );
    }

    private async BuildBoard(
        config: ZRSJZ_MysteryBoxConfig,
        rewards: ZRSJZ_MysteryBoxReward[]
    ): Promise<void> {
        const board = this.GetBoard();
        if (!board) return;
        this.ClearBoard();

        this.ResizeBoard(config);

        const itemLayer = new Node("盲盒内容");
        itemLayer.layer = board.layer;
        board.addChild(itemLayer);

        const emptySprite = this._mysterySprites.get("道具底");
        const emptySize = ZRSJZ_MYSTERY_BOX_CELL_SIZE * 0.88;
        for (let row = 0; row < config.rows; row++) {
            for (let column = 0; column < config.columns; column++) {
                const emptyNode = new Node("空格");
                emptyNode.layer = board.layer;
                itemLayer.addChild(emptyNode);
                const emptyTransform = emptyNode.addComponent(UITransform);
                const emptyImage = emptyNode.addComponent(Sprite);
                emptyImage.sizeMode = Sprite.SizeMode.CUSTOM;
                emptyImage.spriteFrame = emptySprite;
                emptyTransform.setContentSize(emptySize, emptySize);
                emptyNode.setPosition(this.GetGridPosition(
                    column,
                    row,
                    1,
                    1,
                    config.columns,
                    config.rows
                ));
            }
        }

        const initTasks: Promise<void>[] = [];
        for (const reward of rewards) {
            const itemNode = instantiate(this._itemPrefab);
            reward.node = itemNode;
            itemLayer.addChild(itemNode);

            const width = reward.width * ZRSJZ_MYSTERY_BOX_CELL_SIZE;
            const height = reward.height * ZRSJZ_MYSTERY_BOX_CELL_SIZE;
            itemNode.setPosition(this.GetGridPosition(
                reward.column,
                reward.row,
                reward.width,
                reward.height,
                config.columns,
                config.rows
            ));
            const gridName = reward.gridType.replace("_", "x");
            const gridSprite = this._mysterySprites.get(gridName);
            const component = itemNode.getComponent(ZRSJZ_MysteryBoxSmallBox);
            if (component) {
                initTasks.push(component.Init(
                    reward.name,
                    width,
                    height,
                    reward.quality,
                    reward.gridType,
                    gridSprite
                ));
            }
        }
        await Promise.all(initTasks);
    }

    private GetGridPosition(
        column: number,
        row: number,
        width: number,
        height: number,
        columns: number,
        rows: number
    ): Vec3 {
        return new Vec3(
            (column + width * 0.5 - columns * 0.5) * ZRSJZ_MYSTERY_BOX_CELL_SIZE,
            (rows * 0.5 - row - height * 0.5) * ZRSJZ_MYSTERY_BOX_CELL_SIZE,
            0
        );
    }

    private GetFirstValidPosition(
        occupied: boolean[][],
        width: number,
        height: number
    ): { column: number, row: number } | null {
        const rows = occupied.length;
        const columns = occupied[0]?.length ?? 0;

        for (let row = 0; row <= rows - height; row++) {
            for (let column = 0; column <= columns - width; column++) {
                let valid = true;
                for (let y = row; y < row + height && valid; y++) {
                    for (let x = column; x < column + width; x++) {
                        if (occupied[y][x]) {
                            valid = false;
                            break;
                        }
                    }
                }
                if (valid) return { column, row };
            }
        }
        return null;
    }

    private SetOccupied(
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

    private GetGridSize(gridType: ZRSJZ_GRID_TYPE): [number, number] {
        const [height, width] = gridType.split("_").map(Number);
        return [Math.max(1, height || 1), Math.max(1, width || 1)];
    }

    private GrantRewards(rewards: ZRSJZ_MysteryBoxReward[]): void {
        for (const reward of rewards) {
            ZRSJZ_GameData.Instance.AddPropByName(reward.name);
        }
    }

    private RefreshOpenBoxState(): void {
        this.LoadAssets().then(() => {
            const stateSprite = this.node.getChildByName("Panel")
                ?.getChildByName("开箱界面")
                ?.getChildByName("普通箱打开状态")
                ?.getComponent(Sprite);
            if (stateSprite) {
                stateSprite.spriteFrame = this._mysterySprites.get(`${this._selectedType}打开状态`);
            }
        });
    }

    private RefreshStatistics(): void {
        const openingPage = this.node.getChildByName("Panel")?.getChildByName("开箱界面");
        const statistics = openingPage?.getChildByName("统计");
        const gameData = ZRSJZ_GameData.Instance;

        const totalValue = statistics?.getChildByName("价值文本")?.getComponent(Label);
        const openCount = statistics?.getChildByName("累计开启次数")?.getComponent(Label);
        const redCount = statistics?.getChildByName("价值文本-002")?.getComponent(Label);
        if (totalValue) {
            totalValue.string = FormatMysteryBoxValue(gameData.MysteryBoxTotalValue ?? 0);
        }
        if (openCount) openCount.string = `${gameData.MysteryBoxOpenCount ?? 0}次`;
        if (redCount) redCount.string = `${gameData.MysteryBoxRedCount ?? 0}个`;
    }

    private SetCurrentValue(value: number): void {
        const label = this.node.getChildByName("Panel")
            ?.getChildByName("开箱界面")
            ?.getChildByName("本次的吃")
            ?.getChildByName("价值文本")
            ?.getComponent(Label);
        if (label) label.string = FormatMysteryBoxValue(value);
    }

    private SetOpenButtonText(text: string): void {
        const label = this.node.getChildByName("Panel")
            ?.getChildByName("开箱界面")
            ?.getChildByName("开吃")
            ?.getChildByName("文本")
            ?.getComponent(Label);
        if (label) label.string = text;
    }

    private GetBoard(): Node {
        return this.node.getChildByName("Panel")
            ?.getChildByName("开箱界面")
            ?.getChildByName("道具底框") ?? null;
    }

    private ResizeBoard(config: ZRSJZ_MysteryBoxConfig): void {
        const boardWidth = config.columns * ZRSJZ_MYSTERY_BOX_CELL_SIZE
            + ZRSJZ_MYSTERY_BOX_FRAME_PADDING;
        const boardHeight = config.rows * ZRSJZ_MYSTERY_BOX_CELL_SIZE
            + ZRSJZ_MYSTERY_BOX_FRAME_PADDING;
        this.GetBoard()?.getComponent(UITransform)?.setContentSize(boardWidth, boardHeight);
    }

    private ClearBoard(): void {
        const board = this.GetBoard();
        if (!board) return;
        const children = board.children.slice();
        board.removeAllChildren();
        children.forEach(child => child.destroy());
    }

    private LoadAssets(): Promise<void> {
        if (
            this._itemPrefab
            && this._mysterySprites.size > 0
            && this._qualityAudios.size > 0
        ) {
            return Promise.resolve();
        }
        if (this._assetTask) return this._assetTask;

        this._assetTask = Promise.all([
            new Promise<void>(resolve => {
                BundleManager.GetBundle("73_ZRSJZ_DLC").load(
                    "Prefabs/盲盒道具框",
                    Prefab,
                    (error: any, prefab: Prefab) => {
                        if (error) {
                            console.error("盲盒道具框加载失败:", error);
                        } else {
                            this._itemPrefab = prefab;
                        }
                        resolve();
                    }
                );
            }),
            new Promise<void>(resolve => {
                BundleManager.GetBundle("73_ZRSJZ_DLC").loadDir(
                    "Sprites/盲盒",
                    SpriteFrame,
                    (error: any, sprites: SpriteFrame[]) => {
                        if (error) {
                            console.error("盲盒图片加载失败:", error);
                        } else {
                            sprites.forEach(sprite => this._mysterySprites.set(sprite.name, sprite));
                        }
                        resolve();
                    }
                );
            }),
            new Promise<void>(resolve => {
                BundleManager.GetBundle("73_ZRSJZ_DLC").loadDir(
                    "Audios",
                    AudioClip,
                    (error: any, audioClips: AudioClip[]) => {
                        if (error) {
                            console.error("盲盒品质音效加载失败:", error);
                        } else {
                            audioClips.forEach(audioClip =>
                                this._qualityAudios.set(audioClip.name, audioClip)
                            );
                        }
                        resolve();
                    }
                );
            }),
        ]).then(() => undefined);
        return this._assetTask;
    }
}
