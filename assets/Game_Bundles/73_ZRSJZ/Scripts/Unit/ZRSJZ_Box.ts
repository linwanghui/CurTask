import { _decorator, Component, Node, Sprite, SpriteFrame, tween, v3, Vec3 } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import {
    ZRSJZ_BoxConfig,
    ZRSJZ_INVENTORY,
    ZRSJZ_MAP_CONFIG,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PROP_QUALITY,
} from '../ZRSJZ_Constant';
import { ZRSJZ_BoxInventory } from '../UI/ZRSJZ_BoxInventory';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
const { ccclass, property } = _decorator;

const ZRSJZ_LOOT_QUALITY_ORDER: readonly ZRSJZ_PROP_QUALITY[] = [
    ZRSJZ_PROP_QUALITY.白色,
    ZRSJZ_PROP_QUALITY.绿色,
    ZRSJZ_PROP_QUALITY.蓝色,
    ZRSJZ_PROP_QUALITY.紫色,
    ZRSJZ_PROP_QUALITY.金色,
    ZRSJZ_PROP_QUALITY.红色,
];

enum ZRSJZ_BOX_STATE {
    IDLE = 0,
    OPENED = 1,
}

@ccclass('ZRSJZ_Box')
export class ZRSJZ_Box extends Component {
    private static _inventorySerial: number = 0;

    @property
    BoxName: string = '';

    @property
    IsInit: boolean = false;

    Icon: Sprite = null;
    Checked: Sprite = null;
    IconSF: SpriteFrame[] = [null, null];
    CheckedSF: SpriteFrame[] = [null, null];
    State: ZRSJZ_BOX_STATE = ZRSJZ_BOX_STATE.IDLE;
    /** 根据地图配置预先生成的箱内物品名称。 */
    LootProps: string[] = [];
    /** 密码箱当前是否已被玩家成功破解。 */
    private _isPasswordUnlocked: boolean = false;
    /** 医疗箱是否已成功观看视频解锁。 */
    private _isMedicalUnlocked: boolean = false;

    private _isInit: boolean = false;
    private _nextLootIndex: number = 0;
    private _inventoryID: string = "";
    private _boxInventory: ZRSJZ_BoxInventory = null;
    private _boxConfig: Readonly<ZRSJZ_BoxConfig> = null;
    private _mapProp: readonly (readonly string[])[] = [];

