import { _decorator, Collider2D, RigidBody2D, Sprite, SpriteFrame, tween, Tween, v2, v3, Vec3 } from 'cc';
import {
    ZRSJZ_MAP_CONFIG,
    ZRSJZ_MapConfig,
    ZRSJZ_ParacargoConfig,
    ZRSJZ_PROP_CONFIG,
    ZRSJZ_PROP_QUALITY,
} from '../ZRSJZ_Constant';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_Box } from './ZRSJZ_Box';
const { ccclass, property } = _decorator;

const ZRSJZ_PARACARGO_QUALITY_ORDER: readonly ZRSJZ_PROP_QUALITY[] = [
    ZRSJZ_PROP_QUALITY.白色,
    ZRSJZ_PROP_QUALITY.绿色,
    ZRSJZ_PROP_QUALITY.蓝色,
    ZRSJZ_PROP_QUALITY.紫色,
    ZRSJZ_PROP_QUALITY.金色,
    ZRSJZ_PROP_QUALITY.红色,
];
const ZRSJZ_PARACARGO_EQUIPMENT_TYPES: readonly string[] = [
    "枪", "刀", "头盔", "防弹衣",
];

@ccclass('ZRSJZ_ParacargoBox')
export class ZRSJZ_ParacargoBox extends ZRSJZ_Box {
    @property(SpriteFrame)
    IconSFs: SpriteFrame[] = [];

    /** 空投打开后被玩家选中时使用的专属开箱描边。 */
    @property(SpriteFrame)
    OpenedCheckedSF: SpriteFrame = null;

    private _collider: Collider2D = null;
    private _rigidBody: RigidBody2D = null;
    private _visualInitialized: boolean = false;
    private _landed: boolean = false;

    public get IsLanded(): boolean {
        return this._landed;
    }

    protected onLoad(): void {
        this._collider = this.getComponent(Collider2D);
        this._rigidBody = this.getComponent(RigidBody2D);
        this.SetInteractionEnabled(false);
    }

    /** 空投由 ZRSJZ_Game 在配置时间到达后主动部署，不走普通场景箱 start 初始化。 */
    protected start(): void { }

    /**
     * 在指定地图点正上方生成空投并向下落。
     * 落地前关闭碰撞，落地后切换 IconSFs[1] 并接入普通箱子的打开/搜索流程。
     */
    public Deploy(
        targetWorldPosition: Readonly<Vec3>,
        config: Readonly<ZRSJZ_ParacargoConfig>,
        mapConfig: Readonly<ZRSJZ_MapConfig> = ZRSJZ_MAP_CONFIG.get(ZRSJZ_GameData.Instance.CurMap),
    ): void {
        if (!config || !mapConfig) {
            console.warn("[ZRSJZ_ParacargoBox] 缺少空投或地图配置");
            return;
        }

        Tween.stopAllByTarget(this.node);
        this._landed = false;
        this.BoxName = "空投";
        this.ConfigureFixedLoot(this.GenerateHighValueLoot(config, mapConfig));
        this.SetInteractionEnabled(false);
        this.ApplyIcon(0);
        if (this.Checked?.node) this.Checked.node.active = false;

        if (this._rigidBody) {
            this._rigidBody.linearVelocity = v2(0, 0);
            this._rigidBody.angularVelocity = 0;
            this._rigidBody.gravityScale = 0;
        }

        const target = v3(targetWorldPosition.x, targetWorldPosition.y, targetWorldPosition.z);
        const start = v3(target.x, target.y + Math.max(0, config.DropHeight), target.z);
        this.node.setWorldPosition(start);
        this.node.active = true;
        ZRSJZ_UIManager.Instance.ShowTip("空投已投放！");
        tween(this.node)
            .to(Math.max(0.1, config.DropDuration), { worldPosition: target }, { easing: "quadIn" })
            .call(() => this.OnLanded())
            .start();
    }

    /** 空投使用预制体直接绑定的三张图片，不再由普通箱子名称异步覆盖。 */
    public Init(): void {
        if (!this._visualInitialized) {
            this._visualInitialized = true;
            this.Icon = this.node.getChildByName("Icon")?.getComponent(Sprite) ?? null;
            this.Checked = this.node.getChildByName("Checked")?.getComponent(Sprite) ?? null;
            this.CheckedSF[0] = this.Checked?.spriteFrame ?? null;
            this.CheckedSF[1] = this.OpenedCheckedSF;
            if (!this.CheckedSF[1]) {
                ZRSJZ_UIManager.Instance.GetBoxUI("空投开箱描边").then(sf => {
                    if (!this.node.isValid) return;
                    this.CheckedSF[1] = sf;
                    if (this.IsOpened() && this.Checked) this.Checked.spriteFrame = sf;
                }).catch(error => console.error("[ZRSJZ_ParacargoBox] 加载空投开箱描边失败", error));
            }
        }

        this.IconSF[0] = this.IconSFs[1] ?? this.IconSFs[0] ?? null;
        this.IconSF[1] = this.IconSFs[2] ?? this.IconSF[0];
        if (this.Checked) {
            const checkedState = this.IsOpened() ? 1 : 0;
            this.Checked.spriteFrame = this.CheckedSF[checkedState] ?? this.CheckedSF[0];
        }
    }

