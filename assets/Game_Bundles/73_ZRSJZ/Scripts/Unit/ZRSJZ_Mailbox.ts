import { _decorator, Component, Label, Sprite, SpriteFrame } from 'cc';
import { ZRSJZ_Game } from '../ZRSJZ_Game';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_MAP_CONFIG, ZRSJZ_PANEL } from '../ZRSJZ_Constant';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Mailbox')
export class ZRSJZ_Mailbox extends Component {
    @property(SpriteFrame)
    OpenSF: SpriteFrame = null;

    private readonly _icons: Sprite[] = [];
    private readonly _closedSFs: SpriteFrame[] = [];
    private _countLabel: Label = null;
    private _openedCount: number = 0;
    private _searchingPlayerIndex: number = -1;
    private _isCracking: boolean = false;

    protected onLoad(): void {
        this._icons.length = 0;
        this._closedSFs.length = 0;
        for (let index = 1; index <= 9; index++) {
            const sprite = this.node.getChildByName(`Icon${index}`)?.getComponent(Sprite) ?? null;
            if (!sprite) continue;
            this._icons.push(sprite);
            this._closedSFs.push(sprite.spriteFrame);
        }
        this._countLabel = this.node.getChildByName("Count")?.getComponent(Label) ?? null;
        this.RefreshCount();
    }

    public get TotalBoxCount(): number {
        return this._icons.length;
    }

    public get OpenedBoxCount(): number {
        return this._openedCount;
    }

    public get IsAvailable(): boolean {
        return this.node?.isValid
            && this.node.activeInHierarchy
            && ZRSJZ_Game.Instance?.IsBreakWallOperationInProgress() === true
            && this._openedCount < this._icons.length;
    }

    public ResetForBreakWallTask(): void {
        this._openedCount = 0;
        this._searchingPlayerIndex = -1;
        this._isCracking = false;
        for (let index = 0; index < this._icons.length; index++) {
            this._icons[index].spriteFrame = this._closedSFs[index];
        }
        this.RefreshCount();
    }

    public IsBeingSearchedByOther(playerIndex: number): boolean {
        return this._searchingPlayerIndex >= 0
            && this._searchingPlayerIndex !== (playerIndex === 1 ? 1 : 0);
    }

    public TryOpenNext(playerIndex: number): boolean {
        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        if (!ZRSJZ_Game.Instance?.IsBreakWallOperationInProgress()) {
            void ZRSJZ_UIManager.Instance.ShowTip("需要先接取破壁行动");
            return false;
        }
        if (!this.IsAvailable) {
            void ZRSJZ_UIManager.Instance.ShowTip("邮箱中的箱子已经全部打开");
            return false;
        }
        if (this._isCracking || this.IsBeingSearchedByOther(normalizedIndex)) {
            void ZRSJZ_UIManager.Instance.ShowTip("另一名玩家正在破解邮箱");
            return false;
        }

        this._searchingPlayerIndex = normalizedIndex;
        this._isCracking = true;
        ZRSJZ_UIManager.Instance.ShowPlayerPanel(
            ZRSJZ_PANEL.破壁行动密码弹窗,
            normalizedIndex,
            null,
            normalizedIndex,
            () => this.CompleteCrack(normalizedIndex),
            () => this.EndSearch(normalizedIndex),
        );
        return true;
    }

    public EndSearch(playerIndex: number): void {
        const normalizedIndex = playerIndex === 1 ? 1 : 0;
        if (this._searchingPlayerIndex !== normalizedIndex) return;
        this._searchingPlayerIndex = -1;
        this._isCracking = false;
    }

    public CancelBreakWallTask(): void {
        if (this._searchingPlayerIndex >= 0) {
            ZRSJZ_UIManager.Instance.HidePlayerPanel(
                ZRSJZ_PANEL.破壁行动密码弹窗,
                this._searchingPlayerIndex,
            );
        }
        this._searchingPlayerIndex = -1;
        this._isCracking = false;
    }

    private CompleteCrack(playerIndex: number): void {
        if (
            !this._isCracking
            || this._searchingPlayerIndex !== playerIndex
            || !ZRSJZ_Game.Instance?.IsBreakWallOperationInProgress()
            || !this.IsAvailable
        ) {
            this.EndSearch(playerIndex);
            return;
        }

        const icon = this._icons[this._openedCount];
        if (icon && this.OpenSF) {
            icon.spriteFrame = this.OpenSF;
            ZRSJZ_AudioManager.Instance.PlaySound("开邮箱");
        }
        this._openedCount++;
        this.RefreshCount();
        this.EndSearch(playerIndex);
        ZRSJZ_Game.Instance.NotifyBreakWallBoxOpened(this);

        ZRSJZ_UIManager.Instance.ShowPlayerPanel(
            ZRSJZ_PANEL.物资弹窗,
            playerIndex,
            this.GenerateHighValueLoot(),
            0.35,
            playerIndex,
        );
    }

    /** 每个箱位只掉落1～3件，并显著提高蓝、紫、金、红品质的权重。 */
    private GenerateHighValueLoot(): string[] {
        const mapConfig = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap);
        const pools = mapConfig?.MapProp ?? [];
        const qualityWeights = [5, 12, 30, 32, 16, 5];
        const available = pools
            .map((props, qualityIndex) => ({
                props,
                weight: Math.max(0, qualityWeights[qualityIndex] ?? 0),
            }))
            .filter(item => item.props.length > 0 && item.weight > 0);
        if (available.length === 0) return [];

        const count = 1 + Math.floor(Math.random() * 3);
        const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
        const loot: string[] = [];
        for (let index = 0; index < count; index++) {
            let roll = Math.random() * totalWeight;
            const selected = available.find(item => {
                roll -= item.weight;
                return roll < 0;
            }) ?? available[available.length - 1];
            loot.push(selected.props[Math.floor(Math.random() * selected.props.length)]);
        }
        return loot;
    }

    private RefreshCount(): void {
        if (this._countLabel) {
            this._countLabel.string = `${this._openedCount}/${this._icons.length}`;
        }
    }
}