    protected start(): void {
        if (this.IsInit) {
            this.Configure(ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap).MapBox.get(this.BoxName), ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap).MapProp);
        } else {
            // 地图中直接摆放的医疗箱等静态箱子不走 Configure，
            // 仍需要初始化 Icon/Checked，否则玩家碰撞时 Check 会空引用。
            this.Init();
        }
    }

    protected onDestroy(): void {
        this.DisposeInventory();
    }

    public get InventoryID(): string {
        return this._inventoryID;
    }

    /**
     * 每次从对象池取出箱子时重新写入掉落配置。
     * MapProp 的下标依次对应白、绿、蓝、紫、金、红六种品质。
     */
    Configure(
        config: Readonly<ZRSJZ_BoxConfig>,
        mapProp: readonly (readonly string[])[],
    ): void {
        this.DisposeInventory();
        this._boxConfig = {
            ...config,
            Probability: [...config.Probability],
            GuaranteedPropTypes: [...(config.GuaranteedPropTypes ?? [])],
        };
        this._mapProp = mapProp?.map(props => [...props]) ?? [];
        this.BoxName = config.BoxName;
        this.State = ZRSJZ_BOX_STATE.IDLE;
        this._isPasswordUnlocked = false;
        this._isMedicalUnlocked = false;
        this._nextLootIndex = 0;
        this._inventoryID = `${this.node.uuid}_${++ZRSJZ_Box._inventorySerial}`;
        this.LootProps = this.GenerateLootProps();
        this._isInit = false;
        this.Init();
    }

    Init() {
        if (this._isInit) return;
        this._isInit = true;
        this.Icon = this.node.getChildByName('Icon').getComponent(Sprite);
        this.Checked = this.node.getChildByName('Checked').getComponent(Sprite);
        this.State = ZRSJZ_BOX_STATE.IDLE;
        this.IconSF = [null, null];
        this.CheckedSF = [null, null];
        ZRSJZ_UIManager.Instance.GetBoxUI(this.BoxName).then((sf: SpriteFrame) => {
            this.IconSF[0] = sf;
            this.Icon.spriteFrame = sf;
        })
        ZRSJZ_UIManager.Instance.GetBoxUI(`${this.BoxName}开箱`).then((sf: SpriteFrame) => {
            this.IconSF[1] = sf;
        })
        ZRSJZ_UIManager.Instance.GetBoxUI(`${this.BoxName}描边`).then((sf: SpriteFrame) => {
            this.CheckedSF[0] = sf;
            this.Checked.spriteFrame = sf;
            this.Checked.node.active = false;
        })
        ZRSJZ_UIManager.Instance.GetBoxUI(`${this.BoxName}开箱描边`).then((sf: SpriteFrame) => {
            this.CheckedSF[1] = sf;
        })
    }

    Show(worldPos: Vec3) {
        this.Init();
        this.node.setWorldPosition(v3(worldPos.x, worldPos.y + 300, worldPos.z))
        tween(this.node)
            .to(0.3, { worldPosition: worldPos.clone() }, { easing: 'backOut' })
            .start();
    }

    Check() {
        this.Init();
        if (this.Checked?.node?.isValid) {
            this.Checked.node.active = true;
        }
    }

    CheckCancel() {
        this.Init();
        if (this.Checked?.node?.isValid) {
            this.Checked.node.active = false;
        }
    }

    Open(): boolean {
        this.Init();
        if (this.RequiresPassword() && !this._isPasswordUnlocked) {
            return false;
        }
        if (this.RequiresRewardVideo() && !this._isMedicalUnlocked) {
            return false;
        }
        if (this.State === ZRSJZ_BOX_STATE.OPENED) {
            return false;
        }
        this.State = ZRSJZ_BOX_STATE.OPENED;
        if (this.Icon) this.Icon.spriteFrame = this.IconSF[this.State];
        if (this.Checked) this.Checked.spriteFrame = this.CheckedSF[this.State];
        return true;
    }

    RequiresPassword(): boolean {
        return this.BoxName === "密码箱";
    }

    IsPasswordUnlocked(): boolean {
        return !this.RequiresPassword() || this._isPasswordUnlocked;
    }

    UnlockPassword(): void {
        if (this.RequiresPassword()) {
            this._isPasswordUnlocked = true;
        }
    }

    RequiresRewardVideo(): boolean {
        return this.BoxName === "医疗箱";
    }

    UnlockMedicalBox(): void {
        if (this.RequiresRewardVideo()) {
            this._isMedicalUnlocked = true;
        }
    }

    IsOpened(): boolean {
        return this.State === ZRSJZ_BOX_STATE.OPENED;
    }

    /** 返回本次箱子按地图配置生成的物品列表。 */
    GetLootProps(): readonly string[] {
        return this.LootProps;
    }

    /** 返回当前仍未搜索到的物品，用于提前显示开箱占位图。 */
    GetUnclaimedLootProps(): readonly string[] {
        return this.LootProps.slice(this._nextLootIndex);
    }

    /** 逐件取出尚未领取的物品，关闭弹窗后可从当前位置继续搜索。 */
    TakeNextLootProp(): string {
        if (this._nextLootIndex >= this.LootProps.length) {
            return null;
        }
        return this.LootProps[this._nextLootIndex++];
    }

    HasUnclaimedLoot(): boolean {
        return this._nextLootIndex < this.LootProps.length;
    }

    /** 延迟创建本箱子独享的库存节点。 */
    async GetBoxInventory(): Promise<ZRSJZ_BoxInventory> {
        if (this._boxInventory?.node?.isValid) {
            return this._boxInventory;
        }

        this._boxInventory = await ZRSJZ_BoxInventory.Create(this._inventoryID);
        return this._boxInventory;
    }

    private DisposeInventory(): void {
        if (!this._inventoryID) {
            return;
        }

        this._boxInventory?.Dispose();
        this._boxInventory = null;

        let changed = false;
        for (const propID in ZRSJZ_GameData.Instance.PropData) {
            const propData = ZRSJZ_GameData.Instance.PropData[propID];
            if (
                propData.CurInventory === ZRSJZ_INVENTORY.物资
                && propData.SourceBoxID === this._inventoryID
            ) {
                delete ZRSJZ_GameData.Instance.PropData[propID];
                changed = true;
            }
        }
        if (changed) {
            ZRSJZ_GameData.SaveData();
        }
    }

    private GenerateLootProps(): string[] {
        if (!this._boxConfig) {
            return [];
        }

        const minCount = Math.max(0, Math.floor(this._boxConfig.MinPropCount));
        const maxCount = Math.max(minCount, Math.floor(this._boxConfig.MaxPropCount));
        const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
        const availableQualities = this._mapProp
            .map((props, index) => ({ props, index }))
            .filter(item => item.props.length > 0);
        if (availableQualities.length === 0) {
            return [];
        }

        const weights = availableQualities.map(item =>
            Math.max(0, this._boxConfig.Probability[item.index] ?? 0),
        );
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        const loot: string[] = [];

        for (let index = 0; index < count; index++) {
            let qualityIndex = Math.floor(Math.random() * availableQualities.length);
            if (totalWeight > 0) {
                let roll = Math.random() * totalWeight;
                qualityIndex = weights.findIndex(weight => {
                    roll -= weight;
                    return roll < 0;
                });
                if (qualityIndex < 0) {
                    qualityIndex = availableQualities.length - 1;
                }
            }

            const props = availableQualities[qualityIndex].props;
            loot.push(props[Math.floor(Math.random() * props.length)]);
        }
        for (const propType of this._boxConfig.GuaranteedPropTypes ?? []) {
            const guaranteedProp = this.GenerateGuaranteedProp(propType);
            if (guaranteedProp) {
                loot.push(guaranteedProp);
            }
        }
        return loot;
    }

    /** 按箱子的品质权重额外生成一件指定类型装备。 */
    private GenerateGuaranteedProp(propType: string): string {
        const candidates = Array.from(ZRSJZ_PROP_CONFIG.values())
            .filter(prop => prop.PropType === propType);
        if (candidates.length === 0) {
            console.warn(`[ZRSJZ_Box] 没有可掉落的保底道具类型: ${propType}`);
            return null;
        }

        const qualities = Array.from(new Set(candidates.map(prop => prop.Quality)));
        const weightedCandidates = qualities.map(quality => {
            const qualityIndex = ZRSJZ_LOOT_QUALITY_ORDER.indexOf(quality);
            return {
                quality,
                weight: qualityIndex >= 0
                    ? Math.max(0, this._boxConfig.Probability[qualityIndex] ?? 0)
                    : 0,
            };
        });
        const totalWeight = weightedCandidates.reduce((sum, item) => sum + item.weight, 0);
        let selectedQuality = qualities[Math.floor(Math.random() * qualities.length)];
        if (totalWeight > 0) {
            let roll = Math.random() * totalWeight;
            selectedQuality = weightedCandidates.find(item => {
                roll -= item.weight;
                return roll < 0;
            })?.quality ?? weightedCandidates[weightedCandidates.length - 1].quality;
        }

        const qualityCandidates = candidates.filter(prop => prop.Quality === selectedQuality);
        return qualityCandidates[Math.floor(Math.random() * qualityCandidates.length)].Name;
    }
}