    public Check(): void {
        if (!this._landed) return;
        super.Check();
    }

    public Open(): boolean {
        if (!this._landed) return false;
        return super.Open();
    }

    public TryBeginSearch(playerIndex: number): boolean {
        return this._landed && super.TryBeginSearch(playerIndex);
    }

    private OnLanded(): void {
        if (!this.node.isValid) return;
        this._landed = true;
        this.ApplyIcon(1);
        this.SetInteractionEnabled(true);
    }

    private SetInteractionEnabled(enabled: boolean): void {
        if (!this._collider) this._collider = this.getComponent(Collider2D);
        if (this._collider) this._collider.enabled = enabled;
    }

    private ApplyIcon(index: number): void {
        if (!this.Icon) this.Icon = this.node.getChildByName("Icon")?.getComponent(Sprite) ?? null;
        if (this.Icon && this.IconSFs[index]) this.Icon.spriteFrame = this.IconSFs[index];
    }

    /**
     * 每个空投至少含一件金/红高价值物资，并按难度保证若干高品质装备；
     * 其余位置继续从这两类奖励中补齐，不会混入普通白绿蓝物资。
     */
    private GenerateHighValueLoot(
        config: Readonly<ZRSJZ_ParacargoConfig>,
        mapConfig: Readonly<ZRSJZ_MapConfig>,
    ): string[] {
        const minCount = Math.max(1, Math.floor(config.MinPropCount));
        const maxCount = Math.max(minCount, Math.floor(config.MaxPropCount));
        const totalCount = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
        const minEquipmentQuality = Math.max(0, Math.min(3, Math.floor(config.MinEquipmentQualityIndex)));

        const highValueProps = Array.from(new Set([
            ...(mapConfig.MapProp[4] ?? []),
            ...(mapConfig.MapProp[5] ?? []),
        ])).filter(propName => ZRSJZ_PROP_CONFIG.get(propName)?.PropType === "物品");
        const equipmentProps = Array.from(ZRSJZ_PROP_CONFIG.values())
            .filter(prop => {
                const qualityIndex = ZRSJZ_PARACARGO_QUALITY_ORDER.indexOf(prop.Quality);
                return ZRSJZ_PARACARGO_EQUIPMENT_TYPES.includes(prop.PropType)
                    && qualityIndex >= minEquipmentQuality
                    // 与普通箱子规则一致：空投装备也不能超过第四级（紫色）。
                    && qualityIndex <= 3;
            })
            .map(prop => prop.Name);

        const loot: string[] = [];
        // 至少保留一件高价值物资，但红色物资按配置显著降权。
        this.PushWeightedHighValueProp(loot, highValueProps, config);
        const equipmentCount = Math.min(
            Math.max(0, totalCount - 1),
            Math.max(0, Math.floor(config.GuaranteedEquipmentCount)),
        );
        for (let index = 0; index < equipmentCount; index++) {
            this.PushRandomUnique(loot, equipmentProps);
        }

        while (loot.length < totalCount && (highValueProps.length > 0 || equipmentProps.length > 0)) {
            const usePropSlot = Math.random() < Math.max(0, Math.min(1, config.PropSlotChance));
            const added = usePropSlot
                ? this.PushWeightedHighValueProp(loot, highValueProps, config)
                : this.PushRandomUnique(loot, equipmentProps);
            if (added) continue;

            // 首选池已无未重复奖励时切换到另一类；两类都耗尽后才允许重复。
            const fallbackAdded = usePropSlot
                ? this.PushRandomUnique(loot, equipmentProps)
                : this.PushWeightedHighValueProp(loot, highValueProps, config);
            if (fallbackAdded) continue;

            const fallbackPool = equipmentProps.length > 0 ? equipmentProps : highValueProps;
            loot.push(fallbackPool[Math.floor(Math.random() * fallbackPool.length)]);
        }
        return loot;
    }

    private PushWeightedHighValueProp(
        target: string[],
        candidates: readonly string[],
        config: Readonly<ZRSJZ_ParacargoConfig>,
    ): boolean {
        const available = candidates.filter(propName => !target.includes(propName));
        if (available.length === 0) return false;

        const goldProps = available.filter(propName =>
            ZRSJZ_PROP_CONFIG.get(propName)?.Quality === ZRSJZ_PROP_QUALITY.金色
        );
        const redProps = available.filter(propName =>
            ZRSJZ_PROP_CONFIG.get(propName)?.Quality === ZRSJZ_PROP_QUALITY.红色
        );
        const goldWeight = goldProps.length > 0 ? Math.max(0, config.GoldPropWeight) : 0;
        const redWeight = redProps.length > 0 ? Math.max(0, config.RedPropWeight) : 0;
        const totalWeight = goldWeight + redWeight;
        if (totalWeight <= 0) return this.PushRandomUnique(target, available);

        const selectedPool = Math.random() * totalWeight < goldWeight ? goldProps : redProps;
        target.push(selectedPool[Math.floor(Math.random() * selectedPool.length)]);
        return true;
    }

    private PushRandomUnique(target: string[], candidates: readonly string[]): boolean {
        const available = candidates.filter(propName => !target.includes(propName));
        if (available.length === 0) return false;
        target.push(available[Math.floor(Math.random() * available.length)]);
        return true;
    }
}

