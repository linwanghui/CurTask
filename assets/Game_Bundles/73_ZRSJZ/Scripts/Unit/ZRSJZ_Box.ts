import { _decorator, Component, Node, Sprite, SpriteFrame, tween, v3, Vec3 } from 'cc';
import { ZRSJZ_UIManager } from '../Manager/ZRSJZ_UIManager';
import { ZRSJZ_BoxConfig } from '../ZRSJZ_Constant';
const { ccclass, property } = _decorator;

enum ZRSJZ_BOX_STATE {
    IDLE = 0,
    OPENED = 1,
}

@ccclass('ZRSJZ_Box')
export class ZRSJZ_Box extends Component {
    @property
    BoxName: string = '';

    Icon: Sprite = null;
    Checked: Sprite = null;
    IconSF: SpriteFrame[] = [null, null];
    CheckedSF: SpriteFrame[] = [null, null];
    State: ZRSJZ_BOX_STATE = ZRSJZ_BOX_STATE.IDLE;
    /** 根据地图配置预先生成的箱内物品名称。 */
    LootProps: string[] = [];

    private _isInit: boolean = false;
    private _nextLootIndex: number = 0;
    private _boxConfig: Readonly<ZRSJZ_BoxConfig> = null;
    private _mapProp: readonly (readonly string[])[] = [];

    protected start(): void {
        this.Init();
    }

    /**
     * 每次从对象池取出箱子时重新写入掉落配置。
     * MapProp 的下标依次对应白、绿、蓝、紫、金、红六种品质。
     */
    Configure(
        config: Readonly<ZRSJZ_BoxConfig>,
        mapProp: readonly (readonly string[])[],
    ): void {
        this._boxConfig = {
            ...config,
            Probability: [...config.Probability],
        };
        this._mapProp = mapProp?.map(props => [...props]) ?? [];
        this.BoxName = config.BoxName;
        this.State = ZRSJZ_BOX_STATE.IDLE;
        this._nextLootIndex = 0;
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
        this.Checked.node.active = true;
    }

    CheckCancel() {
        this.Checked.node.active = false;
    }

    Open(): boolean {
        if (this.State === ZRSJZ_BOX_STATE.OPENED) {
            return false;
        }
        this.State = ZRSJZ_BOX_STATE.OPENED;
        this.Icon.spriteFrame = this.IconSF[this.State];
        this.Checked.spriteFrame = this.CheckedSF[this.State];
        return true;
    }

    /** 返回本次箱子按地图配置生成的物品列表。 */
    GetLootProps(): readonly string[] {
        return this.LootProps;
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
        return loot;
    }
}
